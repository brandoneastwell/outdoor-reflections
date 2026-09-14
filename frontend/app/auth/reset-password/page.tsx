"use client"

import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import DrawIcon from "@/components/DrawIcon";
import {SVG_PATHS} from "@/constants/svgPaths";
import {resetPassword} from "@/lib/api/auth";
import {PasswordSchema} from "@/types/userTypes";
import {useRouter, useSearchParams} from "next/navigation";

export default function Page() {
    const searchParams = useSearchParams();
    const [token] = useState<string | null>(() => searchParams.get("token"));
    const [firstPassword, setFirstPassword] = useState<string>("");
    const [secondPassword, setSecondPassword] = useState<string>("");
    const [error, setError] = useState<string | null>(() => token ? null : "Invalid token");
    const [message, setMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const router = useRouter();

    useEffect(() => {
        if (!token) return;
        window.history.replaceState({}, '', '/auth/reset-password');
    }, [token])

    const handleReset = async () => {
        if (isSubmitting) return;
        if (!token) return setError("Invalid token");

        setIsSubmitting(true);
        const password = PasswordSchema.safeParse(firstPassword);
        if (!password.success) {
            setMessage(null)
            setError(password.error.issues[0].message);
            setIsSubmitting(false);
            return
        }

        if (firstPassword !== secondPassword) {
            setError("Passwords do not match");
            setMessage(null)
            setIsSubmitting(false);
            return
        }

        try {
            await resetPassword(token, password.data);
            setMessage('Password reset successfully. You can now login with your new password.')
            setError(null)

            setTimeout(() => {
                router.push("/auth");
            }, 3000);
        } catch (error) {
            setError(error instanceof Error ? error.message : "Unable to reset password");
            return
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="w-full flex flex-col items-center justify-center font-mono">
            <div className="flex flex-row place-items-center gap-2 mb-6">
                <DrawIcon svgPaths={SVG_PATHS.flowerIcon} strokeWidth={1.5} iconSize={42} fill={"#ce796b"} />
                <span className="text-3xl font-semibold leading-tight text-rose font-flower">
                    outdoor reflections
                </span>
            </div>
            <div className="aspect-square bg-rose/10 rounded-lg p-12 flex flex-col gap-4 items-center justify-center">
                <h1 className="text-3xl font-semibold">Change your password</h1>
                <p className="mb-4">Enter your new password below to change your password.</p>
                <label className="w-full grid gap-2">
                    <span className="text-sm font-medium text-blue-slate">New password</span>
                    <input
                        value={firstPassword}
                        onChange={(e) => setFirstPassword(e.target.value)}
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="h-12 rounded-2xl border border-border bg-white/90 px-4 text-sm text-blue-slate outline-none transition-shadow placeholder:text-blue-slate/35 focus:border-rose/40 focus:shadow-[0_0_0_3px_rgba(206,121,107,0.12)]"
                    />
                </label>
                <label className="w-full grid gap-2">
                    <span className="text-sm font-medium text-blue-slate">Re-enter new password</span>
                    <input
                        value={secondPassword}
                        onChange={(e) => setSecondPassword(e.target.value)}
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="h-12 rounded-2xl border border-border bg-white/90 px-4 text-sm text-blue-slate outline-none transition-shadow placeholder:text-blue-slate/35 focus:border-rose/40 focus:shadow-[0_0_0_3px_rgba(206,121,107,0.12)]"
                    />
                </label>
                <Button disabled={isSubmitting} onClick={handleReset} className="w-full h-12 rounded-2xl bg-rose text-background hover:bg-rose/90">Reset password</Button>
                {error && !message && <p className="text-sm text-destructive place-self-center">{error}</p>}
                {message && <p className="text-sm text-green-600 text-center">{message}</p>}
                <a href="/auth" className="mt-2 text-sm text-rose">Back to Login</a>
            </div>
        </div>
    )
}
