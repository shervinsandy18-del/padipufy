import assert from "node:assert/strict";
import test from "node:test";
import {
  AiServiceError,
  generateAiText,
  getAiProviderStatus,
  runWithAiProviders
} from "../dist/services/aiProviderManager.js";
import { AiProviderRequestError } from "../dist/services/aiTypes.js";

const request = {
  input: "Explain arrays.",
  systemInstruction: "You are a tutor.",
  maxOutputTokens: 1200
};
const environmentKeys = [
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL",
  "AI_PROVIDER_ORDER",
  "AI_MAX_PROVIDER_ATTEMPTS"
];

function mockEnvironment(t, values, fetchImplementation) {
  const previousEnvironment = new Map(
    environmentKeys.map((key) => [key, process.env[key]])
  );
  const previousFetch = globalThis.fetch;
  for (const key of environmentKeys) {
    delete process.env[key];
  }
  Object.assign(process.env, values);
  globalThis.fetch = fetchImplementation;

  t.after(() => {
    for (const key of environmentKeys) {
      const previous = previousEnvironment.get(key);
      if (previous === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous;
      }
    }
    globalThis.fetch = previousFetch;
  });
}

function captureWarnings(t) {
  const warnings = [];
  const previousWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  t.after(() => {
    console.warn = previousWarn;
  });
  return warnings;
}

function providerResponse(status, message) {
  return new Response(JSON.stringify({ error: { message } }), { status });
}

function geminiSuccess() {
  return new Response(JSON.stringify({
    steps: [{ type: "model_output", content: [{ type: "text", text: "A clear answer." }] }]
  }), { status: 200 });
}

function openRouterSuccess(content = "A clear answer.") {
  return new Response(JSON.stringify({
    choices: [{ message: { content }, finish_reason: "stop" }]
  }), { status: 200 });
}

test("selects Gemini first and does not call the fallback after success", async (t) => {
  const urls = [];
  const bodies = [];
  mockEnvironment(t, {
    GEMINI_API_KEY: "unit-test-gemini-key",
    GEMINI_MODEL: "configured-test-model",
    OPENROUTER_API_KEY: "unit-test-openrouter-key",
    AI_PROVIDER_ORDER: "gemini,openrouter"
  }, async (url, options) => {
    urls.push(String(url));
    bodies.push(JSON.parse(options.body));
    return geminiSuccess();
  });

  assert.equal(await generateAiText(request), "A clear answer.");
  assert.deepEqual(urls, [
    "https://generativelanguage.googleapis.com/v1beta/interactions"
  ]);
  assert.equal(bodies[0].model, "configured-test-model");
});

test("falls back to OpenRouter's free router after a Gemini 429", async (t) => {
  captureWarnings(t);
  const requests = [];
  mockEnvironment(t, {
    GEMINI_API_KEY: "unit-test-gemini-key",
    OPENROUTER_API_KEY: "unit-test-openrouter-key",
    AI_PROVIDER_ORDER: "gemini,openrouter",
    OPENROUTER_MODEL: "vendor/paid-model"
  }, async (url, options) => {
    requests.push({ url: String(url), body: JSON.parse(options.body) });
    return String(url).includes("googleapis.com")
      ? providerResponse(429, "quota detail includes unit-test-gemini-key")
      : openRouterSuccess();
  });

  assert.equal(await generateAiText({
    ...request,
    maxOutputTokens: 9000,
    responseFormat: {
      type: "text",
      mime_type: "application/json",
      schema: {
        type: "object",
        properties: { answer: { type: "string" } },
        required: ["answer"]
      }
    }
  }), "A clear answer.");
  assert.equal(requests.length, 2);
  assert.equal(requests[1].body.model, "openrouter/free");
  assert.equal(requests[1].body.max_tokens, 2000);
  assert.equal(requests[1].body.provider.require_parameters, true);
  assert.equal(requests[1].body.provider.data_collection, "deny");
  assert.equal(
    requests[1].body.response_format.json_schema.schema.additionalProperties,
    false
  );
});

test("falls back after a provider timeout", async (t) => {
  captureWarnings(t);
  const urls = [];
  mockEnvironment(t, {
    GEMINI_API_KEY: "unit-test-gemini-key",
    OPENROUTER_API_KEY: "unit-test-openrouter-key",
    AI_PROVIDER_ORDER: "gemini,openrouter"
  }, async (url) => {
    urls.push(String(url));
    if (urls.length === 1) {
      throw new DOMException("request timed out", "TimeoutError");
    }
    return openRouterSuccess();
  });

  assert.equal(await generateAiText(request), "A clear answer.");
  assert.equal(urls.length, 2);
});

