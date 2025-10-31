import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TermsDoc, TermsDocDocument, LegalDocType } from './schemas/terms-doc.schema';
import { UserAgreement, UserAgreementDocument } from './schemas/user-agreement.schema';

@Injectable()
export class LegalService {
  constructor(
    @InjectModel(TermsDoc.name) private termsDocModel: Model<TermsDocDocument>,
    @InjectModel(UserAgreement.name) private userAgreementModel: Model<UserAgreementDocument>,
  ) {}

  private parseVersion(v: string) {
    const m = /^v(\d+)\.(\d+)$/.exec(v?.trim() || '');
    if (!m) return { major: 0, minor: 0 };
    return { major: Number(m[1]), minor: Number(m[2]) };
  }

  private compareVersion(a: string, b: string) {
    const pa = this.parseVersion(a);
    const pb = this.parseVersion(b);
    if (pa.major !== pb.major) return pa.major - pb.major;
    return pa.minor - pb.minor;
  }

  async getLatest(doc: LegalDocType) {
    // 以 effectiveDate DESC, 其次用版本號排序
    const list = await this.termsDocModel.find({ doc }).sort({ effectiveDate: -1, createdAt: -1 }).lean();
    if (!list.length) throw new NotFoundException('No legal document found');
    // 若同日多版，挑選最高版本號
    let latest = list[0];
    for (const item of list) {
      if (new Date(item.effectiveDate).getTime() === new Date(latest.effectiveDate).getTime()) {
        if (this.compareVersion(item.version, latest.version) > 0) latest = item;
      } else {
        break;
      }
    }
    return latest;
  }

  async getByVersion(doc: LegalDocType, version: string) {
    const found = await this.termsDocModel.findOne({ doc, version }).lean();
    if (!found) throw new NotFoundException('Document version not found');
    return found;
  }

  async listAll(doc: LegalDocType) {
    return this.termsDocModel.find({ doc }).sort({ effectiveDate: -1 }).lean();
  }

  async recordAgreement(params: {
    userId?: string;
    visitorId?: string;
    doc: LegalDocType;
    version: string;
    agreedAt?: Date;
    ip: string;
    userAgent?: string;
  }) {
    if (!params.userId && !params.visitorId) {
      throw new Error('Either userId or visitorId is required');
    }
    const record = new this.userAgreementModel({
      userId: params.userId,
      visitorId: params.visitorId,
      doc: params.doc,
      version: params.version,
      agreedAt: params.agreedAt || new Date(),
      ip: params.ip,
      userAgent: params.userAgent,
    });
    await record.save();
    return record.toObject();
  }

  async publishDoc(params: {
    doc: LegalDocType;
    version: string;
    html?: string;
    sha256?: string;
    md?: string;
    sha256Md?: string;
    effectiveDate: Date;
    requireReconsent: boolean;
    forceUpdate?: boolean;
  }) {
    const existing = await this.termsDocModel.findOne({ doc: params.doc, version: params.version });
    const model: Partial<TermsDoc> = {
      doc: params.doc,
      version: params.version,
      effectiveDate: params.effectiveDate,
      contentHtml: params.html,
      sha256: params.sha256,
      contentMd: params.md,
      sha256Md: params.sha256Md,
      requireReconsent: params.requireReconsent,
    } as Partial<TermsDoc>;
    if (existing) {
      if (!params.forceUpdate) {
        throw new Error('Version already exists');
      }
      await this.termsDocModel.updateOne({ _id: existing._id }, { $set: model });
      return { ok: true, overwritten: true };
    }
    await this.termsDocModel.create(model);
    return { ok: true, overwritten: false };
  }
}
