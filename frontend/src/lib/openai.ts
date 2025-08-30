import OpenAI from "openai";

// Lazy OpenAI client initialization
let openaiClient: OpenAI | null = null;

export const openai = new Proxy({} as OpenAI, {
  get(target, prop) {
    if (!openaiClient) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY environment variable is missing");
      }
      openaiClient = new OpenAI({ apiKey });
    }
    return openaiClient[prop as keyof typeof openaiClient];
  },
});
