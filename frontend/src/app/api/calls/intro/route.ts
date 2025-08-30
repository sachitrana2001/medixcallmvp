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
    // 1️⃣ Fetch lead information including preferred language
    const { data: lead } = await supabase
      .from("leads")
      .select("preferred_language")
      .eq("id", Number(leadId))
      .single();

    const preferredLanguage = lead?.preferred_language || "en";

    // 2️⃣ Fetch lead script from Supabase
    const { data: leadScript } = await supabase
      .from("lead_scripts")
      .select("script_text")
      .eq("lead_id", Number(leadId))
      .single();

    const scriptText =
      leadScript?.script_text ||
      (preferredLanguage?.toLowerCase() === "hindi" ||
      preferredLanguage?.toLowerCase() === "hi"
        ? "Good Afternoon Sir, main DM Pharma se baat kar raha hun Chandigarh se. Actually aapki query receive hui thi hume portal pe. Toh aap PCD Franchise ke dhoond rahe hain DM Pharma ke saath kaam karna chahte hain. Pehle main aapko kuch conditions bata deta hun. Actually humara PCD ka aisa rahta hai ki hum aapko monopoly base pe business dete hain. Monopoly samajhte ho aap? Aapko access milega aapki district ka. Agar humne aapko goods diye hain toh uss district mein aapke alawa hum kisi aur ko goods nahi denge. Sir, iska yeh hai ki agar aapke saath main kaam start karta hun, aapne humse goods buy kiya hai, toh uske baad aapko monopoly ka agreement milega humari side se. Properly mention hoga ki aapka district hai. Agar aap sale nahi dete ho toh alternative time aapka 3 month tak rahta hai. Uske baad aap se poocha jayega ki Sir aap karna chahte ho aage ya nahi. Aise humara goods kisi aur ko milega hi nahi. Milega toh aapke through. Please line par rahen ya beep ke baad message chhod dein"
        : "Good Afternoon Sir, this is a call from DM Pharma in Chandigarh. We received your query about PCD Franchise. You're looking to work with DM Pharma. I contacted you earlier. Let me first explain some conditions. Our PCD works on a monopoly basis. Do you understand monopoly? You'll get access to your district. If we've given you goods, we won't give goods to anyone else in that district. Sir, this means if I start working with you, after you buy goods from us, you'll get a monopoly agreement from our side. It will be properly mentioned which district is yours. If you don't give sales, you have an alternative time of 3 months. After that, you'll be asked if you want to continue or not. This way, our goods won't go to anyone else. If they do, it will be through you. Please stay on the line or leave a message after the beep");

    // 3️⃣ Generate OpenAI TTS MP3 with language support
    const ttsDir = path.join("public", "tts");
    if (!fs.existsSync(ttsDir)) {
      fs.mkdirSync(ttsDir, { recursive: true });
    }

    // Generate TTS for the script
    const ttsFilePath = path.join(ttsDir, `lead_${leadId}_intro.mp3`);
    const ttsUrl = await synthesizeTTS(
      scriptText.replace(/\n/g, " "),
      ttsFilePath,
      preferredLanguage
    );

    // 4️⃣ Build TwiML response with language attributes
    const twiml = new Twilio.twiml.VoiceResponse();

    // Set language attributes for better voice recognition
    if (
      preferredLanguage?.toLowerCase() === "hindi" ||
      preferredLanguage?.toLowerCase() === "hi"
    ) {
      twiml.say({ language: "hi-IN" }, "Hello, namaste"); // Hinglish greeting
    }

    twiml.play(ttsUrl); // Play OpenAI TTS

    // Set recording language hint
    const recordOptions: {
      maxLength: number;
      action: string;
      language?: string;
    } = {
      maxLength: 10,
      action: `/api/calls/recording?leadId=${leadId}&turn=1`,
    };

    if (
      preferredLanguage?.toLowerCase() === "hindi" ||
      preferredLanguage?.toLowerCase() === "hi"
    ) {
      recordOptions.language = "hi-IN";
    }

    twiml.record(recordOptions);

    return new Response(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error("Error in intro route:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
