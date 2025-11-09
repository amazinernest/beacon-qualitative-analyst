import { GoogleGenerativeAI } from '@google/generative-ai';

type AIAnalysisInput = {
  transcripts: string[];
  researchQuestion: string;
};

type AIAnalysisResult = {
  themes: {
    name: string;
    description: string;
    subthemes: string[];
    quotes: { text: string; respondentId: string; context: string }[];
    prevalence: string;
    significance: string;
  }[];
  keyFindings: string[];
  patterns: {
    name: string;
    description: string;
    examples: string[];
  }[];
  interpretations: string;
  recommendations: string[];
  methodologyNotes: string;
};

export async function analyzeWithAI(input: AIAnalysisInput): Promise<AIAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set. Get a free key at: https://aistudio.google.com/app/apikey');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Prepare transcripts with IDs
  const transcriptsWithIds = input.transcripts.map((text, idx) => ({
    id: `Respondent ${idx + 1}`,
    text,
  }));

  const transcriptsFormatted = transcriptsWithIds
    .map((t) => `### ${t.id}\n${t.text}`)
    .join('\n\n---\n\n');

  const systemPrompt = `You are an expert qualitative researcher specializing in thematic analysis, grounded theory, and interpretative phenomenological analysis (IPA). Your task is to conduct a rigorous, systematic analysis of interview transcripts.

Your analysis should:
1. Identify major themes and subthemes that directly address the research question
2. Extract verbatim quotes that exemplify each theme with proper context
3. Provide prevalence information (how many respondents mentioned each theme)
4. Offer deep interpretations grounded in the data
5. Identify patterns, relationships, and insights
6. Follow established qualitative research standards (Braun & Clarke, Charmaz, Smith)

Be thorough, systematic, and academically rigorous. Ground all interpretations in the data.`;

  const userPrompt = `Research Question: ${input.researchQuestion}

Please conduct a comprehensive thematic analysis of the following interview transcripts. For each theme you identify:
1. Provide a clear name and comprehensive description
2. Identify subthemes
3. Extract 2-4 representative verbatim quotes with respondent IDs
4. Note prevalence (how many/which respondents discussed this)
5. Explain the significance of the theme in relation to the research question

After identifying themes, provide:
- Key findings that answer the research question
- Patterns and relationships between themes
- Deep interpretations of what the data reveals
- Methodological notes about the analysis
- Recommendations for future research

Interview Transcripts:

${transcriptsFormatted}

Please structure your response as a JSON object with the following format:
{
  "themes": [
    {
      "name": "Theme Name",
      "description": "Detailed description",
      "subthemes": ["Subtheme 1", "Subtheme 2"],
      "quotes": [
        {
          "text": "Exact verbatim quote",
          "respondentId": "Respondent X",
          "context": "Brief context explanation"
        }
      ],
      "prevalence": "X out of Y respondents mentioned this",
      "significance": "Why this theme matters for the research question"
    }
  ],
  "keyFindings": ["Finding 1", "Finding 2"],
  "patterns": [
    {
      "name": "Pattern name",
      "description": "Pattern description",
      "examples": ["Example 1", "Example 2"]
    }
  ],
  "interpretations": "Deep interpretation paragraph(s)",
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "methodologyNotes": "Notes about the analytical approach used"
}`;

  try {
    // Use Gemini 2.0 Flash Experimental (free tier: 15 requests/minute, 1500/day)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3,
      },
    });

    const prompt = `${systemPrompt}\n\n${userPrompt}`;
    
    console.log('Sending request to Gemini API...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('Response received, parsing JSON...');
    
    // Try to extract JSON from markdown code blocks if present
    let jsonText = content.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').trim();
    }

    const parsedResult = JSON.parse(jsonText) as AIAnalysisResult;
    return parsedResult;
  } catch (error: any) {
    console.error('AI analysis error:', error);
    console.error('Error details:', error.response || error);
    
    // Provide more helpful error messages
    if (error.message?.includes('fetch failed')) {
      throw new Error('Network error connecting to Gemini API. Please check your internet connection and API key.');
    }
    if (error.message?.includes('API_KEY_INVALID')) {
      throw new Error('Invalid Gemini API key. Please verify your GEMINI_API_KEY in the .env file.');
    }
    
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

export function generateAIReport(
  input: {
    researchQuestion: string;
    title?: string;
    author?: string;
    methodology?: string;
    participantDemographics?: string;
    additionalNotes?: string;
    institution?: string;
  },
  analysis: AIAnalysisResult,
  transcriptCount: number
): string {
  const title = input.title || 'AI-Powered Qualitative Analysis Report';
  const author = input.author || 'Research Team';
  const date = new Date().toISOString().split('T')[0];
  
  let report = `# ${title}\n\n`;
  report += `**Author**: ${author}\n`;
  if (input.institution) {
    report += `**Institution**: ${input.institution}\n`;
  }
  report += `**Date**: ${date}\n`;
  report += `**Number of Transcripts**: ${transcriptCount}\n\n`;
  report += `---\n\n`;
  
  // Abstract
  report += `## Abstract\n\n`;
  report += `This qualitative study examined ${transcriptCount} interview transcript${transcriptCount > 1 ? 's' : ''} using AI-assisted thematic analysis to explore the research question: "${input.researchQuestion}". `;
  report += `Analysis identified ${analysis.themes.length} major theme${analysis.themes.length > 1 ? 's' : ''} with associated subthemes. `;
  report += `Key findings reveal important insights about ${input.researchQuestion.toLowerCase()}. `;
  report += `This report presents comprehensive thematic analysis with verbatim quotes, interpretations, and recommendations for future research.\n\n`;
  
  // Research Question
  report += `## Research Question\n\n`;
  report += `**${input.researchQuestion}**\n\n`;
  
  if (input.participantDemographics) {
    report += `## Participant Information\n\n${input.participantDemographics}\n\n`;
  }
  
  // Methodology
  report += `## Methodology\n\n`;
  if (input.methodology) {
    report += `${input.methodology}\n\n`;
  } else {
    report += `This analysis employed AI-assisted thematic analysis following established qualitative research principles (Braun & Clarke, 2006). `;
    report += `Transcripts were systematically analyzed to identify patterns, themes, and insights relevant to the research question. `;
    report += `The analysis process involved iterative coding, theme development, and interpretation grounded in the data.\n\n`;
  }
  
  if (analysis.methodologyNotes) {
    report += `**Analytical Notes**: ${analysis.methodologyNotes}\n\n`;
  }
  
  // Key Findings
  report += `## Key Findings\n\n`;
  analysis.keyFindings.forEach((finding, idx) => {
    report += `${idx + 1}. ${finding}\n`;
  });
  report += `\n`;
  
  // Thematic Analysis
  report += `## Thematic Analysis\n\n`;
  report += `The following themes emerged from systematic analysis of the interview transcripts:\n\n`;
  
  analysis.themes.forEach((theme, idx) => {
    report += `### Theme ${idx + 1}: ${theme.name}\n\n`;
    report += `**Description**: ${theme.description}\n\n`;
    
    if (theme.subthemes && theme.subthemes.length > 0) {
      report += `**Subthemes**:\n`;
      theme.subthemes.forEach(subtheme => {
        report += `- ${subtheme}\n`;
      });
      report += `\n`;
    }
    
    report += `**Prevalence**: ${theme.prevalence}\n\n`;
    report += `**Significance**: ${theme.significance}\n\n`;
    
    if (theme.quotes && theme.quotes.length > 0) {
      report += `**Representative Quotes**:\n\n`;
      theme.quotes.forEach(quote => {
        report += `> *${quote.respondentId}*: "${quote.text}"\n`;
        if (quote.context) {
          report += `>\n> *Context*: ${quote.context}\n`;
        }
        report += `\n`;
      });
    }
    
    report += `---\n\n`;
  });
  
  // Patterns
  if (analysis.patterns && analysis.patterns.length > 0) {
    report += `## Patterns and Relationships\n\n`;
    analysis.patterns.forEach((pattern, idx) => {
      report += `### ${idx + 1}. ${pattern.name}\n\n`;
      report += `${pattern.description}\n\n`;
      if (pattern.examples && pattern.examples.length > 0) {
        report += `**Examples**:\n`;
        pattern.examples.forEach(example => {
          report += `- ${example}\n`;
        });
        report += `\n`;
      }
    });
  }
  
  // Interpretations
  report += `## Interpretations and Discussion\n\n`;
  report += `${analysis.interpretations}\n\n`;
  
  // Recommendations
  if (analysis.recommendations && analysis.recommendations.length > 0) {
    report += `## Recommendations\n\n`;
    analysis.recommendations.forEach((rec, idx) => {
      report += `${idx + 1}. ${rec}\n`;
    });
    report += `\n`;
  }
  
  if (input.additionalNotes) {
    report += `## Additional Notes\n\n${input.additionalNotes}\n\n`;
  }
  
  // Limitations
  report += `## Limitations\n\n`;
  report += `This analysis should be interpreted within the following limitations:\n\n`;
  report += `1. **Sample Size**: Analysis is based on ${transcriptCount} transcript${transcriptCount > 1 ? 's' : ''}, which may limit generalizability.\n`;
  report += `2. **AI-Assisted Analysis**: While AI tools can enhance systematic analysis, human researcher judgment and reflexivity remain essential for interpretation.\n`;
  report += `3. **Context**: Findings should be considered within the specific context of the study participants and research setting.\n`;
  report += `4. **Validation**: Future research should validate these findings with additional data sources and populations.\n\n`;
  
  // References
  report += `## References\n\n`;
  report += `Braun, V., & Clarke, V. (2006). Using thematic analysis in psychology. *Qualitative Research in Psychology*, 3(2), 77-101.\n\n`;
  report += `Charmaz, K. (2006). *Constructing grounded theory: A practical guide through qualitative analysis*. Sage.\n\n`;
  report += `Smith, J. A., Flowers, P., & Larkin, M. (2009). *Interpretative phenomenological analysis: Theory, method and research*. Sage.\n\n`;
  
  return report;
}
