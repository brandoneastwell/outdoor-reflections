import {webcrypto} from "node:crypto";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {IDBFactory} from "fake-indexeddb";
import {afterEach, expect, it, vi} from "vitest";
import Database from "@/lib/database";
import {prepareVault} from "@/lib/vault/crypto";
import {getVaultGeneration, installVault, lockJournal} from "@/lib/vault/session";
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

it("unlocks the existing local vault with the recovery key and saves a reflection offline", async () => {
    vi.stubGlobal("crypto", webcrypto);
    vi.stubGlobal("indexedDB", new IDBFactory());
    Object.defineProperty(navigator, "locks", {configurable: true, value: {
        request: (_name: string, run: () => void) => Promise.resolve().then(run),
    }});
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
