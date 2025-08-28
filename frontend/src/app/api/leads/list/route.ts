import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../../lib/supabase";

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  try {
    const url = new URL(req.url);
    const filterLang = url.searchParams.get("language") || "";
    const filterDoc = url.searchParams.get("doc_id") || "";
    const search = url.searchParams.get("search") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20");

    let query = supabase.from("leads").select("*", { count: "exact" });

    if (filterLang) query = query.eq("preferred_language", filterLang);
    if (filterDoc) query = query.eq("doc_id", Number(filterDoc));
    if (search)
      query = query.ilike("name", `%${search}%`).or(`phone.ilike.%${search}%`);

    const start = (page - 1) * pageSize;
    const end = page * pageSize - 1;

    const { data, count, error } = await query.range(start, end);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data, count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
