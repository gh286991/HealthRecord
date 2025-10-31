import { Module, Global } from '@nestjs/common';
import { MinioService } from './services/minio.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './services/email.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    MailerModule.forRootAsync({
      useFactory: () => ({
        transport: {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: String(process.env.SMTP_SECURE || 'false') === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          // Silence Nodemailer internal logs
          logger: false as any,
          debug: false as any,
        },
        defaults: {
          from: `${process.env.SMTP_FROM_NAME || 'YoungFit'} <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        },
        template: {
          dir: join(__dirname, 'mail', 'templates'),
          adapter: new HandlebarsAdapter(),
          options: { strict: false },
        },
      }),
    }),
  ],
  providers: [MinioService, EmailService],
  exports: [MinioService, EmailService],
})
export class CommonModule {}
