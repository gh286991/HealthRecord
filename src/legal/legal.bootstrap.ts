import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TermsDoc, TermsDocDocument, LegalDocType } from './schemas/terms-doc.schema';
import { createHash } from 'crypto';

@Injectable()
export class LegalBootstrap implements OnModuleInit {
  private readonly logger = new Logger(LegalBootstrap.name);

  constructor(
    @InjectModel(TermsDoc.name) private termsDocModel: Model<TermsDocDocument>,
  ) {}

  async onModuleInit() {
    if (process.env.LEGAL_AUTO_SEED !== 'true') return;
    const FE = process.env.FRONTEND_URL;
    if (!FE) {
      this.logger.warn('FRONTEND_URL not set, skip legal snapshot seeding');
      return;
    }
    try {
      const [termsHtml, privacyHtml] = await Promise.all([
        fetch(`${FE}/terms`, { cache: 'no-store' }).then(r => r.text()),
        fetch(`${FE}/privacy`, { cache: 'no-store' }).then(r => r.text()),
      ]);
      const extractMain = (html: string) => {
        const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
        let inner = m ? m[1] : html;
        inner = inner
          .replace(/<header[\s\S]*?<\/header>/gi, '')
          .replace(/<nav[\s\S]*?<\/nav>/gi, '')
          .replace(/<div[^>]*role=["']?navigation["']?[^>]*>[\s\S]*?<\/div>/gi, '')
          .replace(/<div[^>]*id=["']?(site-header|app-header)["']?[^>]*>[\s\S]*?<\/div>/gi, '')
          .replace(/<div[^>]*data-snapshot-exclude[\s\S]*?<\/div>/gi, '');
        return inner.trim();
      };
      const termsInner = extractMain(termsHtml);
      const privacyInner = extractMain(privacyHtml);
      const targets: (Partial<TermsDoc> & { doc: LegalDocType })[] = [
        { doc: 'terms', version: 'v0.3', effectiveDate: new Date('2026-01-01'), contentHtml: termsInner, sha256: createHash('sha256').update(termsInner).digest('hex'), requireReconsent: true },
        { doc: 'privacy', version: 'v0.3', effectiveDate: new Date('2026-01-01'), contentHtml: privacyInner, sha256: createHash('sha256').update(privacyInner).digest('hex'), requireReconsent: true },
      ];
      for (const t of targets) {
        const exists = await this.termsDocModel.findOne({ doc: t.doc, version: t.version });
        if (!exists) {
          await this.termsDocModel.create(t);
          this.logger.log(`Seeded snapshot ${t.doc} ${t.version}`);
        } else {
          this.logger.log(`Exists ${t.doc} ${t.version}, skip`);
        }
      }
    } catch (e) {
      this.logger.error(`Legal snapshot seed failed: ${String(e)}`);
    }
  }
}
