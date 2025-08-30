import fs from "fs";
import OpenAI from "openai";

// Lazy OpenAI client initialization
let openaiClient: OpenAI | null = null;

const getOpenAIClient = () => {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is missing");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
};

export async function transcribeAudio(audioFilePath: string): Promise<string> {
  try {
    const audioFile = fs.createReadStream(audioFilePath);
    const transcript = await getOpenAIClient().audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });
    return transcript.text;
  } catch (error) {
    console.error("Transcription error:", error);
    return "Sorry, I couldn't understand that.";
  }
}
