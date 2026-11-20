import {
  AiProviderRequestError,
  AiServiceError,
  isTimeoutError,
  type AiFailureCategory,
  type AiGenerationRequest,
  type AiProviderAdapter
} from "./aiTypes.js";
import { geminiProvider } from "./gemini.js";
import { openRouterProvider } from "./openrouter.js";

const PROVIDER_TIMEOUT_MS = 15_000;
const TOTAL_PROVIDER_TIMEOUT_MS = 25_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 1200;
const MAX_OUTPUT_TOKENS = 2000;
const DEFAULT_MAX_PROVIDER_ATTEMPTS = 2;
const HARD_MAX_PROVIDER_ATTEMPTS = 3;
const DEFAULT_PROVIDER_ORDER = ["gemini", "openrouter"];

type ProviderHealth = {
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastFailureCategory: AiFailureCategory | null;
};

const providers = new Map<string, AiProviderAdapter>([
  [geminiProvider.id, geminiProvider],
  [openRouterProvider.id, openRouterProvider]
]);
const providerHealth = new Map<string, ProviderHealth>();
const reportedUnknownProviders = new Set<string>();

export function registerAiProvider(adapter: AiProviderAdapter): void {
  if (!/^[a-z][a-z0-9_-]*$/.test(adapter.id)) {
    throw new Error("AI provider IDs must be lowercase identifiers.");
  }
  if (providers.has(adapter.id)) {
    throw new Error(`AI provider "${adapter.id}" is already registered.`);
  }
  providers.set(adapter.id, adapter);
}

function getProviderOrder(): string[] {
  const configuredOrder = process.env.AI_PROVIDER_ORDER?.trim();
  const requestedOrder = configuredOrder
    ? configuredOrder.split(",").map((id) => id.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_PROVIDER_ORDER;
  const order = [...new Set(requestedOrder)];
  const unknown = order.filter((id) => !providers.has(id));
  for (const id of unknown) {
    if (!reportedUnknownProviders.has(id)) {
      console.error("AI provider order references an unregistered adapter.", { providerId: id });
      reportedUnknownProviders.add(id);
    }
  }
  return order.filter((id) => providers.has(id));
}

function getMaxAttempts(): number {
  const configuredAttempts = process.env.AI_MAX_PROVIDER_ATTEMPTS?.trim();
  if (!configuredAttempts) {
    return DEFAULT_MAX_PROVIDER_ATTEMPTS;
  }
  const attempts = Number(configuredAttempts);
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > HARD_MAX_PROVIDER_ATTEMPTS) {
    console.error("AI_MAX_PROVIDER_ATTEMPTS must be an integer from 1 to 3.");
    return DEFAULT_MAX_PROVIDER_ATTEMPTS;
  }
  return attempts;
}

function boundedOutputTokens(value: number | undefined): number {
  if (!Number.isFinite(value) || !value || value < 1) {
    return DEFAULT_MAX_OUTPUT_TOKENS;
  }
  return Math.min(Math.floor(value), MAX_OUTPUT_TOKENS);
}

function getHealth(providerId: string): ProviderHealth {
  const current = providerHealth.get(providerId);
  if (current) return current;
  const initial = {
    lastSuccessAt: null,
    lastFailureAt: null,
    lastFailureCategory: null
  };
  providerHealth.set(providerId, initial);
  return initial;
}

function recordProviderSuccess(providerId: string): void {
  providerHealth.set(providerId, {
    ...getHealth(providerId),
    lastSuccessAt: new Date().toISOString()
  });
}

function recordProviderFailure(providerId: string, category: AiFailureCategory): void {
  providerHealth.set(providerId, {
    ...getHealth(providerId),
    lastFailureAt: new Date().toISOString(),
    lastFailureCategory: category
  });
}

function isFallbackEligible(category: AiFailureCategory): boolean {
  return category !== "invalid_request";
}

export async function runWithAiProviders(
  request: AiGenerationRequest,
  candidates: AiProviderAdapter[],
  maxAttempts = DEFAULT_MAX_PROVIDER_ATTEMPTS
): Promise<string> {
  const attemptLimit = Math.min(
    HARD_MAX_PROVIDER_ATTEMPTS,
    Math.max(1, Math.floor(maxAttempts) || DEFAULT_MAX_PROVIDER_ATTEMPTS)
  );
  const deadline = Date.now() + TOTAL_PROVIDER_TIMEOUT_MS;
  let attempts = 0;

  for (const provider of candidates) {
    if (!provider.isConfigured()) continue;
    if (attempts > 0 && !provider.freeFallback) continue;
    if (attempts >= attemptLimit) break;
    const remainingTimeMs = deadline - Date.now();
    if (remainingTimeMs <= 0) break;

    attempts += 1;
    let failure: AiProviderRequestError;
    try {
      const answer = await provider.generate(
        request,
        AbortSignal.timeout(Math.min(PROVIDER_TIMEOUT_MS, remainingTimeMs))
      );
      if (!answer.trim()) {
        throw new AiProviderRequestError("invalid_response", null);
      }
      recordProviderSuccess(provider.id);
      return answer.trim();
    } catch (error) {
      failure = error instanceof AiProviderRequestError
        ? error
        : new AiProviderRequestError(
            isTimeoutError(error) ? "timeout" : "network",
            null
          );
    }

    recordProviderFailure(provider.id, failure.category);
    console.warn("AI provider request failed.", {
      provider: provider.id,
      category: failure.category,
      status: failure.statusCode
    });
    if (!isFallbackEligible(failure.category)) {
      break;
    }
  }

  throw new AiServiceError();
}

export async function generateAiText(request: AiGenerationRequest): Promise<string> {
  const orderedProviders = getProviderOrder()
    .map((id) => providers.get(id))
    .filter((provider): provider is AiProviderAdapter => Boolean(provider));
  const boundedRequest = {
    ...request,
    maxOutputTokens: boundedOutputTokens(request.maxOutputTokens)
  };
  return runWithAiProviders(boundedRequest, orderedProviders, getMaxAttempts());
}

export function getAiProviderStatus() {
  return getProviderOrder().flatMap((id) => {
    const provider = providers.get(id);
    if (!provider) return [];
    const health = getHealth(provider.id);
    const configured = provider.isConfigured();
    const hasResult = health.lastSuccessAt !== null || health.lastFailureAt !== null;
    const lastSuccessIsNewer = Boolean(
      health.lastSuccessAt &&
      (!health.lastFailureAt || health.lastSuccessAt > health.lastFailureAt)
    );
    return [{
      id: provider.id,
      configured,
      status: !configured
        ? "not_configured"
        : !hasResult
          ? "unverified"
          : lastSuccessIsNewer
            ? "available"
            : "degraded",
      fallbackPolicy: provider.freeFallback ? "free_only" : "primary_only",
      lastSuccessAt: health.lastSuccessAt,
      lastFailureAt: health.lastFailureAt,
      lastFailureCategory: health.lastFailureCategory
    }];
  });
}

export { AiServiceError };
