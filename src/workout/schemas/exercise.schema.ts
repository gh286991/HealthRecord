import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BodyPart } from './workout-record.schema';

@Schema({ timestamps: true })
export class Exercise {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ enum: BodyPart, required: true })
  bodyPart: BodyPart;

  @Prop({ default: true })
  isActive: boolean;
}

export type ExerciseDocument = Exercise & Document;
export const ExerciseSchema = SchemaFactory.createForClass(Exercise);


