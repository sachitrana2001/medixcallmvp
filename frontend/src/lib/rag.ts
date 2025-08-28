import { supabase } from "./supabase";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateLeadReply(leadId: string, leadTranscript: string) {
  // 1. Fetch top 5 relevant doc_chunks for lead
  const { data: chunks, error } = await supabase
    .from("doc_chunks")
    .select("content")
    .limit(5);

  const context = chunks?.map((c) => c.content).join("\n\n") || "";

  // 2. GPT generates reply
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a sales assistant. Respond concisely and professionally." },
      { role: "user", content: `Lead said: ${leadTranscript}\nContext: ${context}` },
    ],
  });

  return completion.choices[0].message?.content || "Sorry, can you repeat?";
}
