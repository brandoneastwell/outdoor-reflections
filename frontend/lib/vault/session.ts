import {useSyncExternalStore} from "react";
import {type VaultDescriptor, vaultDescriptorSchema} from "./crypto";
import {deleteRememberedKey, readRememberedKey, writeRememberedKey} from "./rememberedKey";

const descriptorKey = "outdoor-reflections.vault.v1";
export const journalLockSignal = "outdoor-reflections.vault.lock";
const rememberFor = 7 * 24 * 60 * 60 * 1000;
let journalKey: CryptoKey | null = null;
let sessionGeneration = 0;
let observedLockToken: string | null | undefined;
const subscribers = new Set<() => void>();
const beforeLock = new Set<() => void>();

export function readVaultDescriptor(): VaultDescriptor | null {
    const stored = localStorage.getItem(descriptorKey);
    return stored === null ? null : vaultDescriptorSchema.parse(JSON.parse(stored));
}

function checkBrowserLock() {
    const token = localStorage.getItem(journalLockSignal);
    const changed = observedLockToken !== undefined && observedLockToken !== token;
    observedLockToken = token;
    if (changed) lockJournal();
    return token;
}

export function getVaultGeneration() {
    checkBrowserLock();
    return sessionGeneration;
}

function assertCurrentGeneration(generation: number) {
    const lockToken = checkBrowserLock();
    if (generation !== sessionGeneration) throw new Error("The journal was locked. Try again.");
    return lockToken;
}

export function unlockJournal(key: CryptoKey, generation: number) {
    assertCurrentGeneration(generation);
    journalKey = key;
    subscribers.forEach((notify) => notify());
}

function rememberKey(descriptor: VaultDescriptor, key: CryptoKey, generation: number) {
    const lockToken = assertCurrentGeneration(generation);
    if (!isJournalKey(key)) throw new Error("Invalid journal key.");
    return writeRememberedKey({key, vaultSalt: descriptor.salt, lockToken, expiresAt: Date.now() + rememberFor});
}

function isJournalKey(key: CryptoKey | undefined): key is CryptoKey {
    return Boolean(key && key.type === "secret" && !key.extractable && key.algorithm.name === "AES-GCM");
}

export async function rememberJournal(descriptor: VaultDescriptor, key: CryptoKey, generation: number) {
    await navigator.locks.request(descriptorKey, () => {
        if (readVaultDescriptor()?.salt !== descriptor.salt) throw new Error("The journal vault changed.");
        return rememberKey(descriptor, key, generation);
    });
}

export async function restoreRememberedJournal(descriptor: VaultDescriptor) {
    const generation = getVaultGeneration();

    return navigator.locks.request(descriptorKey, async () => {
        const record = await readRememberedKey();
        const token = assertCurrentGeneration(generation);
        if (!record) return false;
        if (!isJournalKey(record.key) || record.vaultSalt !== descriptor.salt ||
            readVaultDescriptor()?.salt !== descriptor.salt || record.lockToken !== token ||
            !Number.isFinite(record.expiresAt) || record.expiresAt <= Date.now()) {
            await deleteRememberedKey();
            return false;
        }

        unlockJournal(record.key, generation);
        return true;
    });
}

export async function installVault(descriptor: VaultDescriptor, key: CryptoKey, generation: number, remember = false) {
    await navigator.locks.request(descriptorKey, async () => {
        assertCurrentGeneration(generation);
        if (readVaultDescriptor()) throw new Error("A journal already exists on this device. Reload to unlock it.");
        if (remember) await rememberKey(descriptor, key, generation);
        assertCurrentGeneration(generation);
        localStorage.setItem(descriptorKey, JSON.stringify(descriptor));
        unlockJournal(key, generation);
    });
}

export function lockJournal() {
    sessionGeneration++;
    if (journalKey) beforeLock.forEach((flush) => flush());
    journalKey = null;
    subscribers.forEach((notify) => notify());
}

export function onBeforeJournalLock(flush: () => void) {
    beforeLock.add(flush);
    return () => { beforeLock.delete(flush); };
}

export async function lockJournalEverywhere() {
    let published = false;
    try {
        const token = crypto.randomUUID();
        localStorage.setItem(journalLockSignal, token);
        observedLockToken = token;
        published = true;
    } finally {
        lockJournal();
        const clearRevokedKey = async () => {
            const remembered = await readRememberedKey();
            if (remembered && (!published || remembered.lockToken !== localStorage.getItem(journalLockSignal))) {
                await deleteRememberedKey();
            }
        };
        if (navigator.locks) await navigator.locks.request(descriptorKey, clearRevokedKey);
        else await clearRevokedKey();
    }
}

export function listenForJournalLocks() {
    const check = () => {
        try {
            checkBrowserLock();
        } catch {
            lockJournal();
        }
    };
    const onStorage = (event: StorageEvent) => {
        if (event.key === journalLockSignal) check();
        if (event.key === null || (event.key === descriptorKey && event.oldValue !== null)) lockJournal();
    };

    check();
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", check);
    return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("pageshow", check);
        document.removeEventListener("visibilitychange", check);
    };
}

export function requireJournalKey() {
    checkBrowserLock();
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
