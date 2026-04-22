/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { VideoAnalysisInput, VideoAnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    transcript: { type: Type.STRING, description: "The cleaned-up and processed transcript in the target language" },
    analysis: {
      type: Type.OBJECT,
      properties: {
        mainTopic: { type: Type.STRING },
        subtopics: { type: Type.ARRAY, items: { type: Type.STRING } },
        intent: { type: Type.STRING },
        tone: { type: Type.STRING },
        keyMoments: { 
          type: Type.ARRAY, 
          items: { 
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING },
              description: { type: Type.STRING }
            }
          }
        },
        audiencePersona: { type: Type.STRING },
      },
      required: ["mainTopic", "subtopics", "intent", "tone", "keyMoments", "audiencePersona"]
    },
    seo: {
      type: Type.OBJECT,
      properties: {
        shortTailKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        longTailKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        trendingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["shortTailKeywords", "longTailKeywords", "trendingKeywords"]
    },
    content: {
      type: Type.OBJECT,
      properties: {
        titles: { type: Type.ARRAY, items: { type: Type.STRING } },
        description: { 
          type: Type.OBJECT,
          properties: {
            hook: { type: Type.STRING },
            summary: { type: Type.STRING },
            cta: { type: Type.STRING }
          }
        },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
        platformOutputs: {
          type: Type.OBJECT,
          properties: {
            youtube: { 
              type: Type.OBJECT,
              properties: {
                chapters: { type: Type.ARRAY, items: { type: Type.STRING } },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            facebook: { type: Type.STRING },
            tiktok: { type: Type.STRING }
          }
        },
        chapters: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              timestamp: { type: Type.STRING },
              title: { type: Type.STRING }
            }
          }
        },
        thumbnailText: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["titles", "description", "tags", "hashtags", "platformOutputs", "chapters", "thumbnailText"]
    },
    viral: {
      type: Type.OBJECT,
      properties: {
        hooks: { type: Type.ARRAY, items: { type: Type.STRING } },
        shortIdeas: { type: Type.ARRAY, items: { type: Type.STRING } },
        bestPostingTime: { type: Type.STRING },
        audienceTargetingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["hooks", "shortIdeas", "bestPostingTime", "audienceTargetingTips"]
    },
    scores: {
      type: Type.OBJECT,
      properties: {
        seo: { type: Type.NUMBER },
        clickability: { type: Type.NUMBER },
        viral: { type: Type.NUMBER },
      },
      required: ["seo", "clickability", "viral"]
    },
    improvements: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["transcript", "analysis", "seo", "content", "viral", "scores", "improvements"]
} as any;

function cleanJSON(text: string): string {
  // Remove markdown code blocks if present
  return text.replace(/```json\n?|```/g, "").trim();
}

export async function transcribeOnly(file: { data: string; mimeType: string }, language: string): Promise<string> {
  const parts: any[] = [
    { text: `
      You are a specialized Speech-to-Text AI.
      Your task is to accurately transcribe the provided audio/video file.
      
      RULES:
      1. Transcribe EVERY WORD accurately.
      2. Remove filler words (um, ah, etc.) and repetitive stuttering.
      3. If the audio is NOT in ${language}, translate it into natural, high-quality ${language}.
      4. DO NOT generate any marketing content, SEO, or titles yet. ONLY return the cleaned transcript.
      
      Return ONLY a JSON object with a single key "transcript".
    ` },
    {
      inlineData: {
        mimeType: file.mimeType,
        data: file.data
      }
    }
  ];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transcript: { type: Type.STRING }
        },
        required: ["transcript"]
      } as any
    },
  });

  try {
    const cleanedText = cleanJSON(response.text || '{"transcript": ""}');
    const res = JSON.parse(cleanedText);
    return res.transcript || response.text || "";
  } catch (e) {
    console.error("Failed to parse transcript JSON:", e, response.text);
    return response.text || ""; // Fallback
  }
}

