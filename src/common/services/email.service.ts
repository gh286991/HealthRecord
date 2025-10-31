import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly mailer?: MailerService) {
    const host = process.env.SMTP_HOST || '';
    const port = Number(process.env.SMTP_PORT || 0) || 587;
    const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
    } else {
      this.logger.warn('SMTP not fully configured; EmailService will be in noop mode');
    }
  }

  async sendTemplate(params: { to: string; subject: string; template: string; context?: Record<string, any> }) {
    const smtpUser = process.env.SMTP_USER || '';
    const fromEmailWanted = process.env.SMTP_FROM || smtpUser;
    const fromName = process.env.SMTP_FROM_NAME || 'HealthJ';
    const allowDifferentFrom = String(process.env.SMTP_ALLOW_FROM_DIFFERENT || 'false') === 'true';
    let headerFromEmail = fromEmailWanted;
    let replyTo: string | undefined = process.env.SMTP_REPLY_TO || undefined;
    let envelopeFrom = smtpUser;
    if (!allowDifferentFrom && fromEmailWanted && smtpUser && fromEmailWanted.toLowerCase() !== smtpUser.toLowerCase()) {
      this.logger.warn(`Different FROM (${fromEmailWanted}) vs SMTP_USER (${smtpUser}) not allowed; using SMTP_USER and Reply-To.`);
      headerFromEmail = smtpUser;
      replyTo = fromEmailWanted;
    }
    if (allowDifferentFrom && fromEmailWanted) envelopeFrom = fromEmailWanted;
    const fromHeader = `${fromName} <${headerFromEmail}>`;
    if (this.mailer) {
      await this.mailer.sendMail({
        to: params.to,
        subject: params.subject,
        template: params.template,
        context: params.context || {},
        from: fromHeader,
        replyTo,
      });
      return { ok: true } as const;
    }
    // fallback
    this.logger.warn('MailerService not available, fallback to raw transport');
    return this.sendMail({ to: params.to, subject: params.subject, html: '', text: '' });
  }

  async sendMail(params: { to: string; subject: string; html?: string; text?: string; fromEmail?: string; fromName?: string }) {
    if (!this.transporter) {
      this.logger.warn(`sendMail noop to=${params.to} subject=${params.subject}`);
      return { ok: false, noop: true } as const;
    }
    const wantedFromEmail = params.fromEmail || process.env.SMTP_FROM || process.env.SMTP_USER || '';
    const wantedFromName = params.fromName || process.env.SMTP_FROM_NAME || 'HealthJ';
    const smtpUser = process.env.SMTP_USER || '';
    const allowDifferentFrom = String(process.env.SMTP_ALLOW_FROM_DIFFERENT || 'false') === 'true';

    // Zoho 等服務：From 必須等於登入帳號或其已授權別名
    // 若未允許不同 From，則強制使用 SMTP_USER 作為 From，並把希望的 From 放到 replyTo
    let headerFromEmail = wantedFromEmail;
    let replyTo: string | undefined = undefined;
    // 預設以登入帳號當 envelope sender
    let envelopeFrom = smtpUser;
    if (!allowDifferentFrom && wantedFromEmail && smtpUser && wantedFromEmail.toLowerCase() !== smtpUser.toLowerCase()) {
      this.logger.warn(`Different FROM (${wantedFromEmail}) vs SMTP_USER (${smtpUser}) not allowed; falling back to SMTP_USER and setting Reply-To.`);
      headerFromEmail = smtpUser;
      replyTo = wantedFromEmail;
    }
    // 若允許不同 From（且你已在 SMTP 供應商授權該別名），則讓 envelope 也使用該信箱
    if (allowDifferentFrom && wantedFromEmail) {
      envelopeFrom = wantedFromEmail;
    }

    const from = wantedFromName ? `${wantedFromName} <${headerFromEmail}>` : headerFromEmail;

    await this.transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
      replyTo: replyTo || process.env.SMTP_REPLY_TO || undefined,
      envelope: { from: envelopeFrom, to: params.to },
    });
    return { ok: true } as const;
  }
}
