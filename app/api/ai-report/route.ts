import { NextRequest } from "next/server";
import { analyzeWithAI, generateAIReport } from "@/lib/ai-analysis";

export const maxDuration = 60; // Allow up to 60 seconds for AI processing

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate research question
    const researchQuestion = typeof body?.researchQuestion === "string" 
      ? body.researchQuestion.trim() 
      : "";
    
    if (!researchQuestion) {
      return new Response("Research question is required", { status: 400 });
    }
    
    // Validate transcripts
    const documents = (Array.isArray(body?.documents) ? body.documents : [])
      .map((s: unknown) => (typeof s === "string" ? s.trim() : ""))
      .filter((s: string) => s.length > 0);

    if (documents.length === 0) {
      return new Response("No documents provided", { status: 400 });
    }

    // Extract metadata
    const meta = {
      researchQuestion,
      title: typeof body?.title === "string" ? body.title : undefined,
      author: typeof body?.author === "string" ? body.author : undefined,
      methodology: typeof body?.methodology === "string" ? body.methodology : undefined,
      participantDemographics: typeof body?.participantDemographics === "string" 
        ? body.participantDemographics : undefined,
      additionalNotes: typeof body?.additionalNotes === "string" 
        ? body.additionalNotes : undefined,
      institution: typeof body?.institution === "string" ? body.institution : undefined,
    };

    // Perform AI analysis
    const analysis = await analyzeWithAI({
      transcripts: documents,
      researchQuestion,
    });
    
    // Generate report
    const report = generateAIReport(meta, analysis, documents.length);
    
    return new Response(report, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  } catch (e: any) {
    console.error('AI report generation error:', e);
    return new Response(e?.message || "Failed to generate AI report", { status: 500 });
  }
}
