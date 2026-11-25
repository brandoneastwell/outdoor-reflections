import {argon2idAsync} from "@noble/hashes/argon2.js";
import {z} from "zod";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const wrappedKey = z.object({iv: z.string().length(16), ciphertext: z.string().length(64)}).strict();
export const vaultDescriptorSchema = z.object({
    version: z.literal(1),
    salt: z.string().length(24),
    passphrase: wrappedKey,
    recovery: wrappedKey,
}).strict();
export type VaultDescriptor = z.infer<typeof vaultDescriptorSchema>;
export type Ciphertext = {iv: string; ciphertext: string};

export function encodeBytes(bytes: Uint8Array): string {
    const chunks: string[] = [];
    for (let index = 0; index < bytes.length; index += 8192) {
        chunks.push(String.fromCharCode(...bytes.subarray(index, index + 8192)));
    }
    return btoa(chunks.join(""));
}

function decodeBytes(value: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function importKey(bytes: Uint8Array<ArrayBuffer>) {
    return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function passphraseKey(passphrase: string, salt: string) {
    const bytes = new Uint8Array(await argon2idAsync(passphrase, decodeBytes(salt), {
        t: 3, m: 65536, p: 4, dkLen: 32,
    }));
    try {
        return await importKey(bytes);
    } finally {
        bytes.fill(0);
    }
}

async function seal(key: CryptoKey, plaintext: Uint8Array<ArrayBuffer>, context: string): Promise<Ciphertext> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({
        name: "AES-GCM", iv, additionalData: encoder.encode(context),
    }, key, plaintext);
    return {iv: encodeBytes(iv), ciphertext: encodeBytes(new Uint8Array(ciphertext))};
}

async function open(key: CryptoKey, payload: Ciphertext, context: string) {
    const iv = decodeBytes(payload.iv);
    if (iv.byteLength !== 12) throw new Error("Invalid journal nonce");
    return crypto.subtle.decrypt({
        name: "AES-GCM", iv, additionalData: encoder.encode(context),
    }, key, decodeBytes(payload.ciphertext));
}

export function encryptJson(key: CryptoKey, value: unknown, context: string) {
    return seal(key, encoder.encode(JSON.stringify(value)), context);
}

export async function decryptJson(key: CryptoKey, payload: Ciphertext, context: string): Promise<unknown> {
    return JSON.parse(decoder.decode(await open(key, payload, context)));
}

export async function prepareVault(passphrase: string) {
    if (passphrase.length < 12) throw new Error("Use a passphrase of at least 12 characters.");
    const salt = encodeBytes(crypto.getRandomValues(new Uint8Array(16)));
    const journalBytes = crypto.getRandomValues(new Uint8Array(32));
    const recoveryBytes = crypto.getRandomValues(new Uint8Array(32));
    try {
        const [passphraseWrappingKey, recoveryWrappingKey, key] = await Promise.all([
            passphraseKey(passphrase, salt),
            importKey(recoveryBytes),
            importKey(journalBytes),
        ]);
        const [passphraseWrap, recoveryWrap] = await Promise.all([
            seal(passphraseWrappingKey, journalBytes, "outdoor/vault/v1/passphrase"),
            seal(recoveryWrappingKey, journalBytes, "outdoor/vault/v1/recovery"),
        ]);
        const descriptor: VaultDescriptor = {version: 1, salt, passphrase: passphraseWrap, recovery: recoveryWrap};
        return {descriptor, recoveryKey: encodeBytes(recoveryBytes), key};
    } finally {
        journalBytes.fill(0);
        recoveryBytes.fill(0);
    }
}

export async function unlockVault(descriptor: VaultDescriptor, method: "passphrase" | "recovery", secret: string) {
    const wrappingKey = method === "passphrase"
        ? await passphraseKey(secret, descriptor.salt)
        : await recoveryWrappingKey(secret);
    const bytes = new Uint8Array(await open(wrappingKey, descriptor[method], `outdoor/vault/v1/${method}`));
    try {
        return await importKey(bytes);
    } finally {
        bytes.fill(0);
    }
}

async function recoveryWrappingKey(secret: string) {
    const bytes = decodeBytes(secret.trim());
    if (bytes.byteLength !== 32) throw new Error("Invalid recovery key");
    try {
        return await importKey(bytes);
    } finally {
        bytes.fill(0);
    }
}
