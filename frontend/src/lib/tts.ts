import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function synthesizeTTS(text: string, outputPath: string) {
  // Call OpenAI TTS (text-to-speech)
  const response = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
  });

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Save MP3 locally
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);

  // Return public URL for TwiML
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://fbc303e9bee1.ngrok-free.app";
  return `${baseUrl}/tts/${path.basename(outputPath)}`;
}
