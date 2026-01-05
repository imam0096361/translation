
import React, { useState, useMemo } from 'react';
import { HistoryItem, TranslationFormat } from '../types';
import { IconTrash, IconRotate } from './Icons';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

type DateFilter = 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK';

export const HistoryModal: React.FC<HistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onSelect, 
  onDelete, 
  onClear 
}) => {
  const [formatFilter, setFormatFilter] = useState<TranslationFormat | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      // Format Filter
      if (formatFilter !== 'ALL' && item.format !== formatFilter) return false;

      // Date Filter
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
      const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;

      if (dateFilter === 'TODAY' && item.timestamp < startOfToday) return false;
      if (dateFilter === 'YESTERDAY' && (item.timestamp < startOfYesterday || item.timestamp >= startOfToday)) return false;
      if (dateFilter === 'WEEK' && item.timestamp < startOfWeek) return false;

      // Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const inSource = item.sourceText.toLowerCase().includes(query);
        const inTranslated = item.translatedText.toLowerCase().includes(query);
        if (!inSource && !inTranslated) return false;
      }

      return true;
    });
  }, [history, formatFilter, dateFilter, searchQuery]);

  if (!isOpen) return null;

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-serif font-bold text-ds-black">Translation History</h3>
            <p className="text-xs text-gray-500">View and restore previous transcreations.</p>
          </div>
          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <button 
                onClick={onClear}
                className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-wider px-2 py-1"
              >
                Clear All
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-ds-black text-2xl leading-none transition-transform hover:scale-110">&times;</button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white flex flex-col gap-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Timeframe</label>
              <div className="flex bg-gray-100 p-0.5 rounded-md border border-gray-200">
                {(['ALL', 'TODAY', 'YESTERDAY', 'WEEK'] as DateFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setDateFilter(f)}
                    className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${dateFilter === f ? 'bg-white text-ds-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {f === 'WEEK' ? 'LAST 7D' : f}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Format</label>
              <div className="flex bg-gray-100 p-0.5 rounded-md border border-gray-200">
                <button
                  onClick={() => setFormatFilter('ALL')}
                  className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${formatFilter === 'ALL' ? 'bg-white text-ds-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  ALL
                </button>
                <button
                  onClick={() => setFormatFilter('FULL_TRANSLATION')}
                  className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${formatFilter === 'FULL_TRANSLATION' ? 'bg-white text-ds-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  FULL
                </button>
                <button
                  onClick={() => setFormatFilter('PARAGRAPH_BY_PARAGRAPH')}
                  className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${formatFilter === 'PARAGRAPH_BY_PARAGRAPH' ? 'bg-white text-ds-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  PARA
                </button>
              </div>
            </div>
            
            <div className="ml-auto text-right">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                Showing {filteredHistory.length} of {history.length}
              </span>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search past transcreations by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ds-green/20 focus:border-ds-green transition-all placeholder:text-gray-400 font-sans"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ds-black text-lg"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto bg-white">
          {filteredHistory.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-gray-300 text-center">
              <div className="p-4 bg-gray-50 rounded-full mb-4">
                <IconRotate />
              </div>
              <p className="font-serif text-lg font-bold text-gray-400">No matching history</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your keywords or filters.</p>
              {(dateFilter !== 'ALL' || formatFilter !== 'ALL' || searchQuery !== '') && (
                <button 
                  onClick={() => { setDateFilter('ALL'); setFormatFilter('ALL'); setSearchQuery(''); }}
                  className="mt-4 text-xs font-bold text-ds-green hover:underline uppercase tracking-widest"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((item) => (
                <div 
                  key={item.id} 
                  className="group relative border border-gray-100 rounded-xl overflow-hidden hover:border-ds-green transition-all shadow-sm hover:shadow-md bg-white"
                >
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-ds-green uppercase tracking-widest bg-ds-green/5 px-2 py-0.5 rounded">
                          {item.format === 'FULL_TRANSLATION' ? 'Full Article' : 'Comparative'}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-gray-400">
                        {formatDate(item.timestamp)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                      <div className="sm:border-r sm:border-gray-50 sm:pr-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Source Snippet</p>
                        <p className="text-xs text-gray-600 line-clamp-2 font-serif italic leading-relaxed">
                          {item.sourceText}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Result Snippet</p>
                        <p className="text-xs text-gray-800 line-clamp-2 font-serif leading-relaxed">
                          {item.translatedText}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-50 flex justify-end gap-2">
                      <button 
                        onClick={() => onDelete(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50"
                        title="Delete from history"
                      >
                        <IconTrash />
                      </button>
                      <button 
                        onClick={() => onSelect(item)}
                        className="px-4 py-1.5 bg-ds-black text-white text-[10px] font-bold uppercase tracking-widest rounded-md hover:bg-ds-green transition-all hover:translate-y-[-1px] active:translate-y-[0px]"
                      >
                        Restore Draft
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 text-right">
          <button 
            onClick={onClose}
            className="px-8 py-2 bg-ds-black text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-gray-800 transition-all shadow-sm active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
