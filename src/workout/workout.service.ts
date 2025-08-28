import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WorkoutRecord, WorkoutRecordDocument, BodyPart, WorkoutType, ResistanceData, CardioData } from './schemas/workout-record.schema';
import { Exercise, ExerciseDocument } from './schemas/exercise.schema';
import { CreateWorkoutRecordDto, CreateResistanceDataDto, CreateCardioDataDto } from './dto/create-workout-record.dto';
import { UpdateWorkoutRecordDto, UpdateResistanceDataDto, UpdateCardioDataDto } from './dto/update-workout-record.dto';
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
    // 向後兼容：如果沒有 type 但有 exercises，視為舊版重訓記錄
    let workoutType = dto.type;
    if (!workoutType && dto.exercises && dto.exercises.length > 0) {
      workoutType = WorkoutType.Resistance;
    }

    if (!workoutType) {
      throw new BadRequestException('必須指定運動類型');
    }

    const recordData: any = {
      userId: new Types.ObjectId(userId),
      date: new Date(dto.date),
      type: workoutType,
      duration: dto.duration,
      notes: dto.notes,
    };

    // 根據運動類型處理專用數據
    if (workoutType === WorkoutType.Resistance) {
      const resistanceData = dto.resistanceData || {
        exercises: dto.exercises || [], // 向後兼容
        totalRestSeconds: dto.totalRestSeconds,
      };

      if (!resistanceData.exercises || resistanceData.exercises.length === 0) {
        throw new BadRequestException('重訓記錄必須包含至少一個動作');
      }

      const computed = this.computeResistanceTotals(resistanceData.exercises);
      const totalRestSeconds =
        typeof resistanceData.totalRestSeconds === 'number'
          ? resistanceData.totalRestSeconds
          : this.computeTotalRestSeconds(resistanceData.exercises as any);

      recordData.resistanceData = {
        ...resistanceData,
        ...computed,
        totalRestSeconds,
      };

      // 向後兼容：保留舊欄位
      if (dto.exercises) {
        recordData.exercises = dto.exercises;
        recordData.totalVolume = computed.totalVolume;
        recordData.totalSets = computed.totalSets;
        recordData.totalReps = computed.totalReps;
        recordData.totalRestSeconds = totalRestSeconds;
      }
      if (dto.workoutDurationSeconds) {
        recordData.workoutDurationSeconds = dto.workoutDurationSeconds;
      }
    } else if (workoutType === WorkoutType.Cardio) {
      if (!dto.cardioData) {
        throw new BadRequestException('有氧記錄必須包含有氧數據');
      }
      recordData.cardioData = dto.cardioData;
    } else if (workoutType === WorkoutType.Flexibility) {
      if (!dto.flexibilityData) {
        throw new BadRequestException('柔韌性記錄必須包含柔韌性數據');
      }
      recordData.flexibilityData = dto.flexibilityData;
    }

    const record = new this.workoutRecordModel(recordData);
    return record.save();
  }

  async findAll(userId: string, date?: string, type?: WorkoutType): Promise<WorkoutRecord[]> {
    const filter: any = { userId: new Types.ObjectId(userId) };
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filter.date = { $gte: startDate, $lte: endDate };
    }
    if (type) {
      filter.type = type;
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
      throw new NotFoundException(`找不到 ID 為 ${id} 的運動紀錄`);
    }
    return record;
  }

  async update(userId: string, id: string, dto: UpdateWorkoutRecordDto): Promise<WorkoutRecord> {
    const existing = await this.findOne(userId, id);
    const workoutType = dto.type || existing.type;

    const updateData: any = {};
    
    // 基礎欄位更新
    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.type) updateData.type = dto.type;
    if (dto.duration !== undefined) updateData.duration = dto.duration;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    // 根據運動類型處理專用數據更新
    if (workoutType === WorkoutType.Resistance) {
      if (dto.resistanceData || dto.exercises) { // 向後兼容
        const resistanceData = dto.resistanceData || {
          exercises: dto.exercises || [],
          totalRestSeconds: dto.totalRestSeconds,
        };

        const computed = this.computeResistanceTotals(resistanceData.exercises || []);
        const totalRestSeconds =
          typeof resistanceData.totalRestSeconds === 'number'
            ? resistanceData.totalRestSeconds
            : this.computeTotalRestSeconds(resistanceData.exercises as any || []);

        updateData.resistanceData = {
          ...existing.resistanceData,
          ...resistanceData,
          ...computed,
          totalRestSeconds,
        };

        // 向後兼容：更新舊欄位
        if (dto.exercises) {
          updateData.exercises = dto.exercises;
          updateData.totalVolume = computed.totalVolume;
          updateData.totalSets = computed.totalSets;
          updateData.totalReps = computed.totalReps;
          updateData.totalRestSeconds = totalRestSeconds;
        }
        if (dto.workoutDurationSeconds !== undefined) {
          updateData.workoutDurationSeconds = dto.workoutDurationSeconds;
        }
      }
    } else if (workoutType === WorkoutType.Cardio && dto.cardioData) {
      updateData.cardioData = { ...existing.cardioData, ...dto.cardioData };
    } else if (workoutType === WorkoutType.Flexibility && dto.flexibilityData) {
      updateData.flexibilityData = { ...existing.flexibilityData, ...dto.flexibilityData };
    }

    const updated = await this.workoutRecordModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        updateData,
        { new: true },
      )
      .exec();
      
    if (!updated) {
      throw new NotFoundException(`找不到 ID 為 ${id} 的運動紀錄`);
    }
    return updated;
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.workoutRecordModel
      .findOneAndDelete({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
    if (!result) {
      throw new NotFoundException(`找不到 ID 為 ${id} 的運動紀錄`);
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
      totalDuration: 0, // 新增：總運動時間（分鐘）
      recordCount: records.length,
      recordsByType: {}, // 新增：按運動類型統計
    };

    records.forEach((r) => {
      // 統計重訓數據（從新結構或舊欄位取值）
      const volume = r.resistanceData?.totalVolume || r.totalVolume || 0;
      const sets = r.resistanceData?.totalSets || r.totalSets || 0;
      const reps = r.resistanceData?.totalReps || r.totalReps || 0;
      
      summary.totalVolume += volume;
      summary.totalSets += sets;
      summary.totalReps += reps;
      
      // 統計總運動時間
      if (r.duration) {
        summary.totalDuration += r.duration;
      }
      
      // 按運動類型統計
      const type = r.type || WorkoutType.Resistance;
      if (!summary.recordsByType[type]) {
        summary.recordsByType[type] = 0;
      }
      summary.recordsByType[type]++;
    });

    return { date, records, dailyTotals: summary };
  }

  // 重命名以更明確表示用途
  private computeResistanceTotals(
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

  // 向後兼容：保留舊方法名稱
  private computeTotals = this.computeResistanceTotals;

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
    // 這邊如果名稱重複（因為 unique index），會直接拋出資料庫錯誤，這是我們想要的
    const doc = new this.userExerciseModel({
      userId: new Types.ObjectId(userId),
      name: payload.name,
      bodyPart: payload.bodyPart,
      isActive: true,
    });
    return doc.save();
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


