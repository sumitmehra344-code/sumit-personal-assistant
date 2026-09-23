export interface DocumentMetadata {
  id: string;
  name: string;
  originalName?: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  pageCount: number;
  wordCount: number;
  characterCount: number;
  summary?: string;
  keyTopics?: string[];
  snippet?: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  status: 'sending' | 'streaming' | 'done' | 'error';
  error?: string;
  quickActionUsed?: string;
  responseTimeMs?: number;
}

export type UploadProgressState = 'idle' | 'uploading' | 'parsing' | 'indexing' | 'ready' | 'error';

export interface QuickActionItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  prompt: string;
  badge?: string;
}
