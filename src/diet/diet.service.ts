import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DietRecord, DietRecordDocument } from './schemas/diet-record.schema';
import { CreateDietRecordDto } from './dto/create-diet-record.dto';
import { UpdateDietRecordDto } from './dto/update-diet-record.dto';
import { FoodService } from '../food/food.service';
import { MinioService } from '../common/services/minio.service';

@Injectable()
export class DietService {
  constructor(
    @InjectModel(DietRecord.name)
    private dietRecordModel: Model<DietRecordDocument>,
    private foodService: FoodService,
    private minioService: MinioService,
  ) {}

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
      processedFoods = await this.processFoodItems(foods);
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
        processedFoods = await this.processFoodItems(foods);
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

  private async processFoodItems(foods: any[]): Promise<any[]> {
    const processedFoods = [];

    for (const foodItem of foods) {
      const food = await this.foodService.findOne(foodItem.foodId);

      processedFoods.push({
        foodId: new Types.ObjectId(foodItem.foodId),
        foodName: food.name,
        quantity: foodItem.quantity,
        calories: food.calories * foodItem.quantity,
        protein: food.protein * foodItem.quantity,
        carbohydrates: food.carbohydrates * foodItem.quantity,
        fat: food.fat * foodItem.quantity,
        fiber: food.fiber ? food.fiber * foodItem.quantity : undefined,
        sugar: food.sugar ? food.sugar * foodItem.quantity : undefined,
        sodium: food.sodium ? food.sodium * foodItem.quantity : undefined,
      });
    }

    return processedFoods;
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
   * 建立飲食紀錄（包含照片上傳）
   * @param userId 使用者 ID
   * @param createDietRecordDto 飲食紀錄資料
   * @param file 上傳的照片檔案（可選）
   * @returns 建立的飲食紀錄
   */
  async createWithPhoto(
    userId: string,
    createDietRecordDto: CreateDietRecordDto,
    file?: Express.Multer.File,
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
      processedFoods = await this.processFoodItems(foods);
      totals = this.calculateTotals(processedFoods);
    }

    // 處理照片上傳
    let photoUrl = createDietRecordDto.photoUrl || '';
    if (file) {
      const fileName = this.minioService.generateUniqueFileName(
        file.originalname,
      );

      photoUrl = await this.minioService.uploadFile(
        fileName,
        file.buffer,
        file.mimetype,
        'diet-records',
      );
    }

    const dietRecord = new this.dietRecordModel({
      userId: new Types.ObjectId(userId),
      date: new Date(createDietRecordDto.date),
      ...rest,
      foods: processedFoods,
      photoUrl: `https://${photoUrl}`,
      ...totals,
    });

    return dietRecord.save();
  }
}
