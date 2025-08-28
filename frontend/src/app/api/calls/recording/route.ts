import { NextRequest, NextResponse } from "next/server";
import Twilio from "twilio";
import fs from "fs";
import path from "path";

import { transcribeAudio } from "@/lib/whisper";
import { generateLeadReply } from "@/lib/rag";
import { synthesizeTTS } from "@/lib/tts";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const leadId = url.searchParams.get("leadId");
  const turn = Number(url.searchParams.get("turn") || 1);
  if (turn > 5) {
    const twiml = new Twilio.twiml.VoiceResponse();
    twiml.say("Thank you for your time. Goodbye!");
    return new Response(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
  if (!leadId)
    return NextResponse.json({ error: "Missing leadId" }, { status: 400 });

  const formData = await req.formData();
  const recordingUrl = formData.get("RecordingUrl")?.toString();
  if (!recordingUrl)
    return NextResponse.json({ error: "No RecordingUrl" }, { status: 400 });

  // 1️⃣ Download Twilio recording with authentication
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not found");
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const audioRes = await fetch(`${recordingUrl}.mp3`, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  if (!audioRes.ok) {
    throw new Error(`Failed to download recording: ${audioRes.statusText}`);
  }
  const audioBuffer = await audioRes.arrayBuffer();

  // Ensure directory exists
  const ttsDir = path.join("public", "tts");
  if (!fs.existsSync(ttsDir)) {
    fs.mkdirSync(ttsDir, { recursive: true });
  }

  const audioFilePath = path.join(ttsDir, `lead_${leadId}_turn${turn}.mp3`);
  fs.writeFileSync(audioFilePath, Buffer.from(audioBuffer));

  // 2️⃣ Transcribe lead
  const transcript = await transcribeAudio(audioFilePath);

  // 3️⃣ GPT reply using RAG
  const replyText = await generateLeadReply(leadId, transcript);

  // 4️⃣ Generate OpenAI TTS MP3
  const ttsFilePath = path.join(
    "public",
    "tts",
    `lead_${leadId}_turn${turn + 1}.mp3`
  );
  const ttsUrl = await synthesizeTTS(replyText, ttsFilePath);

  // 5️⃣ Build TwiML response
  const twiml = new Twilio.twiml.VoiceResponse();
  twiml.play(ttsUrl);
  twiml.record({
    maxLength: 8,
    action: `/api/calls/recording?leadId=${leadId}&turn=${turn + 1}`,
  });

  return new Response(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
