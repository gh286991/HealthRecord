import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserPwaStatusDocument = UserPwaStatus & Document;

export type PwaEvent = 'install' | 'later' | 'dismiss';

@Schema({ timestamps: true })
export class UserPwaStatus {
  @Prop({ type: Types.ObjectId, ref: 'User', unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Date, required: false })
  installedAt?: Date;

  @Prop({ type: String, enum: ['install', 'later', 'dismiss'], required: false })
  lastAction?: PwaEvent;

  @Prop({ type: Date, required: false })
  lastActionAt?: Date;

  @Prop({ type: Date, required: false })
  nextPromptAt?: Date | null;

  @Prop({ type: Number, default: 0 })
  laterCount: number;

  @Prop({ type: Number, default: 0 })
  dismissCount: number;
}

export const UserPwaStatusSchema = SchemaFactory.createForClass(UserPwaStatus);


