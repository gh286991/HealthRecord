import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { LegalDocType } from './terms-doc.schema';

export type UserAgreementDocument = UserAgreement & Document;

@Schema({ timestamps: true, collection: 'user_agreements' })
export class UserAgreement {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: any;

  @Prop({ required: true, enum: ['terms', 'privacy'] })
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
