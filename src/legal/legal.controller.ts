import { Controller, Get, Param, Res, Header, HttpStatus, Post, Body, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { LegalService } from './legal.service';

function htmlWrapper(params: {
  title: string;
  bodyHtml?: string;
  noindex?: boolean;
  docPath: string; // e.g., '/terms/v1.2'
}) {
  const robots = params.noindex ? '<meta name="robots" content="noindex, nofollow" />' : '';
  const body = params.bodyHtml || '<p>Document not available.</p>';
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${robots}
  <title>${params.title}</title>
  <link rel="canonical" href="${params.docPath}" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji';
           color: #111827; margin: 0; padding: 2rem; background: #fafafa; }
    .container { max-width: 860px; margin: 0 auto; background: #fff; padding: 2rem; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .meta { color: #6b7280; font-size: 0.875rem; margin-top: .25rem; }
  </style>
  </head>
  <body>
    <div class="container">
      ${body}
      <div class="meta">若需最新版，請前往 <a href="/terms/latest">/terms/latest</a> 或 <a href="/privacy/latest">/privacy/latest</a></div>
    </div>
  </body>
  </html>`;
}

@Controller()
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  // 302: /terms/latest → /terms/vX.Y
  @Get('terms/latest')
  async termsLatest(@Res() res: Response) {
    const latest = await this.legalService.getLatest('terms');
    return res.redirect(HttpStatus.FOUND, `/terms/${latest.version}`);
  }

  // 302: /privacy/latest → /privacy/vX.Y
  @Get('privacy/latest')
  async privacyLatest(@Res() res: Response) {
    const latest = await this.legalService.getLatest('privacy');
    return res.redirect(HttpStatus.FOUND, `/privacy/${latest.version}`);
  }

  // 顯示指定版本的條款（支援舊版 noindex）
  @Get('terms/:version')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async termsVersion(@Param('version') version: string, @Res() res: Response) {
    const latest = await this.legalService.getLatest('terms');
    const doc = await this.legalService.getByVersion('terms', version);
    if (doc.contentHtml) {
      const isFullDoc = /<\s*html[\s>]/i.test(doc.contentHtml);
      if (isFullDoc) return res.status(HttpStatus.OK).type('html').send(doc.contentHtml);
      const noindex = doc.version !== latest.version;
      const html = htmlWrapper({ title: `服務條款 ${doc.version}`, bodyHtml: doc.contentHtml, noindex, docPath: `/terms/${doc.version}` });
      return res.status(HttpStatus.OK).send(html);
    }
    if (doc.fileUrl) {
      return res.redirect(HttpStatus.FOUND, doc.fileUrl);
    }
    const noindex = doc.version !== latest.version;
    const html = htmlWrapper({ title: `服務條款 ${doc.version}`, bodyHtml: `<h1>服務條款 ${doc.version}</h1>`, noindex, docPath: `/terms/${doc.version}` });
    return res.status(HttpStatus.OK).send(html);
  }

  // 顯示指定版本的隱私權政策（支援舊版 noindex）
  @Get('privacy/:version')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async privacyVersion(@Param('version') version: string, @Res() res: Response) {
    const latest = await this.legalService.getLatest('privacy');
    const doc = await this.legalService.getByVersion('privacy', version);
    if (doc.contentHtml) {
      const isFullDoc = /<\s*html[\s>]/i.test(doc.contentHtml);
      if (isFullDoc) return res.status(HttpStatus.OK).type('html').send(doc.contentHtml);
      const noindex = doc.version !== latest.version;
      const html = htmlWrapper({ title: `隱私權政策 ${doc.version}`, bodyHtml: doc.contentHtml, noindex, docPath: `/privacy/${doc.version}` });
      return res.status(HttpStatus.OK).send(html);
    }
    if (doc.fileUrl) {
      return res.redirect(HttpStatus.FOUND, doc.fileUrl);
    }
    const noindex = doc.version !== latest.version;
    const html = htmlWrapper({ title: `隱私權政策 ${doc.version}`, bodyHtml: `<h1>隱私權政策 ${doc.version}</h1>`, noindex, docPath: `/privacy/${doc.version}` });
    return res.status(HttpStatus.OK).send(html);
  }

  // /terms/changelog：列出所有版本
  @Get('terms/changelog')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async termsChangelog(@Res() res: Response) {
    const list = await this.legalService.listAll('terms');
    const latest = await this.legalService.getLatest('terms');
    const items = list
      .map((d) => {
        const mark = d.version === latest.version ? '（最新版）' : '';
        const eff = new Date(d.effectiveDate).toISOString().slice(0, 10);
        const recon = d.requireReconsent ? '需重新同意' : '修文';
        return `<li><a href="/terms/${d.version}">v${d.version.replace(/^v/, '')}</a> - ${eff} - ${recon} ${mark}</li>`;
      })
      .join('');
    const body = `<h1>服務條款變更紀錄</h1><ul>${items}</ul>`;
    const html = htmlWrapper({ title: '服務條款變更紀錄', bodyHtml: body, docPath: '/terms/changelog' });
    return res.status(HttpStatus.OK).send(html);
  }

  // 供前端記錄使用者同意（以 token 判斷 userId 的情境下可再加上守衛）
  @Post('agreements')
  async createAgreement(@Body() body: { userId: string; doc: 'terms' | 'privacy'; version?: string }, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const userAgent = req.headers['user-agent'] as string;
    // 若未指定版本，使用最新版本
    const version = body.version || (await this.legalService.getLatest(body.doc)).version;
    return this.legalService.recordAgreement({
      userId: body.userId,
      doc: body.doc,
      version,
      ip,
      userAgent,
    });
  }

  // 提供前端查詢目前 latest 版本（避免硬編碼）
  @Get('legal/latest-versions')
  async latestVersions() {
    const [terms, privacy] = await Promise.all([
      this.legalService.getLatest('terms'),
      this.legalService.getLatest('privacy'),
    ]);
    return {
      terms: terms.version,
      privacy: privacy.version,
      termsEffectiveDate: terms.effectiveDate,
      privacyEffectiveDate: privacy.effectiveDate,
    };
  }
}
