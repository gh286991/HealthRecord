import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { LegalDocType } from './terms-doc.schema';

export type UserAgreementDocument = UserAgreement & Document;

@Schema({ timestamps: true, collection: 'user_agreements' })
export class UserAgreement {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false, index: true })
  userId?: any;

  // 未登入用戶的匿名識別碼（例如前端 localStorage 產生的 UUID）
  @Prop({ required: false, trim: true, index: true })
  visitorId?: string;

  @Prop({ required: true, enum: ['terms', 'privacy', 'cookies'] })
  doc: LegalDocType;

  @Prop({ required: true, trim: true })
  version: string;

  @Prop({ required: true, type: Date })
  agreedAt: Date;

  @Prop({ required: true, trim: true })
  ip: string;

  @Prop({ required: false, trim: true })
  userAgent?: string;
}

export const UserAgreementSchema = SchemaFactory.createForClass(UserAgreement);

UserAgreementSchema.index({ userId: 1, doc: 1, agreedAt: -1 });
UserAgreementSchema.index({ visitorId: 1, doc: 1, agreedAt: -1 });
