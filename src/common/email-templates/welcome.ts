import { interpolate, loadTemplateHtml, htmlToText } from './loader';

export async function renderWelcomeEmail(params: { username?: string; brandName?: string; dashboardUrl?: string; }) {
  const brand = params.brandName || process.env.BRAND_NAME || 'YoungFit 漾飛特';
  const subject = `${brand}｜註冊成功，歡迎加入！`;
  const dash = params.dashboardUrl || (process.env.FRONTEND_URL?.replace(/\/$/, '') || 'http://localhost:3030') + '/dashboard';
  const raw = await loadTemplateHtml('welcome.html');
  const html = interpolate(raw, { brand, username: params.username || '', dashboard: dash });
  const text = htmlToText(html);
  return { subject, html, text };
}
