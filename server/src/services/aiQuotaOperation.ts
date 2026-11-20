export class AiQuotaError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = "AiQuotaError";
  }
}

export async function runReservedAiOperation<T>(
  operation: () => Promise<T>,
  consumeReservation: () => Promise<boolean>,
  releaseReservation: () => Promise<void>
): Promise<T> {
  try {
    const result = await operation();
    if (!await consumeReservation()) {
      throw new AiQuotaError("The AI quota reservation expired. Please try again.", 503);
    }
    return result;
  } catch (error) {
    try {
      await releaseReservation();
    } catch (releaseError) {
      console.error("Could not release AI quota reservation:", releaseError);
      throw new AiQuotaError("Could not release AI quota. Please try again later.", 503);
    }
    throw error;
  }
}
