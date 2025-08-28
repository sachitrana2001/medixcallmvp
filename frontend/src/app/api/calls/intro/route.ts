import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

import { createServerSupabaseClient } from "../../../../lib/supabase";
import { synthesizeTTS } from "@/lib/tts";
import Twilio from "twilio";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const leadId = req.nextUrl.searchParams.get("leadId");

  if (!leadId) return new NextResponse("Missing leadId", { status: 400 });

  try {
    // 1️⃣ Fetch lead script from Supabase
    const { data: leadScript, error } = await supabase
      .from("lead_scripts")
      .select("script_text")
      .eq("lead_id", Number(leadId))
      .single();

    const scriptText =
      leadScript?.script_text ||
      "Hello, this is Sachin Rana from DM Pharma Company. Our company is certified and we specialize in delivering high-quality pharmaceutical products. I’d like to share some important information with you. Please stay on the line or leave a message after the beep";

    // 2️⃣ Generate OpenAI TTS MP3
    const ttsDir = path.join("public", "tts");
    if (!fs.existsSync(ttsDir)) {
      fs.mkdirSync(ttsDir, { recursive: true });
    }
    console.log(ttsDir, "ttsDir" , leadId);
    const ttsFilePath = path.join(ttsDir, `lead_${leadId}_intro.mp3`);
    const ttsUrl = await synthesizeTTS(
      scriptText.replace(/\n/g, " "),
      ttsFilePath
    );

    // 3️⃣ Build TwiML response
    const twiml = new Twilio.twiml.VoiceResponse();
    twiml.play(ttsUrl); // Play OpenAI TTS
    twiml.record({
      maxLength: 10,
      action: `/api/calls/recording?leadId=${leadId}&turn=1`,
    });

    return new Response(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error("Error in intro route:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
