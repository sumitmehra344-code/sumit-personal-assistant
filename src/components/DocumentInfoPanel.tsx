import React, { useState } from 'react';
import { FileText, FileSpreadsheet, CheckCircle2, Trash2, Eye, ChevronDown, ChevronUp, Layers, Hash, BookOpen } from 'lucide-react';
import { DocumentMetadata } from '../types';

interface DocumentInfoPanelProps {
  document: DocumentMetadata;
  onRemoveDocument: () => void;
  onViewText: () => void;
}

export const DocumentInfoPanel: React.FC<DocumentInfoPanelProps> = ({
  document,
  onRemoveDocument,
  onViewText,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isPdf =
    document.name.toLowerCase().endsWith('.pdf') || document.mimeType === 'application/pdf';
  const isDocx =
    document.name.toLowerCase().endsWith('.docx') ||
    document.name.toLowerCase().endsWith('.doc') ||
    document.mimeType?.includes('word');

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Main Document Summary Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* File Icon + Name + Meta */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                isPdf
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : isDocx
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
              }`}
            >
              {isPdf ? <FileText className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md md:max-w-lg" title={document.name}>
                  {document.name}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Document Ready
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5">
                <span className="font-semibold uppercase text-slate-700">
                  {isPdf ? 'PDF Document' : isDocx ? 'Word Document' : 'Document'}
                </span>
                <span>•</span>
                <span>{formatFileSize(document.sizeBytes)}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                  <Layers className="w-3 h-3 text-slate-400" />
                  {document.pageCount} {document.pageCount === 1 ? 'Page' : 'Pages'}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <Hash className="w-3 h-3 text-slate-400" />
                  {document.wordCount.toLocaleString()} words
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Overview</span>
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              onClick={onViewText}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
              title="Inspect parsed text"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Inspect</span>
            </button>

            {confirmDelete ? (
              <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg p-0.5">
                <button
                  onClick={onRemoveDocument}
                  className="px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200/60 rounded transition-colors cursor-pointer"
                >
                  Confirm Remove
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-1.5 py-1 text-xs text-slate-500 hover:text-slate-800 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Remove Document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Overview & Topics */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="md:col-span-2 space-y-1">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Executive Summary
              </span>
              <p className="text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                {document.summary || document.snippet || 'Ready to analyze and answer queries grounded in this document.'}
              </p>
            </div>

            {document.keyTopics && document.keyTopics.length > 0 && (
              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Detected Topics & Sections
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {document.keyTopics.map((topic, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-indigo-50/80 text-indigo-700 border border-indigo-100 rounded-md text-[11px] font-medium"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
