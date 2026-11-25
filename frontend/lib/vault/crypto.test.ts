// @vitest-environment node
import {expect, it} from "vitest";
import {decryptJson, encryptJson, prepareVault, unlockVault} from "./crypto";

it("unlocks an encrypted journal with either secret and rejects changed ciphertext or entry binding", async () => {
    const passphrase = "a long trail journal passphrase";
    const {descriptor, key, recoveryKey} = await prepareVault(passphrase);
    const entry = {title: "Private reflection", content: ["A quiet walk"]};
    const context = "outdoor/entry/v1/reflection-one";
    const encrypted = await encryptJson(key, entry, context);
    expect(JSON.stringify(encrypted)).not.toContain(entry.title);
    expect((await encryptJson(key, entry, context)).iv).not.toBe(encrypted.iv);

    const localDescriptor = JSON.parse(JSON.stringify(descriptor));
    const passwordKey = await unlockVault(localDescriptor, "passphrase", passphrase);
    const recoveredKey = await unlockVault(localDescriptor, "recovery", recoveryKey);
    await expect(decryptJson(passwordKey, encrypted, context)).resolves.toEqual(entry);
    await expect(decryptJson(recoveredKey, encrypted, context)).resolves.toEqual(entry);
    await expect(decryptJson(recoveredKey, encrypted, context + "-changed")).rejects.toThrow();
    const changed = (encrypted.ciphertext[0] === "A" ? "B" : "A") + encrypted.ciphertext.slice(1);
    await expect(decryptJson(recoveredKey, {...encrypted, ciphertext: changed}, context)).rejects.toThrow();
    await expect(unlockVault(localDescriptor, "passphrase", "incorrect long passphrase")).rejects.toThrow();
}, 20_000);
