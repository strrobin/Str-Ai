/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { 
  Zap, 
  Search, 
  TrendingUp, 
  Play, 
  Clock, 
  Copy, 
  Check, 
  RefreshCcw,
  RotateCcw,
  Lightbulb,
  Youtube,
  Facebook,
  Smartphone,
  Info,
  Globe,
  Settings2,
  Sparkles,
  ChevronRight,
  Moon,
  Sun,
  Layout as LayoutIcon,
  Download,
  History,
  Languages,
  Edit3,
  Video,
  Link as LinkIcon,
  MoreVertical,
  Plus,
  ArrowRight,
  ShieldCheck,
  Zap as ZapIcon,
  UploadCloud,
  FileText,
  PlayCircle,
  Music,
  VideoOff,
  Mic,
  Share2,
  Menu,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { analyzeVideo, transcribeOnly } from "./services/geminiService";
import { VideoAnalysisInput, VideoAnalysisResult } from "./types";

const PLATFORMS = ["YouTube", "Facebook", "TikTok", "All"] as const;
const STYLES = ["Educational", "Funny", "Motivational", "Business"] as const;

interface HistoryItem {
  id: string;
  timestamp: string;
  input: VideoAnalysisInput;
  result: VideoAnalysisResult;
}

const TypingText = ({ text = "", delay = 10 }: { text?: string; delay?: number }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDisplayedText("");
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (!text) return;
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, delay]);

  return <span className={currentIndex < text.length ? "typing-cursor" : ""}>{displayedText}</span>;
};

