
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { translateContentStream, detectLanguage } from './services/gemini';
import { getAllHistory, saveHistoryItem, deleteHistoryItem, clearHistory } from './services/db';
import { TranslationStatus, TranslationFormat, ModelTier, GlossaryEntry, ContentType, Language, HistoryItem } from './types';
import { IconArrowRight, IconCopy, IconCheck, IconRotate, IconMaximize, IconMinimize, IconSettings, IconTranslate, IconThumbsUp, IconThumbsDown, IconHistory, IconBolt, IconBrain, IconNews, IconFeather } from './components/Icons';
import { GlossaryModal } from './components/GlossaryModal';
import { HistoryModal } from './components/HistoryModal';

const INPUT_STORAGE_KEY = 'daily_star_translator_input';
const OUTPUT_STORAGE_KEY = 'daily_star_translator_output';
const GLOSSARY_STORAGE_KEY = 'daily_star_translator_glossary';
const HISTORY_STORAGE_KEY = 'daily_star_translator_history';
const FORMAT_STORAGE_KEY = 'daily_star_translator_format';

const DEEP_MESSAGES = [
  "Analysing contextual nuances...",
  "Applying The Daily Star House Style...",
  "Verifying journalistic tone...",
  "Cross-referencing editorial standards...",
  "Refining sentence structures...",
  "Optimising for British English standards...",
  "Checking terminology consistency..."
];

const FAST_MESSAGES = [
  "Processing transcreation...",
  "Generating draft...",
  "Polishing output..."
];

