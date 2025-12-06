import React, { useState, useEffect } from 'react';
import { translateContent } from './services/gemini';
import { TranslationStatus } from './types';
import { IconTranslate, IconArrowRight, IconCopy, IconCheck, IconRotate, IconMaximize, IconMinimize } from './components/Icons';

const LOCAL_STORAGE_KEY = 'daily_star_translator_draft';

const App: React.FC = () => {
  // Initialize state from localStorage if available
  const [inputText, setInputText] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved || '';
    } catch (e) {
      console.warn('LocalStorage access denied', e);
      return '';
    }
  });
  
  const [outputText, setOutputText] = useState('');
  const [status, setStatus] = useState<TranslationStatus>(TranslationStatus.IDLE);
  const [copied, setCopied] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Auto-save effect
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, inputText);
    } catch (e) {
      // Ignore write errors (e.g. storage full or disabled)
    }
  }, [inputText]);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    setStatus(TranslationStatus.LOADING);
    setOutputText('');

    try {
      const result = await translateContent(inputText);
      setOutputText(result);
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
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      // Ignore
    }
  };

  const toggleFocusMode = () => {
    setIsFocusMode(!isFocusMode);
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans bg-[#F4F4F4] transition-colors duration-300 ${isFocusMode ? 'bg-[#fcfcfc]' : ''}`}>
      
      {/* Header */}
      {!isFocusMode && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ds-green rounded-lg flex items-center justify-center text-white">
                <IconTranslate />
              </div>
              <div>
                <h1 className="text-xl font-bold font-serif text-ds-black leading-tight">Daily Star Translator</h1>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Editorial Edition</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                Powered by Gemini 2.5
              </div>
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
          <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Exit Focus
          </span>
        </button>
      )}

      {/* Main Content */}
      <main 
        className={`flex-1 flex flex-col lg:flex-row gap-6 mx-auto transition-all duration-500 w-full
          ${isFocusMode 
            ? 'max-w-[98%] px-4 py-4 h-screen' 
            : 'max-w-5xl px-4 py-8'
          }`}
      >
        
        {/* Input Section */}
        <div className="flex-1 flex flex-col gap-4">
          <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col transition-all duration-500 ${isFocusMode ? 'h-full' : 'h-[calc(100vh-12rem)] min-h-[500px]'}`}>
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-600">Source Text (Bangla/English)</span>
                <span className="text-xs font-medium text-gray-500 bg-gray-200/60 px-2 py-0.5 rounded-md tabular-nums">{inputText.length.toLocaleString()} chars</span>
              </div>
              {inputText && (
                <button 
                  onClick={handleClear}
                  className="text-xs text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1 font-medium"
                >
                  <IconRotate /> Reset
                </button>
              )}
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your article here. The tool will translate it paragraph-by-paragraph, strictly adhering to The Daily Star's editorial style and idiomatic expressions..."
              className="flex-1 w-full p-6 resize-none focus:outline-none text-lg leading-relaxed font-serif text-gray-800 placeholder-gray-300"
              spellCheck={false}
            />
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <button
                onClick={handleTranslate}
                disabled={status === TranslationStatus.LOADING || !inputText.trim()}
                className={`w-full py-3 px-6 rounded-lg text-white font-medium text-lg shadow-sm transition-all flex items-center justify-center gap-2
                  ${status === TranslationStatus.LOADING || !inputText.trim()
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-ds-black hover:bg-ds-green active:scale-[0.99]'
                  }`}
              >
                {status === TranslationStatus.LOADING ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Translating...
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
          <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col transition-all duration-500 ${isFocusMode ? 'h-full' : 'h-[calc(100vh-12rem)] min-h-[500px]'}`}>
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
                  <p className="text-sm opacity-80">Please check your internet connection or API key and try again.</p>
                </div>
              ) : !outputText && status !== TranslationStatus.LOADING ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 text-center p-6 select-none">
                  <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-300">
                    <IconTranslate />
                  </div>
                  <p className="font-serif text-xl mb-2">Ready to Translate</p>
                  <p className="text-sm font-sans max-w-xs mx-auto">Paste an article from The Daily Star (Bangla or English) to get a professionally formatted translation.</p>
                </div>
              ) : (
                <div className="prose prose-lg max-w-none font-serif text-gray-800 leading-8 whitespace-pre-wrap">
                  {status === TranslationStatus.LOADING && !outputText ? (
                     <div className="animate-pulse space-y-4">
                       <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                       <div className="h-4 bg-gray-200 rounded w-full"></div>
                       <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                       <div className="h-8 bg-transparent"></div>
                       <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                       <div className="h-4 bg-gray-200 rounded w-full"></div>
                     </div>
                  ) : (
                    outputText
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
          <div className="max-w-5xl mx-auto px-4 text-center text-gray-400 text-sm font-sans">
            &copy; {new Date().getFullYear()} Daily Star Editorial Tools. Strict Confidentiality Maintained.
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;