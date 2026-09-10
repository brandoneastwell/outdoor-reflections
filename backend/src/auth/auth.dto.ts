import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CredentialsSchema = z
  .object(
    {
      email: z.email().trim(),
      password: z.string().trim().min(7).max(32),
    },
    { error: 'Invalid credentials' },
  )
  .required();

export const EmailSchema = z.object({
    email: z.string().trim(),
})

export class EmailDto extends createZodDto(EmailSchema) {}
export class CredentialsDto extends createZodDto(CredentialsSchema) {}
