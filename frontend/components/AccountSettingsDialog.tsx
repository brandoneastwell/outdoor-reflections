"use client";

import {Dialog} from "radix-ui";
import {useEffect, useState} from "react";
import {useAuth} from "@/lib/context/auth";
import {lockJournalEverywhere} from "@/lib/vault/session";

export default function AccountSettingsDialog({open, onOpenChange, onRestoreFocus}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRestoreFocus: () => void;
}) {
    const {accountSettings, reloadAccountSettings, updateCloudAi} = useAuth();
    const [section, setSection] = useState<"Privacy" | "Recovery">("Privacy");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [locking, setLocking] = useState(false);
    const [lockError, setLockError] = useState("");

    useEffect(() => {
        if (!open) return;
        const refresh = new AbortController();
        reloadAccountSettings(refresh.signal);
        return () => refresh.abort();
    }, [open, reloadAccountSettings]);

    async function toggleCloudAi(enabled: boolean) {
        setSaving(true);
        setError("");
        try {
            await updateCloudAi(enabled);
        } catch {
            setError("The account setting was not saved. Reconnect and try again.");
        } finally {
            setSaving(false);
        }
    }

    async function lockJournal() {
        setLocking(true);
        setLockError("");
        try {
            await lockJournalEverywhere();
            onOpenChange(false);
        } catch {
            setLockError("Could not clear remembered browser access. Try again.");
        } finally {
            setLocking(false);
        }
    }

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[60] bg-[#362528]/20" />
                <Dialog.Content className="fixed top-1/2 left-1/2 z-[61] max-h-[85vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border border-rose/15 bg-[#fffaf2] text-[#362528] shadow-xl"
                    onCloseAutoFocus={(event) => { event.preventDefault(); onRestoreFocus(); }}>
                    <header className="flex items-center justify-between gap-3 border-b border-rose/15 px-4 py-3">
                        <Dialog.Title className="font-flower text-3xl font-semibold">Account settings</Dialog.Title>
                        <Dialog.Close className="cursor-pointer rounded-lg px-2 py-1 text-sm text-[#9b3c48] hover:bg-rose/10">Close</Dialog.Close>
                    </header>
                    <Dialog.Description className="sr-only">Manage privacy preferences and journal recovery.</Dialog.Description>
                    <div className="grid min-h-48 grid-cols-[6rem_minmax(0,1fr)] sm:grid-cols-[8rem_minmax(0,1fr)]">
                        <nav aria-label="Settings sections" className="space-y-1 border-r border-rose/15 bg-rose/5 p-2">
                            {(["Privacy", "Recovery"] as const).map((item) => (
                                <button type="button" key={item} aria-pressed={section === item} onClick={() => setSection(item)}
                                    className="block w-full cursor-pointer rounded-lg px-2 py-2 text-left text-sm hover:bg-rose/10 aria-pressed:bg-rose/15 aria-pressed:font-semibold">
                                    {item}
                                </button>
                            ))}
                        </nav>
                        <section className="space-y-3 p-4 text-sm">
                            {section === "Privacy" ? <>
                                <h2 className="font-semibold">Cloud AI</h2>
                                <p id="cloud-ai-disclosure">Turning this on sends readable text from your current draft and up to ten recent reflections to our AI service and its provider, Groq, for writing suggestions.</p>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" className="accent-[#a23743]" checked={accountSettings?.cloudAiEnabled ?? false}
                                        disabled={saving || !accountSettings} aria-describedby="cloud-ai-disclosure"
                                        onChange={(event) => void toggleCloudAi(event.target.checked)} />
                                    Enable cloud AI suggestions
                                </label>
                                {!accountSettings && <p className="text-[#654d50]">Connect to the account service to change this setting.</p>}
                                {error && <p role="alert" className="text-[#9b3c48]">{error}</p>}
                            </> : <>
                                <h2 className="font-semibold">Journal recovery</h2>
                                <p>Use the recovery key you saved when setting up the vault to unlock this journal if you forget its passphrase.</p>
                                <p>The encrypted vault must still be on this device. Restoring to a new device is not available yet.</p>
                            </>}
                        </section>
                    </div>
                    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-rose/15 px-4 py-3 text-sm">
                        <button type="button" onClick={() => void lockJournal()} disabled={locking}
                            className="cursor-pointer rounded-lg border border-rose/30 px-3 py-2 text-[#9b3c48] hover:bg-rose/10 disabled:opacity-60">
                            Lock journal
                        </button>
                        <p className="text-xs text-[#654d50]">Locks all tabs and clears remembered access on this browser.</p>
                        {lockError && <p role="alert" className="text-[#9b3c48]">{lockError}</p>}
                    </footer>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
