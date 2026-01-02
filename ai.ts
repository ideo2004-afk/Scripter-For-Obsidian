import { requestUrl, Notice } from 'obsidian';

export interface GeminiResponse {
    text: string;
    error?: string;
}

export class GeminiService {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async callGemini(prompt: string): Promise<GeminiResponse> {
        if (!this.apiKey) {
            return { text: "", error: "API Key not set" };
        }

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;
            const response = await requestUrl({
                url: url,
                method: 'POST',
                contentType: 'application/json',
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const data = response.json;
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

            if (!text) {
                return { text: "", error: "Empty response from AI" };
            }

            return { text };
        } catch (error) {
            console.error("Gemini AI Error:", error);
            return { text: "", error: error.message || "Request failed" };
        }
    }


    /**
     * Specialized prompt for generating a scene summary (Beat)
     */
    async generateSceneSummary(content: string): Promise<GeminiResponse> {
        const prompt = `Act as a professional Hollywood screenwriter and script doctor. 
Sumarize the following scene content into a concise BEAT.
Requirements:
1. Provide exactly ONE short, punchy sentence summarising the scene.
2. The summary MUST be in the same language and script (e.g., Traditional Chinese, English, Japanese) as the provided Scene Content.
3. CRITICAL: If the input is in Traditional Chinese (繁體中文), you must respond in Traditional Chinese. Do NOT use Simplified Chinese (簡體中文).
4. Do not include any other text, intros, explanations, or quotes.
5. CRITICAL: Return PLAIN TEXT ONLY. Do NOT use HTML tags (e.g., <b>, <i>) or Markdown bolding (**).
Format: Just the summary text.

Scene Content:
${content}`;
        return this.callGemini(prompt);
    }


    /**
     * Specialized prompt for bulk processing
     */
    async generateBulkSummaries(transcript: string): Promise<GeminiResponse> {
        const prompt = `Act as a professional Hollywood screenwriter. 
Below is a structured screenplay. 
Some blocks are marked with (REQUEST_SUMMARY_FOR_THIS_BLOCK). 
Please generate a concise ONE-sentence summary for each of those marked blocks.

Requirements:
1. Provide exactly ONE short, punchy sentence per marked block.
2. The summary MUST be in the same language and script as the block's content.
3. CRITICAL: If the input is in Traditional Chinese (繁體中文), you must respond in Traditional Chinese. Do NOT use Simplified Chinese (簡體中文).
4. CRITICAL: Return PLAIN TEXT ONLY. Do NOT use HTML tags or Markdown bolding.
5. Respond ONLY with a list of summaries in the following format:
BLOCK X: Summary text

Screenplay:
${transcript}`;
        return this.callGemini(prompt);
    }

    /**
     * Specialized prompt for rewriting/generating scene content based on rough notes and context
     */
    async generateRewriteScene(content: string, before: string, after: string): Promise<GeminiResponse> {
        const prompt = `CRITICAL LANGUAGE RULE: 
- You MUST respond in the SAME language and style as the "Current Scene Content" and "Context". 
- If the content is in Traditional Chinese, respond in Traditional Chinese. 
- If it's a mix of Mandarin and Taiwanese (台語), maintain that specific mix.
- DO NOT default to English for action lines or narration unless the source content is in English.

Role: You are a professional Screenwriter and Script Doctor.
Task: Rewrite the "Current Scene Content" into a full, evocative screenplay scene while STRICTLY maintaining the original language style.

Requirements:
1. Maintain consistency with the provided "Context Before" and "Context After".
2. Expand rough notes into lean, cinematic Action descriptions and natural Dialogue.
3. SHOW, DON'T TELL: Focus only on what can be SEEN or HEARD on screen. 
4. BE EFFICIENT: Avoid filler or "purple prose".
5. Provide the rewritten script content in standard screenplay format.
6. DO NOT include the Scene Heading (e.g., INT. / EXT.) in the "CONTENT" section.
7. Return ONLY the following format:

SUMMARY: [One sentence summary in Traditional Chinese]
CONTENT:
[The rewritten script content in Traditional Chinese]

Context Before:
${before}

Context After:
${after}

Current Scene Content:
${content}`;
        return this.callGemini(prompt);
    }
    /**
     * Specialized prompt for AI Brainstorm: Asking provocative questions to help the writer
     */
    async generateBrainstormQuestions(content: string, before: string, after: string): Promise<GeminiResponse> {
        const prompt = `CRITICAL LANGUAGE RULE:
- You MUST ask questions in the SAME language and script as the provided "Context".
- If the script uses Traditional Chinese and Taiwanese, your questions must reflect that same linguistic context.
- DO NOT use English or any other language unless the source content is in that language.

Role: You are a professional Screenwriter and Script Doctor.
Goal: Challenge and inspire the writer by asking deep, provocative questions in the original language of the script.

CONTEXT RULES:
1. "Context Before" (preceding 5 scenes) and "Context After" (following 5 scenes).
2. The "Current Scene Content" is a GAP between these two contexts. Ask questions that help fill this gap logically.
3. Focus on character Need/Want, intentions, and conflicts.
4. CRITICAL: Do NOT provide any plot suggestions or direction. 

OUTPUT REQUIREMENTS:
1. Return ONLY the questions, separated by newlines. 
2. Do NOT include any intro, outro, headers, or Markdown formatting.

Context Before:
${before}

Context After:
${after}

Current Scene Content:
${content}`;
        return this.callGemini(prompt);
    }
}
