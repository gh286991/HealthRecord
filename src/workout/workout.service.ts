import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WorkoutRecord, WorkoutRecordDocument, BodyPart } from './schemas/workout-record.schema';
import { Exercise, ExerciseDocument } from './schemas/exercise.schema';
import { CreateWorkoutRecordDto } from './dto/create-workout-record.dto';
import { UpdateWorkoutRecordDto } from './dto/update-workout-record.dto';

@Injectable()
export class WorkoutService {
  constructor(
    @InjectModel(WorkoutRecord.name)
    private workoutRecordModel: Model<WorkoutRecordDocument>,
    @InjectModel(Exercise.name)
    private exerciseModel: Model<ExerciseDocument>,
  ) {}

  async create(userId: string, dto: CreateWorkoutRecordDto): Promise<WorkoutRecord> {
    const { exercises, ...rest } = dto;

    const computed = this.computeTotals(exercises);

    const record = new this.workoutRecordModel({
      userId: new Types.ObjectId(userId),
      date: new Date(dto.date),
      exercises,
      ...rest,
      ...computed,
    });
    return record.save();
  }

  async findAll(userId: string, date?: string): Promise<WorkoutRecord[]> {
    const filter: any = { userId: new Types.ObjectId(userId) };
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filter.date = { $gte: startDate, $lte: endDate };
    }
    return this.workoutRecordModel.find(filter).sort({ date: -1 }).exec();
  }

  async findOne(userId: string, id: string): Promise<WorkoutRecord> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`無效的 ID 格式: ${id}`);
    }
    const record = await this.workoutRecordModel
      .findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
    if (!record) {
      throw new NotFoundException(`找不到 ID 為 ${id} 的健身紀錄`);
    }
    return record;
  }

  async update(userId: string, id: string, dto: UpdateWorkoutRecordDto): Promise<WorkoutRecord> {
    const { exercises, ...rest } = dto;

    const updateData: any = { ...rest };
    if (exercises) {
      updateData.exercises = exercises;
      const computed = this.computeTotals(exercises);
      Object.assign(updateData, computed);
    }
    if (rest.date) {
      updateData.date = new Date(rest.date);
    }

    const updated = await this.workoutRecordModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        updateData,
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new NotFoundException(`找不到 ID 為 ${id} 的健身紀錄`);
    }
    return updated;
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.workoutRecordModel
      .findOneAndDelete({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
    if (!result) {
      throw new NotFoundException(`找不到 ID 為 ${id} 的健身紀錄`);
    }
  }

  async getDailySummary(userId: string, date: string): Promise<any> {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const records = await this.workoutRecordModel
      .find({ userId: new Types.ObjectId(userId), date: { $gte: startDate, $lte: endDate } })
      .sort({ date: 1 })
      .exec();

    const summary = {
      totalVolume: 0,
      totalSets: 0,
      totalReps: 0,
      recordCount: records.length,
    };

    records.forEach((r) => {
      summary.totalVolume += r.totalVolume;
      summary.totalSets += r.totalSets;
      summary.totalReps += r.totalReps;
    });

    return { date, records, dailyTotals: summary };
  }

  private computeTotals(
    exercises: Array<{ sets?: Array<{ weight?: number; reps?: number }> }>,
  ) {
    let totalVolume = 0;
    let totalSets = 0;
    let totalReps = 0;
    for (const exercise of exercises || []) {
      for (const set of exercise.sets || []) {
        const weight = set.weight || 0;
        const reps = set.reps || 0;
        totalVolume += weight * reps;
        totalSets += 1;
        totalReps += reps;
      }
    }
    return { totalVolume, totalSets, totalReps };
  }

  // 內建常用動作清單（可依部位過濾）
  getCommonExercises(bodyPart?: BodyPart) {
    // 從資料庫讀取（只回傳啟用項目）；若資料庫為空，會自動種子初始化
    const filter: any = { isActive: true };
    if (bodyPart) filter.bodyPart = bodyPart;
    return this.exerciseModel
      .countDocuments({})
      .then(async (count) => {
        if (count === 0) {
          const defaults: Array<{ name: string; bodyPart: BodyPart }> = [
            { name: '臥推 (Bench Press)', bodyPart: BodyPart.Chest },
            { name: '上斜啞鈴臥推 (Incline DB Press)', bodyPart: BodyPart.Chest },
            { name: '深蹲 (Squat)', bodyPart: BodyPart.Legs },
            { name: '硬舉 (Deadlift)', bodyPart: BodyPart.Back },
            { name: '槓鈴划船 (Barbell Row)', bodyPart: BodyPart.Back },
            { name: '肩推 (Overhead Press)', bodyPart: BodyPart.Shoulders },
            { name: '側平舉 (Lateral Raise)', bodyPart: BodyPart.Shoulders },
            { name: '二頭彎舉 (Biceps Curl)', bodyPart: BodyPart.Arms },
            { name: '三頭下拉 (Triceps Pushdown)', bodyPart: BodyPart.Arms },
            { name: '棒式 (Plank)', bodyPart: BodyPart.Core },
            { name: '臀推 (Hip Thrust)', bodyPart: BodyPart.Legs },
            { name: '引體向上 (Pull-up)', bodyPart: BodyPart.Back },
          ];
          await this.exerciseModel.insertMany(
            defaults.map((d) => ({ ...d, isActive: true })),
            { ordered: false },
          ).catch(() => undefined);
        }
        return this.exerciseModel
          .find(filter)
          .sort({ bodyPart: 1, name: 1 })
          .lean();
      });
  }
}


