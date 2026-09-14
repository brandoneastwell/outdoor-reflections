import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MAIL_TRANSPORTER } from './mail.constants';
import { MailService } from './mail.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MAIL_TRANSPORTER,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const user = configService.get<string>('SMTP_USER');
        const pass = configService.get<string>('SMTP_PASS');

        return nodemailer.createTransport({
          host: configService.getOrThrow<string>('SMTP_HOST'),
          port: Number(configService.get<string>('SMTP_PORT') ?? 587),
          auth: { user, pass },
        });
      },
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