export async function analyzeVideo(input: VideoAnalysisInput): Promise<VideoAnalysisResult> {
  const parts: any[] = [
    { text: `
      You are a specialized Speech-to-Text AI and AI Content Expert.
      Your primary task is to process audio/video input (or text transcript) and generate professional, viral-ready SEO content.

      CORE RESPONSIBILITIES:
      1. TRANSCRIPTION & TRANSLATION:
         - Create a clean, full transcript from provided audio/video.
         - REMOVE filler words ("um", "ah").
         - FIX pronunciation/grammar while preserving original meaning.
         - CRITICAL: If the source audio/video is in ANY language other than Bengali, you MUST TRANSLATE the entire transcript into BENGALI.
         - The final "transcript" field in your JSON MUST be in BENGALI.

      2. CONTENT ANALYSIS (বোঝাপড়া):
         - Identify Main Topic, Sub-topics, Intent, Tone, and Key Points.
         - Generate these in BENGALI.

      3. CONTENT GENERATION:
         - TITLES: 5-10 clickable, SEO-friendly titles (In Bengali).
         - DESCRIPTION: JSON object with { hook: string, summary: string, cta: string } (In Bengali).
         - KEYWORDS: 15-25 highly relevant terms (Mix of Bengali and English).
         - HASHTAGS: 5-10 relevant hashtags.
         - PLATFORM OUTPUTS:
           - Facebook: Engaging caption with emojis.
           - YouTube: Extremely detailed and comprehensive SEO content in Bengali (Catchy Title, deep-dive Description (300-500 words), structured segments like "Key Topics", "Summary", tags, and CTAs).
           - TikTok: Short hook + caption.
         - VIRAL TOOLS: 
            - 3-5 viral hooks.
            - 3-5 short video ideas.
            - bestPostingTime: Best day/time to post.
            - audienceTargetingTips: Array of 3-5 tips.

      4. SCORING & IMPROVEMENTS:
         - Provide numeric scores (0-100) for SEO, Virality, and Clickability.
         - improvements: Array of suggestions to improve title, engagement, and reach.

      STRICT RULES:
      - NEVER imagine facts. Use ONLY what is communicated in the source.
      - Use natural, human-sounding Bengali language.
      - If the target language is Bengali, output everything in Bengali unless it's a technical tag/keyword.
    ` }
  ];

  // Add the source content
  if (input.transcript) {
    // If transcript exists (especially if edited by user), use it as primary source
    // We EXCLUDE the file binary here to speed up analysis significantly and avoid payload limits
    parts.push({ text: `TRANSCRIPT TO ANALYZE (Primary Source): ${input.transcript}` });
  } else if (input.file) {
    // Fallback to just file if no transcript is present yet (unlikely in current flow)
    parts.push({
      inlineData: {
        mimeType: input.file.mimeType,
        data: input.file.data
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA as any,
      },
    });

    const cleanedText = cleanJSON(response.text || "{}");
    let jsonResult: any;
    try {
      jsonResult = JSON.parse(cleanedText);
      if (!jsonResult || typeof jsonResult !== 'object') {
        throw new Error("Invalid AI response format");
      }
    } catch (e) {
      console.error("JSON Parse failed, attempting fallback keys:", e);
      jsonResult = {};
    }
    
    // Ensure all critical sections exist with default empty values to prevent UI crashes
    return {
      transcript: jsonResult.transcript || input.transcript || "",
      analysis: {
        mainTopic: jsonResult.analysis?.mainTopic || "No topic identified",
        subtopics: jsonResult.analysis?.subtopics || [],
        intent: jsonResult.analysis?.intent || "",
        tone: jsonResult.analysis?.tone || "",
        keyMoments: jsonResult.analysis?.keyMoments || [],
        audiencePersona: jsonResult.analysis?.audiencePersona || ""
      },
      seo: {
        shortTailKeywords: jsonResult.seo?.shortTailKeywords || [],
        longTailKeywords: jsonResult.seo?.longTailKeywords || [],
        trendingKeywords: jsonResult.seo?.trendingKeywords || []
      },
      content: {
        titles: jsonResult.content?.titles || [],
        description: {
          hook: jsonResult.content?.description?.hook || "",
          summary: jsonResult.content?.description?.summary || "",
          cta: jsonResult.content?.description?.cta || ""
        },
        tags: jsonResult.content?.tags || [],
        hashtags: jsonResult.content?.hashtags || [],
        platformOutputs: {
          youtube: {
            title: jsonResult.content?.platformOutputs?.youtube?.title || "",
            description: jsonResult.content?.platformOutputs?.youtube?.description || "",
            tags: jsonResult.content?.platformOutputs?.youtube?.tags || [],
            chapters: jsonResult.content?.platformOutputs?.youtube?.chapters || []
          },
          facebook: jsonResult.content?.platformOutputs?.facebook || "",
          tiktok: jsonResult.content?.platformOutputs?.tiktok || ""
        },
        chapters: jsonResult.content?.chapters || [],
        thumbnailText: jsonResult.content?.thumbnailText || []
      },
      viral: {
        hooks: jsonResult.viral?.hooks || [],
        shortIdeas: jsonResult.viral?.shortIdeas || [],
        bestPostingTime: jsonResult.viral?.bestPostingTime || "",
        audienceTargetingTips: jsonResult.viral?.audienceTargetingTips || []
      },
      scores: {
        seo: jsonResult.scores?.seo || 0,
        clickability: jsonResult.scores?.clickability || 0,
        viral: jsonResult.scores?.viral || 0
      },
      improvements: jsonResult.improvements || []
    } as VideoAnalysisResult;
  } catch (e) {
    console.error("Failed call or parse analysis JSON:", e);
    throw new Error("AI output parsing failed or request timed out. Please try a shorter content or check your connection.");
  }
}
