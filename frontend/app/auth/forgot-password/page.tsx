"use client"

import {useState} from "react";
import {Button} from "@/components/ui/button";
import DrawIcon from "@/components/DrawIcon";
import {SVG_PATHS} from "@/constants/svgPaths";
import {forgotPassword} from "@/lib/api/auth";
import {EmailSchema} from "@/types/userTypes";

export default function Page() {
    const [email, setEmail] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleResetLink = async () => {
        const emailResult = EmailSchema.safeParse(email);
        if (!emailResult.success) {
            setMessage(null)
            setError(emailResult.error.issues[0].message);
            return
        }

        const data = await forgotPassword(emailResult.data);
        data.message && setMessage(data.message)
        setError(null)
    }

    return (
        <div className="w-full flex flex-col items-center justify-center font-mono">
            <div className="flex flex-row place-items-center gap-2 mb-6">
                <DrawIcon svgPaths={SVG_PATHS.flowerIcon} strokeWidth={1.5} iconSize={42} fill={"#ce796b"} />
                <span className="text-3xl font-semibold leading-tight text-rose font-flower">
                    outdoor reflections
                </span>
            </div>
            <div className="w-full max-w-md aspect-square bg-rose/10 rounded-lg p-12 flex flex-col gap-4 items-center justify-center">
                <h1 className="text-3xl font-semibold">Forgot your password</h1>
                <p className="mb-4">Enter your email address and we will send you a link to reset your password.</p>
                <input type="email" placeholder="name@example.com" autoComplete={"email"} value={email} onChange={(e) => setEmail(e.target.value)}
                       className="w-full h-12 rounded-2xl border border-border bg-white/90 px-4 text-sm text-blue-slate outline-none transition-shadow placeholder:text-blue-slate/35 focus:border-rose/40 focus:shadow-[0_0_0_3px_rgba(206,121,107,0.12)]" />
                <Button onClick={handleResetLink} className="w-full h-12 rounded-2xl bg-rose text-background hover:bg-rose/90">Send reset link</Button>
                {error && !message && <p className="text-sm text-destructive place-self-center">{error}</p>}
                {message && <p className="text-sm text-green-600 text-center">{message}</p>}
                <p className="text-sm mt-4">Remember your password? <a href="/auth" className="text-rose underline">Login here</a></p>
            </div>
        </div>
    )
}