export default function App() {
  const [input, setInput] = useState<VideoAnalysisInput>({
    transcript: "",
    language: "Bengali",
    country: "Bangladesh",
    platform: "All",
    style: "Educational",
  });

  const [activeTab, setActiveTab] = useState<'transcribe' | 'analyze'>('analyze');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [workflowStep, setWorkflowStep] = useState<'idle' | 'uploading' | 'transcribing' | 'refining' | 'analyzing'>('idle');
  const [transcriptionResult, setTranscriptionResult] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [result, setResult] = useState<VideoAnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activePlatformTab, setActivePlatformTab] = useState<"youtube" | "facebook" | "tiktok">("youtube");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("viralquest_history");
    if (saved) setHistory(JSON.parse(saved));
    
    // Enforce dark mode
    document.documentElement.classList.add("dark");
  }, []);

  const handleCopy = (text: string, field: string) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const content = `
      VIRALQUEST ANALYSIS REPORT
      Topic: ${result.analysis?.mainTopic || "No Topic"}
      Language: ${input.language}
      
      TITLES:
      ${result.content?.titles?.join("\n- ") || "N/A"}
      
      SEO TAGS:
      ${result.content?.tags?.join(", ") || "N/A"}
      
      YOUTUBE DESCRIPTION:
      ${result.content?.platformOutputs?.youtube?.description || "N/A"}
      
      FACEBOOK CAPTION:
      ${result.content?.platformOutputs?.facebook || "N/A"}
      
      TIKTOK HOOK:
      ${result.content?.platformOutputs?.tiktok || "N/A"}
    `;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `viralquest-report-${new Date().getTime()}.txt`;
    a.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024 * 1024) {
      alert("File too large. Please select a file smaller than 5GB.");
      return;
    }

    setWorkflowStep('uploading');
    setUploadProgress(0);
    setSelectedFileName(file.name);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Content = event.target?.result as string;
      const base64Data = base64Content.split(",")[1];
      
      const fileData = {
        data: base64Data,
        mimeType: file.type,
      };

      // Wait for simulated upload to finish
      setTimeout(async () => {
        setWorkflowStep('transcribing');
        try {
          const text = await transcribeOnly(fileData, input.language);
          setTranscriptionResult(text);
          setWorkflowStep('idle');
        } catch (error) {
          console.error("Transcription failed:", error);
          alert("Transcription failed. Please try a different file.");
          setWorkflowStep('idle');
        }
      }, 2000);
    };
    reader.readAsDataURL(file);
  };

  const onAnalyze = async () => {
    if (!input.transcript.trim()) return;
    setWorkflowStep('analyzing');
    setResult(null);
    try {
      const data = await analyzeVideo(input);
      setResult(data);
      setWorkflowStep('idle');
      const newItem: HistoryItem = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        input: { ...input },
        result: data,
      };
      setHistory(prev => {
        const next = [newItem, ...prev].slice(0, 10);
        localStorage.setItem("viralquest_history", JSON.stringify(next));
        return next;
      });
    } catch (error: any) {
      console.error("Analysis failed:", error);
      if (error?.message?.includes("quota") || error?.message?.includes("429")) {
        alert("দুঃখিত, আজ ফ্রিতে ব্যবহারের লিমিট শেষ হয়ে গেছে। কিছুক্ষণ পর আবার চেষ্টা করুন অথবা কালকে ট্রাই করুন।");
      } else {
        alert("Analysis failed. please check your content or settings.");
      }
      setWorkflowStep('refining');
    } finally {
      // Step handled by AnimatePresence and result state
    }
  };

  const startAnalysis = () => {
    onAnalyze();
  };

  const toggleLanguage = () => {
    setInput(prev => ({ 
      ...prev, 
      language: prev.language === "Bengali" ? "English" : prev.language === "English" ? "Spanish" : "Bengali" 
    }));
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 bg-bg text-text">
      {/* Navbar - Elite Design */}
      <nav className="h-16 md:h-24 px-6 md:px-12 flex items-center justify-between bg-bg/80 backdrop-blur-3xl border-b border-white/5 sticky top-0 z-50 transition-all duration-500">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => { setActiveTab('analyze'); setResult(null); setWorkflowStep('idle'); }}>
          <div className="bg-brand p-2 md:p-2.5 rounded-2xl text-white shadow-2xl shadow-brand/40 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
            <ZapIcon className="w-5 h-5 md:w-6 md:h-6 fill-current" />
          </div>
          <div className="flex flex-col -gap-1">
            <span className="font-display text-xl md:text-2xl font-black tracking-tighter text-text italic leading-none">STR <span className="text-brand not-italic">AI</span></span>
            <span className="text-[9px] font-bold text-brand uppercase tracking-[0.2em] opacity-80 leading-none mt-0.5">Revolutionizing Content</span>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-12 bg-white/5 px-8 py-3 rounded-[2.5rem] border border-white/5 shadow-inner">
          <button 
            onClick={() => { setActiveTab('transcribe'); setResult(null); setWorkflowStep('idle'); }}
            className={`text-sm font-black uppercase tracking-widest transition-all hover:text-brand flex items-center gap-2.5 ${activeTab === 'transcribe' ? 'text-brand' : 'text-text-muted opacity-80'}`}
          >
            <Mic className="w-4 h-4" /> আপলোড
          </button>
          <div className="w-px h-4 bg-white/10" />
          <button 
            onClick={() => { setActiveTab('analyze'); setWorkflowStep('idle'); }}
            className={`text-sm font-black uppercase tracking-widest transition-all hover:text-brand flex items-center gap-2.5 ${activeTab === 'analyze' ? 'text-brand' : 'text-text-muted opacity-80'}`}
          >
            <Zap className="w-4 h-4" /> জেনারেট
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            className="hidden md:flex btn-primary !px-7 !py-3 !rounded-[2rem] !text-xs !font-black !tracking-widest uppercase shadow-xl shadow-brand/30 hover:scale-105 active:scale-95 transition-all"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Start Creating
          </button>
          
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden w-12 h-12 flex items-center justify-center text-text hover:bg-white/5 rounded-2xl transition-all border border-white/5"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isMenuOpen ? "close" : "menu"}
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>

        {/* Mobile Menu Overlay - Refined Design */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMenuOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] md:hidden"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-[#0a0a0a] border-l border-white/10 z-[70] p-8 md:hidden shadow-[-20px_0_100px_rgba(0,0,0,1)]"
              >
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-16">
                     <div className="flex items-center gap-3">
                        <div className="bg-brand p-2 rounded-xl text-white">
                          <ZapIcon className="w-5 h-5 fill-current" />
                        </div>
                        <span className="font-display font-black text-2xl italic tracking-tighter">STR <span className="text-brand not-italic">AI</span></span>
                     </div>
                     <button onClick={() => setIsMenuOpen(false)} className="p-3 bg-white/5 rounded-2xl border border-white/10 text-white"><X className="w-6 h-6" /></button>
                  </div>
                  
                  <div className="flex-1 space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand opacity-60 ml-4 mb-4">Main Navigation</p>
                    <button 
                      onClick={() => { setActiveTab('transcribe'); setResult(null); setWorkflowStep('idle'); setIsMenuOpen(false); }}
                      className={`w-full flex items-center gap-5 p-5 rounded-3xl transition-all ${activeTab === 'transcribe' ? 'bg-brand/20 text-brand ring-1 ring-brand/30' : 'text-text-muted hover:bg-white/5'}`}
                    >
                      <div className={`p-3 rounded-2xl ${activeTab === 'transcribe' ? 'bg-brand text-white shadow-lg shadow-brand/40' : 'bg-white/10'}`}>
                        <Mic className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-lg">অডিও ও ভিডিও</p>
                        <p className="text-xs opacity-60 font-medium">ট্রান্সক্রিপ্ট তৈরি করুন</p>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => { setActiveTab('analyze'); setWorkflowStep('idle'); setIsMenuOpen(false); }}
                      className={`w-full flex items-center gap-5 p-5 rounded-3xl transition-all ${activeTab === 'analyze' ? 'bg-brand/20 text-brand ring-1 ring-brand/30' : 'text-text-muted hover:bg-white/5'}`}
                    >
                      <div className={`p-3 rounded-2xl ${activeTab === 'analyze' ? 'bg-brand text-white shadow-lg shadow-brand/40' : 'bg-white/10'}`}>
                        <Zap className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-lg">জেনারেট কনটেন্ট</p>
                        <p className="text-xs opacity-60 font-medium">ভাইরাল ম্যাজিক শুরু করুন</p>
                      </div>
                    </button>
                  </div>

                  <div className="mt-auto space-y-6">
                    <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/10">
                      <p className="text-xs font-bold text-center text-text-muted mb-4">স্বাগতম, আপনার জার্নি শুরু হোক</p>
                      <button className="w-full btn-primary py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-brand/40">
                        Start Creating Now
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>

      <main className="flex-1 bg-bg pb-10 md:pb-0">
        <AnimatePresence mode="wait">
          {activeTab === 'transcribe' ? (
            /* Transcribe Workflow */
            workflowStep === 'idle' ? (
              <motion.section 
                key="transcribe-hero"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-4xl mx-auto px-6 py-10 md:py-20 text-center"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/10 rounded-full text-brand text-[10px] font-bold mb-6">
                  <Mic className="w-3 h-3" />
                  <span>PRECISE TRANSCRIPTION</span>
                </div>
                <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-text mb-6">
                  অডিও ও ভিডিও ফাইল থেকে <br /> <span className="text-brand">টেক্সট তৈরি করুন</span>
                </h1>
                
                <div className="max-w-xl mx-auto mb-10">
                  <label className="google-card p-10 md:p-16 border-2 border-dashed border-border hover:border-brand transition-all cursor-pointer flex flex-col items-center gap-4 bg-bg group rounded-[2rem]">
                    <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center text-brand group-hover:scale-110 transition-transform shadow-inner">
                      <Video className="w-10 h-10" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xl font-bold text-text">এখানে ফাইল আপলোড করুন</p>
                      <p className="text-sm text-text-muted">MP3, WAV, MP4, MOV (Max 5GB)</p>
                    </div>
                    <input type="file" className="hidden" accept="audio/*,video/*" onChange={handleFileUpload} />
                  </label>
                </div>
                {transcriptionResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="google-card p-6 text-left space-y-4 rounded-3xl"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-text flex items-center gap-2"><FileText className="w-4 h-4 text-brand" /> আপনার ট্রান্সক্রিপ্ট</h3>
                      <button 
                        onClick={() => handleCopy(transcriptionResult, "trans-result")}
                        className="p-2 rounded-full hover:bg-white/5 transition-colors"
                      >
                        {copiedField === 'trans-result' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-text-muted" />}
                      </button>
                    </div>
                    <div className="p-5 bg-bg rounded-2xl border border-border max-h-60 overflow-y-auto">
                      <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">
                        {transcriptionResult}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-4">
                      <button 
                        onClick={() => { setTranscriptionResult(""); setWorkflowStep('idle'); }}
                        className="btn-secondary !rounded-full py-4 sm:py-2 text-sm"
                      >আবার চেষ্টা করুন</button>
                      <button 
                        onClick={() => {
                          setInput(prev => ({ ...prev, transcript: transcriptionResult }));
                          setActiveTab('analyze');
                        }}
                        className="btn-primary !rounded-full flex items-center justify-center gap-2 py-4 sm:py-2 text-sm"
                      >
                        কনটেন্ট তৈরি শুরু করুন <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.section>
            ) : workflowStep === 'uploading' ? (
              <motion.section 
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-2xl mx-auto px-6 py-40 text-center space-y-8"
              >
                <div className="w-24 h-24 bg-google-blue/10 rounded-full flex items-center justify-center text-google-blue mx-auto animate-pulse shadow-lg">
                  <UploadCloud className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-display font-bold dark:text-dark-text">ফাইল আপলোড হচ্ছে...</h2>
                <div className="w-full h-3 bg-google-border dark:bg-dark-border rounded-full overflow-hidden shadow-inner">
                  <motion.div className="h-full bg-google-blue shadow-[0_0_15px_rgba(66,133,244,0.5)]" initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-xl font-display font-bold text-google-blue">{uploadProgress}%</p>
              </motion.section>
            ) : (
              <motion.section 
                key="transcribing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-2xl mx-auto px-6 py-40 text-center space-y-8"
              >
                <div className="w-24 h-24 bg-google-blue/10 rounded-full flex items-center justify-center text-google-blue mx-auto animate-spin shadow-lg">
                   <RefreshCcw className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-display font-bold dark:text-dark-text animate-pulse">প্রসেসিং হচ্ছে...</h2>
                <p className="text-lg text-google-grey-light">AI আপনার ফাইলটি বিশ্লেষণ করছে।</p>
              </motion.section>
            )
          ) : (
            /* Analyze Workflow */
            workflowStep === 'idle' && !result ? (
              <motion.section 
                key="analyze-hero"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto px-6 py-10 md:py-20 text-center space-y-8"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-google-blue/10 rounded-full text-google-blue text-[10px] font-bold">
                  <Zap className="w-3 h-3" />
                  <span>VIRAL CONTENT GENERATOR</span>
                </div>
                <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-google-grey-dark dark:text-dark-text leading-[1.1]">
                  টেক্সট থেকে <br /> <span className="text-google-blue">ভাইরাল কনটেন্ট</span> তৈরি করুন
                </h1>

                <div className="google-card p-4 md:p-6 !rounded-[2rem] border-2 border-google-blue/10 bg-bg-faint dark:bg-dark-bg focus-within:border-google-blue focus-within:shadow-2xl transition-all">
                   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <label className="text-sm font-bold text-google-grey-dark dark:text-dark-text flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-google-blue" /> স্ক্রিপ্ট বা ট্রান্সক্রিপ্ট দিন
                      </label>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              setInput(prev => ({ ...prev, transcript: text }));
                            } catch (e) {
                              console.error("Paste failed", e);
                            }
                          }}
                          className="flex-1 sm:flex-none px-4 py-2 bg-google-blue/10 text-google-blue text-[11px] font-bold rounded-full hover:bg-google-blue hover:text-white transition-all text-center"
                        >পেস্ট করুন</button>
                        <button 
                         onClick={() => setInput(prev => ({ ...prev, transcript: "" }))}
                         className="flex-1 sm:flex-none px-4 py-2 bg-rose-50 text-rose-500 text-[11px] font-bold rounded-full hover:bg-rose-500 hover:text-white transition-all text-center"
                        >মুছে ফেলুন</button>
                      </div>
                   </div>
                   <textarea 
                     value={input.transcript}
                     onChange={(e) => setInput(prev => ({ ...prev, transcript: e.target.value }))}
                     placeholder="আপনার ট্রান্সক্রিপ্ট এখানে দিন..."
                     className="w-full h-48 md:h-60 p-5 rounded-2xl border border-google-border dark:border-dark-border bg-white dark:bg-dark-bg text-sm focus:ring-0 outline-none transition-all resize-none shadow-inner"
                   />
                </div>

                <button 
                  onClick={onAnalyze}
                  disabled={!input.transcript.trim()}
                  className="w-full btn-primary py-5 text-lg shadow-2xl shadow-google-blue/30 disabled:opacity-50 !rounded-[2rem] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  কনটেন্ট জেনারেট করুন <Zap className="w-5 h-5 fill-current" />
                </button>
              </motion.section>
            ) : workflowStep === 'analyzing' ? (
              <motion.section 
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-2xl mx-auto px-6 py-40 text-center space-y-10"
              >
                <div className="flex justify-center gap-4 mb-8">
                  {[0, 1, 2].map(i => (
                    <motion.div 
                      key={i}
                      className="w-4 h-4 bg-google-blue rounded-full"
                      animate={{ y: [0, -20, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
                <div className="space-y-4">
                  <h2 className="text-3xl font-display font-bold dark:text-dark-text">আপনার স্ট্র্যাটেজি তৈরি হচ্ছে...</h2>
                  <div className="flex flex-col items-center gap-2 text-google-grey-light dark:text-dark-text-muted">
                     <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-google-blue" /> SEO Optimization</div>
                     <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-rose-500" /> Viral Hook Generation</div>
                     <div className="flex items-center gap-2"><LayoutIcon className="w-4 h-4 text-emerald-500" /> Multi-Platform Packaging</div>
                  </div>
                </div>
              </motion.section>
            ) : (result && (
            /* Dashboard UI */
            <motion.section 
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="px-6 py-10 max-w-7xl mx-auto"
            >
              <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 mb-8 text-center md:text-left">
                <div className="space-y-1">
                  <div className="flex items-center justify-center md:justify-start gap-2 text-google-blue text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-google-blue animate-pulse" />
                    Dashboard
                  </div>
                  <h2 className="text-3xl md:text-4xl font-display font-black text-google-grey-dark dark:text-dark-text tracking-tighter">Optimization Matrix</h2>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
                  <button onClick={toggleLanguage} className="bg-bg-faint dark:bg-white/5 border border-google-border dark:border-white/5 px-4 py-2.5 rounded-2xl text-xs font-bold dark:text-dark-text flex items-center gap-2 hover:bg-google-blue/10 transition-all shadow-sm">
                    <Globe className="w-3.5 h-3.5 text-google-blue" /> {input.language}
                  </button>
                  <button onClick={handleDownload} className="bg-bg-faint dark:bg-white/5 border border-google-border dark:border-white/5 px-4 py-2.5 rounded-2xl text-xs font-bold dark:text-dark-text flex items-center gap-2 hover:bg-google-blue/10 transition-all shadow-sm">
                    <Download className="w-3.5 h-3.5 text-emerald-500" /> Save
                  </button>
                  <button onClick={() => setResult(null)} className="btn-primary !px-5 !py-2.5 !text-xs !rounded-2xl shadow-xl shadow-google-blue/20">
                    <Plus className="w-3.5 h-3.5" /> New
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Sidebar or Main Cards */}
                <div className="lg:col-span-8 space-y-8">
                  {/* Understanding Card */}
                  <div className="google-card p-6 dark:bg-dark-card border-l-4 border-l-google-blue">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-google-blue/10 rounded-lg">
                        <Info className="w-5 h-5 text-google-blue" />
                      </div>
                      <h3 className="font-bold text-lg dark:text-dark-text">Content Understanding (বোঝাপড়া)</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[10px] uppercase font-bold text-google-grey-light mb-1">Main Topic</h4>
                        <p className="text-sm font-medium dark:text-dark-text">{result?.analysis?.mainTopic || ""}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-[10px] uppercase font-bold text-google-grey-light mb-1">Purpose & Intent</h4>
                          <p className="text-sm dark:text-dark-text">{result?.analysis?.intent || ""}</p>
                        </div>
                        <div>
                          <h4 className="text-[10px] uppercase font-bold text-google-grey-light mb-1">Tone & Voice</h4>
                          <p className="text-sm dark:text-dark-text">{result?.analysis?.tone || ""}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] uppercase font-bold text-google-grey-light mb-1">Key Points</h4>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                           {result?.analysis?.keyMoments?.map((moment, i) => (
                             <li key={i} className="flex gap-2 text-xs text-google-grey-light dark:text-dark-text-muted">
                               <div className="w-1.5 h-1.5 rounded-full bg-google-blue/40 mt-1 shrink-0" />
                               <span>{moment?.description || ""}</span>
                             </li>
                           ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Cards: Titles, Description, etc. */}
                  
                  {/* Titles Card */}
                  <div className="google-card p-6 md:p-8 dark:bg-dark-card border-none shadow-2xl !rounded-[2.5rem]">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-2xl shadow-inner">
                          <TrendingUp className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-xl md:text-2xl dark:text-dark-text">ভাইরাল টাইটেলসমূহ</h3>
                          <p className="text-xs text-google-grey-light dark:text-dark-text-muted">AI দ্বারা অপ্টিমাইজড হাই-CTR টাইটেল</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleCopy(result?.content?.titles?.join("\n") || "", "all-titles")} 
                        className="btn-secondary !py-2 !px-4 text-[10px] font-black uppercase tracking-widest !rounded-full"
                      >
                        Copy All
                      </button>
                    </div>
                    <div className="grid gap-4">
                      {result?.content?.titles?.map((title, i) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          key={i} 
                          className="group p-5 bg-bg-faint dark:bg-dark-bg/50 rounded-3xl border border-google-border dark:border-dark-border flex items-center justify-between hover:border-google-blue hover:shadow-xl transition-all cursor-default"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <span className="w-8 h-8 rounded-full bg-google-blue/10 flex items-center justify-center text-google-blue text-xs font-bold shrink-0">0{i+1}</span>
                            <p className="text-base md:text-lg font-medium text-google-grey-dark dark:text-dark-text leading-snug">
                              {title || ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                            <button 
                              onClick={() => handleCopy(title || "", `title-${i}`)} 
                              className="p-3 bg-white dark:bg-white/5 shadow-md rounded-2xl transition-all text-google-blue active:scale-90"
                            >
                              {copiedField === `title-${i}` ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Platforms Tabs Card */}
                  <div className="google-card overflow-hidden dark:bg-dark-card">
                    <div className="flex border-b border-google-border dark:border-dark-border">
                      <button 
                        onClick={() => setActivePlatformTab("youtube")}
                        className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-2 ${activePlatformTab === "youtube" ? "border-google-blue text-google-blue bg-google-blue/5" : "border-transparent text-google-grey-light hover:text-google-grey-dark dark:hover:text-dark-text"}`}
                      >
                        <Youtube className="w-4 h-4" /> YouTube
                      </button>
                      <button 
                         onClick={() => setActivePlatformTab("facebook")}
                         className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-2 ${activePlatformTab === "facebook" ? "border-google-blue text-google-blue bg-google-blue/5" : "border-transparent text-google-grey-light hover:text-google-grey-dark dark:hover:text-dark-text"}`}
                      >
                        <Facebook className="w-4 h-4" /> Facebook
                      </button>
                      <button 
                         onClick={() => setActivePlatformTab("tiktok")}
                         className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-2 ${activePlatformTab === "tiktok" ? "border-google-blue text-google-blue bg-google-blue/5" : "border-transparent text-google-grey-light hover:text-google-grey-dark dark:hover:text-dark-text"}`}
                      >
                        <Smartphone className="w-4 h-4" /> TikTok
                      </button>
                    </div>
                    <div className="p-6 min-h-[300px]">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activePlatformTab}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-6"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-google-grey-dark dark:text-dark-text uppercase tracking-widest text-[10px]">Optimized Content</h4>
                            <div className="flex items-center gap-2">
                               <button onClick={() => onAnalyze()} className="btn-secondary !p-2 !rounded-lg"><RefreshCcw className="w-4 h-4" /></button>
                               <button 
                                onClick={() => {
                                  const text = activePlatformTab === 'youtube' 
                                    ? result?.content?.platformOutputs?.youtube?.description 
                                    : activePlatformTab === 'facebook' 
                                      ? result?.content?.platformOutputs?.facebook 
                                      : result?.content?.platformOutputs?.tiktok;
                                  handleCopy(text || "", `plat-${activePlatformTab}`);
                                }}
                                className="btn-primary !px-4 !py-2 text-xs flex items-center gap-2"
                               >
                                  {copiedField === `plat-${activePlatformTab}` ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy All</>}
                               </button>
                            </div>
                          </div>
                          
                          <div className="p-4 bg-bg-faint dark:bg-dark-bg rounded-xl border border-google-border dark:border-dark-border min-h-[200px]">
                            <p className="text-sm leading-relaxed text-google-grey-dark dark:text-dark-text whitespace-pre-wrap font-sans">
                              {activePlatformTab === 'youtube' 
                                ? `TITLE: ${result?.content?.platformOutputs?.youtube?.title || ""}\n\nDESCRIPTION:\n${result?.content?.platformOutputs?.youtube?.description || ""}` 
                                : activePlatformTab === 'facebook' 
                                  ? (result?.content?.platformOutputs?.facebook || "") 
                                  : (result?.content?.platformOutputs?.tiktok || "")}
                            </p>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Tags & Metadata Card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="google-card p-6 dark:bg-dark-card">
                      <div className="flex items-center gap-3 mb-6">
                         <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                           <Globe className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                         </div>
                         <h3 className="font-bold dark:text-dark-text">SEO Tags</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result?.content?.tags?.map(tag => (
                          <span key={tag} className="px-3 py-1 bg-white dark:bg-white/5 border border-google-border dark:border-dark-border rounded-full text-xs font-medium text-google-grey-light dark:text-dark-text-muted hover:border-google-blue cursor-default transition-colors">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="google-card p-6 dark:bg-dark-card">
                      <div className="flex items-center gap-3 mb-6">
                         <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                           <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                         </div>
                         <h3 className="font-bold dark:text-dark-text">Thumbnail Hooks</h3>
                      </div>
                      <div className="space-y-3">
                        {result?.content?.thumbnailText?.map((text, i) => (
                           <div key={i} className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-900/20">
                             <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                             <span className="text-sm font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-tighter italic">"{text}"</span>
                           </div>
                        ))}
                      </div>
                    </div>

                    {/* Viral Hooks Card */}
                    <div className="google-card p-6 dark:bg-dark-card">
                      <div className="flex items-center gap-3 mb-6">
                         <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                           <Zap className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                         </div>
                         <h3 className="font-bold dark:text-dark-text">Viral Hooks</h3>
                      </div>
                      <div className="space-y-3">
                        {result?.viral?.hooks?.map((hook, i) => (
                           <div key={i} className="flex gap-3 p-3 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/20">
                             <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</div>
                             <p className="text-xs font-medium text-rose-900 dark:text-rose-200">{hook}</p>
                           </div>
                        ))}
                      </div>
                    </div>

                    {/* Hashtags Card */}
                    <div className="google-card p-6 dark:bg-dark-card">
                      <div className="flex items-center gap-3 mb-6">
                         <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                           <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                         </div>
                         <h3 className="font-bold dark:text-dark-text">Hashtags</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result?.content?.hashtags?.map(tag => (
                          <span key={tag} className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-200 cursor-default">
                             {tag?.startsWith('#') ? tag : `#${tag}`}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Short Form Ideas */}
                    <div className="google-card p-6 dark:bg-dark-card">
                        <div className="flex items-center gap-3 mb-6">
                           <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                             <TrendingUp className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                           </div>
                           <h3 className="font-bold dark:text-dark-text">Short Form Ideas</h3>
                        </div>
                        <div className="space-y-3">
                          {result?.viral?.shortIdeas?.map((idea, i) => (
                             <div key={i} className="flex gap-3 p-4 bg-pink-50 dark:bg-pink-900/10 rounded-xl border border-pink-100 dark:border-pink-900/20">
                               <div className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-bold shrink-0">{i+1}</div>
                               <p className="text-sm text-pink-900 dark:text-pink-200">{idea}</p>
                             </div>
                          ))}
                        </div>
                      </div>

                      {/* Posting Strategy Card */}
                      <div className="google-card p-6 dark:bg-dark-card border-l-4 border-l-emerald-500">
                        <div className="flex items-center gap-3 mb-6">
                           <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                             <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                           </div>
                           <h3 className="font-bold dark:text-dark-text">Posting Strategy</h3>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-[10px] uppercase font-bold text-google-grey-light mb-1">Recommended Time</h4>
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg border border-emerald-100 dark:border-emerald-900/20">
                              {result?.viral?.bestPostingTime || ""}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-[10px] uppercase font-bold text-google-grey-light mb-1">Target Audience</h4>
                            <p className="text-sm dark:text-dark-text leading-relaxed">
                              {result?.analysis?.audiencePersona || ""}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Growth Suggestions Card */}
                      <div className="google-card p-6 dark:bg-dark-card md:col-span-2">
                        <div className="flex items-center gap-3 mb-6">
                           <div className="p-2 bg-google-blue/10 rounded-lg">
                             <Lightbulb className="w-5 h-5 text-google-blue" />
                           </div>
                           <h3 className="font-bold dark:text-dark-text">Growth Suggestions (উন্নতিকরণের পরামর্শ)</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {result?.improvements?.map((tip, i) => (
                            <div key={i} className="flex gap-3 p-4 bg-bg-faint dark:bg-white/5 rounded-xl border border-google-border dark:border-dark-border">
                              <div className="w-5 h-5 rounded-full bg-google-blue/10 text-google-blue flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</div>
                              <p className="text-xs text-google-grey-dark dark:text-dark-text">{tip}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Cleaned Transcript Card */}
                      <div className="google-card p-6 dark:bg-dark-card md:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-google-blue/10 rounded-lg">
                              <Languages className="w-5 h-5 text-google-blue" />
                            </div>
                            <h3 className="font-bold dark:text-dark-text">Cleaned Transcript</h3>
                          </div>
                          <button onClick={() => handleCopy(result?.transcript || "", "cleaned-transcript")} className="text-sm font-medium text-google-blue hover:underline">Copy Transcript</button>
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-4 bg-bg-faint dark:bg-dark-bg rounded-xl border border-google-border dark:border-dark-border">
                          <p className="text-sm leading-relaxed text-google-grey-dark dark:text-dark-text whitespace-pre-wrap">
                            {result?.transcript}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                {/* Right Sidebar: Analytics */}
                <aside className="lg:col-span-4 space-y-8">
                  {/* Scores Section */}
                  <div className="google-card p-6 bg-google-grey-dark text-white shadow-xl">
                    <h3 className="font-display font-medium text-white/60 uppercase tracking-widest text-[10px] mb-6">System Health Matrix</h3>
                    
                    <div className="space-y-8">
                      {[
                        { label: "SEO Performance", score: result?.scores?.seo, color: "bg-google-blue" },
                        { label: "Viral Potential", score: result?.scores?.viral, color: "bg-rose-500" },
                        { label: "Click Probability", score: result?.scores?.clickability, color: "bg-emerald-500" }
                      ].map((s, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between items-end">
                            <span className="text-xs font-medium text-white/80">{s.label}</span>
                            <span className="text-2xl font-display font-bold italic">{s.score || 0}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${s.score || 0}%` }}
                              transition={{ duration: 1, delay: i * 0.2 }}
                              className={`h-full ${s.color}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* History List */}
                  <div className="google-card p-6 dark:bg-dark-card">
                    <div className="flex items-center justify-between mb-6">
                       <h3 className="font-bold flex items-center gap-2 dark:text-dark-text"><History className="w-4 h-4 text-google-blue" /> Recent Analysis</h3>
                       <button className="text-xs text-google-blue font-medium hover:underline">View All</button>
                    </div>
                    <div className="space-y-4">
                      {history?.slice(0, 3).map((item, i) => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-bg-faint dark:hover:bg-white/5 transition-colors cursor-pointer group">
                          <div className="flex items-center gap-3 overflow-hidden">
                             <div className="w-8 h-8 rounded bg-bg-faint dark:bg-dark-bg flex items-center justify-center shrink-0">
                                <Play className="w-3 h-3 text-google-grey-light" />
                             </div>
                             <div className="overflow-hidden">
                                <p className="text-sm font-medium dark:text-dark-text truncate">{item?.result?.analysis?.mainTopic || "No Topic"}</p>
                                <p className="text-[10px] text-google-grey-light dark:text-dark-text-muted">{item?.timestamp ? new Date(item.timestamp).toLocaleDateString() : ""}</p>
                             </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-google-grey-light opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Improvement Tips */}
                  <div className="google-card p-6 border-google-blue/20 bg-google-blue/5 dark:bg-google-blue/10">
                    <h3 className="font-bold text-google-grey-dark dark:text-dark-text mb-4 flex items-center gap-2">
                       <Lightbulb className="w-5 h-5 text-google-blue" /> Strategy Directives
                    </h3>
                    <ul className="space-y-4">
                      {result?.improvements?.map((tip, i) => (
                        <li key={i} className="flex gap-3">
                          <div className="w-5 h-5 rounded-full bg-google-blue text-white flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</div>
                          <p className="text-sm text-google-grey-light dark:text-dark-text-muted leading-relaxed">{tip}</p>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 pt-6 border-t border-google-blue/10">
                       <div className="flex items-center gap-2 text-xs font-bold text-google-grey-dark dark:text-dark-text mb-2">
                          <Clock className="w-4 h-4" /> Optimal Posting Window
                       </div>
                       <p className="text-lg font-display font-medium text-google-blue italic">{result?.viral?.bestPostingTime || ""}</p>
                    </div>
                  </div>
                </aside>
              </div>
            </motion.section>
            ))
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation - App Style */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/90 dark:bg-dark-bg/90 backdrop-blur-2xl border-t border-google-border dark:border-dark-border z-50 flex items-center justify-around px-2 pb-safe">
        {[
          { id: 'transcribe', icon: Mic, label: 'অডিও' },
          { id: 'analyze', icon: Zap, label: 'জেনারেট' },
          { id: 'video-to-audio', icon: Video, label: 'ভি ভিডিও' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setResult(null); setWorkflowStep('idle'); }}
            className={`relative flex flex-col items-center gap-1 transition-all flex-1 py-2 ${activeTab === tab.id ? 'text-google-blue scale-105' : 'text-google-grey-light dark:text-dark-text-muted'}`}
          >
            <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-bold tracking-tighter">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div layoutId="mobile-nav-indicator" className="absolute -top-[1px] w-12 h-1 bg-google-blue rounded-full shadow-[0_0_10px_rgba(66,133,244,0.5)]" />
            )}
          </button>
        ))}
      </div>

      {/* Mobile Overlay Menu Button (Optional Sidebar) */}
      <div className="md:hidden fixed bottom-28 right-6 z-50">
      </div>

      {/* Footer - Professional Polish */}
      <footer className="bg-bg border-t border-white/5 pt-24 pb-44 md:pb-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
            <div className="col-span-1 md:col-span-2 lg:col-span-1 space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/5 rounded-[1.25rem] border border-white/10 flex items-center justify-center text-brand">
                  <ZapIcon className="w-6 h-6 fill-current" />
                </div>
                <span className="font-display font-black text-3xl italic tracking-tighter">STR <span className="text-brand not-italic">AI</span></span>
              </div>
              <p className="text-base text-text-muted leading-relaxed font-medium opacity-80 max-w-xs">
                Next-generation content optimization driven by elite-level AI algorithms. Bangladesh's premier platform for viral results.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-text-muted hover:bg-brand hover:text-white hover:border-brand transition-all">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-text-muted hover:bg-brand hover:text-white hover:border-brand transition-all">
                  <Smartphone className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-text-muted hover:bg-brand hover:text-white hover:border-brand transition-all">
                  <Share2 className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div className="space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">আমাদের সার্ভিসসমূহ</h4>
              <ul className="space-y-4 text-sm font-bold text-text-muted">
                <li><button onClick={() => { setActiveTab('analyze'); setResult(null); }} className="hover:text-brand transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand" /> ভাইরাল টাইটেল জেনারেটর</button></li>
                <li><button onClick={() => { setActiveTab('analyze'); setResult(null); }} className="hover:text-brand transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand" /> হাই-কনভার্টিং ডেসক্রিপশন</button></li>
                <li><button onClick={() => { setActiveTab('analyze'); setResult(null); }} className="hover:text-brand transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand" /> এসইও অপ্টিমাইজড ট্যাগ</button></li>
                <li><button onClick={() => { setActiveTab('analyze'); setResult(null); }} className="hover:text-brand transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand" /> প্রফেশনাল বায়ো এবং শোল্ডার ব্যাগ</button></li>
                <li><button onClick={() => { setActiveTab('analyze'); setResult(null); }} className="hover:text-brand transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand" /> থাম্বনেইল হুক স্ট্র্যাটেজি</button></li>
              </ul>
            </div>

            <div className="space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">Connect</h4>
              <ul className="space-y-4 text-sm font-bold text-text-muted">
                <li><a href="https://www.facebook.com/profile.php?id=61586575149744" target="_blank" className="hover:text-brand transition-colors flex items-center gap-2">Str Robin (FB) <ArrowRight className="w-3 h-3" /></a></li>
                <li><a href="https://www.tiktok.com/@strrobin1" target="_blank" className="hover:text-brand transition-colors flex items-center gap-2">TikTok Channel <ArrowRight className="w-3 h-3" /></a></li>
                <li><a href="#" className="hover:text-brand transition-colors">Discord Community</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">Email Support</a></li>
              </ul>
            </div>

            <div className="space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">Support</h4>
              <ul className="space-y-4 text-sm font-bold text-text-muted">
                <li><a href="#" className="hover:text-brand transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">API Documentation</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-brand transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-between pt-12 border-t border-white/5 space-y-10 lg:space-y-0">
            <div className="text-center lg:text-left space-y-2">
              <p className="text-lg font-black text-text italic">© 2026 Crafted by <span className="text-brand not-italic">Str Robin</span></p>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-60">Revolutionizing the Bengali Creator Ecosystem</p>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2.5 px-5 py-2.5 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-muted">
                <Globe className="w-3.5 h-3.5 text-brand" /> Bengali (BD)
              </div>
              <div className="flex items-center gap-2.5 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Secure Platform
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
