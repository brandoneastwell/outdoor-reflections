import {API_URL} from "@/constants/apiUrl";
import {readJsonError} from "@/lib/api/readResponse";
import type {
    ContentGenerationRequest,
    InlineCompletionRequest,
    JournalSuggestion,
} from "@/types/intelligenceTypes";

const DEFAULT_TIMEOUT_MS = 20_000;

type ReflectionsAiManagerOptions = {
    baseUrl?: string;
    timeoutMs?: number;
};

export class ReflectionsAiError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = "ReflectionsAiError";
    }
}

export class ReflectionsAiRateLimitError extends ReflectionsAiError {
    constructor(public readonly retryAfterSeconds: number) {
        super("AI suggestions are temporarily paused");
        this.name = "ReflectionsAiRateLimitError";
    }
}

export class ReflectionsAiManager {
    private readonly baseUrl: string;
    private readonly timeoutMs: number;
    private cooldownUntil = 0;

    constructor({
        baseUrl = API_URL,
        timeoutMs = DEFAULT_TIMEOUT_MS,
    }: ReflectionsAiManagerOptions = {}) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.timeoutMs = timeoutMs;
    }

    async getInlineCompletion(
        reflectionId: string,
        request: InlineCompletionRequest,
        signal?: AbortSignal,
    ): Promise<string> {
        this.assertAvailable();

        const response = await this.request(
            `${this.baseUrl}/reflection/${encodeURIComponent(reflectionId)}/intelligence/inline-completion`,
            request,
            signal,
        );

        if (!response.ok) {
            throw await this.responseError(response, "AI inline completion service is unavailable");
        }

        const payload: unknown = await response.json();
        const suggestion = typeof payload === "object" && payload !== null && "suggestion" in payload
            ? payload.suggestion
            : undefined;
        if (typeof suggestion !== "string" || suggestion.trim().length === 0 || suggestion.length > 100) {
            throw new ReflectionsAiError("AI inline completion service returned an invalid response");
        }

        return suggestion;
    }

    async getSentenceStarters(
        reflectionId: string,
        request: ContentGenerationRequest,
        signal?: AbortSignal,
    ): Promise<JournalSuggestion[]> {
        this.assertAvailable();

        console.log("Requesting sentence starters for reflection", reflectionId, request)
        const response = await this.request(
            `${this.baseUrl}/reflection/${encodeURIComponent(reflectionId)}/intelligence/sentence-starters`,
            request,
            signal,
        );

        if (!response.ok) {
            throw await this.responseError(response, "AI sentence starter service is unavailable");
        }

        const payload: unknown = await response.json();
        if (!this.isSentenceStartersResponse(payload)) {
            throw new ReflectionsAiError("AI sentence starter service returned an invalid response");
        }

        return payload;
    }

    private async request(url: string, body: object, signal?: AbortSignal): Promise<Response> {
        const requestController = new AbortController();
        const abortRequest = () => requestController.abort(signal?.reason);
        const timeout = window.setTimeout(() => requestController.abort(), this.timeoutMs);

        if (signal?.aborted) abortRequest();
        else signal?.addEventListener("abort", abortRequest, {once: true});

        try {
            return await fetch(url, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                credentials: "include",
                body: JSON.stringify(body),
                signal: requestController.signal,
            });
        } catch (error) {
            if (requestController.signal.aborted) throw error;
            throw new ReflectionsAiError("Unable to request AI suggestions", {cause: error});
        } finally {
            window.clearTimeout(timeout);
            signal?.removeEventListener("abort", abortRequest);
        }
    }

    private assertAvailable() {
        if (this.cooldownUntil <= Date.now()) return;
        throw new ReflectionsAiRateLimitError(
            Math.ceil((this.cooldownUntil - Date.now()) / 1000),
        );
    }

    private async responseError(response: Response, fallback: string): Promise<ReflectionsAiError> {
        if (response.status !== 429) {
            return new ReflectionsAiError(await readJsonError(response, fallback));
        }

        let body: unknown;
        try {
            body = await response.json();
        } catch {
            body = null;
        }

        const bodyRetryAfter = typeof body === "object" && body !== null && "retryAfterSeconds" in body
            ? Number(body.retryAfterSeconds)
            : Number.NaN;
        const headerRetryAfter = Number(response.headers.get("Retry-After"));
        const retryAfterSeconds = Math.ceil(
            bodyRetryAfter > 0 ? bodyRetryAfter : headerRetryAfter > 0 ? headerRetryAfter : 60,
        );

        this.cooldownUntil = Date.now() + retryAfterSeconds * 1000;
        return new ReflectionsAiRateLimitError(retryAfterSeconds);
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
                    suggestion.text.trim().length > 0 &&
                    suggestion.text.length <= 200,
            )
        );
    }
}

export const reflectionsAiManager = new ReflectionsAiManager();
