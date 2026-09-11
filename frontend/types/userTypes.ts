import * as z from "zod";

export const EmailSchema = z.string().email({ error: "Email is not valid" }).trim();
export const PasswordSchema = z.string().min(7, { error: "Password must be over 6 characters long" });
export const UserSchema = z.object({
    email: EmailSchema,
    password: PasswordSchema,
});

export type User = z.infer<typeof UserSchema>;

export type AuthUser = {
    id: number;
    email: string;
    createdAt: string;
    updatedAt: string;
}