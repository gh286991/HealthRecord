import { Controller, Get, Param, Res, Header, HttpStatus, Post, Body, Req, UseGuards, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { Response, Request } from 'express';
import { LegalService } from './legal.service';
import { createHash } from 'crypto';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { LegalDocType } from './schemas/terms-doc.schema';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

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

@ApiTags('Legal')
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
  async createAgreement(@Body() body: { userId: string; doc: LegalDocType; version?: string }, @Req() req: Request) {
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

  // 以 API 發佈新版本（上傳 Markdown，後端轉 HTML + sha256）
  // 需 JWT 權限（可依你需求調整守衛）
  @UseGuards(AuthGuard('jwt'))
  @Post('legal/publish')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '發佈法律文件版本（上傳 Markdown）', description: '上傳 Markdown 檔案，後端計算 sha256Md 並以 Markdown 形式保存該版本。若已存在相同版本，需設定 forceUpdate=true 才能覆寫。' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        doc: { type: 'string', enum: ['terms', 'privacy', 'cookies'], description: '文件類型' },
        version: { type: 'string', example: 'v0.6', description: '版本號（vX.Y）' },
        effectiveDate: { type: 'string', format: 'date', example: '2026-06-01', description: '生效日期（ISO 日期字串）' },
        requireReconsent: { type: 'boolean', example: true, default: true, description: '是否需要重新同意' },
        forceUpdate: { type: 'boolean', example: false, default: false, description: '如版本已存在，是否允許覆寫' },
        file: { type: 'string', format: 'binary', description: 'Markdown 檔案（multipart field 名稱為 file）' },
      },
      required: ['doc', 'version', 'file'],
    },
  })
  @ApiOkResponse({ description: '發佈成功（或覆寫成功）', schema: { example: { ok: true, sha256Md: 'abcdef...', overwritten: false } } })
  @ApiBadRequestResponse({ description: '參數錯誤或版本已存在且未允許覆寫' })
  async publish(
    @Body() body: { doc: LegalDocType; version: string; effectiveDate?: string; requireReconsent?: string | boolean; forceUpdate?: string | boolean },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!body?.doc || !['terms','privacy','cookies'].includes(String(body.doc))) throw new BadRequestException('Invalid doc');
    if (!/^v\d+\.\d+$/.test(String(body.version))) throw new BadRequestException('Invalid version');
    if (!file) throw new BadRequestException('file (Markdown) is required');

    const md = file.buffer?.toString('utf8') ?? '';
    if (!md.trim()) throw new BadRequestException('Empty Markdown');

    // 僅保存 Markdown 與其雜湊
    const sha256Md = createHash('sha256').update(md).digest('hex');
    const effectiveDate = body.effectiveDate ? new Date(body.effectiveDate) : new Date();
    const requireReconsent = String(body.requireReconsent ?? 'true') === 'true';
    const forceUpdate = String(body.forceUpdate ?? 'false') === 'true';

    // 判斷是否存在
    try {
      const result = await this.legalService.publishDoc({
        doc: body.doc,
        version: body.version,
        md,
        sha256Md,
        effectiveDate,
        requireReconsent,
        forceUpdate,
      });
      return { ok: true, sha256Md, overwritten: result.overwritten };
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      if (e instanceof Error && e.message.includes('already exists')) {
        throw new BadRequestException('Version already exists. Set forceUpdate=true to overwrite');
      }
      throw e;
    }
  }

  // 提供指定文件與版本的原始內容（JSON）
  @Get('legal/doc/:doc/:version')
  async readDocJson(@Param('doc') doc: 'terms'|'privacy', @Param('version') version: string) {
    if (doc !== 'terms' && doc !== 'privacy') {
      return { error: 'Invalid doc' };
    }
    const d = await this.legalService.getByVersion(doc, version);
    return {
      doc: d.doc,
      version: d.version,
      effectiveDate: d.effectiveDate,
      requireReconsent: d.requireReconsent,
      sha256: d.sha256,
      sha256Md: (d as any).sha256Md || null,
      contentHtml: d.contentHtml || null,
      contentMd: (d as any).contentMd || null,
      fileUrl: d.fileUrl || null,
    };
  }
}
