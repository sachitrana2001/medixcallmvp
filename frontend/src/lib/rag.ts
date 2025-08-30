import { supabase } from "./supabase";
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

// Cache for lead language preferences
const leadLanguageCache = new Map();
// Cache for document chunks
const chunksCache = new Map();

interface Lead {
  preferred_language?: string;
}

interface DocChunk {
  content: string;
}

export async function generateLeadReply(
  leadId: string,
  leadTranscript: string,
  language: string = "en"
) {
  try {
    // 1. Fetch lead information to get preferred language (with caching)
    let preferredLanguage = language;

    if (!leadLanguageCache.has(leadId)) {
      const { data: lead } = await supabase
        .from("leads")
        .select("preferred_language")
        .eq("id", leadId)
        .single();

      preferredLanguage = lead
        ? (lead as Lead).preferred_language || language
        : language;
      leadLanguageCache.set(leadId, preferredLanguage);
    } else {
      preferredLanguage = leadLanguageCache.get(leadId);
    }

    // 2. Fetch top 5 relevant doc_chunks for lead (with caching)
    let context = "";
    const chunksCacheKey = `chunks-${leadId}`;

    if (!chunksCache.has(chunksCacheKey)) {
      const { data: chunks } = await supabase
        .from("doc_chunks")
        .select("content")
        .limit(5);

      context =
        (chunks as DocChunk[])?.map((c) => c.content).join("\n\n") || "";
      chunksCache.set(chunksCacheKey, context);
    } else {
      context = chunksCache.get(chunksCacheKey);
    }

    // 3. GPT generates reply in the appropriate language
    const systemPrompt =
      preferredLanguage?.toLowerCase() === "hindi" ||
      preferredLanguage?.toLowerCase() === "hi"
        ? "You are a Hinglish-speaking PCD Franchise assistant. Respond concisely and professionally using Hinglish (Hindi mixed with English). Use natural Hinglish expressions that are commonly used in India. Mix Hindi and English naturally - use Hindi for conversational parts and English for technical/business terms. Be warm and professional. Focus on PCD Franchise opportunities, monopoly rights, district access, and business benefits. Keep responses under 50 words for faster conversation flow."
        : "You are a PCD Franchise assistant. Respond concisely and professionally. Keep responses under 50 words for faster conversation flow.";

    const completion = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Lead said: ${leadTranscript}\nContext: ${context}`,
        },
      ],
      max_tokens: 100, // Limit response length for faster generation
      temperature: 0.7,
    });

    return (
      completion.choices[0].message?.content ||
      (preferredLanguage?.toLowerCase() === "hindi"
        ? "Sorry, kya aap dobara bol sakte hain?"
        : "Sorry, can you repeat?")
    );
  } catch (error) {
    console.error("❌ RAG generation error:", error);
    return "Sorry, can you repeat?";
  }
}
