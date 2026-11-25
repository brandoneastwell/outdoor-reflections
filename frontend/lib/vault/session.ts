import {useSyncExternalStore} from "react";
import {type VaultDescriptor, vaultDescriptorSchema} from "./crypto";

const descriptorKey = "outdoor-reflections.vault.v1";
let journalKey: CryptoKey | null = null;
let sessionGeneration = 0;
const subscribers = new Set<() => void>();

export function readVaultDescriptor(): VaultDescriptor | null {
    const stored = localStorage.getItem(descriptorKey);
    return stored === null ? null : vaultDescriptorSchema.parse(JSON.parse(stored));
}

export function getVaultGeneration() {
    return sessionGeneration;
}

export function unlockJournal(key: CryptoKey, generation: number) {
    if (generation !== sessionGeneration) throw new Error("The journal was locked. Try again.");
    journalKey = key;
    subscribers.forEach((notify) => notify());
}

export async function installVault(descriptor: VaultDescriptor, key: CryptoKey, generation: number) {
    await navigator.locks.request(descriptorKey, () => {
        if (generation !== sessionGeneration) throw new Error("The journal was locked. Try again.");
        if (readVaultDescriptor()) throw new Error("A journal already exists on this device. Reload to unlock it.");
        localStorage.setItem(descriptorKey, JSON.stringify(descriptor));
        unlockJournal(key, generation);
    });
}

export function lockJournal() {
    sessionGeneration++;
    journalKey = null;
    subscribers.forEach((notify) => notify());
}

export function requireJournalKey() {
    if (!journalKey) throw new Error("Unlock your journal first.");
    return journalKey;
}

function subscribe(notify: () => void) {
    subscribers.add(notify);
    return () => { subscribers.delete(notify); };
}

const getUnlocked = () => journalKey !== null;
const getServerUnlocked = () => false;

export function useJournalUnlocked() {
    return useSyncExternalStore(subscribe, getUnlocked, getServerUnlocked);
}
