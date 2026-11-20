import {
  AiProviderRequestError,
  classifyProviderFailure,
  isTimeoutError,
  type AiProviderAdapter,
  type AiResponseFormat
} from "./aiTypes.js";

type MessageContent = string | Array<{ type?: string; text?: string }> | undefined;

type OpenRouterResponse = {
  error?: {
    message?: string;
  };
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: MessageContent;
    };
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function makeStrictSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const result = { ...schema };
  if (schema.type === "object" && isRecord(schema.properties)) {
    const properties = schema.properties;
    result.properties = Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [
        key,
        isRecord(value) ? makeStrictSchema(value) : value
      ])
    );
    result.required = Array.isArray(schema.required)
      ? schema.required
      : Object.keys(properties);
    result.additionalProperties = false;
  } else if (schema.type === "array" && isRecord(schema.items)) {
    result.items = makeStrictSchema(schema.items);
  }
  return result;
}

function makeResponseFormat(responseFormat: AiResponseFormat) {
  return {
    type: "json_schema",
    json_schema: {
      name: "studymate_response",
      strict: true,
      schema: makeStrictSchema(responseFormat.schema)
    }
  };
}

function extractText(content: MessageContent): string {
  if (typeof content === "string") {
    return content.trim();
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text || "")
    .join("")
    .trim();
}

export const openRouterProvider: AiProviderAdapter = {
  id: "openrouter",
  freeFallback: true,

  isConfigured() {
    return Boolean(process.env.OPENROUTER_API_KEY?.trim());
  },

  async generate(request, signal) {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      throw new AiProviderRequestError("authentication", null);
    }

    let response: Response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            { role: "system", content: request.systemInstruction },
            { role: "user", content: request.input }
          ],
          max_tokens: request.maxOutputTokens,
          provider: {
            data_collection: "deny",
            ...(request.responseFormat ? { require_parameters: true } : {})
          },
          ...(request.responseFormat ? {
            response_format: makeResponseFormat(request.responseFormat)
          } : {})
        }),
        signal
      });
    } catch (error) {
      throw new AiProviderRequestError(
        isTimeoutError(error) ? "timeout" : "network",
        null
      );
    }

    let payload: OpenRouterResponse | null;
    try {
      payload = await response.json() as OpenRouterResponse;
    } catch (error) {
      if (signal.aborted || isTimeoutError(error)) {
        throw new AiProviderRequestError("timeout", response.status);
      }
      payload = null;
    }
    if (!response.ok) {
      throw new AiProviderRequestError(
        classifyProviderFailure(response.status, payload?.error?.message),
        response.status
      );
    }

    const choice = payload?.choices?.[0];
    if (!choice || choice.finish_reason === "length") {
      throw new AiProviderRequestError("invalid_response", response.status);
    }

    const answer = extractText(choice.message?.content);
    if (!answer) {
      throw new AiProviderRequestError("invalid_response", response.status);
    }
    return answer;
  }
};
