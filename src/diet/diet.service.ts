import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DietRecord, DietRecordDocument } from './schemas/diet-record.schema';
import { CreateDietRecordDto } from './dto/create-diet-record.dto';
import { UpdateDietRecordDto } from './dto/update-diet-record.dto';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class DietService {
  private readonly logger = new Logger(DietService.name);

  constructor(
    @InjectModel(DietRecord.name)
    private dietRecordModel: Model<DietRecordDocument>,
    private readonly configService: ConfigService,
  ) {}

  async analyzePhoto(
    file: Express.Multer.File,
  ): Promise<{ foods: any[] } | { error: string }> {
    this.logger.log('Starting diet photo analysis with Gemini...');
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

    // 在傳送前，先用 sharp 壓縮圖片
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sharp = require('sharp');
      const compressedBuffer = await sharp(file.buffer)
        .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
      
      this.logger.log(`Image compressed for Gemini: orig size=${file.size}, new size=${compressedBuffer.length}`);
      imageBuffer = compressedBuffer;
      mimeType = 'image/jpeg';

    } catch (e) {
      this.logger.warn(`Could not compress image for Gemini, using original. Reason: ${(e as Error).message}`);
      // 如果壓縮失敗，則使用原圖
      imageBuffer = file.buffer;
      mimeType = file.mimetype;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      請分析這張圖片中的食物。辨識出所有食物項目，並為每一個項目提供營養估計值。
      請嚴格按照下面的 JSON 格式回傳結果，不要有任何額外的文字或解釋。
      如果圖片中沒有食物，或無法辨識，請回傳一個空的 "foods" 陣列。

      JSON 格式:
      {
        "foods": [
          {
            "foodName": "食物名稱",
            "description": "簡短描述",
            "servingSize": 數值 (份量),
            "calories": 數值 (大卡),
            "protein": 數值 (克),
            "carbohydrates": 數值 (克),
            "fat": 數值 (克),
            "fiber": 數值 (克),
            "sugar": 數值 (克),
            "sodium": 數值 (毫克),
            "category": "食物分類，如 "蔬菜", "水果", "肉類", "穀物"
          }
        ]
      }
    `;

    try {
      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: mimeType,
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = result.response;
      let text = response.text();

      // 清理 Gemini 可能回傳的 markdown 格式
      text = text.replace(/^```json\s*|```$/g, '').trim();

      this.logger.log(`Gemini raw response: ${text}`);

      const parsedResult = JSON.parse(text);
      
      if (!parsedResult.foods) {
        this.logger.warn('Gemini response is missing "foods" array');
        return { foods: [] };
      }

      this.logger.log(
        `Successfully analyzed photo, found ${parsedResult.foods.length} food items.`,
      );
      return parsedResult;
    } catch (error) {
      this.logger.error(`Error analyzing photo with Gemini: ${error.message}`, error.stack);
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

  async getMarkedDates(userId: string, year: number, month: number): Promise<string[]> {
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
    records.forEach(record => {
      const dateStr = record.date.toISOString().split('T')[0];
      uniqueDates.add(dateStr);
    });

    return Array.from(uniqueDates).sort();
  }

  private processFoodItems(foods: any[]): any[] {
    return foods.map(foodItem => ({
      foodName: foodItem.foodName,
      description: foodItem.description || '',
      calories: foodItem.calories || 0,
      protein: foodItem.protein || 0,
      carbohydrates: foodItem.carbohydrates || 0,
      fat: foodItem.fat || 0,
      fiber: foodItem.fiber || 0,
      sugar: foodItem.sugar || 0,
      sodium: foodItem.sodium || 0,
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

  // 遷移營養字段的方法
  async migrateNutritionFields(): Promise<{ updated: number; total: number }> {
    const allRecords = await this.dietRecordModel.find({}).exec();
    let updatedCount = 0;

    for (const record of allRecords) {
      let needsUpdate = false;
      const updateDoc: any = {};

      // 檢查並更新 foods 陣列中的營養素字段
      if (record.foods && record.foods.length > 0) {
        const updatedFoods = record.foods.map(food => ({
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
      if (record.totalCarbohydrates === undefined || record.totalCarbohydrates === null) {
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
          { $set: updateDoc }
        );
        updatedCount++;
      }
    }

    return { updated: updatedCount, total: allRecords.length };
  }
}
