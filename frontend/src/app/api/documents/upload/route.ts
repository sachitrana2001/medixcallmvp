import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase";
import OpenAI from "openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

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

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();

  try {
    // Get the request body as text
    const rawData = await req.text();
    console.log("Raw document data received:", rawData); // Debug log

    if (!rawData) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    // Extract file content from multipart form data
    let fileName = "";
    let fileContent = "";
    let fileType = "text/plain";

    // Look for the file content between the form boundaries
    const lines = rawData.split("\n");
    let inFileSection = false;
    const fileLines: string[] = [];

    for (const line of lines) {
      // Extract filename from Content-Disposition header
      if (line.includes('Content-Disposition: form-data; name="file"')) {
        const filenameMatch = line.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          fileName = filenameMatch[1];
        }
        inFileSection = true;
        continue;
      }
      if (inFileSection && line.trim() === "") {
        continue;
      }
      if (inFileSection && line.includes("--")) {
        break;
      }
      if (inFileSection) {
        fileLines.push(line);
      }
    }

    fileContent = fileLines.join("\n");

    // Determine file type based on content
    if (fileContent.startsWith("%PDF")) {
      fileType = "application/pdf";
    }

    console.log("Extracted file data:", {
      fileName,
      fileType,
      contentLength: fileContent.length,
    }); // Debug log

    if (!fileName || !fileContent) {
      return NextResponse.json(
        { error: "File name and content are required" },
        { status: 400 }
      );
    }

    // Extract text from PDF
    let text = fileContent;

    if (fileType === "application/pdf") {
      try {
        // Dynamic import to avoid build-time issues
        const pdf = (await import("pdf-parse")).default;

        // Convert the PDF content to a Buffer
        const buffer = Buffer.from(fileContent, "binary");
        const pdfData = await pdf(buffer);
        text = pdfData.text;
        console.log("Extracted text from PDF, length:", text.length);
      } catch (pdfError) {
        console.error("PDF parsing error:", pdfError);
        return NextResponse.json(
          { error: "Failed to parse PDF file" },
          { status: 500 }
        );
      }
    }

    // 1️⃣ Insert document record
    const { data: docData, error: docError } = await supabase
      .from("documents")
      .insert({
        name: fileName,
        storage_path: `text/${fileName}`,
      })
      .select()
      .single();

    if (docError) {
      console.error("Document insert error:", docError);
      return NextResponse.json({ error: docError.message }, { status: 500 });
    }

    const docId = docData.id;

    // 2️⃣ Chunk text
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });
    const chunks = await splitter.splitText(text);

    // 3️⃣ Generate embeddings & insert into doc_chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];

      try {
        const embeddingResponse = await getOpenAIClient().embeddings.create({
          model: "text-embedding-3-small",
          input: chunkText,
        });

        const embedding = embeddingResponse.data[0].embedding;

        const { error: chunkError } = await supabase.from("doc_chunks").insert({
          doc_id: docId,
          chunk_index: i,
          content: chunkText,
          embedding,
        });

        if (chunkError) {
          console.error("Chunk insert error:", chunkError);
        }
      } catch (embeddingError) {
        console.error("Embedding generation error:", embeddingError);
      }
    }

    return NextResponse.json({
      success: true,
      docId,
      chunkCount: chunks.length,
      message: `Successfully processed document with ${chunks.length} chunks`,
    });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      {
        error: "Document upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
