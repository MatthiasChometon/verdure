// Deterministic offline embeddings: distinct unit vectors keyed on the text so
// semantic ranking is predictable without a real model.
export class AiStub {
  embed(text: string): Promise<number[] | undefined> {
    const lower = text.toLowerCase();
    if (lower.includes('cactus')) {
      return Promise.resolve([1, 0, 0]);
    }
    if (lower.includes('fern')) {
      return Promise.resolve([0, 1, 0]);
    }
    return Promise.resolve([0, 0, 1]);
  }
}
