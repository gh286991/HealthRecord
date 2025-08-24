import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { BodyPart } from './workout-record.schema';

@Schema({ timestamps: true })
export class UserExercise {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ enum: BodyPart, required: true })
  bodyPart: BodyPart;

  @Prop({ default: true })
  isActive: boolean;
}

export type UserExerciseDocument = UserExercise & Document;
export const UserExerciseSchema = SchemaFactory.createForClass(UserExercise);

// 確保同一使用者下名稱唯一
UserExerciseSchema.index({ userId: 1, name: 1 }, { unique: true });


