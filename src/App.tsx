import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DocumentUploader } from './components/DocumentUploader';
import { DocumentInfoPanel } from './components/DocumentInfoPanel';
import { QuickActions } from './components/QuickActions';
import { ChatContainer } from './components/ChatContainer';
import { ChatInput } from './components/ChatInput';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { DocumentMetadata, ChatMessage } from './types';
import { streamChatMessage, deleteDocument } from './services/api';

export default function App() {
  const [activeDocument, setActiveDocument] = useState<DocumentMetadata | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [abortStream, setAbortStream] = useState<(() => void) | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [viewerSearchQuery, setViewerSearchQuery] = useState<string>('');

  // Handle document successfully loaded
  const handleDocumentLoaded = (doc: DocumentMetadata) => {
    setActiveDocument(doc);

    // Initial greeting from DocuMind AI
    const initialWelcomeMessage: ChatMessage = {
      id: `msg_welcome_${Date.now()}`,
      role: 'assistant',
      content: `### Welcome to DocuMind AI!

I have analyzed **${doc.name}** (${doc.pageCount} ${doc.pageCount === 1 ? 'page' : 'pages'}, ${doc.wordCount.toLocaleString()} words).

${doc.summary ? `**Document Summary:**\n${doc.summary}\n\n` : ''}
You can now ask any question grounded specifically in this document. Select one of the quick actions above or type your question below!`,
      timestamp: new Date().toISOString(),
      status: 'done',
    };

    setMessages([initialWelcomeMessage]);
  };

  // Handle user asking a question
  const handleSendMessage = (questionText: string, quickActionId?: string) => {
    if (!activeDocument || isGenerating || !questionText.trim()) return;

    const userMessageId = `user_${Date.now()}`;
    const assistantMessageId = `assistant_${Date.now() + 1}`;
    const startTime = Date.now();

    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: questionText,
      timestamp: new Date().toISOString(),
      status: 'done',
      quickActionUsed: quickActionId,
    };

    const initialAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      status: 'streaming',
    };

    // Format chat history for context
    const historyPayload = messages
      .filter((m) => m.status === 'done')
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setIsGenerating(true);

    const abortFn = streamChatMessage(
      activeDocument.id,
      questionText,
      historyPayload,
      {
        onChunk: (chunkText) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: chunkText, status: 'streaming' }
                : msg
            )
          );
        },
        onDone: (finalText) => {
          const elapsed = Date.now() - startTime;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: finalText || "I couldn't find this information in the uploaded document.",
                    status: 'done',
                    responseTimeMs: elapsed,
                  }
                : msg
            )
          );
          setIsGenerating(false);
          setAbortStream(null);
        },
        onError: (err) => {
          console.error('Chat generation error:', err);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content:
                      msg.content ||
                      "I encountered an error while processing your request. Please try asking again.",
                    status: 'error',
                    error: err.message,
                  }
                : msg
            )
          );
          setIsGenerating(false);
          setAbortStream(null);
        },
      }
    );

    setAbortStream(() => abortFn);
  };

  // Handle Stop Generation
  const handleStopGeneration = () => {
    if (abortStream) {
      abortStream();
      setAbortStream(null);
      setIsGenerating(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.status === 'streaming'
            ? { ...msg, status: 'done', content: msg.content + ' *(Generation stopped)*' }
            : msg
        )
      );
    }
  };

  // Handle Retry Answer
  const handleRetry = (userMessageIndex: number) => {
    if (userMessageIndex < 0 || userMessageIndex >= messages.length) return;
    const userMsg = messages[userMessageIndex];
    if (userMsg && userMsg.role === 'user') {
      // Remove all messages after the user message and re-send
      setMessages((prev) => prev.slice(0, userMessageIndex));
      handleSendMessage(userMsg.content, userMsg.quickActionUsed);
    }
  };

  // Handle New Chat for current document
  const handleNewChat = () => {
    if (!activeDocument) return;
    if (abortStream) abortStream();
    setIsGenerating(false);

    const initialWelcomeMessage: ChatMessage = {
      id: `msg_welcome_${Date.now()}`,
      role: 'assistant',
      content: `Started a fresh conversation for **${activeDocument.name}**.\n\nAsk any question or pick a quick action to begin!`,
      timestamp: new Date().toISOString(),
      status: 'done',
    };
    setMessages([initialWelcomeMessage]);
  };

  // Handle Remove / Change Document
  const handleResetDocument = async () => {
    if (abortStream) abortStream();
    if (activeDocument) {
      deleteDocument(activeDocument.id).catch(() => {});
    }
    setActiveDocument(null);
    setMessages([]);
    setIsGenerating(false);
    setIsViewerOpen(false);
  };

  // Handle Citation chip click -> Opens Viewer Modal with search
  const handleCitationClick = (citation: string) => {
    // Extract key search terms from citation (e.g. "[Section 2.1]" -> "Section 2.1" or "2.1")
    const cleanCitation = citation.replace(/[\[\]]/g, '').trim();
    setViewerSearchQuery(cleanCitation);
    setIsViewerOpen(true);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Application Header */}
      <Header
        document={activeDocument}
        onNewChat={handleNewChat}
        onViewDocument={() => {
          setViewerSearchQuery('');
          setIsViewerOpen(true);
        }}
        onResetDocument={handleResetDocument}
        messageCount={messages.length}
      />

      {/* Main Body */}
      {!activeDocument ? (
        /* Upload & Empty State Screen */
        <main className="flex-1 overflow-y-auto">
          <DocumentUploader
            onDocumentLoaded={handleDocumentLoaded}
            isLoading={isGenerating}
          />
        </main>
      ) : (
        /* Active Document Workspace Screen */
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Document Information & Status Banner */}
          <DocumentInfoPanel
            document={activeDocument}
            onRemoveDocument={handleResetDocument}
            onViewText={() => {
              setViewerSearchQuery('');
              setIsViewerOpen(true);
            }}
          />

          {/* Quick Actions Bar */}
          <div className="bg-slate-100/70 border-b border-slate-200/80 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <QuickActions
                onSelectAction={(prompt, id) => handleSendMessage(prompt, id)}
                disabled={isGenerating}
              />
            </div>
          </div>

          {/* Chat Messages Stream */}
          <ChatContainer
            messages={messages}
            isGenerating={isGenerating}
            document={activeDocument}
            onRetry={handleRetry}
            onCitationClick={handleCitationClick}
          />

          {/* Chat Input Bar */}
          <ChatInput
            onSendMessage={(text) => handleSendMessage(text)}
            onStopGeneration={handleStopGeneration}
            isGenerating={isGenerating}
            disabled={!activeDocument}
            documentName={activeDocument.name}
          />
        </main>
      )}

      {/* Full Document Inspector Modal */}
      {activeDocument && (
        <DocumentViewerModal
          document={activeDocument}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          initialSearchQuery={viewerSearchQuery}
        />
      )}
    </div>
  );
}
