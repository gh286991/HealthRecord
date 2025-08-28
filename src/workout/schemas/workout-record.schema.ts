import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WorkoutRecordDocument = WorkoutRecord & Document;

// 運動類型枚舉
export enum WorkoutType {
  Resistance = 'resistance',   // 重訓
  Cardio = 'cardio',          // 有氧
  Flexibility = 'flexibility', // 瑜伽/伸展
  Swimming = 'swimming',       // 游泳
  Sports = 'sports',          // 球類運動
  Other = 'other'             // 其他
}

// 有氧運動類型枚舉
export enum CardioType {
  Running = 'running',         // 跑步
  Cycling = 'cycling',         // 騎車
  Walking = 'walking',         // 健走
  Elliptical = 'elliptical',   // 橢圓機
  Rowing = 'rowing',           // 劃船機
  Treadmill = 'treadmill',     // 跑步機
  StairClimber = 'stairclimber', // 階梯機
  Other = 'other'              // 其他
}

// 訓練部位列舉
export enum BodyPart {
  Chest = 'chest',
  Back = 'back',
  Legs = 'legs',
  Shoulders = 'shoulders',
  Arms = 'arms',
  Core = 'core',
  FullBody = 'fullbody',
  Other = 'other',
}

@Schema({ _id: false })
export class WorkoutSet {
  @Prop({ required: true, min: 0 })
  weight: number; // 單位：kg

  @Prop({ required: true, min: 1 })
  reps: number;

  @Prop({ min: 0 })
  restSeconds?: number; // 休息秒數

  @Prop({ min: 1, max: 10 })
  rpe?: number; // 主觀用力程度（1-10）

  @Prop({ default: false })
  completed?: boolean; // 是否完成此組
}

@Schema({ _id: false })
export class WorkoutExercise {
  @Prop({ required: true })
  exerciseName: string; // 動作名稱，如 Bench Press

  @Prop({ enum: BodyPart, required: false })
  bodyPart?: BodyPart; // 訓練部位

  @Prop({ type: String, required: true })
  exerciseId: string; // 對應資料庫中的固定 ID

  @Prop({ type: [WorkoutSet], default: [] })
  sets: WorkoutSet[];
}

// 重訓專用數據
@Schema({ _id: false })
export class ResistanceData {
  @Prop({ type: [WorkoutExercise], default: [] })
  exercises: WorkoutExercise[];

  @Prop({ default: 0 })
  totalVolume: number; // 總訓練量（Σ weight*reps）

  @Prop({ default: 0 })
  totalSets: number;

  @Prop({ default: 0 })
  totalReps: number;

  @Prop({ default: 0 })
  totalRestSeconds: number; // 總休息秒數
}

// 有氧運動專用數據
@Schema({ _id: false })
export class CardioData {
  @Prop({ enum: CardioType, required: true })
  cardioType: CardioType; // 有氧運動類型

  @Prop({ min: 0 })
  distance?: number; // 距離（公里）

  @Prop({ min: 1, max: 10, required: true })
  intensity: number; // 強度等級（1-10）

  @Prop({ min: 0 })
  averageHeartRate?: number; // 平均心率

  @Prop({ min: 0 })
  maxHeartRate?: number; // 最大心率

  @Prop({ min: 0 })
  caloriesBurned?: number; // 消耗卡路里（估算）

  @Prop()
  location?: string; // 運動地點
}

// 柔韌性/瑜伽專用數據
@Schema({ _id: false })
export class FlexibilityData {
  @Prop({ type: [String], default: [] })
  poses: string[]; // 體式或動作名稱

  @Prop({ min: 1, max: 10 })
  difficulty?: number; // 難度等級（1-10）

  @Prop({ type: [String], default: [] })
  focusAreas: string[]; // 重點部位

  @Prop({ min: 1, max: 10 })
  relaxationLevel?: number; // 放鬆程度（1-10）
}

@Schema({ timestamps: true })
export class WorkoutRecord {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Date })
  date: Date; // 記錄日期

  @Prop({ enum: WorkoutType, default: WorkoutType.Resistance })
  type: WorkoutType; // 運動類型

  @Prop({ min: 0 })
  duration?: number; // 運動持續時間（分鐘）- 通用欄位

  @Prop()
  notes?: string;

  // 各運動類型的專用數據（只有對應類型才會有值）
  @Prop({ type: ResistanceData })
  resistanceData?: ResistanceData;

  @Prop({ type: CardioData })
  cardioData?: CardioData;

  @Prop({ type: FlexibilityData })
  flexibilityData?: FlexibilityData;

  // 保留舊有欄位以維持向後兼容（標記為 deprecated，未來版本移除）
  @Prop({ type: [WorkoutExercise], default: [] })
  exercises?: WorkoutExercise[];

  @Prop({ default: 0 })
  totalVolume?: number;

  @Prop({ default: 0 })
  totalSets?: number;

  @Prop({ default: 0 })
  totalReps?: number;

  @Prop({ default: 0 })
  workoutDurationSeconds?: number;

  @Prop({ default: 0 })
  totalRestSeconds?: number;
}

export const WorkoutRecordSchema = SchemaFactory.createForClass(WorkoutRecord);

// 依使用者、日期與運動類型建立索引，加速查詢
WorkoutRecordSchema.index({ userId: 1, date: 1 });
WorkoutRecordSchema.index({ userId: 1, type: 1 });
WorkoutRecordSchema.index({ userId: 1, date: 1, type: 1 });