test("falls back when the primary provider reports quota exhaustion", async (t) => {
  captureWarnings(t);
  const urls = [];
  mockEnvironment(t, {
    GEMINI_API_KEY: "unit-test-gemini-key",
    OPENROUTER_API_KEY: "unit-test-openrouter-key",
    AI_PROVIDER_ORDER: "gemini,openrouter"
  }, async (url) => {
    urls.push(String(url));
    return urls.length === 1
      ? providerResponse(402, "quota exhausted")
      : openRouterSuccess();
  });

  assert.equal(await generateAiText(request), "A clear answer.");
  assert.equal(urls.length, 2);
});

test("returns a friendly error and sanitized logs when all providers fail", async (t) => {
  const warnings = captureWarnings(t);
  const urls = [];
  mockEnvironment(t, {
    GEMINI_API_KEY: "unit-test-gemini-key",
    OPENROUTER_API_KEY: "unit-test-openrouter-key",
    AI_PROVIDER_ORDER: "gemini,openrouter"
  }, async (url) => {
    urls.push(String(url));
    return String(url).includes("googleapis.com")
      ? providerResponse(503, "internal detail unit-test-gemini-key")
      : providerResponse(429, "internal detail unit-test-openrouter-key");
  });

  await assert.rejects(
    generateAiText(request),
    (error) => error instanceof AiServiceError &&
      error.statusCode === 503 &&
      error.message === "AI is temporarily unavailable. Please try again later." &&
      !error.message.includes("unit-test")
  );
  assert.equal(urls.length, 2);
  assert.equal(JSON.stringify(warnings).includes("unit-test"), false);
  assert.equal(JSON.stringify(warnings).includes("internal detail"), false);
});

test("never uses a non-free adapter as a fallback", async (t) => {
  captureWarnings(t);
  let paidProviderCalls = 0;
  const primary = {
    id: "configured-primary",
    freeFallback: false,
    isConfigured: () => true,
    generate: async () => {
      throw new AiProviderRequestError("rate_limit", 429);
    }
  };
  const paidProvider = {
    id: "paid-provider",
    freeFallback: false,
    isConfigured: () => true,
    generate: async () => {
      paidProviderCalls += 1;
      return "Paid response";
    }
  };
  const freeProvider = {
    id: "free-provider",
    freeFallback: true,
    isConfigured: () => true,
    generate: async () => "Free response"
  };

  assert.equal(
    await runWithAiProviders(request, [primary, paidProvider, freeProvider], 3),
    "Free response"
  );
  assert.equal(paidProviderCalls, 0);
});

test("stops after the configured maximum number of provider attempts", async (t) => {
  captureWarnings(t);
  let thirdProviderCalls = 0;
  const primary = {
    id: "configured-primary",
    freeFallback: false,
    isConfigured: () => true,
    generate: async () => {
      throw new AiProviderRequestError("temporary", 503);
    }
  };
  const freeFallback = {
    id: "free-fallback",
    freeFallback: true,
    isConfigured: () => true,
    generate: async () => {
      throw new AiProviderRequestError("temporary", 503);
    }
  };
  const thirdProvider = {
    id: "third-free-provider",
    freeFallback: true,
    isConfigured: () => true,
    generate: async () => {
      thirdProviderCalls += 1;
      return "Unexpected response";
    }
  };

  await assert.rejects(
    runWithAiProviders(request, [primary, freeFallback, thirdProvider], 2),
    AiServiceError
  );
  assert.equal(thirdProviderCalls, 0);
});

test("provider status exposes no keys or upstream error details", (t) => {
  mockEnvironment(t, {
    GEMINI_API_KEY: "unit-test-gemini-secret",
    OPENROUTER_API_KEY: "unit-test-openrouter-secret",
    AI_PROVIDER_ORDER: "gemini,openrouter"
  }, async () => {
    throw new Error("Provider requests are not expected in this test.");
  });

  const status = getAiProviderStatus();
  const serialized = JSON.stringify(status);
  assert.deepEqual(status.map((provider) => provider.id), ["gemini", "openrouter"]);
  assert.equal(status[0].fallbackPolicy, "primary_only");
  assert.equal(status[1].fallbackPolicy, "free_only");
  assert.equal(serialized.includes("unit-test"), false);
  assert.equal(serialized.includes("apiKey"), false);
});
