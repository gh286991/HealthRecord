/*
  Quick seeding script for legal documents.
  Usage: ts-node src/scripts/seed-legal.ts
*/
import mongoose from 'mongoose';
import { createHash } from 'crypto';
import { TermsDoc, TermsDocSchema, LegalDocType } from '../legal/schemas/terms-doc.schema';

async function main() {
  const uri = process.env.MONGO_URI as string;
  const dbName = process.env.MONGO_DB_NAME as string;
  if (!uri) throw new Error('MONGO_URI is not set');
  await mongoose.connect(uri, { dbName });

  const TermsDocModel = mongoose.model(TermsDoc.name, TermsDocSchema, 'terms_docs');

  const FE = process.env.FRONTEND_URL;
  if (!FE) throw new Error('FRONTEND_URL is required to snapshot pages');
  // 抓取前端頁面 HTML 作為凍結全文
  const [termsHtml, privacyHtml] = await Promise.all([
    fetch(`${FE}/terms`, { cache: 'no-store' }).then(r => r.text()),
    fetch(`${FE}/privacy`, { cache: 'no-store' }).then(r => r.text()),
  ]);
  const baseDocs = [
    { doc: 'terms' as LegalDocType, version: 'v0.3', effectiveDate: new Date('2026-01-01'), contentHtml: termsHtml, sha256: createHash('sha256').update(termsHtml).digest('hex'), requireReconsent: true },
    { doc: 'privacy' as LegalDocType, version: 'v0.3', effectiveDate: new Date('2026-01-01'), contentHtml: privacyHtml, sha256: createHash('sha256').update(privacyHtml).digest('hex'), requireReconsent: true },
  ];
  for (const d of baseDocs) {
    const exists = await TermsDocModel.findOne({ doc: d.doc, version: d.version });
    if (!exists) {
      await TermsDocModel.create(d as Partial<TermsDoc>);
      // eslint-disable-next-line no-console
      console.log('Inserted', d.doc, d.version);
    } else {
      // eslint-disable-next-line no-console
      console.log('Exists', d.doc, d.version);
    }
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
