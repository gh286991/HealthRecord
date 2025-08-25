import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Exercise, ExerciseDocument } from './schemas/exercise.schema';
import { exerciseSeeds } from './seeds/exercise-seeds';

@Injectable()
export class ExerciseSeedService implements OnModuleInit {
  constructor(
    @InjectModel(Exercise.name) private exerciseModel: Model<ExerciseDocument>,
  ) {}

  async onModuleInit() {
    await this.seedExercises();
  }

  private async seedExercises() {
    try {
      const existingCount = await this.exerciseModel.countDocuments({}).exec();

      if (existingCount === 0) {
        console.log('🏋️ 開始初始化運動項目資料...');

        const exercisesToInsert = exerciseSeeds.map((seed) => ({
          ...seed,
          isActive: true,
        }));

        await this.exerciseModel.insertMany(exercisesToInsert, {
          ordered: false,
        });

        console.log(`✅ 成功初始化 ${exerciseSeeds.length} 筆運動項目資料`);
      } else {
        console.log(
          `📊 運動項目資料庫已有 ${existingCount} 筆資料，跳過初始化`,
        );
      }
    } catch (error) {
      console.error('❌ 初始化運動項目資料時發生錯誤:', error);
    }
  }
}