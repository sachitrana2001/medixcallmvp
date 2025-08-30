import fs from "fs";
import path from "path";
import OpenAI from "openai";
import crypto from "crypto";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cache for TTS files to avoid regeneration (memory only)
const ttsCache = new Map();

export async function synthesizeTTS(
  text: string,
  outputPath: string,
  language: string = "en"
) {
  // Create a hash of the text and language for caching
  const textHash = crypto
    .createHash("md5")
    .update(`${text}-${language}`)
    .digest("hex");
  const cacheKey = `${textHash}-${language}`;

  // Check memory cache first
  if (ttsCache.has(cacheKey)) {
    console.log(`🎵 TTS memory cache hit for: ${text.substring(0, 50)}...`);
    return ttsCache.get(cacheKey);
  }

  console.log(`🎵 Generating new TTS for: ${text.substring(0, 50)}...`);

  // Select appropriate voice based on language
  let voice: string;
  let model: string;

  if (language.toLowerCase() === "hindi" || language.toLowerCase() === "hi") {
    voice = "echo"; // Echo works best for Northern Indian Hindi accent
    model = "gpt-4o-mini-tts";
  } else {
    voice = "alloy"; // Default voice for English
    model = "gpt-4o-mini-tts";
  }

  try {
    // Call OpenAI TTS (text-to-speech)
    const response = await openai.audio.speech.create({
      model: model,
      voice: voice,
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
    const ttsUrl = `${baseUrl}/tts/${path.basename(outputPath)}`;

    // Cache the result in memory
    ttsCache.set(cacheKey, ttsUrl);

    console.log(`✅ TTS generated successfully: ${path.basename(outputPath)}`);
    return ttsUrl;
  } catch (error) {
    console.error("❌ TTS generation error:", error);
    throw error;
  }
}
