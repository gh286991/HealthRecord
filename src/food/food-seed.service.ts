import { Injectable, OnModuleInit } from '@nestjs/common';
import { FoodService } from './food.service';
import { foodSeeds } from './seeds/food-seeds';

@Injectable()
export class FoodSeedService implements OnModuleInit {
  constructor(private readonly foodService: FoodService) {}

  async onModuleInit() {
    await this.seedFoods();
  }

  private async seedFoods() {
    try {
      const existingFoods = await this.foodService.findAll();

      if (existingFoods.length === 0) {
        console.log('🌱 開始初始化食物資料...');

        for (const foodSeed of foodSeeds) {
          await this.foodService.create(foodSeed);
        }

        console.log(`✅ 成功初始化 ${foodSeeds.length} 筆食物資料`);
      } else {
        console.log(
          `📊 食物資料庫已有 ${existingFoods.length} 筆資料，跳過初始化`,
        );
      }
    } catch (error) {
      console.error('❌ 初始化食物資料時發生錯誤:', error);
    }
  }
}
