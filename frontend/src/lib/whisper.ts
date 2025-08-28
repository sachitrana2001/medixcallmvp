import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Audio file not found: ${filePath}`);
  }

  const audio = fs.createReadStream(filePath);
  const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model: "whisper-1",
  });
  return transcription.text;
}
