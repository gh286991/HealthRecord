
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';

export type BodyRecordDocument = BodyRecord & Document;

@Schema({ timestamps: true })
export class BodyRecord {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ required: true, type: Date, default: Date.now })
  date: Date;

  @Prop({ required: true })
  weight: number;

  @Prop({ required: false })
  bodyFat?: number;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  inbody?: Record<string, any>;
}

export const BodyRecordSchema = SchemaFactory.createForClass(BodyRecord);
