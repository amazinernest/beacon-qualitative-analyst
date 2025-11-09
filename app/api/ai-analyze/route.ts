import { NextRequest } from "next/server";
import { analyzeWithAI } from "@/lib/ai-analysis";

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

    // Perform AI analysis
    const result = await analyzeWithAI({
      transcripts: documents,
      researchQuestion,
    });
    
    return Response.json(result);
  } catch (e: any) {
    console.error('AI analysis error:', e);
    return new Response(e?.message || "Failed to analyze with AI", { status: 500 });
  }
}
