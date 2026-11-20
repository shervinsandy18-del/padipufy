import {
  AiProviderRequestError,
  classifyProviderFailure,
  isTimeoutError,
  type AiProviderAdapter
} from "./aiTypes.js";

type GeminiInteractionResponse = {
  error?: {
    message?: string;
  };
  status?: string;
  steps?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

export const geminiProvider: AiProviderAdapter = {
  id: "gemini",
  freeFallback: false,

  isConfigured() {
    return Boolean(process.env.GEMINI_API_KEY?.trim());
  },

  async generate(request, signal) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new AiProviderRequestError("authentication", null);
    }

    const model = process.env.GEMINI_MODEL?.trim() || "gemini-3-flash-preview";
    let response: Response;
    try {
      response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
          "Api-Revision": "2026-05-20"
        },
        body: JSON.stringify({
          model,
          input: request.input,
          system_instruction: request.systemInstruction,
          generation_config: {
            max_output_tokens: request.maxOutputTokens,
            thinking_level: "minimal"
          },
          ...(request.responseFormat ? { response_format: request.responseFormat } : {}),
          store: false
        }),
        signal
      });
    } catch (error) {
      throw new AiProviderRequestError(
        isTimeoutError(error) ? "timeout" : "network",
        null
      );
    }

    let payload: GeminiInteractionResponse | null;
    try {
      payload = await response.json() as GeminiInteractionResponse;
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

    if (payload?.status === "incomplete") {
      throw new AiProviderRequestError("invalid_response", response.status);
    }

    const answer = payload?.steps
      ?.filter((step) => step.type === "model_output")
      .flatMap((step) =>
        step.content?.filter((part) => part.type === "text").map((part) => part.text || "") || []
      )
      .join("")
      .trim();

    if (!answer) {
      throw new AiProviderRequestError("invalid_response", response.status);
    }

    return answer;
  }
};
