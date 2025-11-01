import { NextRequest } from "next/server";
import { analyzeCorpus } from "@/lib/analysis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const documents = (Array.isArray(body?.documents) ? body.documents : [])
      .map((s: unknown) => (typeof s === "string" ? s.trim() : ""))
      .filter((s: string) => s.length > 0);

    if (documents.length === 0) {
      return new Response("No documents provided", { status: 400 });
    }

    const result = analyzeCorpus(documents);
    return Response.json(result);
  } catch (e: any) {
    return new Response(e?.message || "Failed to analyze", { status: 500 });
  }
}


