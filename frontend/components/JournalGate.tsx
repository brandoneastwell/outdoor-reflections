"use client";

import {useEffect, useState, type FormEvent, type ReactNode} from "react";
import {usePathname} from "next/navigation";
import {useAuth} from "@/lib/context/auth";
import {prepareVault, unlockVault, type VaultDescriptor} from "@/lib/vault/crypto";
import {getVaultGeneration, installVault, readVaultDescriptor, unlockJournal, useJournalUnlocked} from "@/lib/vault/session";

export default function JournalGate({children}: {children: ReactNode}) {
    const pathname = usePathname();
    const unlocked = useJournalUnlocked();
    const {accountReady} = useAuth();
    if (pathname !== "/entries" && !pathname?.startsWith("/entry/")) return children;
    if (!unlocked) return <JournalUnlock />;
    return accountReady ? children : <p className="mx-auto p-6 text-sm">Opening journal…</p>;
}

function JournalUnlock() {
    const [descriptor, setDescriptor] = useState<VaultDescriptor | null>();
    const [method, setMethod] = useState<"passphrase" | "recovery">("passphrase");
    const [secret, setSecret] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [prepared, setPrepared] = useState<Awaited<ReturnType<typeof prepareVault>>>();
    const [generation, setGeneration] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        try {
            if (!globalThis.crypto?.subtle || !navigator.locks) {
                setError("Open the journal in a supported browser over HTTPS.");
                return;
            }
            setDescriptor(readVaultDescriptor());
        } catch {
            setError("Could not read the journal vault on this device.");
        }
    }, []);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setBusy(true);
        const session = getVaultGeneration();
        try {
            if (descriptor) {
                unlockJournal(await unlockVault(descriptor, method, secret), session);
            } else {
                if (secret !== confirmation) throw new Error("The passphrases do not match.");
                setPrepared(await prepareVault(secret));
                setGeneration(session);
            }
            setSecret("");
            setConfirmation("");
        } catch (err) {
            setError(descriptor ? "Could not unlock the journal. Check your passphrase or recovery key."
                : err instanceof Error ? err.message : "Could not create your journal.");
        } finally {
            setBusy(false);
        }
    }

    async function saveRecoveryKey() {
        if (!prepared) return;
        setBusy(true);
        setError("");
        try {
            await installVault(prepared.descriptor, prepared.key, generation);
        } catch {
            setError("Could not save the vault. Reload and try again.");
        } finally {
            setBusy(false);
        }
    }

    const button = "rounded-full bg-[#a23743] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60";
    const field = "mt-1 w-full rounded-lg border border-rose/30 bg-white px-3 py-2";

    return (
        <section className="mx-auto mt-10 w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-[#fffaf2] p-6 text-[#362528] shadow-sm">
            <h1 className="font-flower text-4xl font-semibold">{descriptor ? "Unlock your journal" : "Protect your journal"}</h1>
            {error && <p role="alert" className="mt-3 text-sm text-[#9b3c48]">{error}</p>}
            {prepared ? (
                <div className="mt-4 space-y-3 text-sm">
                    <p>Save this recovery key somewhere safe. It unlocks your journal if you forget your passphrase, while the encrypted vault is still on this device.</p>
                    <output aria-label="Recovery key" className="block select-all break-all rounded-lg bg-rose/10 p-3 font-mono">{prepared.recoveryKey}</output>
                    <button type="button" className={button} disabled={busy} onClick={() => void saveRecoveryKey()}>I saved my recovery key</button>
                </div>
            ) : descriptor !== undefined && (
                <form className="mt-4 space-y-4 text-sm" onSubmit={submit}>
                    {!descriptor && <p>Choose a passphrase of at least 12 characters. You can use it offline on this device.</p>}
                    <label className="block">
                        {method === "recovery" ? "Recovery key" : "Journal passphrase"}
                        <input className={field} value={secret} onChange={(event) => setSecret(event.target.value)}
                            type="password" autoComplete={descriptor ? "off" : "new-password"} required
                            minLength={descriptor ? undefined : 12} />
                    </label>
                    {!descriptor && (
                        <label className="block">
                            Confirm passphrase
                            <input className={field} type="password" autoComplete="new-password" minLength={12} required
                                value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
                        </label>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                        <button className={button} disabled={busy}>{descriptor ? "Unlock journal" : "Create encrypted journal"}</button>
                        {descriptor && <button type="button" className="text-[#9b3c48] underline" disabled={busy} onClick={() => {
                            setMethod(method === "passphrase" ? "recovery" : "passphrase");
                            setSecret("");
                            setError("");
                        }}>{method === "passphrase" ? "Use recovery key" : "Use passphrase"}</button>}
                    </div>
                </form>
            )}
        </section>
    );
}
