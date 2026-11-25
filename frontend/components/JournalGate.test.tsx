import {webcrypto} from "node:crypto";
import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {IDBFactory} from "fake-indexeddb";
import {afterEach, expect, it, vi} from "vitest";
import Database from "@/lib/database";
import {prepareVault} from "@/lib/vault/crypto";
import {
    getVaultGeneration, installVault, journalLockSignal, lockJournal, lockJournalEverywhere, rememberJournal,
    requireJournalKey, restoreRememberedJournal, unlockJournal,
} from "@/lib/vault/session";
import {readRememberedKey} from "@/lib/vault/rememberedKey";
import JournalGate from "./JournalGate";

vi.mock("next/navigation", () => ({usePathname: () => "/entries"}));
vi.mock("@/lib/context/auth", () => ({useAuth: () => ({accountReady: true})}));

afterEach(() => {
    cleanup();
    lockJournal();
    localStorage.clear();
    Reflect.deleteProperty(navigator, "locks");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

function mockBrowserStorage() {
    vi.stubGlobal("crypto", webcrypto);
    vi.stubGlobal("indexedDB", new IDBFactory());
    Object.defineProperty(navigator, "locks", {configurable: true, value: {
        request: (_name: string, run: () => void) => Promise.resolve().then(run),
    }});
}

it("unlocks the existing local vault with the recovery key and saves a reflection offline", async () => {
    mockBrowserStorage();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const prepared = await prepareVault("a long journal recovery passphrase");
    await installVault(prepared.descriptor, prepared.key, getVaultGeneration());
    lockJournal();

    render(<JournalGate><p>Journal ready</p></JournalGate>);
    fireEvent.click(await screen.findByRole("button", {name: "Use recovery key"}));
    fireEvent.change(screen.getByLabelText("Recovery key"), {target: {value: prepared.recoveryKey}});
    fireEvent.click(screen.getByRole("button", {name: "Unlock journal"}));
    expect(await screen.findByText("Journal ready")).toBeInTheDocument();

    const db = new Database();
    const timestamp = "2026-11-25T10:00:00.000Z";
    await expect(db.saveToLocalDB({
        id: "offline-reflection", title: "Private trail", content: ["Snow underfoot"], date: timestamp,
        createdAt: timestamp, lastEditedAt: timestamp, drawingPaths: [], syncStatus: "pending",
    }, "reflections")).resolves.toBe("offline-reflection");
    await expect(db.get("offline-reflection", "reflections")).resolves.toMatchObject({title: "Private trail"});
    expect(fetchMock).not.toHaveBeenCalled();
}, 20_000);

it("leaves remembering off until selected and restores the opted-in key after reopening", async () => {
    mockBrowserStorage();
    const {descriptor, key, recoveryKey} = await prepareVault("a long journal recovery passphrase");
    await installVault(descriptor, key, getVaultGeneration());
    expect(await readRememberedKey()).toBeUndefined();
    lockJournal();

    const {unmount} = render(<JournalGate><p>Journal ready</p></JournalGate>);
    fireEvent.click(await screen.findByRole("button", {name: "Use recovery key"}));
    const remember = screen.getByRole("checkbox", {name: /Remember this browser/});
    expect(remember).not.toBeChecked();
    fireEvent.click(remember);
    fireEvent.change(screen.getByLabelText("Recovery key"), {target: {value: recoveryKey}});
    fireEvent.click(screen.getByRole("button", {name: "Unlock journal"}));
    expect(await screen.findByText("Journal ready")).toBeInTheDocument();
    expect((await readRememberedKey())?.key.extractable).toBe(false);

    unmount();
    lockJournal();
    render(<JournalGate><p>Journal ready</p></JournalGate>);
    expect(await screen.findByText("Journal ready")).toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Unlock journal"})).not.toBeInTheDocument();
}, 20_000);

it("expires remembered unlock and discards a late unlock after another tab locks", async () => {
    mockBrowserStorage();
    const {descriptor, key} = await prepareVault("a long journal recovery passphrase");
    await installVault(descriptor, key, getVaultGeneration(), true);
    const record = (await readRememberedKey())!;
    const now = vi.spyOn(Date, "now").mockReturnValue(record.expiresAt);
    lockJournal();
    expect(await restoreRememberedJournal(descriptor)).toBe(false);
    expect(await readRememberedKey()).toBeUndefined();
    now.mockRestore();

    const generation = getVaultGeneration();
    await rememberJournal(descriptor, key, generation);
    unlockJournal(key, generation);
    render(<JournalGate><p>Journal ready</p></JournalGate>);
    expect(screen.getByText("Journal ready")).toBeInTheDocument();

    act(() => {
        const token = crypto.randomUUID();
        localStorage.setItem(journalLockSignal, token);
        window.dispatchEvent(new StorageEvent("storage", {key: journalLockSignal, newValue: token}));
    });
    expect(screen.queryByText("Journal ready")).not.toBeInTheDocument();
    expect(() => unlockJournal(key, generation)).toThrow("was locked");
    expect(() => requireJournalKey()).toThrow("Unlock");
    expect(await restoreRememberedJournal(descriptor)).toBe(false);
    await lockJournalEverywhere();
    expect(await readRememberedKey()).toBeUndefined();
}, 20_000);
