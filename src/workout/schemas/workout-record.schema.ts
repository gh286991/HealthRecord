import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WorkoutRecordDocument = WorkoutRecord & Document;

// 訓練部位列舉
export enum BodyPart {
  Chest = '胸',
  Back = '背',
  Legs = '腿',
  Shoulders = '肩',
  Arms = '手臂',
  Core = '核心',
  FullBody = '全身',
  Other = '其他',
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

@Schema({ timestamps: true })
export class WorkoutRecord {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Date })
  date: Date; // 記錄日期

  @Prop({ type: [WorkoutExercise], default: [] })
  exercises: WorkoutExercise[];

  @Prop()
  notes?: string;

  @Prop({ default: 0 })
  totalVolume: number; // 總訓練量（Σ weight*reps）

  @Prop({ default: 0 })
  totalSets: number;

  @Prop({ default: 0 })
  totalReps: number;

  @Prop({ default: 0 })
  workoutDurationSeconds: number; // 本次訓練總時長（秒）

  @Prop({ default: 0 })
  totalRestSeconds: number; // 總休息秒數（由各組 restSeconds 加總）
}

export const WorkoutRecordSchema = SchemaFactory.createForClass(WorkoutRecord);

// 依使用者與日期建立索引，加速查詢
WorkoutRecordSchema.index({ userId: 1, date: 1 });


