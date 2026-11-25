import {API_URL} from "@/constants/apiUrl";

export type AccountSettings = {cloudAiEnabled: boolean};

export async function fetchAccountSettings(signal?: AbortSignal, settings?: AccountSettings): Promise<AccountSettings> {
    const request = () => fetch(`${API_URL}/account/settings`, {
        credentials: "include",
        method: settings ? "PATCH" : "GET",
        headers: settings ? {"Content-Type": "application/json"} : undefined,
        body: settings ? JSON.stringify(settings) : undefined,
        cache: "no-store",
        signal,
    });
    let response = await request();
    if (response.status === 401) {
        const refreshed = await fetch(`${API_URL}/auth/refresh`, {method: "POST", credentials: "include", signal});
        if (refreshed.ok) response = await request();
    }
    if (!response.ok) throw new Error("Could not load or save account settings.");
    const data: unknown = await response.json();
    if (typeof data !== "object" || !data || !("cloudAiEnabled" in data) || typeof data.cloudAiEnabled !== "boolean") {
        throw new Error("Invalid account settings response.");
    }
    return {cloudAiEnabled: data.cloudAiEnabled};
}
