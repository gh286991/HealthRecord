import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import * as sharp from 'sharp';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DietRecord, DietRecordDocument } from './schemas/diet-record.schema';
import { CreateDietRecordDto } from './dto/create-diet-record.dto';
import { UpdateDietRecordDto } from './dto/update-diet-record.dto';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { AiLoggingService } from '../ai-logging/ai-logging.service';
import { AiPromptService } from '../ai-prompt/ai-prompt.service';

@Injectable()
export class DietService {
  private readonly logger = new Logger(DietService.name);
  private readonly AI_ANALYSIS_LIMIT = 12;

  constructor(
    @InjectModel(DietRecord.name)
    private dietRecordModel: Model<DietRecordDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
    private readonly aiLoggingService: AiLoggingService,
    private readonly aiPromptService: AiPromptService,
  ) {}

  async analyzePhoto(
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ foods: any[] } | { error: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('找不到使用者');
    }

    // --- 使用者 AI 使用次數檢查 ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (
      user.lastAiAnalysisDate &&
      user.lastAiAnalysisDate.getTime() < today.getTime()
    ) {
      user.aiAnalysisCount = 0;
    }
    if (user.aiAnalysisCount >= this.AI_ANALYSIS_LIMIT) {
      throw new ForbiddenException('已超過今日 AI 分析次數限制 (12次)');
    }

    // --- AI 設定與圖片前處理 ---
    this.logger.log(`Starting diet photo analysis for user ${userId}`);
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is not configured.');
      throw new BadRequestException('AI 功能未設定，請聯絡管理員。');
    }
    if (!file) {
      throw new BadRequestException('沒有提供圖片檔案。');
    }
    let imageBuffer = file.buffer;
    let mimeType = file.mimetype;
    try {
      const compressedBuffer = await sharp(file.buffer)
        .resize({
          width: 1024,
          height: 1024,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
      this.logger.log(
        `Image compressed: orig size=${file.size}, new size=${compressedBuffer.length}`,
      );
      imageBuffer = compressedBuffer;
      mimeType = 'image/jpeg';
    } catch (e) {
      this.logger.warn(
        `Could not compress image, using original. Reason: ${(e as Error).message}`,
      );
    }

    // --- 取得 AI 提示詞 ---
    const dietPrompt =
      await this.aiPromptService.getLatestPrompt('diet-analysis');
    const prompt = dietPrompt.text;

    // --- 呼叫 AI 模型 ---
    const modelName = 'gemini-1.5-flash';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: mimeType,
      },
    };

    try {
      const result = await model.generateContent([prompt, imagePart]);
      const response = result.response;
      const usage = response.usageMetadata;
      let text = response.text();
      text = text.replace(/^```json\s*|```$/g, '').trim();
      this.logger.log(`Gemini raw response: ${text}`);
      const parsedResult = this.safelyParseGeminiJson(text);

      // 記錄成功的 AI 呼叫
      this.aiLoggingService.createLog({
        userId,
        model: modelName,
        promptId: dietPrompt._id.toString(),
        apiResponse: text,
        parsedResponse: parsedResult,
        inputTokens: usage?.promptTokenCount,
        outputTokens: usage?.candidatesTokenCount,
        imageUrl: file.originalname,
        status: 'success',
      });

      if (!parsedResult.foods) {
        this.logger.warn('Gemini response is missing "foods" array');
        return { foods: [] };
      }

      // 更新使用者計數
      user.aiAnalysisCount += 1;
      user.lastAiAnalysisDate = new Date();
      await user.save();

      this.logger.log(
        `Successfully analyzed photo, found ${parsedResult.foods.length} food items.`,
      );
      return parsedResult;
    } catch (error) {
      this.logger.error(
        `Error analyzing photo with Gemini: ${error.message}`,
        error.stack,
      );

      // 記錄失敗的 AI 呼叫
      this.aiLoggingService.createLog({
        userId,
        model: modelName,
        promptId: dietPrompt._id.toString(),
        status: 'error',
        errorMessage: error.message,
        imageUrl: file.originalname,
      });

      throw new BadRequestException(`圖片分析失敗: ${error.message}`);
    }
  }

  async create(
    userId: string,
    createDietRecordDto: CreateDietRecordDto,
  ): Promise<DietRecord> {
    const { foods, ...rest } = createDietRecordDto;

    // 處理食物項目並計算營養成分
    let processedFoods = [];
    let totals = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbohydrates: 0,
      totalFat: 0,
      totalFiber: 0,
      totalSugar: 0,
      totalSodium: 0,
    };

    if (foods && foods.length > 0) {
      processedFoods = this.processFoodItems(foods);
      totals = this.calculateTotals(processedFoods);
    }

    const dietRecord = new this.dietRecordModel({
      userId: new Types.ObjectId(userId),
      date: new Date(createDietRecordDto.date),
      ...rest,
      foods: processedFoods,
      ...totals,
    });

    return dietRecord.save();
  }

  async findAll(userId: string, date?: string): Promise<DietRecord[]> {
    const filter: any = { userId: new Types.ObjectId(userId) };

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const results = await this.dietRecordModel
      .find(filter)
      .sort({ date: -1, mealType: 1 })
      .exec();

    return results;
  }

  async findOne(userId: string, id: string): Promise<DietRecord> {
    // 檢查 ObjectId 是否有效
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`無效的 ID 格式: ${id}`);
    }

    const dietRecord = await this.dietRecordModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!dietRecord) {
      throw new NotFoundException(`找不到 ID 為 ${id} 的飲食紀錄`);
    }

    return dietRecord;
  }

  async update(
    userId: string,
    id: string,
    updateDietRecordDto: UpdateDietRecordDto,
  ): Promise<DietRecord> {
    const { foods, ...rest } = updateDietRecordDto;

    let processedFoods;
    let totals;

    if (foods) {
      if (foods.length > 0) {
        processedFoods = this.processFoodItems(foods);
        totals = this.calculateTotals(processedFoods);
      } else {
        // 如果 foods 是空陣列，設定為空並重置營養成分
        processedFoods = [];
        totals = {
          totalCalories: 0,
          totalProtein: 0,
          totalCarbohydrates: 0,
          totalFat: 0,
          totalFiber: 0,
          totalSugar: 0,
          totalSodium: 0,
        };
      }
    }

    const updateData: any = { ...rest };
    if (processedFoods !== undefined) {
      updateData.foods = processedFoods;
      updateData.totalCalories = totals.totalCalories;
      updateData.totalProtein = totals.totalProtein;
      updateData.totalCarbohydrates = totals.totalCarbohydrates;
      updateData.totalFat = totals.totalFat;
      updateData.totalFiber = totals.totalFiber;
      updateData.totalSugar = totals.totalSugar;
      updateData.totalSodium = totals.totalSodium;
    }

    if (rest.date) {
      updateData.date = new Date(rest.date);
    }

    const updatedRecord = await this.dietRecordModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          userId: new Types.ObjectId(userId),
        },
        updateData,
        { new: true },
      )
      .exec();

    if (!updatedRecord) {
      throw new NotFoundException(`找不到 ID 為 ${id} 的飲食紀錄`);
    }

    return updatedRecord;
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.dietRecordModel
      .findOneAndDelete({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!result) {
      throw new NotFoundException(`找不到 ID 為 ${id} 的飲食紀錄`);
    }
  }

  async getDailySummary(userId: string, date: string): Promise<any> {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const records = await this.dietRecordModel
      .find({
        userId: new Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate },
      })
      .sort({ mealType: 1 })
      .exec();

    const dailyTotals = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbohydrates: 0,
      totalFat: 0,
      totalFiber: 0,
      totalSugar: 0,
      totalSodium: 0,
      mealCount: records.length,
    };

    records.forEach((record) => {
      dailyTotals.totalCalories += record.totalCalories;
      dailyTotals.totalProtein += record.totalProtein;
      dailyTotals.totalCarbohydrates += record.totalCarbohydrates;
      dailyTotals.totalFat += record.totalFat;
      dailyTotals.totalFiber += record.totalFiber;
      dailyTotals.totalSugar += record.totalSugar;
      dailyTotals.totalSodium += record.totalSodium;
    });

    return {
      date,
      records,
      dailyTotals,
    };
  }

  async getMarkedDates(
    userId: string,
    year: number,
    month: number,
  ): Promise<string[]> {
    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    const records = await this.dietRecordModel
      .find({
        userId: new Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate },
      })
      .select('date')
      .exec();

    // 提取唯一的日期（只取年-月-日）
    const uniqueDates = new Set<string>();
    records.forEach((record) => {
      const dateStr = record.date.toISOString().split('T')[0];
      uniqueDates.add(dateStr);
    });

    return Array.from(uniqueDates).sort();
  }

  private processFoodItems(foods: any[]): any[] {
    return foods.map((foodItem) => ({
      foodName: foodItem.foodName,
      description: foodItem.description || '',
      calories: this.toNumber(foodItem.calories),
      protein: this.toNumber(foodItem.protein),
      carbohydrates: this.toNumber(foodItem.carbohydrates),
      fat: this.toNumber(foodItem.fat),
      fiber: this.toNumber(foodItem.fiber),
      sugar: this.toNumber(foodItem.sugar),
      sodium: this.toNumber(foodItem.sodium),
    }));
  }

  private calculateTotals(foods: any[]): any {
    return foods.reduce(
      (totals, food) => ({
        totalCalories: totals.totalCalories + food.calories,
        totalProtein: totals.totalProtein + food.protein,
        totalCarbohydrates: totals.totalCarbohydrates + food.carbohydrates,
        totalFat: totals.totalFat + food.fat,
        totalFiber: totals.totalFiber + (food.fiber || 0),
        totalSugar: totals.totalSugar + (food.sugar || 0),
        totalSodium: totals.totalSodium + (food.sodium || 0),
      }),
      {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbohydrates: 0,
        totalFat: 0,
        totalFiber: 0,
        totalSugar: 0,
        totalSodium: 0,
      },
    );
  }

  /**
   * 嘗試修復 Gemini 產出的近似 JSON 文字，處理常見問題並解析為物件。
   * - 自動抽取最外層的 { ... } 片段
   * - 移除尾逗號
   * - 將帶單位的數值（例如 20g、300mg、120kcal）自動加上雙引號，避免 JSON 解析錯誤
   * - 將單引號字串嘗試換成雙引號（僅在合理範圍內）
   */
  private safelyParseGeminiJson(text: string): any {
    // 1) 嘗試直接解析
    try {
      return JSON.parse(text);
    } catch {}

    // 2) 抽取最外層 JSON 區段
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    }

    // 3) 先移除常見的尾逗號
    text = text.replace(/,\s*([}\]])/g, '$1');

    // 4) 嘗試僅修復 servingSize 欄位：若值含字母或中文字但未加引號，則補上雙引號
    text = text.replace(
      /("servingSize"\s*:\s*)([^,}\]\s][^,}\]]*)/g,
      (match, p1, p2) => {
        const raw = String(p2).trim();
        if (/^".*"$/.test(raw) || /^'.*'$/.test(raw)) return `${p1}${raw}`;
        // 若包含英文字母或中文字元，視為需要字串化
        if (/[A-Za-z\u4e00-\u9fa5]/.test(raw)) {
          const quoted = raw.replace(/"/g, '\"');
          return `${p1}"${quoted}"`;
        }
        return match;
      },
    );

    // 5) 修復數值欄位若含單位但未加引號的情況：calories、protein、carbohydrates、fat、fiber、sugar、sodium
    const unitProneKeys = [
      'calories',
      'protein',
      'carbohydrates',
      'fat',
      'fiber',
      'sugar',
      'sodium',
    ];
    for (const key of unitProneKeys) {
      const re = new RegExp(`("${key}"\s*:\s*)([^,}\]\s][^,}\]]*)`, 'g');
      text = text.replace(re, (match, p1, p2) => {
        const raw = String(p2).trim();
        // 已是字串或是純數字則不變
        if (/^".*"$/.test(raw) || /^'.*'$/.test(raw)) return `${p1}${raw}`;
        if (/^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/.test(raw))
          return `${p1}${raw}`;
        // 含英文字或中文字視為需字串化（如 20g、300mg、120kcal）
        if (/[A-Za-z\u4e00-\u9fa5]/.test(raw)) {
          const quoted = raw.replace(/"/g, '\"');
          return `${p1}"${quoted}"`;
        }
        return match;
      });
    }

    // 6) 把明顯的單引號字串改成雙引號（避免破壞數字/小數）
    // 僅針對 JSON 中的屬性值的簡單情境： : '...'
    text = text.replace(
      /:\s*'([^']*)'/g,
      (m, p1) => `: "${p1.replace(/"/g, '\"')}"`,
    );

    // 7) 再試一次解析
    try {
      return JSON.parse(text);
    } catch (e) {
      this.logger.warn(
        `Repairing Gemini JSON failed, fallback empty. Reason: ${(e as Error).message}`,
      );
      return { foods: [] };
    }
  }

  private toNumber(value: any): number {
    if (typeof value === 'number') return isFinite(value) ? value : 0;
    if (value === null || value === undefined) return 0;
    const cleaned = String(value).replace(/[^0-9+\-.eE]/g, '');
    const num = parseFloat(cleaned);
    return isFinite(num) ? num : 0;
  }

  // 遷移營養字段的方法
  async migrateNutritionFields(): Promise<{ updated: number; total: number }> {
    const allRecords = await this.dietRecordModel.find({}).exec();
    let updatedCount = 0;

    for (const record of allRecords) {
      let needsUpdate = false;
      const updateDoc: any = {};

      // 檢查並更新 foods 陣列中的營養素字段
      if (record.foods && record.foods.length > 0) {
        const updatedFoods = record.foods.map((food) => ({
          ...food,
          protein: food.protein ?? 0,
          carbohydrates: food.carbohydrates ?? 0,
          fat: food.fat ?? 0,
          fiber: food.fiber ?? 0,
          sugar: food.sugar ?? 0,
          sodium: food.sodium ?? 0,
          calories: food.calories ?? 0,
        }));

        updateDoc.foods = updatedFoods;
        needsUpdate = true;
      }

      // 檢查並更新總營養素字段
      if (record.totalProtein === undefined || record.totalProtein === null) {
        updateDoc.totalProtein = 0;
        needsUpdate = true;
      }
      if (
        record.totalCarbohydrates === undefined ||
        record.totalCarbohydrates === null
      ) {
        updateDoc.totalCarbohydrates = 0;
        needsUpdate = true;
      }
      if (record.totalFat === undefined || record.totalFat === null) {
        updateDoc.totalFat = 0;
        needsUpdate = true;
      }
      if (record.totalFiber === undefined || record.totalFiber === null) {
        updateDoc.totalFiber = 0;
        needsUpdate = true;
      }
      if (record.totalSugar === undefined || record.totalSugar === null) {
        updateDoc.totalSugar = 0;
        needsUpdate = true;
      }
      if (record.totalSodium === undefined || record.totalSodium === null) {
        updateDoc.totalSodium = 0;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await this.dietRecordModel.updateOne(
          { _id: record._id },
          { $set: updateDoc },
        );
        updatedCount++;
      }
    }

    return { updated: updatedCount, total: allRecords.length };
  }
}
