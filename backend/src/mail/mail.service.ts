import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';
import { MAIL_TRANSPORTER } from './mail.constants';
import { renderPasswordResetEmail } from './templates/password-reset.template';

@Injectable()
export class MailService {
  constructor(
    @Inject(MAIL_TRANSPORTER)
    private readonly transporter: Transporter,
    private readonly configService: ConfigService,
  ) {}

  async sendPasswordResetEmail(
    recipient: string,
    resetToken: string,
  ): Promise<void> {
    const frontendUrl = this.configService
      .getOrThrow<string>('FRONTEND_URL')
      .replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    await this.transporter.sendMail({
      from: this.configService.getOrThrow<string>('MAIL_FROM'),
      to: recipient,
      subject: 'Reset your Outdoor Reflections password',
      text: [
        'We received a request to reset your Outdoor Reflections password.',
        '',
        `Reset your password: ${resetUrl}`,
        '',
        'If you did not request this, you can ignore this email.',
      ].join('\n'),
      html: renderPasswordResetEmail({ resetUrl }),
    });
  }
}
