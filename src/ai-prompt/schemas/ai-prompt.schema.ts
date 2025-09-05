
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiPromptDocument = AiPrompt & Document;

@Schema({ timestamps: true })
export class AiPrompt {
  @Prop({ required: true, index: true })
  name: string; // e.g., 'diet-analysis'

  @Prop({ default: '1.0.0' })
  version: string; // e.g., '1.0', '1.1'

  @Prop({ required: true })
  text: string;
}

export const AiPromptSchema = SchemaFactory.createForClass(AiPrompt);

// Set default value for version
AiPromptSchema.pre('save', function(next) {
  if (!this.version) {
    this.version = '1.0.0';
  }
  next();
});

// Create a compound index to ensure version is unique per name
AiPromptSchema.index({ name: 1, version: 1 }, { unique: true });
