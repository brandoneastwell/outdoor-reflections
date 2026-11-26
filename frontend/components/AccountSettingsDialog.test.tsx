import {cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {afterEach, expect, it, vi} from "vitest";
import {AuthProvider} from "@/lib/context/authContext";
import * as vaultSession from "@/lib/vault/encryption-session";
import TopBar from "./TopBar";

vi.mock("next/navigation", () => ({
    usePathname: () => "/entries",
    useRouter: () => ({push: vi.fn()}),
}));
vi.mock("@/components/DrawIcon", () => ({default: () => null}));

afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

it("opens settings from the account menu and saves affirmative cloud AI consent", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (url, init) => {
        if (String(url).endsWith("/auth/me")) return Response.json({id: 42, email: "journal@example.com"});
        return Response.json({cloudAiEnabled: init?.method === "PATCH"});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AuthProvider><TopBar /></AuthProvider>);

    fireEvent.click(await screen.findByRole("button", {name: "Account menu"}));
    fireEvent.click(screen.getByRole("button", {name: "Settings"}));
    const dialog = await screen.findByRole("dialog", {name: "Account settings"});
    const optIn = within(dialog).getByRole("checkbox", {name: "Enable cloud AI suggestions"});
    await waitFor(() => expect(optIn).toBeEnabled());
    expect(optIn).not.toBeChecked();
    expect(optIn).toHaveAccessibleDescription(/sends readable text/);

    fireEvent.click(optIn);
    await waitFor(() => expect(optIn).toBeChecked());
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringMatching(/\/account\/settings$/), expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({cloudAiEnabled: true}),
    }));
    fireEvent.click(within(dialog).getByRole("button", {name: "Recovery"}));
    expect(within(dialog).getByText(/Restoring to a new device is not available yet/)).toBeInTheDocument();
    const lock = vi.spyOn(vaultSession, "lockJournalEverywhere").mockResolvedValue(undefined);
    fireEvent.click(within(dialog).getByRole("button", {name: "Lock journal"}));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(lock).toHaveBeenCalledOnce();
});
