import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MAIL_TRANSPORTER } from './mail.constants';
import { MailService } from './mail.service';

describe('MailService', () => {
  let service: MailService;
  const sendMail = jest.fn();

  beforeEach(async () => {
    sendMail.mockReset();
    sendMail.mockResolvedValue(undefined);

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

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'person@example.com',
        from: 'Outdoor Reflections <no-reply@example.com>',
        subject: 'Reset your Outdoor Reflections password',
        text: expect.stringContaining(
          'http://localhost:3000/reset-password?token=token%2Fvalue',
        ),
        html: expect.stringContaining(
          'http://localhost:3000/reset-password?token=token%2Fvalue',
        ),
      }),
    );
    expect(sendMail.mock.calls[0][0].html).toContain('Outdoor Reflections');
    expect(sendMail.mock.calls[0][0].html).toContain('#ce796b');
    expect(sendMail.mock.calls[0][0].html).toContain('expires in 15 minutes');
  });
});
