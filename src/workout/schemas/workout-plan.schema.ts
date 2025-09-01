import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Re-defining these enums and classes here to keep the schema self-contained.
// In a future refactor, these could be moved to a shared file.

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

export type WorkoutPlanDocument = WorkoutPlan & Document;

@Schema({ timestamps: true })
export class WorkoutPlan {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  creator: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  assignedTo: Types.ObjectId;

  @Prop({ required: true, type: Date })
  plannedDate: Date;

  @Prop({ type: String, enum: ['pending', 'completed'], default: 'pending', index: true })
  status: string;

  @Prop({ type: [WorkoutExercise], default: [] })
  exercises: WorkoutExercise[];
}

export const WorkoutPlanSchema = SchemaFactory.createForClass(WorkoutPlan);

WorkoutPlanSchema.index({ assignedTo: 1, plannedDate: 1 });
