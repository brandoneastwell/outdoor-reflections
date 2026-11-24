import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {
    ReflectionsAiError,
    ReflectionsAiManager,
    ReflectionsAiRateLimitError,
} from "./reflectionsAiManager";

const suggestions = [
    {type: "sentence_starter" as const, text: "I noticed..."},
    {type: "sentence_starter" as const, text: "Today I felt..."},
    {type: "sentence_starter" as const, text: "Next time..."},
];

describe("ReflectionsAiManager", () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("calls the NestJS sentence starter endpoint with the frontend contract", async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify(suggestions), {
                status: 200,
                headers: {"Content-Type": "application/json"},
            }),
        );
        const manager = new ReflectionsAiManager({
            baseUrl: "http://backend.test/",
        });

        const result = await manager.getSentenceStarters(
            "reflection/id",
            {
                currentContent: "Current draft",
                recentContent: ["Earlier reflection one", "Earlier reflection two"],
            },
        );

        expect(result).toEqual(suggestions);
        expect(fetchMock).toHaveBeenCalledWith(
            "http://backend.test/reflection/reflection%2Fid/intelligence/sentence-starters",
            expect.objectContaining({
                method: "POST",
                credentials: "include",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    currentContent: "Current draft",
                    recentContent: ["Earlier reflection one", "Earlier reflection two"],
                }),
                signal: expect.any(AbortSignal),
            }),
        );
    });

    it("uses the backend error message for a failed response", async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({message: "Suggestions are unavailable"}), {
                status: 503,
                headers: {"Content-Type": "application/json"},
            }),
        );
        const manager = new ReflectionsAiManager();

        await expect(
            manager.getSentenceStarters("reflection-id", {
                currentContent: "Current draft",
                recentContent: [],
            }),
        ).rejects.toEqual(
            expect.objectContaining<Partial<ReflectionsAiError>>({
                name: "ReflectionsAiError",
                message: "Suggestions are unavailable",
            }),
        );
    });

    it("calls the inline completion endpoint with the current text block", async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({suggestion: " beneath the trees"}), {
                status: 200,
                headers: {"Content-Type": "application/json"},
            }),
        );
        const manager = new ReflectionsAiManager({
            baseUrl: "http://backend.test",
        });

        const result = await manager.getInlineCompletion("reflection-id", {
            currentContent: "Current draft",
            currentTextBlock: "Current draft",
            recentContent: ["Earlier reflection one", "Earlier reflection two"],
        });

        expect(result).toBe(" beneath the trees");
        expect(fetchMock).toHaveBeenCalledWith(
            "http://backend.test/reflection/reflection-id/intelligence/inline-completion",
            expect.objectContaining({
                body: JSON.stringify({
                    currentContent: "Current draft",
                    currentTextBlock: "Current draft",
                    recentContent: ["Earlier reflection one", "Earlier reflection two"],
                }),
            }),
        );
    });

    it("rejects a response that does not match the suggestion contract", async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify(suggestions.slice(0, 1)), {
                status: 200,
                headers: {"Content-Type": "application/json"},
            }),
        );
        const manager = new ReflectionsAiManager();

        await expect(
            manager.getSentenceStarters("reflection-id", {
                currentContent: "Current draft",
                recentContent: [],
            }),
        ).rejects.toThrow("AI sentence starter service returned an invalid response");
    });

    it.each([
        "bare completion",
        {suggestion: null},
        {suggestion: " "},
        {suggestion: "x".repeat(101)},
    ])("rejects an invalid inline completion: %j", async (payload) => {
        fetchMock.mockResolvedValue(
            Response.json(payload),
        );
        const manager = new ReflectionsAiManager();

        await expect(manager.getInlineCompletion("reflection-id", {
            currentContent: "Current draft",
            currentTextBlock: "Current draft",
            recentContent: ["Earlier reflection one", "Earlier reflection two"],
        })).rejects.toThrow("AI inline completion service returned an invalid response");
    });

    it("does not call the backend again during a quota cooldown", async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({
                statusCode: 429,
                code: "AI_TOKEN_QUOTA_EXCEEDED",
                retryAfterSeconds: 42,
            }), {
                status: 429,
                headers: {"Retry-After": "42"},
            }),
        );
        const manager = new ReflectionsAiManager();
        const request = {
            currentContent: "Current draft",
            recentContent: ["Earlier reflection one", "Earlier reflection two"],
        };

        await expect(manager.getSentenceStarters("reflection-id", request)).rejects.toEqual(
            expect.objectContaining<Partial<ReflectionsAiRateLimitError>>({
                name: "ReflectionsAiRateLimitError",
                retryAfterSeconds: 42,
            }),
        );
        await expect(manager.getSentenceStarters("reflection-id", request)).rejects.toBeInstanceOf(
            ReflectionsAiRateLimitError,
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
