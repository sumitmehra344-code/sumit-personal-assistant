import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Sparkles, CornerDownLeft, X } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onStopGeneration?: () => void;
  isGenerating: boolean;
  disabled?: boolean;
  documentName?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopGeneration,
  isGenerating,
  disabled,
  documentName,
}) => {
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isGenerating && onStopGeneration) {
      onStopGeneration();
      return;
    }

    if (!inputText.trim() || disabled) return;

    onSendMessage(inputText.trim());
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const placeholderText = documentName
    ? `Ask any question grounded in "${documentName}"...`
    : 'Upload a document first to ask questions...';

  return (
    <div className="bg-white border-t border-slate-200 p-3 sm:p-4 shadow-sm">
      <div className="max-w-4xl mx-auto space-y-2">
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
          <div className="relative flex-1 bg-slate-50 focus-within:bg-white border border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 rounded-2xl transition-all shadow-inner overflow-hidden">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              rows={1}
              placeholder={placeholderText}
              className="w-full px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent border-0 resize-none focus:outline-none max-h-40 leading-relaxed"
            />

            {inputText && !isGenerating && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                title="Clear input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Button: Ask AI or Stop */}
          {isGenerating ? (
            <button
              type="button"
              onClick={onStopGeneration}
              className="h-11 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-md transition-all cursor-pointer ring-2 ring-rose-100 shrink-0"
              title="Stop generating answer"
            >
              <Square className="w-4 h-4 fill-white" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputText.trim() || disabled}
              className="h-11 px-4 sm:px-5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ring-2 ring-indigo-200 shrink-0"
              title="Ask question"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask AI</span>
              <CornerDownLeft className="w-3 h-3 opacity-80 hidden sm:inline" />
            </button>
          )}
        </form>

        {/* Bottom Helper Bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">
              Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono text-slate-600">Enter ↵</kbd> to ask
            </span>
            <span className="hidden sm:inline">
              <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono text-slate-600">Shift + Enter</kbd> for new line
            </span>
          </div>
          <span className="font-medium text-slate-500">
            Answers strictly derived from uploaded document
          </span>
        </div>
      </div>
    </div>
  );
};
