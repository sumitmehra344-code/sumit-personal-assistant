import React from 'react';
import { Bot, FileText, Plus, RefreshCw, FileSearch, Sparkles } from 'lucide-react';
import { DocumentMetadata } from '../types';

interface HeaderProps {
  document: DocumentMetadata | null;
  onNewChat: () => void;
  onViewDocument: () => void;
  onResetDocument: () => void;
  messageCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  document,
  onNewChat,
  onViewDocument,
  onResetDocument,
  messageCount,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-100">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Sumit Personal Assistant
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                  <Sparkles className="w-2.5 h-2.5" />
                  DocuMind AI
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal hidden sm:block">
                Ask questions. Understand your documents.
              </p>
            </div>
          </div>

          {/* Center/Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {document && (
              <>
                <button
                  onClick={onViewDocument}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors border border-slate-200 shadow-xs cursor-pointer"
                  title="Inspect parsed text from uploaded document"
                >
                  <FileSearch className="w-3.5 h-3.5 text-slate-600" />
                  <span>Inspect Document</span>
                </button>

                {messageCount > 0 && (
                  <button
                    onClick={onNewChat}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-xs cursor-pointer"
                    title="Start a new chat session for this document"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden sm:inline">New Chat</span>
                  </button>
                )}

                <button
                  onClick={onResetDocument}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-xs cursor-pointer"
                  title="Remove current document and upload a new one"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Change Document</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
