
import React, { useState } from 'react';
import { GlossaryEntry } from '../types';
import { IconPlus, IconTrash } from './Icons';

interface GlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  glossary: GlossaryEntry[];
  setGlossary: (glossary: GlossaryEntry[]) => void;
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({ isOpen, onClose, glossary, setGlossary }) => {
  const [newTerm, setNewTerm] = useState('');
  const [newDefinition, setNewDefinition] = useState('');

  if (!isOpen) return null;

  const handleAdd = () => {
    if (newTerm.trim() && newDefinition.trim()) {
      setGlossary([
        ...glossary,
        { id: Date.now().toString(), term: newTerm.trim(), definition: newDefinition.trim() }
      ]);
      setNewTerm('');
      setNewDefinition('');
    }
  };

  const handleDelete = (id: string) => {
    setGlossary(glossary.filter(item => item.id !== id));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-serif font-bold text-ds-black">Editorial Glossary</h3>
            <p className="text-xs text-gray-500">Define terms to ensure consistent translation.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-ds-black text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Add New Input */}
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Term (e.g., Syndicate)"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ds-green"
            />
            <input
              type="text"
              placeholder="Translation (e.g., সিন্ডিকেট)"
              value={newDefinition}
              onChange={(e) => setNewDefinition(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ds-green"
            />
            <button 
              onClick={handleAdd}
              disabled={!newTerm || !newDefinition}
              className="bg-ds-green text-white p-2 rounded-lg hover:bg-[#006030] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconPlus />
            </button>
          </div>

          {/* List */}
          <div className="space-y-2">
            {glossary.length === 0 ? (
              <div className="text-center text-gray-400 py-8 text-sm italic">
                No custom terms added yet.
              </div>
            ) : (
              glossary.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 group hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-ds-black">{item.term}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-ds-green font-medium">{item.definition}</span>
                  </div>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  >
                    <IconTrash />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 text-right">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-ds-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
