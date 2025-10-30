import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TermsDocDocument = TermsDoc & Document;

export type LegalDocType = 'terms' | 'privacy';

@Schema({ timestamps: true, collection: 'terms_docs' })
export class TermsDoc {
  @Prop({ required: true, enum: ['terms', 'privacy'] })
  doc: LegalDocType;

  // 例如 v1.2
  @Prop({ required: true, trim: true })
  version: string;

  // 生效日期
  @Prop({ required: true, type: Date })
  effectiveDate: Date;

  // 直接存 HTML 內容（可選）
  @Prop({ required: false })
  contentHtml?: string;

  // 或僅存檔案位址（例如 CDN）
  @Prop({ required: false, trim: true })
  fileUrl?: string;

  // 內容雜湊，證明未被改動
  @Prop({ required: false, trim: true })
  sha256?: string;

  // 是否需要重新同意（實質變更）
  @Prop({ type: Boolean, default: false })
  requireReconsent?: boolean;
}

export const TermsDocSchema = SchemaFactory.createForClass(TermsDoc);

TermsDocSchema.index({ doc: 1, version: 1 }, { unique: true });

