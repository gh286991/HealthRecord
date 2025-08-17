import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WorkoutRecordDocument = WorkoutRecord & Document;

@Schema({ _id: false })
export class WorkoutSet {
  @Prop({ required: true, min: 0 })
  weight: number; // 單位：kg

  @Prop({ required: true, min: 1 })
  reps: number;

  @Prop({ min: 1 })
  restSeconds?: number; // 休息秒數

  @Prop({ min: 1, max: 10 })
  rpe?: number; // 主觀用力程度（1-10）
}

@Schema({ _id: false })
export class WorkoutExercise {
  @Prop({ required: true })
  exerciseName: string; // 動作名稱，如 Bench Press

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
}

export const WorkoutRecordSchema = SchemaFactory.createForClass(WorkoutRecord);

// 依使用者與日期建立索引，加速查詢
WorkoutRecordSchema.index({ userId: 1, date: 1 });


