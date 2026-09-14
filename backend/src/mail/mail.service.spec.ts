import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MAIL_TRANSPORTER } from './mail.constants';
import { MailService } from './mail.service';
import type { SendMailOptions } from 'nodemailer';

describe('MailService', () => {
  let service: MailService;
  const sendMail = jest.fn((options: SendMailOptions): Promise<void> => {
    void options;
    return Promise.resolve();
  });

  beforeEach(async () => {
    sendMail.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: MAIL_TRANSPORTER, useValue: { sendMail } },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) =>
              key === 'MAIL_FROM'
                ? 'Outdoor Reflections <no-reply@example.com>'
                : 'http://localhost:3000/',
            ),
          },
        },
      ],
    }).compile();

    service = module.get(MailService);
  });

  it('sends a password reset link containing the encoded token', async () => {
    await service.sendPasswordResetEmail('person@example.com', 'token/value');

    expect(sendMail).toHaveBeenCalledTimes(1);
    const call = sendMail.mock.calls[0];
    if (!call) throw new Error('Email transport was not called');
    const [options] = call;
    if (typeof options.text !== 'string' || typeof options.html !== 'string')
      throw new Error('Email content was not rendered as text and HTML');

    const resetUrl =
      'http://localhost:3000/auth/reset-password?token=token%2Fvalue';
    expect(options.to).toBe('person@example.com');
    expect(options.from).toBe('Outdoor Reflections <no-reply@example.com>');
    expect(options.subject).toBe('Reset your Outdoor Reflections password');
    expect(options.text).toContain(resetUrl);
    expect(options.html).toContain(resetUrl);
    expect(options.html).toContain('Outdoor Reflections');
    expect(options.html).toContain('#ce796b');
    expect(options.html).toContain('expires in 15 minutes');
  });
});
