import {API_URL} from "@/constants/apiUrl";
import {readJsonError} from "@/lib/api/readResponse";
import type {JournalSuggestion, SentenceStartersRequest} from "@/types/intelligenceTypes";

const DEFAULT_TIMEOUT_MS = 20_000;

type ReflectionsAiManagerOptions = {
    baseUrl?: string;
    fetcher?: typeof fetch;
    timeoutMs?: number;
};

export class ReflectionsAiError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = "ReflectionsAiError";
    }
}

export class ReflectionsAiManager {
    private readonly baseUrl: string;
    private readonly fetcher: typeof fetch;
    private readonly timeoutMs: number;

    constructor({
        baseUrl = API_URL,
        fetcher = fetch,
        timeoutMs = DEFAULT_TIMEOUT_MS,
    }: ReflectionsAiManagerOptions = {}) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.fetcher = fetcher;
        this.timeoutMs = timeoutMs;
    }

    async generateSentenceStarters(
        reflectionId: string,
        request: SentenceStartersRequest,
        signal?: AbortSignal,
    ): Promise<JournalSuggestion[]> {
        const requestController = new AbortController();
        const abortRequest = () => requestController.abort(signal?.reason);
        const timeout = window.setTimeout(() => requestController.abort(), this.timeoutMs);

        if (signal?.aborted) {
            abortRequest();
        } else {
            signal?.addEventListener("abort", abortRequest, {once: true});
        }

        try {
            const response = await this.fetcher(
                `${this.baseUrl}/reflection/${encodeURIComponent(reflectionId)}/intelligence/sentence-starters`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify(request),
                    signal: requestController.signal,
                },
            );

            if (!response.ok) {
                throw new ReflectionsAiError(
                    await readJsonError(response, "AI sentence starter service is unavailable"),
                );
            }

            const payload: unknown = await response.json();
            if (!this.isSentenceStartersResponse(payload)) {
                throw new ReflectionsAiError("AI sentence starter service returned an invalid response");
            }

            return payload;
        } catch (error) {
            if (requestController.signal.aborted || error instanceof ReflectionsAiError) {
                throw error;
            }

            throw new ReflectionsAiError("Unable to request AI sentence starters", {
                cause: error,
            });
        } finally {
            window.clearTimeout(timeout);
            signal?.removeEventListener("abort", abortRequest);
        }
    }

    private isSentenceStartersResponse(value: unknown): value is JournalSuggestion[] {
        return (
            Array.isArray(value) &&
            value.length === 3 &&
            value.every(
                (suggestion) =>
                    typeof suggestion === "object" &&
                    suggestion !== null &&
                    "type" in suggestion &&
                    suggestion.type === "sentence_starter" &&
                    "text" in suggestion &&
                    typeof suggestion.text === "string" &&
                    suggestion.text.trim().length > 0,
            )
        );
    }
}

export const reflectionsAiManager = new ReflectionsAiManager();
