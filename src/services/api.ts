import { DocumentMetadata } from '../types';

export async function uploadDocument(
  file: File,
  onProgress?: (step: string, percent: number) => void
): Promise<DocumentMetadata> {
  onProgress?.('Uploading document...', 25);

  const formData = new FormData();
  formData.append('file', file);

  onProgress?.('Extracting text and analyzing structure...', 60);

  const response = await fetch('/api/document/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = 'Failed to upload document.';
    try {
      const errJson = await response.json();
      errorMsg = errJson.error || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  onProgress?.('Indexing document sections and generating overview...', 90);
  const data = await response.json();
  onProgress?.('Document Ready!', 100);
  return data.document;
}

export async function loadSampleDocument(sampleKey: string): Promise<DocumentMetadata> {
  const response = await fetch('/api/document/sample', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sampleKey }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to load sample document.');
  }

  const data = await response.json();
  return data.document;
}

export async function getDocumentText(id: string): Promise<{
  id: string;
  name: string;
  pageCount: number;
  wordCount: number;
  text: string;
  htmlPreview?: string;
}> {
  const response = await fetch(`/api/document/${encodeURIComponent(id)}/text`);
  if (!response.ok) {
    throw new Error('Failed to retrieve document text.');
  }
  return response.json();
}

export async function deleteDocument(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/document/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface StreamChatCallbacks {
  onChunk: (chunkText: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

export function streamChatMessage(
  documentId: string,
  question: string,
  history: Array<{ role: string; content: string }>,
  callbacks: StreamChatCallbacks
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          question,
          history,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errMessage = 'Failed to generate response.';
        try {
          const errData = await response.json();
          errMessage = errData.error || errMessage;
        } catch {
          // ignore
        }
        throw new Error(errMessage);
      }

      if (!response.body) {
        throw new Error('Response stream not supported by browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullAccumulatedText = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') {
              continue;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.text) {
                fullAccumulatedText += data.text;
                callbacks.onChunk(fullAccumulatedText);
              }
              if (data.done) {
                callbacks.onDone(fullAccumulatedText);
                return;
              }
            } catch (e: any) {
              if (e.message && e.message !== 'Unexpected end of JSON input') {
                console.warn('SSE JSON parse error:', e);
              }
            }
          }
        }
      }

      callbacks.onDone(fullAccumulatedText);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream generation aborted by user.');
        return;
      }
      callbacks.onError(err);
    }
  })();

  return () => {
    controller.abort();
  };
}

export async function sendChatMessage(
  documentId: string,
  question: string,
  history: Array<{ role: string; content: string }>
): Promise<{ answer: string; elapsedMs: number }> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId, question, history }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to generate answer.');
  }

  return response.json();
}
