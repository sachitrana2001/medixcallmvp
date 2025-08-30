import { NextRequest, NextResponse } from "next/server";
import { twilioClient, twilioNumber } from "../../../../lib/twilio";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  try {
    // Validate environment variables
    if (
      !process.env.TWILIO_ACCOUNT_SID ||
      !process.env.TWILIO_AUTH_TOKEN ||
      !process.env.TWILIO_PHONE_NUMBER
    ) {
      console.error("Missing Twilio environment variables");
      return NextResponse.json(
        { error: "Twilio configuration missing" },
        { status: 500 }
      );
    }

    // if (!process.env.NEXT_PUBLIC_BASE_URL) {
    //   console.error("Missing NEXT_PUBLIC_BASE_URL environment variable");
    //   return NextResponse.json(
    //     { error: "Base URL configuration missing" },
    //     { status: 500 }
    //   );
    // }

    const { leadId } = await req.json();

    if (!leadId) {
      return NextResponse.json(
        { error: "leadId is required" },
        { status: 400 }
      );
    }

    // Fetch lead info
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, name, phone")
      .eq("id", leadId)
      .single();

    if (leadError) {
      console.error("Lead fetch error:", leadError);
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    console.log("Lead data:", lead);

    // Validate phone number
    if (!lead.phone) {
      return NextResponse.json(
        { error: "Lead phone number is missing" },
        { status: 400 }
      );
    }
    console.log(
      "Twilio call URL:",
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/calls/intro?leadId=${leadId}`
    );
    // Create Twilio call
    const call = await twilioClient.calls.create({
      to: lead.phone,
      from: twilioNumber!,
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/calls/intro?leadId=${leadId}`, // TwiML endpoint
    });

    console.log("Twilio call created:", call);

    // Save call SID in Supabase
    const { error: insertError } = await supabase.from("calls").insert({
      lead_id: leadId,
      twilio_call_sid: call.sid, // Changed from call_sid to sid
    });

    if (insertError) {
      console.error("Error saving call to database:", insertError);
      // Don't fail the request if database save fails, but log it
    }

    return NextResponse.json({ success: true, callSid: call.sid });
  } catch (err: any) {
    console.error("Error in /api/calls/start:", err);

    // Provide more specific error messages
    if (err.code === 21211) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    } else if (err.code === 21214) {
      return NextResponse.json(
        { error: "Phone number is not mobile" },
        { status: 400 }
      );
    } else if (err.code === 21608) {
      return NextResponse.json(
        { error: "Invalid Twilio credentials" },
        { status: 500 }
      );
    } else if (err.code === 21614) {
      return NextResponse.json(
        { error: "Invalid Twilio phone number" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: err.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}
