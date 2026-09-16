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
        const token = configService.getOrThrow<string>('SMTP_TOKEN');

        return nodemailer.createTransport({
          host: 'live.smtp.mailtrap.io',
          port: 587,
          secure: false,
          auth: {
            user: 'api',
            pass: token,
          },
        });
      },
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
