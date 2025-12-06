import React, { useState, useEffect, useRef } from 'react';
import { translateContentStream } from './services/gemini';
import { TranslationStatus, TranslationFormat, ModelTier, GlossaryEntry } from './types';
import { IconArrowRight, IconCopy, IconCheck, IconRotate, IconMaximize, IconMinimize, IconSettings, IconTranslate } from './components/Icons';
import { GlossaryModal } from './components/GlossaryModal';

const INPUT_STORAGE_KEY = 'daily_star_translator_input';
const OUTPUT_STORAGE_KEY = 'daily_star_translator_output';
const GLOSSARY_STORAGE_KEY = 'daily_star_translator_glossary';

const App: React.FC = () => {
  // State initialization
  const [inputText, setInputText] = useState(() => {
    try {
      return localStorage.getItem(INPUT_STORAGE_KEY) || '';
    } catch { return ''; }
  });
  
  const [outputText, setOutputText] = useState(() => {
    try {
      return localStorage.getItem(OUTPUT_STORAGE_KEY) || '';
    } catch { return ''; }
  });

  const [status, setStatus] = useState<TranslationStatus>(TranslationStatus.IDLE);
  const [copied, setCopied] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [format, setFormat] = useState<TranslationFormat>('PARAGRAPH_BY_PARAGRAPH');
  const [modelTier, setModelTier] = useState<ModelTier>('FAST');
  const [glossary, setGlossary] = useState<GlossaryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(GLOSSARY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);

  // Persistence Effects
  useEffect(() => {
    try { localStorage.setItem(INPUT_STORAGE_KEY, inputText); } catch {}
  }, [inputText]);

  useEffect(() => {
    try { localStorage.setItem(OUTPUT_STORAGE_KEY, outputText); } catch {}
  }, [outputText]);

  useEffect(() => {
    try { localStorage.setItem(GLOSSARY_STORAGE_KEY, JSON.stringify(glossary)); } catch {}
  }, [glossary]);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    setStatus(TranslationStatus.STREAMING);
    setOutputText('');

    try {
      // Use the streaming service
      await translateContentStream(
        inputText, 
        format, 
        modelTier, 
        glossary,
        (chunk) => {
          setOutputText(prev => prev + chunk);
        }
      );
      setStatus(TranslationStatus.SUCCESS);
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

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setStatus(TranslationStatus.IDLE);
    try { 
      localStorage.removeItem(INPUT_STORAGE_KEY); 
      localStorage.removeItem(OUTPUT_STORAGE_KEY);
    } catch {}
  };

  const toggleFocusMode = () => setIsFocusMode(!isFocusMode);

  return (
    <div className={`min-h-screen flex flex-col font-sans bg-[#F4F4F4] transition-colors duration-300 ${isFocusMode ? 'bg-[#fcfcfc]' : ''}`}>
      
      <GlossaryModal 
        isOpen={isGlossaryOpen} 
        onClose={() => setIsGlossaryOpen(false)} 
        glossary={glossary} 
        setGlossary={setGlossary} 
      />

      {/* Header */}
      {!isFocusMode && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/1/1a/Logo_of_The_Daily_Star.svg" 
                  alt="The Daily Star" 
                  className="h-10 w-auto object-contain"
                />
              </div>
              <div className="h-8 w-px bg-gray-300 hidden sm:block"></div>
              <div className="flex flex-col justify-center">
                <h1 className="text-xl font-bold font-serif text-ds-black leading-none tracking-tight">Translator</h1>
                <p className="text-[10px] text-ds-green uppercase tracking-widest font-bold mt-0.5">Editorial Edition</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleFocusMode}
                className="text-gray-500 hover:text-ds-green p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Enter Focus Mode"
              >
                <IconMaximize />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Focus Mode Exit Button */}
      {isFocusMode && (
        <button 
          onClick={toggleFocusMode}
          className="fixed top-4 right-4 z-50 bg-white shadow-md border border-gray-200 text-gray-500 hover:text-ds-black p-2.5 rounded-full transition-all hover:scale-105 active:scale-95 group"
          title="Exit Focus Mode"
        >
          <IconMinimize />
        </button>
      )}

      {/* Main Content */}
      <main 
        className={`flex-1 flex flex-col lg:flex-row gap-6 mx-auto transition-all duration-500 w-full
          ${isFocusMode 
            ? 'max-w-[98%] px-4 py-4 h-screen' 
            : 'max-w-6xl px-4 py-8'
          }`}
      >
        
        {/* Input Section */}
        <div className="flex-1 flex flex-col gap-4">
          <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col transition-all duration-500 ${isFocusMode ? 'h-full' : 'h-[calc(100vh-12rem)] min-h-[600px]'}`}>
            
            {/* Input Toolbar */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-2 justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-600">Source Text</span>
                <span className="text-xs font-medium text-gray-500 bg-gray-200/60 px-2 py-0.5 rounded-md tabular-nums">{inputText.length.toLocaleString()} chars</span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Format Selector */}
                <select 
                  value={format}
                  onChange={(e) => setFormat(e.target.value as TranslationFormat)}
                  className="text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ds-green cursor-pointer hover:border-ds-green transition-colors"
                >
                  <option value="PARAGRAPH_BY_PARAGRAPH">Paragraph by Paragraph</option>
                  <option value="FULL_TRANSLATION">Full Article Flow</option>
                </select>

                {/* Model Tier Selector */}
                <div className="flex bg-gray-200 rounded-md p-0.5 text-xs font-medium">
                  <button
                    onClick={() => setModelTier('FAST')}
                    className={`px-3 py-1 rounded-sm transition-all ${modelTier === 'FAST' ? 'bg-white text-ds-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Quick
                  </button>
                  <button
                    onClick={() => setModelTier('DEEP_EDITORIAL')}
                    className={`px-3 py-1 rounded-sm transition-all flex items-center gap-1 ${modelTier === 'DEEP_EDITORIAL' ? 'bg-ds-green text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Deep
                  </button>
                </div>

                {/* Glossary Button */}
                <button
                  onClick={() => setIsGlossaryOpen(true)}
                  className={`p-1.5 rounded-md border transition-colors flex items-center gap-1 text-xs font-medium ${glossary.length > 0 ? 'bg-ds-green/10 text-ds-green border-ds-green/20' : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'}`}
                  title="Manage Glossary"
                >
                  <IconSettings /> Glossary {glossary.length > 0 && `(${glossary.length})`}
                </button>

                {inputText && (
                  <button 
                    onClick={handleClear}
                    className="text-xs text-gray-500 hover:text-red-600 transition-colors p-1.5"
                    title="Clear Text"
                  >
                    <IconRotate />
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your article here. The tool will translate it strictly adhering to The Daily Star's editorial style, customized glossary, and idiomatic expressions..."
              className="flex-1 w-full p-6 resize-none focus:outline-none text-lg leading-relaxed font-serif text-gray-800 placeholder-gray-300"
              spellCheck={false}
            />
            
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <button
                onClick={handleTranslate}
                disabled={status === TranslationStatus.LOADING || status === TranslationStatus.STREAMING || !inputText.trim()}
                className={`w-full py-3 px-6 rounded-lg text-white font-medium text-lg shadow-sm transition-all flex items-center justify-center gap-2
                  ${status === TranslationStatus.LOADING || status === TranslationStatus.STREAMING || !inputText.trim()
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-ds-black hover:bg-ds-green active:scale-[0.99]'
                  }`}
              >
                {status === TranslationStatus.LOADING || status === TranslationStatus.STREAMING ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    {status === TranslationStatus.STREAMING ? 'Writing...' : 'Translating...'}
                  </>
                ) : (
                  <>
                    Translate Article <IconArrowRight />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Output Section */}
        <div className="flex-1 flex flex-col gap-4">
          <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col transition-all duration-500 ${isFocusMode ? 'h-full' : 'h-[calc(100vh-12rem)] min-h-[600px]'}`}>
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-600">Journalistic Output</span>
                {outputText && (
                  <span className="text-xs font-medium text-gray-500 bg-gray-200/60 px-2 py-0.5 rounded-md tabular-nums">{outputText.length.toLocaleString()} chars</span>
                )}
              </div>
              <button 
                onClick={handleCopy}
                disabled={!outputText}
                className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${copied ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:bg-gray-200'}`}
              >
                {copied ? <><IconCheck /> Copied</> : <><IconCopy /> Copy</>}
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-[#fafafa]">
              {status === TranslationStatus.ERROR ? (
                <div className="h-full flex flex-col items-center justify-center text-red-500 text-center p-6">
                  <p className="font-semibold text-lg mb-2">Translation Failed</p>
                  <p className="text-sm opacity-80">Please check your internet connection or API key.</p>
                </div>
              ) : !outputText && status !== TranslationStatus.LOADING && status !== TranslationStatus.STREAMING ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 text-center p-6 select-none">
                  <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-300">
                    <IconTranslate />
                  </div>
                  <p className="font-serif text-xl mb-2">Ready to Translate</p>
                  <p className="text-sm font-sans max-w-xs mx-auto mb-4">Paste an article from The Daily Star to get a professionally formatted translation.</p>
                  <div className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                    <span className="font-semibold text-ds-green">Pro Tip:</span> Use "Deep" mode for editorials.
                  </div>
                </div>
              ) : (
                <div className="prose prose-lg max-w-none font-serif text-gray-800 leading-8 whitespace-pre-wrap">
                  {outputText}
                  {(status === TranslationStatus.LOADING || status === TranslationStatus.STREAMING) && (
                     <span className="inline-block w-2 h-5 ml-1 bg-ds-green animate-pulse align-middle"></span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      {!isFocusMode && (
        <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
          <div className="max-w-6xl mx-auto px-4 text-center text-gray-400 text-sm font-sans">
            &copy; {new Date().getFullYear()} Daily Star Editorial Tools. Strict Confidentiality Maintained.
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;