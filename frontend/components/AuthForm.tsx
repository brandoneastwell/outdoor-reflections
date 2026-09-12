"use client"
import {Button} from "@/components/ui/button";
import DrawIcon from "@/components/DrawIcon";
import {SVG_PATHS} from "@/constants/svgPaths";
import {useState} from "react";
import {User, UserSchema} from "@/types/userTypes";
import {createAccount} from "@/lib/api/auth";
import {Providers} from "@/types/authTypes";
import {useRouter} from "next/navigation";
import {syncPendingEntries} from "@/lib/api/reflections";
import Link from "next/link";
import {useAuth} from "@/lib/context/auth";


type AuthFormProps = {
    isSigningIn?: boolean;
    setIsSigningIn?: (nextValue: boolean) => void;
}

export default function AuthForm({ isSigningIn = true, setIsSigningIn = () => {} }: AuthFormProps) {
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const router = useRouter();
    const user = useAuth()


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const result = UserSchema.safeParse({email, password});
        if (!result.success) {
            setIsSubmitting(false);
            console.error(result.error);
            return setError(result.error.issues[0].message);
        }

        const credentials: User = result.data;

        try {
            let res;
            if (isSigningIn) res = await user.login(credentials);
            else res = await createAccount(credentials);
            if (res.message) setMessage(res.message)
            await syncPendingEntries();
        } catch (error) {
            if (error instanceof Error && error.message === "Failed to sync entries")
                console.error(error);
            else setError(error instanceof Error ? error.message : "Unable to sign in");
        } finally {
            router.push("/entries");
            setIsSubmitting(false);
        }
    }

    const handleContinueWithProvider = (provider: Providers) => {
        user.loginWithProvider(provider);
    }

    return (
        <form onSubmit={handleSubmit} className="mt-8 grid gap-4 font-mono">
            <label className="grid gap-2">
                <span className="text-sm font-medium text-blue-slate">Email</span>
                <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    className="h-12 rounded-2xl border border-border bg-white/90 px-4 text-sm text-blue-slate outline-none transition-shadow placeholder:text-blue-slate/35 focus:border-rose/40 focus:shadow-[0_0_0_3px_rgba(206,121,107,0.12)]"
                />
            </label>

            <label className="grid gap-2">
                <span className="text-sm font-medium text-blue-slate">Password</span>
                <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-12 rounded-2xl border border-border bg-white/90 px-4 text-sm text-blue-slate outline-none transition-shadow placeholder:text-blue-slate/35 focus:border-rose/40 focus:shadow-[0_0_0_3px_rgba(206,121,107,0.12)]"
                />
            </label>

            {error && !message && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}

            <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 text-sm text-blue-slate/80">
                    <input
                        type="checkbox"
                        name="remember"
                        className="h-4 w-4 rounded border-border text-rose focus:ring-rose/30"
                    />
                    remember me
                </label>
                <Link href={'/auth/forgot-password'} type="button" className="text-sm text-rose transition-colors hover:text-camel">
                    forgot password
                </Link>
            </div>

            <Button type="submit" disabled={isSubmitting} className="h-12 rounded-2xl bg-rose text-background hover:bg-rose/90">
                { isSigningIn ? 'sign in' : 'create account' }
                <DrawIcon fill={"white"} svgPaths={SVG_PATHS.signInIcon} />
            </Button>

            <Button onClick={() => handleContinueWithProvider("google")} type="button" variant="outline" className="h-12 rounded-2xl border-white/70 bg-white/70 cursor-pointer">
                continue with google
            </Button>

            <p className="pt-2 text-sm text-blue-slate/70">
                { isSigningIn ? 'New here? ' : 'Have an account? ' }
                <button onClick={() => setIsSigningIn(!isSigningIn)} type="button" className="cursor-pointer font-medium text-rose transition-colors hover:text-camel">
                    { isSigningIn ? 'create account' : 'sign in' }
                </button>
            </p>
        </form>
    )
}
