export type AiFailureCategory =
  | "authentication"
  | "invalid_request"
  | "invalid_response"
  | "model_unavailable"
  | "network"
  | "provider"
  | "quota"
  | "rate_limit"
  | "temporary"
  | "timeout";

export type AiResponseFormat = {
  type: "text";
  mime_type: "application/json";
  schema: Record<string, unknown>;
};

export type AiGenerationRequest = {
  input: string;
  systemInstruction: string;
  maxOutputTokens?: number;
  responseFormat?: AiResponseFormat;
};

export interface AiProviderAdapter {
  id: string;
  freeFallback: boolean;
  isConfigured(): boolean;
  generate(request: AiGenerationRequest, signal: AbortSignal): Promise<string>;
}

export class AiProviderRequestError extends Error {
  constructor(
    public readonly category: AiFailureCategory,
    public readonly statusCode: number | null
  ) {
    super(category);
    this.name = "AiProviderRequestError";
  }
}

export class AiServiceError extends Error {
  constructor(
    message = "AI is temporarily unavailable. Please try again later.",
    public readonly statusCode = 503
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

export function classifyProviderFailure(
  statusCode: number,
  providerMessage = ""
): AiFailureCategory {
  const message = providerMessage.toLowerCase();
  if (statusCode === 429) return "rate_limit";
  if (statusCode === 402 || /quota|resource_exhausted/.test(message)) return "quota";
  if (statusCode === 401 || statusCode === 403) return "authentication";
  if (
    statusCode === 404 ||
    (/\bmodel\b/.test(message) && /not found|not available|unavailable|unsupported/.test(message))
  ) {
    return "model_unavailable";
  }
  if (statusCode === 408 || statusCode === 504) return "timeout";
  if (statusCode >= 500 && statusCode <= 599) return "temporary";
  if (statusCode === 400) return "invalid_request";
  return "provider";
}

export function isTimeoutError(error: unknown): boolean {
  return error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError");
}
