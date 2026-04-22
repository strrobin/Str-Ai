/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VideoAnalysisInput {
  transcript: string;
  language: string;
  country: string;
  platform: 'YouTube' | 'Facebook' | 'TikTok' | 'All';
  style: 'Educational' | 'Funny' | 'Motivational' | 'Business';
  file?: {
    data: string; // Base64 encoded data
    mimeType: string;
  };
}

export interface VideoAnalysisResult {
  transcript: string; // The cleaned-up/processed transcript
  analysis: {
    mainTopic: string;
    subtopics: string[];
    intent: string;
    tone: string;
    keyMoments: { time?: string; description: string }[];
    audiencePersona: string;
  };
  seo: {
    shortTailKeywords: string[];
    longTailKeywords: string[];
    trendingKeywords: string[];
  };
  content: {
    titles: string[];
    description: {
      hook: string;
      summary: string;
      cta: string;
    };
    tags: string[];
    hashtags: string[];
    platformOutputs: {
      youtube: { chapters: string[]; title: string; description: string; tags: string[] };
      facebook: string;
      tiktok: string;
    };
    chapters: { timestamp: string; title: string }[];
    thumbnailText: string[];
  };
  viral: {
    hooks: string[];
    shortIdeas: string[];
    bestPostingTime: string;
    audienceTargetingTips: string[];
  };
  scores: {
    seo: number;
    clickability: number;
    viral: number;
  };
  improvements: string[];
}
