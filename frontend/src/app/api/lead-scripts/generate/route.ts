import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();

  try {
    const { leadId, topK = 3 } = await req.json();

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 }
      );
    }

    // 1️⃣ Get lead information
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // 2️⃣ Get document chunks for the lead's document
    const { data: chunks, error: chunksError } = await supabase
      .from("doc_chunks")
      .select("content")
      .eq("doc_id", lead.doc_id)
      .order("chunk_index", { ascending: true })
      .limit(topK);

    if (chunksError) {
      console.error("Error fetching chunks:", chunksError);
      return NextResponse.json(
        { error: "Failed to fetch document chunks" },
        { status: 500 }
      );
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json(
        { error: "No document content found" },
        { status: 404 }
      );
    }

    // 3️⃣ Combine chunks into context
    const context = chunks.map((chunk) => chunk.content).join("\n\n");

    // 4️⃣ Generate script using OpenAI
    const prompt = `Based on the following document content, generate a personalized PCD Franchise script for ${lead.name} in ${lead.preferred_language} language.

Document Content:
${context}

Please create a conversational, professional PCD Franchise script that:
1. Addresses the customer by name
2. Is in the specified language (${lead.preferred_language})
3. Incorporates relevant information from the document
4. Is engaging and persuasive
5. Includes a clear call-to-action
6. If the language is Hindi, use Hinglish (Hindi mixed with English) - this is more natural for Indian speakers
7. Keep the script concise and easy to speak naturally
8. Use common Hinglish phrases like "aapko", "humara", "company", "products", etc.
9. Focus on PCD Franchise opportunities and business benefits
10. Include information about monopoly rights, district access, and business terms

Script:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            lead.preferred_language?.toLowerCase() === "hindi" ||
            lead.preferred_language?.toLowerCase() === "hi"
              ? "You are a professional Hinglish PCD Franchise script writer. Create personalized, engaging PCD Franchise scripts using Hinglish (Hindi mixed with English) based on document content. Use natural Hinglish expressions that are commonly used in India. Mix Hindi and English naturally - use Hindi for conversational parts and English for technical/business terms. Focus on PCD Franchise opportunities, monopoly rights, district access, and business benefits."
              : "You are a professional PCD Franchise script writer. Create personalized, engaging PCD Franchise scripts based on document content.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const script =
      completion.choices[0]?.message?.content || "Failed to generate script";

    // 5️⃣ Store the generated script
    const { data: scriptData, error: scriptError } = await supabase
      .from("lead_scripts")
      .insert({
        lead_id: leadId,
        script_content: script,
        language: lead.preferred_language,
        doc_id: lead.doc_id,
      })
      .select()
      .single();

    if (scriptError) {
      console.error("Error storing script:", scriptError);
      // Still return the script even if storage fails
      return NextResponse.json({
        success: true,
        scriptId: "generated",
        script: script,
        message: "Script generated but not stored",
      });
    }

    return NextResponse.json({
      success: true,
      scriptId: scriptData.id,
      script: script,
      message: "Script generated successfully",
    });
  } catch (error) {
    console.error("Script generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate script",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
