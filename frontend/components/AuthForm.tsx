"use client";

import DrawIcon from "@/components/DrawIcon";
import { Button } from "@/components/ui/button";
import { SVG_PATHS } from "@/constants/svgPaths";
import { useAuth } from "@/lib/context/auth";
import { Providers } from "@/types/authTypes";
import { User, UserSchema } from "@/types/userTypes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AuthFormProps = {
  isSigningIn?: boolean;
  setIsSigningIn?: (nextValue: boolean) => void;
};

export default function AuthForm({
  isSigningIn = true,
  setIsSigningIn = () => {},
}: AuthFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const user = useAuth();

  const clearFeedback = () => {
    setError(null);
    setMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    const result = UserSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    const credentials: User = result.data;
    setIsSubmitting(true);

    try {
      if (!isSigningIn) {
        const response = await user.createAccount(credentials);
        setPassword("");
        setIsSigningIn(true);
        setMessage(`${response.message}. You can now sign in.`);
        return;
      }

      const response = await user.login(credentials);

      try {
        await user.syncPendingEntries(response.id);
      } catch (syncError) {
        console.error("Unable to sync pending entries after sign in", syncError);
      }

      router.replace("/entries");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : isSigningIn
            ? "Unable to sign in"
            : "Unable to create account",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueWithProvider = (provider: Providers) => {
    clearFeedback();
    setIsSubmitting(true);

    try {
      user.loginWithProvider(provider);
    } catch (providerError) {
      setIsSubmitting(false);
      setError(
        providerError instanceof Error
          ? providerError.message
          : "Unable to continue with Google",
      );
    }
  };

  const handleModeChange = () => {
    clearFeedback();
    setPassword("");
    setIsSigningIn(!isSigningIn);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={isSubmitting}
      className="mt-8 grid gap-4 font-mono"
    >
      <label className="grid gap-2">
        <span className="text-sm font-medium text-blue-slate">Email</span>
        <input
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            clearFeedback();
          }}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="name@example.com"
          required
          disabled={isSubmitting}
          aria-invalid={Boolean(error)}
          className="h-12 rounded-2xl border border-border bg-white/90 px-4 text-sm text-blue-slate outline-none transition-shadow placeholder:text-blue-slate/35 focus:border-rose/40 focus:shadow-[0_0_0_3px_rgba(206,121,107,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-blue-slate">Password</span>
        <input
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            clearFeedback();
          }}
          type="password"
          name="password"
          autoComplete={isSigningIn ? "current-password" : "new-password"}
          placeholder="••••••••"
          required
          disabled={isSubmitting}
          aria-invalid={Boolean(error)}
          className="h-12 rounded-2xl border border-border bg-white/90 px-4 text-sm text-blue-slate outline-none transition-shadow placeholder:text-blue-slate/35 focus:border-rose/40 focus:shadow-[0_0_0_3px_rgba(206,121,107,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
        />
        {!isSigningIn && (
          <span className="text-xs text-blue-slate/60">
            Use at least 7 characters.
          </span>
        )}
      </label>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-green-700">
          {message}
        </p>
      )}

      {isSigningIn && (
        <div className="flex justify-end">
          <Link
            href="/auth/forgot-password"
            className="text-sm text-rose transition-colors hover:text-camel"
          >
            forgot password?
          </Link>
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-12 rounded-2xl bg-rose text-background hover:bg-rose/90"
      >
        {isSubmitting
          ? isSigningIn
            ? "signing in…"
            : "creating account…"
          : isSigningIn
            ? "sign in"
            : "create account"}
        <DrawIcon fill="white" svgPaths={SVG_PATHS.signInIcon} />
      </Button>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-blue-slate/50">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        onClick={() => handleContinueWithProvider("google")}
        type="button"
        variant="outline"
        disabled={isSubmitting}
        className="h-12 cursor-pointer rounded-2xl border-white/70 bg-white/70"
      >
        continue with google
      </Button>

      <p className="pt-2 text-sm text-blue-slate/70">
        {isSigningIn ? "New here? " : "Have an account? "}
        <button
          onClick={handleModeChange}
          type="button"
          disabled={isSubmitting}
          className="cursor-pointer font-medium text-rose transition-colors hover:text-camel disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSigningIn ? "create account" : "sign in"}
        </button>
      </p>
    </form>
  );
}
