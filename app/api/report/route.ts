import { NextRequest } from "next/server";
import { analyzeCorpus } from "@/lib/analysis";
import { buildMarkdownReport } from "@/lib/report";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const documents = (Array.isArray(body?.documents) ? body.documents : [])
      .map((s: unknown) => (typeof s === "string" ? s.trim() : ""))
      .filter((s: string) => s.length > 0);
    if (documents.length === 0) return new Response("No documents provided", { status: 400 });

    const meta = {
      title: typeof body?.title === "string" ? body.title : undefined,
      author: typeof body?.author === "string" ? body.author : undefined,
      methodology: typeof body?.methodology === "string" ? body.methodology : undefined,
      methodologyVariations: typeof body?.methodologyVariations === "string" ? body.methodologyVariations : undefined,
      participantDemographics: typeof body?.participantDemographics === "string" ? body.participantDemographics : undefined,
      additionalNotes: typeof body?.additionalNotes === "string" ? body.additionalNotes : undefined,
    };

    const analysis = analyzeCorpus(documents);
    const md = buildMarkdownReport(meta, analysis);
    return new Response(md, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  } catch (e: any) {
    return new Response(e?.message || "Failed to build report", { status: 500 });
  }
}


