import { interpolate, loadTemplateHtml, htmlToText } from './loader';

export async function renderVerifyEmail(params: { link: string; brandName?: string; }) {
  const brand = params.brandName || process.env.BRAND_NAME || 'YoungFit 漾飛特';
  const subject = `${brand}｜請驗證您的 Email`;
  const raw = await loadTemplateHtml('verify-email.html');
  const html = interpolate(raw, { brand, link: params.link });
  const text = htmlToText(html);
  return { subject, html, text };
}
