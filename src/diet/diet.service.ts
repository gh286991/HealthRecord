import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DietRecord, DietRecordDocument } from './schemas/diet-record.schema';
import { CreateDietRecordDto } from './dto/create-diet-record.dto';
import { UpdateDietRecordDto } from './dto/update-diet-record.dto';

@Injectable()
export class DietService {
  constructor(
    @InjectModel(DietRecord.name)
    private dietRecordModel: Model<DietRecordDocument>,
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
