
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';

export type AiLogDocument = AiLog & Document;

@Schema({ timestamps: true })
export class AiLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  model: string;

  @Prop({ type: Types.ObjectId, ref: 'AiPrompt', required: true, index: true })
  promptId: Types.ObjectId;

  @Prop()
  apiResponse: string;

  @Prop({ type: Object })
  parsedResponse: any;

  @Prop()
  inputTokens: number;

  @Prop()
  outputTokens: number;

  @Prop()
  imageUrl: string; // URL to the image, if applicable

  @Prop({ required: true })
  status: 'success' | 'error';

  @Prop()
  errorMessage: string;
}

export const AiLogSchema = SchemaFactory.createForClass(AiLog);
