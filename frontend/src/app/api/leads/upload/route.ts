import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();

  try {
    // Get the request body as text
    const rawData = await req.text();
    console.log("Raw data received:", rawData); // Debug log

    if (!rawData) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    // Extract CSV content from multipart form data
    let csvData = "";

    // Look for the CSV content between the form boundaries
    const lines = rawData.split("\n");
    let inCsvSection = false;
    let csvLines: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip form boundary lines and metadata
      if (
        trimmedLine.startsWith("------WebKitFormBoundary") ||
        trimmedLine.startsWith("Content-Disposition:") ||
        trimmedLine.startsWith("Content-Type:") ||
        trimmedLine === ""
      ) {
        continue;
      }

      // If we find a line that looks like CSV headers, start collecting
      if (trimmedLine.includes("name") && trimmedLine.includes("phone")) {
        inCsvSection = true;
        csvLines.push(trimmedLine);
        continue;
      }

      // If we're in CSV section and find data, keep collecting
      if (inCsvSection && trimmedLine.includes(",")) {
        csvLines.push(trimmedLine);
      }
    }

    csvData = csvLines.join("\n");
    console.log("Extracted CSV data:", csvData); // Debug log

    if (!csvData) {
      return NextResponse.json(
        { error: "No CSV data found in request" },
        { status: 400 }
      );
    }

    // Parse CSV data with better error handling
    const csvLinesArray = csvData.trim().split("\n");
    console.log("Number of CSV lines:", csvLinesArray.length); // Debug log
    console.log("CSV lines:", csvLinesArray); // Debug log

    if (csvLinesArray.length < 2) {
      return NextResponse.json(
        { error: "CSV must have at least a header row and one data row" },
        { status: 400 }
      );
    }

    const headers = csvLinesArray[0]
      .split(",")
      .map((h) => h.trim().toLowerCase());
    console.log("CSV Headers:", headers); // Debug log

    const leads = [];
    const errors = [];

    for (let i = 1; i < csvLinesArray.length; i++) {
      const line = csvLinesArray[i].trim();
      console.log(`Processing CSV line ${i + 1}: "${line}"`); // Debug log

      if (!line) {
        console.log(`Skipping empty line ${i + 1}`); // Debug log
        continue; // Skip empty lines
      }

      const values = line.split(",").map((v) => v.trim());
      console.log(`Line ${i + 1} values:`, values); // Debug log

      const row: any = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      console.log(`Line ${i + 1} parsed row:`, row); // Debug log

      // Map different possible header names to expected fields
      const lead = {
        name: row.name || row.names || row.full_name || row.fullname || "",
        phone:
          row.phone ||
          row.phones ||
          row.phone_number ||
          row.phonenumber ||
          row.mobile ||
          row.cell ||
          "",
        preferred_language:
          row.preferred_language ||
          row.language ||
          row.lang ||
          row.preferredlanguage ||
          "en",
        doc_id: Number(
          row.doc_id || row.docid || row.document_id || row.documentid || 1
        ),
      };

      console.log(`Line ${i + 1} mapped lead:`, lead); // Debug log

      // Validate required fields
      if (!lead.name || !lead.phone) {
        const errorMsg = `Row ${i + 1}: Missing required fields (name: "${
          lead.name
        }", phone: "${lead.phone}")`;
        console.log(errorMsg); // Debug log
        errors.push(errorMsg);
        continue;
      }

      // Clean phone number (remove non-digits)
      const originalPhone = lead.phone;
      lead.phone = lead.phone.replace(/\D/g, "");
      console.log(
        `Line ${i + 1} phone cleaned: "${originalPhone}" -> "${lead.phone}"`
      ); // Debug log

      // Validate phone number
      if (lead.phone.length < 10) {
        const errorMsg = `Row ${i + 1}: Invalid phone number "${lead.phone}"`;
        console.log(errorMsg); // Debug log
        errors.push(errorMsg);
        continue;
      }

      leads.push(lead);
      console.log(`Line ${i + 1} added to leads array`); // Debug log
    }

    console.log("Final leads array:", leads); // Debug log
    console.log("Validation errors:", errors); // Debug log

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "CSV validation failed",
          details: errors,
          validRows: leads.length,
          totalRows: csvLinesArray.length - 1,
        },
        { status: 400 }
      );
    }

    if (leads.length === 0) {
      return NextResponse.json(
        { error: "No valid leads found in CSV" },
        { status: 400 }
      );
    }

    console.log("Processing leads:", leads); // Debug log

    // Insert leads into database
    for (const lead of leads) {
      const { error } = await supabase.from("leads").insert(lead);
      if (error) {
        console.error("Error inserting lead:", error);
        return NextResponse.json(
          { error: "Failed to insert lead", details: error, lead },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      count: leads.length,
      message: `Successfully uploaded ${leads.length} leads`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
