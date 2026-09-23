import React, { useState, useEffect } from 'react';
import { X, Search, Copy, Check, FileText, Layers, Hash, BookOpen, ExternalLink } from 'lucide-react';
import { getDocumentText } from '../services/api';
import { DocumentMetadata } from '../types';

interface DocumentViewerModalProps {
  document: DocumentMetadata;
  isOpen: boolean;
  onClose: () => void;
  initialSearchQuery?: string;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  isOpen,
  onClose,
  initialSearchQuery = '',
}) => {
  const [docDetails, setDocDetails] = useState<{
    text: string;
    pageCount: number;
    wordCount: number;
    htmlPreview?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && document.id) {
      setIsLoading(true);
      getDocumentText(document.id)
        .then((data) => {
          setDocDetails(data);
        })
        .catch((err) => {
          console.error('Failed to load doc text:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, document.id]);

  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  if (!isOpen) return null;

  const handleCopyText = () => {
    if (docDetails?.text) {
      navigator.clipboard.writeText(docDetails.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Highlight search matches
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-amber-200 text-amber-900 rounded-xs px-0.5 font-semibold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const matchesCount = searchQuery.trim() && docDetails?.text
    ? (docDetails.text.match(new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 truncate max-w-md" title={document.name}>
                {document.name}
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-400" />
                  {document.pageCount} Pages
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Hash className="w-3 h-3 text-slate-400" />
                  {document.wordCount.toLocaleString()} Words
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Full Text' : 'Copy Text'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search words, phrases, or section headings..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {searchQuery.trim() && (
            <div className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              {matchesCount} {matchesCount === 1 ? 'match' : 'matches'} found
            </div>
          )}
        </div>

        {/* Document Content View */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 font-mono text-xs leading-relaxed text-slate-800 whitespace-pre-wrap select-text">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <span>Loading extracted document text...</span>
            </div>
          ) : docDetails?.text ? (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs max-w-none">
              {renderHighlightedText(docDetails.text, searchQuery)}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              No readable text extracted.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
          <span>Extracted via Sumit Personal Assistant Document Pipeline</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
