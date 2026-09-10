import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const password = z.string().trim().min(7).max(32);
const email = z.email().trim();

export const EmailSchema = z.object({ email })
export const PasswordSchema = z.object({ password })

export const CredentialsSchema = z
  .object(
    {
      email,
      password,
    },
    { error: 'Invalid credentials' },
  )
  .required();

export class PasswordDto extends createZodDto(PasswordSchema) {}
export class EmailDto extends createZodDto(EmailSchema) {}
export class CredentialsDto extends createZodDto(CredentialsSchema) {}
