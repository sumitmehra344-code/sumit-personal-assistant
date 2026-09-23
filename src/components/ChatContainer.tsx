import React, { useEffect, useRef, useState } from 'react';
import { Bot, User, Copy, Check, RotateCcw, Sparkles, AlertCircle, ArrowDown, Zap } from 'lucide-react';
import { ChatMessage, DocumentMetadata } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatContainerProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  document: DocumentMetadata | null;
  onRetry: (lastUserMessageIndex: number) => void;
  onCitationClick: (citation: string) => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  isGenerating,
  document,
  onRetry,
  onCitationClick,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end',
    });
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, isGenerating]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollBottom(!isNearBottom);
  };

  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const findLastUserIndex = (currentIndex: number) => {
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return i;
    }
    return -1;
  };

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-slate-50/50">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200"
      >
        {messages.map((message, index) => {
          const isUser = message.role === 'user';
          const isLatestAssistant =
            !isUser &&
            index === messages.length - 1 &&
            message.status === 'done' &&
            !isGenerating;

          return (
            <div
              key={message.id}
              className={`flex items-start gap-3 sm:gap-4 max-w-4xl mx-auto ${
                isUser ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ring-2 ${
                  isUser
                    ? 'bg-slate-800 text-white ring-slate-200'
                    : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white ring-indigo-100'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Body */}
              <div
                className={`group relative max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 sm:p-5 shadow-xs transition-all ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-xs'
                    : 'bg-white border border-slate-200/80 text-slate-900 rounded-tl-xs'
                }`}
              >
                {/* User Message */}
                {isUser ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 text-[10px] text-indigo-200 pt-1">
                      <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ) : (
                  /* Assistant Message */
                  <div className="space-y-3">
                    {/* Header meta */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 tracking-tight">
                          DocuMind Assistant
                        </span>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700">
                          <Sparkles className="w-2.5 h-2.5" />
                          Grounded in {document?.name || 'Document'}
                        </span>
                      </div>

                      {/* Top Action Icons */}
                      <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopyMessage(message.content, message.id)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="Copy response"
                        >
                          {copiedMessageId === message.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {isLatestAssistant && (
                          <button
                            onClick={() => {
                              const userIdx = findLastUserIndex(index);
                              if (userIdx !== -1) onRetry(userIdx);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                            title="Regenerate answer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Markdown Content */}
                    <div className="prose-sm max-w-none text-slate-800">
                      <MarkdownRenderer
                        content={message.content}
                        onCitationClick={onCitationClick}
                      />
                    </div>

                    {/* Streaming Cursor */}
                    {message.status === 'streaming' && (
                      <div className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-medium py-1 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                        <span>DocuMind is referencing document sections...</span>
                      </div>
                    )}

                    {/* Error State */}
                    {message.status === 'error' && (
                      <div className="mt-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold block">Failed to generate response</span>
                          <span>{message.error || 'Please try asking the question again.'}</span>
                        </div>
                      </div>
                    )}

                    {/* Footer Info */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        {message.responseTimeMs && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                            <Zap className="w-3 h-3 text-amber-500" />
                            {(message.responseTimeMs / 1000).toFixed(2)}s
                          </span>
                        )}
                      </div>
                      <span>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Global Loading Bubble when waiting for first chunk */}
        {isGenerating && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex items-start gap-3 sm:gap-4 max-w-4xl mx-auto">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs ring-2 ring-indigo-100">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-4 shadow-xs max-w-md space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                <span>DocuMind is reading the document...</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll-to-Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-4 right-6 p-2 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer ring-2 ring-white"
        >
          <ArrowDown className="w-4 h-4" />
          <span className="pr-1">Latest</span>
        </button>
      )}
    </div>
  );
};
