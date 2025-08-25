import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WorkoutRecord, WorkoutRecordDocument, BodyPart } from './schemas/workout-record.schema';
import { Exercise, ExerciseDocument } from './schemas/exercise.schema';
import { CreateWorkoutRecordDto } from './dto/create-workout-record.dto';
import { UpdateWorkoutRecordDto } from './dto/update-workout-record.dto';
import { UserExercise, UserExerciseDocument } from './schemas/user-exercise.schema';

@Injectable()
export class WorkoutService {
  constructor(
    @InjectModel(WorkoutRecord.name)
    private workoutRecordModel: Model<WorkoutRecordDocument>,
    @InjectModel(Exercise.name)
    private exerciseModel: Model<ExerciseDocument>,
    @InjectModel(UserExercise.name)
    private userExerciseModel: Model<UserExerciseDocument>,
  ) {}

  async create(userId: string, dto: CreateWorkoutRecordDto): Promise<WorkoutRecord> {
    const { exercises, ...rest } = dto;

    const computed = this.computeTotals(exercises);
    // 若前端有送休息或時長，合併；否則自行依 sets 計算 totalRestSeconds（保守計）
    const totalRestSeconds =
      typeof dto.totalRestSeconds === 'number'
        ? dto.totalRestSeconds
        : this.computeTotalRestSeconds(exercises as any);

    const record = new this.workoutRecordModel({
      userId: new Types.ObjectId(userId),
      date: new Date(dto.date),
      exercises,
      ...rest,
      ...computed,
      totalRestSeconds,
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
      if (typeof rest.totalRestSeconds !== 'number') {
        updateData.totalRestSeconds = this.computeTotalRestSeconds(exercises as any);
      }
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

  private computeTotalRestSeconds(
    exercises: Array<{ sets?: Array<{ restSeconds?: number }> }>,
  ) {
    let total = 0;
    for (const exercise of exercises || []) {
      for (const set of exercise.sets || []) {
        total += set.restSeconds || 0;
      }
    }
    return total;
  }

  // 內建常用動作清單（可依部位過濾）
  getCommonExercises(bodyPart?: BodyPart) {
    // 從資料庫讀取（只回傳啟用項目）
    const filter: any = { isActive: true };
    if (bodyPart) filter.bodyPart = bodyPart;
    return this.exerciseModel
      .find(filter)
      .sort({ bodyPart: 1, name: 1 })
      .lean();
  }
  // 內建＋使用者自訂合併清單
  async getAllExercises(userId: string, bodyPart?: BodyPart) {
    try {
      const [builtins, custom] = await Promise.all([
        this.getCommonExercises(bodyPart),
        this.getUserExercises(userId, bodyPart),
      ]);
      
      // 確保都是陣列
      const builtinList = Array.isArray(builtins) ? builtins : [];
      const customList = Array.isArray(custom) ? custom : [];
      
      // 正規化，加上 isCustom 旗標
      const list = [
        ...builtinList.map((b: any) => ({ _id: b._id, name: b.name, bodyPart: b.bodyPart, isCustom: false })),
        ...customList.map((c: any) => ({ _id: c._id, name: c.name, bodyPart: c.bodyPart, isCustom: true })),
      ];
      return list.sort((a: any, b: any) => {
        if (a.bodyPart === b.bodyPart) return (a.name || '').localeCompare(b.name || '');
        return (a.bodyPart || '').localeCompare(b.bodyPart || '');
      });
    } catch (error) {
      console.error('getAllExercises error:', error);
      // 發生錯誤時至少回傳內建清單
      try {
        return await this.getCommonExercises(bodyPart);
      } catch (fallbackError) {
        console.error('fallback getCommonExercises error:', fallbackError);
        return [];
      }
    }
  }
  // 取得使用者自訂動作
  async getUserExercises(userId: string, bodyPart?: BodyPart) {
    const filter: any = { userId: new Types.ObjectId(userId), isActive: true };
    if (bodyPart) filter.bodyPart = bodyPart;
    return this.userExerciseModel.find(filter).sort({ bodyPart: 1, name: 1 }).lean();
  }

  // 新增使用者自訂動作
  async addUserExercise(userId: string, payload: { name: string; bodyPart: BodyPart }) {
    try {
      // 先檢查是否有同名的已刪除項目，如果有就重新啟用
      const existing = await this.userExerciseModel.findOne({
        userId: new Types.ObjectId(userId),
        name: payload.name,
        bodyPart: payload.bodyPart,
        isActive: false,
      });

      if (existing) {
        // 重新啟用已存在的項目
        existing.isActive = true;
        return existing.save();
      }

      // 沒有已刪除的同名項目，建立新的
      const doc = new this.userExerciseModel({
        userId: new Types.ObjectId(userId),
        name: payload.name,
        bodyPart: payload.bodyPart,
        isActive: true,
      });
      return doc.save();
    } catch (error) {
      // 如果還是有重複錯誤，嘗試在名稱後加上時間戳
      if (error.code === 11000) {
        const timestamp = Date.now().toString().slice(-4);
        const doc = new this.userExerciseModel({
          userId: new Types.ObjectId(userId),
          name: `${payload.name}_${timestamp}`,
          bodyPart: payload.bodyPart,
          isActive: true,
        });
        return doc.save();
      }
      throw error;
    }
  }

  // 更新使用者自訂動作
  async updateUserExercise(userId: string, id: string, payload: Partial<{ name: string; bodyPart: BodyPart; isActive: boolean }>) {
    return this.userExerciseModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
      payload,
      { new: true },
    ).exec();
  }

  // 停用/刪除使用者自訂動作
  async removeUserExercise(userId: string, id: string) {
    return this.userExerciseModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
      { isActive: false },
      { new: true },
    ).exec();
  }

  // 強制重新初始化運動項目種子數據（開發用）
  async resetExerciseSeeds() {
    await this.exerciseModel.deleteMany({});
    const defaults: Array<{ name: string; bodyPart: BodyPart }> = [
      { name: 'Bench Press', bodyPart: BodyPart.Chest },
      { name: 'Incline Dumbbell Press', bodyPart: BodyPart.Chest },
      { name: 'Dumbbell Flyes', bodyPart: BodyPart.Chest },
      { name: 'Push-ups', bodyPart: BodyPart.Chest },
      { name: 'Squat', bodyPart: BodyPart.Legs },
      { name: 'Deadlift', bodyPart: BodyPart.Back },
      { name: 'Romanian Deadlift', bodyPart: BodyPart.Legs },
      { name: 'Hip Thrust', bodyPart: BodyPart.Legs },
      { name: 'Lunges', bodyPart: BodyPart.Legs },
      { name: 'Leg Press', bodyPart: BodyPart.Legs },
      { name: 'Calf Raises', bodyPart: BodyPart.Legs },
      { name: 'Barbell Row', bodyPart: BodyPart.Back },
      { name: 'Pull-up', bodyPart: BodyPart.Back },
      { name: 'Lat Pulldown', bodyPart: BodyPart.Back },
      { name: 'T-Bar Row', bodyPart: BodyPart.Back },
      { name: 'Overhead Press', bodyPart: BodyPart.Shoulders },
      { name: 'Lateral Raise', bodyPart: BodyPart.Shoulders },
      { name: 'Rear Delt Flyes', bodyPart: BodyPart.Shoulders },
      { name: 'Front Raise', bodyPart: BodyPart.Shoulders },
      { name: 'Shrugs', bodyPart: BodyPart.Shoulders },
      { name: 'Biceps Curl', bodyPart: BodyPart.Arms },
      { name: 'Hammer Curl', bodyPart: BodyPart.Arms },
      { name: 'Preacher Curl', bodyPart: BodyPart.Arms },
      { name: 'Triceps Pushdown', bodyPart: BodyPart.Arms },
      { name: 'Overhead Triceps Extension', bodyPart: BodyPart.Arms },
      { name: 'Close-Grip Bench Press', bodyPart: BodyPart.Arms },
      { name: 'Dips', bodyPart: BodyPart.Arms },
      { name: 'Plank', bodyPart: BodyPart.Core },
      { name: 'Crunches', bodyPart: BodyPart.Core },
      { name: 'Russian Twists', bodyPart: BodyPart.Core },
      { name: 'Leg Raises', bodyPart: BodyPart.Core },
      { name: 'Mountain Climbers', bodyPart: BodyPart.Core },
      { name: 'Burpees', bodyPart: BodyPart.FullBody },
      { name: 'Thrusters', bodyPart: BodyPart.FullBody },
      { name: 'Clean and Press', bodyPart: BodyPart.FullBody },
    ];
    
    await this.exerciseModel.insertMany(
      defaults.map((d) => ({ ...d, isActive: true })),
      { ordered: false }
    ).catch((error) => {
      console.error('Failed to reset exercise seeds:', error);
    });
    
    return { message: 'Exercise seeds reset successfully', count: defaults.length };
  }
}