const App: React.FC = () => {
  const [inputText, setInputText] = useState(() => {
    try { return localStorage.getItem(INPUT_STORAGE_KEY) || ''; } catch { return ''; }
  });
  
  const [outputText, setOutputText] = useState(() => {
    try { return localStorage.getItem(OUTPUT_STORAGE_KEY) || ''; } catch { return ''; }
  });

  const [status, setStatus] = useState<TranslationStatus>(TranslationStatus.IDLE);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [useSearch, setUseSearch] = useState(true);
  const [sources, setSources] = useState<any[]>([]);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  
  const [format, setFormat] = useState<TranslationFormat>(() => {
    try {
      return (localStorage.getItem(FORMAT_STORAGE_KEY) as TranslationFormat) || 'FULL_TRANSLATION';
    } catch { return 'FULL_TRANSLATION'; }
  });

  const [modelTier, setModelTier] = useState<ModelTier>('FAST');
  const [contentType, setContentType] = useState<ContentType>('HARD_NEWS');
  const [glossary, setGlossary] = useState<GlossaryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(GLOSSARY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const detectedLang = useMemo(() => detectLanguage(inputText), [inputText]);
  const outputTextRef = useRef('');

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const legacyHistoryStr = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (legacyHistoryStr) {
          const legacyHistory: HistoryItem[] = JSON.parse(legacyHistoryStr);
          for (const item of legacyHistory) {
            await saveHistoryItem(item);
          }
          localStorage.removeItem(HISTORY_STORAGE_KEY);
        }

        const data = await getAllHistory();
        setHistory(data);
      } catch (err) {
        console.error("Failed to load history from IndexedDB", err);
      }
    };
    loadHistory();
  }, []);

  // Message cycler for loading state
  useEffect(() => {
    let interval: number;
    if (status === TranslationStatus.STREAMING) {
      interval = window.setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % (modelTier === 'DEEP_EDITORIAL' ? DEEP_MESSAGES.length : FAST_MESSAGES.length));
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [status, modelTier]);

  useEffect(() => {
    try { localStorage.setItem(INPUT_STORAGE_KEY, inputText); } catch {}
  }, [inputText]);

  useEffect(() => {
    try { 
      localStorage.setItem(OUTPUT_STORAGE_KEY, outputText); 
      outputTextRef.current = outputText;
    } catch {}
  }, [outputText]);

  useEffect(() => {
    try { localStorage.setItem(GLOSSARY_STORAGE_KEY, JSON.stringify(glossary)); } catch {}
  }, [glossary]);

  useEffect(() => {
    try { localStorage.setItem(FORMAT_STORAGE_KEY, format); } catch {}
  }, [format]);

  const addToHistory = async (source: string, result: string, fmt: TranslationFormat) => {
    if (!source.trim() || !result.trim()) return;
    
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      sourceText: source,
      translatedText: result,
      format: fmt,
      timestamp: Date.now()
    };

    try {
      await saveHistoryItem(newItem);
      const data = await getAllHistory();
      setHistory(data);
    } catch (err) {
      console.error("Failed to save history item", err);
    }
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    setStatus(TranslationStatus.STREAMING);
    setOutputText('');
    setSources([]);
    setFeedback(null);
    setLoadingMessageIndex(0);

    try {
      let currentOutput = '';
      await translateContentStream(
        inputText, 
        format, 
        modelTier, 
        glossary,
        contentType,
        useSearch,
        (chunk) => {
          currentOutput += chunk;
          setOutputText(currentOutput);
        },
        (foundSources) => {
          setSources(prev => [...prev, ...foundSources]);
        }
      );
      
      setStatus(TranslationStatus.SUCCESS);
      addToHistory(inputText, currentOutput, format);
    } catch (error) {
      console.error(error);
      setStatus(TranslationStatus.ERROR);
    }
  };

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: 'positive' | 'negative') => {
    setFeedback(type);
    console.log(`[Feedback Logged] Quality: ${type}. Content: "${inputText.substring(0, 50)}..."`);
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setSources([]);
    setFeedback(null);
    setStatus(TranslationStatus.IDLE);
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setInputText(item.sourceText);
    setOutputText(item.translatedText);
    setFormat(item.format);
    setIsHistoryOpen(false);
    setStatus(TranslationStatus.SUCCESS);
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      await deleteHistoryItem(id);
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      console.error("Failed to delete history item", err);
    }
  };

  const handleClearHistory = async () => {
    if (confirm('Are you sure you want to clear your entire translation history?')) {
      try {
        await clearHistory();
        setHistory([]);
      } catch (err) {
        console.error("Failed to clear history", err);
      }
    }
  };

  const toggleFocusMode = () => setIsFocusMode(!isFocusMode);

  const activeLoadingMessage = modelTier === 'DEEP_EDITORIAL' 
    ? DEEP_MESSAGES[loadingMessageIndex] 
    : FAST_MESSAGES[loadingMessageIndex];

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-500 ${isFocusMode ? 'bg-white' : 'bg-[#F4F4F4]'}`}>
      
      <GlossaryModal 
        isOpen={isGlossaryOpen} 
        onClose={() => setIsGlossaryOpen(false)} 
        glossary={glossary} 
        setGlossary={setGlossary} 
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={handleSelectHistory}
        onDelete={handleDeleteHistory}
        onClear={handleClearHistory}
      />

      {!isFocusMode && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/1/1a/Logo_of_The_Daily_Star.svg" 
                alt="The Daily Star" 
                className="h-10 w-auto object-contain"
              />
              <div className="h-8 w-px bg-gray-300 hidden sm:block"></div>
              <div className="flex flex-col justify-center">
                <h1 className="text-xl font-bold font-serif text-ds-black leading-none tracking-tight">Expert Translator</h1>
                <p className="text-[10px] text-ds-green uppercase tracking-widest font-bold mt-0.5">High Fidelity Journalistic AI</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                onClick={() => setIsHistoryOpen(true)}
                className="text-gray-500 hover:text-ds-green p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="History"
              >
                <IconHistory />
              </button>
              <button 
                onClick={() => setIsGlossaryOpen(true)}
                className="text-gray-500 hover:text-ds-green p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Glossary Settings"
              >
                <IconSettings />
              </button>
              <button onClick={toggleFocusMode} className="text-gray-500 hover:text-ds-green p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Focus Mode">
                <IconMaximize />
              </button>
            </div>
          </div>
        </header>
      )}

      {isFocusMode && (
        <button 
          onClick={toggleFocusMode} 
          className="fixed top-4 right-4 z-[60] bg-white/80 backdrop-blur shadow-lg border border-gray-200 text-gray-500 p-2.5 rounded-full hover:scale-110 transition-all active:scale-95"
          title="Exit Focus Mode"
        >
          <IconMinimize />
        </button>
      )}

      <main className={`flex-1 flex flex-col lg:flex-row w-full transition-all duration-500 ${isFocusMode ? 'h-screen fixed inset-0 z-50 gap-0 overflow-hidden' : 'max-w-6xl mx-auto px-4 py-8 gap-6'}`}>
        
        {/* Input Section */}
        <div className={`flex-1 flex flex-col ${isFocusMode ? 'border-r border-gray-100' : 'gap-4'}`}>
          <div className={`bg-white overflow-hidden flex flex-col h-full transition-all duration-500 ${isFocusMode ? 'rounded-none' : 'rounded-xl shadow-sm border border-gray-200 min-h-[500px]'}`}>
            <div className={`px-4 py-3 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200 flex flex-wrap gap-4 justify-between items-center shrink-0`}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Article Input</span>
                {detectedLang !== 'UNKNOWN' && (
                  <span className="text-[10px] bg-ds-green/10 text-ds-green px-2 py-0.5 rounded font-bold uppercase tracking-tight">
                    {detectedLang}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center bg-gray-200/50 rounded-md p-0.5 border border-gray-200 shadow-inner group">
                  <button 
                    onClick={() => setFormat('PARAGRAPH_BY_PARAGRAPH')} 
                    className={`px-3 py-1 text-[10px] font-black rounded-sm transition-all uppercase tracking-tighter ${format === 'PARAGRAPH_BY_PARAGRAPH' ? 'bg-white text-ds-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    PARA
                  </button>
                  <button 
                    onClick={() => setFormat('FULL_TRANSLATION')} 
                    className={`px-3 py-1 text-[10px] font-black rounded-sm transition-all uppercase tracking-tighter ${format === 'FULL_TRANSLATION' ? 'bg-white text-ds-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    FULL
                  </button>
                </div>

                {!isFocusMode && (
                  <>
                    {/* Content Type Selector */}
                    <div className="flex items-center bg-gray-200/50 rounded-md p-0.5 border border-gray-200 shadow-sm">
                      <button 
                        onClick={() => setContentType('HARD_NEWS')} 
                        className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-sm transition-all uppercase ${contentType === 'HARD_NEWS' ? 'bg-white text-ds-black shadow-sm' : 'text-gray-400 hover:text-gray-500'}`}
                        title="Hard News Style"
                      >
                        <IconNews />
                        <span>News</span>
                      </button>
                      <button 
                        onClick={() => setContentType('OP_ED')} 
                        className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-sm transition-all uppercase ${contentType === 'OP_ED' ? 'bg-white text-ds-green shadow-sm' : 'text-gray-400 hover:text-gray-500'}`}
                        title="Opinion Editorial Style"
                      >
                        <IconFeather />
                        <span>Op-Ed</span>
                      </button>
                    </div>

                    {/* Model Tier Selector */}
                    <div className="flex items-center bg-gray-200/50 rounded-md p-0.5 border border-gray-200 shadow-sm">
                      <button 
                        onClick={() => setModelTier('FAST')} 
                        className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-sm transition-all uppercase ${modelTier === 'FAST' ? 'bg-white text-ds-black shadow-sm' : 'text-gray-400 hover:text-gray-500'}`}
                        title="Fast Translation (Flash)"
                      >
                        <IconBolt />
                        <span>Fast</span>
                      </button>
                      <button 
                        onClick={() => setModelTier('DEEP_EDITORIAL')} 
                        className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-sm transition-all uppercase ${modelTier === 'DEEP_EDITORIAL' ? 'bg-ds-green text-white shadow-sm' : 'text-gray-400 hover:text-gray-500'}`}
                        title="Deep Editorial Quality (Pro)"
                      >
                        <IconBrain />
                        <span>Deep</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste content here..."
              className={`flex-1 w-full p-8 resize-none focus:outline-none font-serif text-gray-800 placeholder-gray-200 bg-transparent transition-all duration-300 leading-relaxed ${isFocusMode ? 'text-xl lg:text-3xl lg:p-12' : 'text-lg'}`}
              spellCheck={false}
            />
            
            <div className={`p-4 border-t border-gray-100 shrink-0 flex items-center gap-3 transition-all ${isFocusMode ? 'bg-white' : 'bg-white'}`}>
              <button
                onClick={handleTranslate}
                disabled={status === TranslationStatus.LOADING || status === TranslationStatus.STREAMING || !inputText.trim() || detectedLang === 'UNKNOWN'}
                className={`flex-1 rounded-lg text-white font-bold shadow-md transition-all flex items-center justify-center gap-3
                  ${isFocusMode ? 'py-5 text-xl' : 'py-4 text-lg'}
                  ${status === TranslationStatus.LOADING || status === TranslationStatus.STREAMING || !inputText.trim() || detectedLang === 'UNKNOWN'
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-ds-black hover:bg-ds-green hover:translate-y-[-2px] active:translate-y-[1px]'
                  }`}
              >
                {status === TranslationStatus.STREAMING ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Transcreating...</span>
                  </>
                ) : (
                  <>
                    Run Transcreation <IconArrowRight />
                  </>
                )}
              </button>
              {inputText && (
                <button 
                  onClick={handleClear}
                  className={`p-4 text-gray-400 hover:text-red-500 transition-colors border border-gray-200 rounded-lg hover:bg-red-50 ${isFocusMode ? 'p-5' : 'p-4'}`}
                  title="Clear All"
                >
                  <IconRotate />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Output Section */}
        <div className={`flex-1 flex flex-col ${isFocusMode ? '' : 'gap-4'}`}>
          <div className={`bg-white overflow-hidden flex flex-col h-full transition-all duration-500 relative ${isFocusMode ? 'rounded-none' : 'rounded-xl shadow-sm border border-gray-200 min-h-[500px]'}`}>
            
            {/* Active Analysis Banner */}
            {status === TranslationStatus.STREAMING && (
              <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 z-20 overflow-hidden">
                <div className="h-full bg-ds-green animate-progress-indeterminate"></div>
              </div>
            )}

            <div className={`px-4 py-3 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200 flex justify-between items-center shrink-0 z-10`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-ds-green uppercase tracking-widest">DS Editorial Output</span>
                {status === TranslationStatus.STREAMING && (
                  <div className="flex items-center gap-2 animate-pulse">
                    <span className="w-1.5 h-1.5 bg-ds-green rounded-full"></span>
                    <span className="text-[10px] text-ds-green font-bold italic tracking-tight">{activeLoadingMessage}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {outputText && status === TranslationStatus.SUCCESS && (
                  <div className="flex items-center gap-1 mr-2 px-2 border-r border-gray-200">
                    <button 
                      onClick={() => handleFeedback('positive')}
                      className={`p-1.5 rounded transition-colors ${feedback === 'positive' ? 'text-ds-green bg-ds-green/10' : 'text-gray-400 hover:text-ds-green hover:bg-gray-100'}`}
                    >
                      <IconThumbsUp />
                    </button>
                    <button 
                      onClick={() => handleFeedback('negative')}
                      className={`p-1.5 rounded transition-colors ${feedback === 'negative' ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-500 hover:bg-gray-100'}`}
                    >
                      <IconThumbsDown />
                    </button>
                  </div>
                )}
                <button onClick={handleCopy} disabled={!outputText} className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all ${copied ? 'text-green-600 bg-green-50 border border-green-200' : 'text-gray-500 hover:bg-gray-200 border border-transparent hover:border-gray-300'}`}>
                  {copied ? <><IconCheck /> Copied</> : <><IconCopy /> Copy Text</>}
                </button>
              </div>
            </div>
            
            <div className={`flex-1 overflow-y-auto bg-[#FCFCFD] p-8 transition-all duration-300 relative ${isFocusMode ? 'lg:p-16' : 'lg:p-8'}`}>
              
              {/* Initial Processing Screen */}
              {status === TranslationStatus.STREAMING && !outputText && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] p-8 text-center animate-in fade-in duration-500">
                  <div className="relative mb-8">
                    <div className="w-20 h-20 border-4 border-ds-green/10 border-t-ds-green rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       <IconTranslate />
                    </div>
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-ds-black mb-2">Editorial Engine Active</h3>
                  <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed">{activeLoadingMessage}</p>
                  <div className="mt-8 flex gap-1 justify-center">
                    <span className="w-1.5 h-1.5 bg-ds-green/40 rounded-full animate-bounce delay-75"></span>
                    <span className="w-1.5 h-1.5 bg-ds-green/60 rounded-full animate-bounce delay-150"></span>
                    <span className="w-1.5 h-1.5 bg-ds-green/80 rounded-full animate-bounce delay-300"></span>
                  </div>
                </div>
              )}

              {status === TranslationStatus.ERROR ? (
                <div className="h-full flex flex-col items-center justify-center text-red-500 text-center p-6">
                  <p className="font-semibold text-lg mb-2 text-red-700">Editorial Protocol Interrupted</p>
                  <button onClick={handleTranslate} className="text-sm font-bold text-gray-500 hover:text-ds-black underline">Retry Translation</button>
                </div>
              ) : !outputText && status !== TranslationStatus.STREAMING ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-200 text-center p-6 select-none opacity-50">
                  <IconTranslate />
                  <p className="font-serif text-3xl font-black mt-4">Draft Output</p>
                  <p className="text-sm mt-3 max-w-sm font-sans leading-relaxed tracking-tight">The transcreation will follow The Daily Star's house style, including British spellings and crisp journalistic structure.</p>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <article className={`prose prose-ds max-w-none font-serif text-gray-900 transition-all duration-300 whitespace-pre-wrap flex-1 ${isFocusMode ? 'text-xl lg:text-3xl leading-relaxed lg:leading-[1.8]' : 'text-lg leading-8'}`}>
                    {outputText}
                    {status === TranslationStatus.STREAMING && (
                       <span className="inline-block w-2 h-6 ml-1 bg-ds-green animate-pulse align-middle"></span>
                    )}
                  </article>

                  {sources.length > 0 && !isFocusMode && (
                    <div className="mt-12 pt-6 border-t border-gray-100 font-sans">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Context Grounding</h4>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(sources.filter(s => s.web).map(s => s.web.uri))).slice(0, 5).map((uri, i) => (
                          <a 
                            key={i} 
                            href={uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] bg-white border border-gray-200 px-3 py-1 rounded hover:border-ds-green hover:text-ds-green transition-all"
                          >
                            Source Link {i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%); width: 30%; }
          50% { transform: translateX(100%); width: 60%; }
          100% { transform: translateX(300%); width: 30%; }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 2s infinite linear;
        }
        .prose-ds p { margin-bottom: 1.5em; }
        ::selection { background-color: rgba(0, 122, 62, 0.1); color: #007a3e; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>
    </div>
  );
};

export default App;
