import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import mammoth from 'mammoth';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Initialize Google GenAI with recommended telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory document storage (per session / documentId)
interface StoredDocument {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  pageCount: number;
  wordCount: number;
  characterCount: number;
  extractedText: string;
  htmlPreview?: string;
  summary?: string;
  keyTopics?: string[];
  base64Data?: string;
}

const documentsStore = new Map<string, StoredDocument>();

// Multer memory storage configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      allowedExtensions.includes(ext) ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'application/msword' ||
      file.mimetype.startsWith('text/')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Please upload a PDF (.pdf) or Word document (.docx).'));
    }
  },
});

// Helper function to extract text from PDF buffer
async function extractTextFromPDF(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    // Dynamic import / require of pdf-parse to be compatible with ESM/CJS
    const pdfParseModule: any = await import('pdf-parse');
    const pdfParse = pdfParseModule.default || pdfParseModule;
    const data = await pdfParse(buffer);
    const text = data.text ? data.text.trim() : '';
    const pageCount = data.numpages || (text.length > 0 ? Math.ceil(text.length / 2500) : 1);
    return { text, pageCount };
  } catch (err: any) {
    console.warn('PDF-parse primary extraction failed, trying fallback text extraction:', err?.message);
    // Fallback: decode text strings from PDF binary stream if possible
    const rawStr = buffer.toString('binary');
    const textChunks: string[] = [];
    const textMatches = rawStr.match(/BT[\s\S]*?ET/g) || [];
    for (const match of textMatches) {
      const extracted = match.replace(/\[\((.*?)\)\]/g, '$1').replace(/\((.*?)\)/g, '$1');
      if (extracted.length > 3) {
        textChunks.push(extracted);
      }
    }
    const fallbackText = textChunks.join('\n').replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim();
    if (fallbackText.length > 50) {
      return { text: fallbackText, pageCount: Math.ceil(fallbackText.length / 2500) || 1 };
    }
    throw new Error('Could not extract readable text from this PDF file. It might be scanned or image-only.');
  }
}

// Helper function to extract text from DOCX buffer
async function extractTextFromDOCX(buffer: Buffer): Promise<{ text: string; html: string; pageCount: number }> {
  try {
    const rawResult = await mammoth.extractRawText({ buffer });
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const text = rawResult.value ? rawResult.value.trim() : '';
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const pageCount = Math.max(1, Math.ceil(wordCount / 400));
    return {
      text,
      html: htmlResult.value || '',
      pageCount,
    };
  } catch (err: any) {
    console.error('DOCX extraction error:', err);
    throw new Error('Could not parse DOCX document. Please ensure the file is not corrupted.');
  }
}

// Built-in Curated Sample Documents for instant 1-click testing
const SAMPLE_DOCUMENTS: Record<string, { title: string; filename: string; text: string; type: string }> = {
  sample_business: {
    title: 'Acme Corp – Q4 Financial & Operational Performance Report',
    filename: 'Acme_Corp_Q4_Performance_Report.pdf',
    type: 'application/pdf',
    text: `# ACME CORPORATION – Q4 ANNUAL FINANCIAL & STRATEGIC PERFORMANCE REPORT

## Executive Summary
Acme Corporation closed Fiscal Year 2025 with total annual revenue of $428.5 million, representing a 24.3% year-over-year increase compared to FY2024 ($344.7 million). Q4 revenue reached $124.2 million, driven primarily by strong adoption of our Enterprise Cloud Platform (AcmeCloud Enterprise) and expansion in the European and Asia-Pacific markets.

## Financial Highlights
- **Total Revenue (FY2025):** $428.5 Million (24.3% YoY Growth)
- **Q4 2025 Revenue:** $124.2 Million (Up 28.1% compared to Q4 2024)
- **Gross Profit Margin:** 71.4% (up from 67.2% in FY2024)
- **Operating Margin:** 21.8% ($93.4 Million Operating Income)
- **Net Income:** $74.2 Million ($1.84 Diluted EPS)
- **Cash & Cash Equivalents:** $186.3 Million as of December 31, 2025
- **Annual Recurring Revenue (ARR):** $312.0 Million, up 36% YoY

## Product & Business Unit Performance
1. **AcmeCloud Enterprise (Software-as-a-Service):**
   - Revenue: $248.6 Million (58% of total revenue)
   - Customer Net Retention Rate (NRR): 128%
   - Added 342 new Fortune 2000 enterprise logos during FY2025.
   - Launched 'Acme AI Copilot for Documents' in September 2025, generating $14.2 Million in incremental ARR.

2. **Acme Hardware & IoT Devices:**
   - Revenue: $118.4 Million (27.6% of total revenue)
   - Shipped 1.45 million smart gateway units across 42 countries.
   - Component supply chain bottlenecks in Q2 resolved with dual-sourcing agreements with suppliers in Taiwan and Vietnam.

3. **Professional Services & Technical Support:**
   - Revenue: $61.5 Million (14.4% of total revenue)
   - Customer satisfaction (CSAT) rating reached 96.4%.

## Regional Breakdown
- **North America:** $244.2 Million (57% of total revenue, +18% YoY)
- **Europe (EMEA):** $115.7 Million (27% of total revenue, +32% YoY)
- **Asia-Pacific (APAC):** $68.6 Million (16% of total revenue, +41% YoY)

## Strategic Priorities for FY2026
1. **AI Innovation & Automation:** Allocate $45 Million in R&D specifically for generative AI document processing and workflow automation.
2. **Zero-Trust Security Certification:** Complete FedRAMP High and SOC2 Type II renewals by Q2 2026.
3. **Carbon Neutrality Goal:** Transition 85% of global server operations to 100% renewable energy by Q4 2026 (currently at 62%).
4. **Target FY2026 Revenue Guidance:** $515 Million to $530 Million (approx. 20-24% growth).

## Risk Factors & Mitigation
- **Currency Fluctuations:** Hedging program active for EUR and JPY exposure.
- **Cybersecurity Threats:** Implemented mandatory biometric MFA and 24/7 autonomous threat detection.
- **Talent Retention:** Decreased voluntary turnover from 14.2% in 2024 to 7.8% in 2025 through competitive equity refresher grants.`,
  },
  sample_contract: {
    title: 'Standard Master Services & Remote Work Agreement',
    filename: 'Master_Services_Agreement_2026.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    text: `# MASTER SERVICES AGREEMENT & REMOTE WORK POLICY (MSA-2026)

**Effective Date:** January 15, 2026  
**Between:** Apex Solutions LLC ("Client") and Vertex Innovations Inc. ("Service Provider")

## SECTION 1: SCOPE OF SERVICES & DELIVERABLES
1.1 **Services Provided:** Service Provider shall provide software engineering, data architecture, document automation, and machine learning infrastructure consulting as specified in individual Statements of Work (SOWs).
1.2 **Deliverable Acceptance:** The Client shall have ten (10) business days following receipt of each deliverable to review and accept or provide written notice of deficiencies. If no notice is provided within ten (10) business days, the deliverable is deemed accepted.

## SECTION 2: COMPENSATION & PAYMENT TERMS
2.1 **Standard Billing Rates:**
   - Principal Architect: $220.00 / hour
   - Senior Full-Stack Engineer: $165.00 / hour
   - Data / AI Specialist: $190.00 / hour
   - QA & Systems Specialist: $110.00 / hour
2.2 **Invoicing & Payment Schedule:** Invoices shall be issued bi-weekly on Mondays. Payment is due strictly **Net 30 Days** from the invoice date. Late payments shall accrue interest at the rate of 1.5% per month or the statutory maximum.
2.3 **Expense Reimbursement:** Pre-approved travel and out-of-pocket expenses exceeding $500.00 require prior written approval from the Client's Project Director.

## SECTION 3: REMOTE WORK & DATA SECURITY OBLIGATIONS
3.1 **Approved Equipment & Networks:** All personnel must connect exclusively through company-approved encrypted VPN tunnels with TLS 1.3 encryption. Public unsecured Wi-Fi networks are strictly prohibited for client-related data processing.
3.2 **Confidentiality & Non-Disclosure (NDA):**
   - Confidential information shall remain strictly protected for five (5) years following the termination of this Agreement.
   - Trade secrets shall be protected in perpetuity.
3.3 **Intellectual Property (IP) Ownership:**
   - All custom code, architectures, and deliverables created specifically for the Client shall constitute "Work Made for Hire" and belong 100% to the Client upon full payment.
   - Pre-existing libraries, proprietary frameworks, and open-source components remain the property of their respective owners under MIT or Apache 2.0 licenses.

## SECTION 4: TERM, TERMINATION & DISPUTE RESOLUTION
4.1 **Term:** This Agreement begins on the Effective Date and continues for a period of twelve (12) months, renewing automatically unless notice of non-renewal is given thirty (30) days prior.
4.2 **Termination for Convenience:** Either party may terminate this Agreement without cause upon giving forty-five (45) days' advance written notice.
4.3 **Termination for Cause:** Immediate termination is permitted if a party breaches a material term and fails to cure within fifteen (15) calendar days of written notification.
4.4 **Governing Law & Jurisdiction:** This Agreement is governed by the laws of the State of Delaware. Any disputes shall be settled through binding arbitration in Wilmington, DE under AAA commercial arbitration rules.`,
  },
  sample_research: {
    title: 'Clinical Study: Multimodal Generative AI in Diagnostic Radiography',
    filename: 'Diagnostic_AI_Clinical_Study.pdf',
    type: 'application/pdf',
    text: `# CLINICAL TRIAL REPORT: MULTIMODAL GENERATIVE AI IN DIAGNOSTIC RADIOGRAPHY AND CLINICAL TRIALS

**Principal Investigators:** Dr. Elena Rostova, MD, PhD; Dr. Marcus Chen, FACP  
**Affiliation:** Institute for Advanced Medical Computing & Department of Radiology, St. Jude Medical Research Consortium  
**Publication Date:** February 2026  
**Trial Registration:** NCT-09482103  

## Abstract & Background
Deep multimodal neural networks have demonstrated remarkable accuracy in interpreting chest radiographs (CXRs) and cross-sectional computed tomography (CT) scans. This double-blind randomized clinical evaluation evaluated DocuRadiology-v4, a specialized multimodal vision-language model, across 14,250 patient imaging studies collected between March 2024 and December 2025.

## Methodology & Patient Cohort
- **Total Patients:** 14,250 adult patients (52.4% female, 47.6% male; mean age: 58.2 ± 13.4 years).
- **Control Group:** Standard radiologist evaluation without AI assistance (3,560 cases).
- **Assisted Group A:** Radiologists aided by DocuRadiology-v4 bounding box heatmaps (5,345 cases).
- **Assisted Group B:** Radiologists aided by AI interactive conversational query synthesis and structured report generation (5,345 cases).
- **Target Pathologies:** Early-stage pulmonary nodules (<8mm), pleural effusion, interstitial pneumonitis, rib fractures, and cardiomegaly.

## Key Findings & Quantitative Results
1. **Diagnostic Sensitivity:**
   - Radiologists alone: 84.1% sensitivity (95% CI: 82.8 - 85.3%)
   - AI-Assisted Radiologists: 95.7% sensitivity (95% CI: 94.9 - 96.4%) — a statistically significant 11.6% improvement (p < 0.001).
2. **False Negative Rate for Small Nodules (<6mm):**
   - Decreased by 42.8% in the AI-assisted cohort.
3. **Turnaround & Report Generation Time:**
   - Mean reading and documentation time dropped from 14.8 minutes per case to 6.2 minutes per case (58.1% reduction in clinical workflow latency).
4. **Inter-Observer Agreement (Fleiss' Kappa):**
   - Increased from κ = 0.72 to κ = 0.91 among junior resident physicians.

## Adverse Events & Edge Case Analysis
- **Hallucinations & False Positives:** AI generated 1.2% false-positive artifacts in images with severe metallic orthopedic implants or pacemaker leads.
- **Recommendations:** Multimodal AI systems should function strictly in an assistive capacity ("Physician-in-the-Loop") rather than autonomous diagnostic sign-off.

## Conclusion
The integration of multimodal conversational models directly into diagnostic workflows significantly improves detection rates for subtle pulmonary pathologies while reducing clinical burnout and reporting latency.`,
  },
};

// API: Process & Upload Document
app.post('/api/document/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please select a PDF or DOCX file.' });
    }

    const { originalname, mimetype, buffer, size } = req.file;
    const ext = path.extname(originalname).toLowerCase();
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    let extractedText = '';
    let pageCount = 1;
    let htmlPreview = '';

    if (ext === '.pdf' || mimetype === 'application/pdf') {
      const pdfData = await extractTextFromPDF(buffer);
      extractedText = pdfData.text;
      pageCount = pdfData.pageCount;
    } else if (
      ext === '.docx' ||
      ext === '.doc' ||
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      const docxData = await extractTextFromDOCX(buffer);
      extractedText = docxData.text;
      htmlPreview = docxData.html;
      pageCount = docxData.pageCount;
    } else {
      // Plain text / markdown
      extractedText = buffer.toString('utf-8').trim();
      const words = extractedText.split(/\s+/).filter(Boolean).length;
      pageCount = Math.max(1, Math.ceil(words / 450));
    }

    if (!extractedText || extractedText.trim().length < 10) {
      return res.status(422).json({
        error: 'The uploaded document contains insufficient or unreadable text. If it is a scanned image, please upload a document with searchable text.',
      });
    }

    const words = extractedText.split(/\s+/).filter(Boolean).length;
    const characters = extractedText.length;

    // Generate a quick summary using Gemini
    let quickSummary = '';
    let keyTopics: string[] = [];
    try {
      const summaryPrompt = `Analyze the following document and provide:
1. A concise 2-sentence summary.
2. A list of 4-6 key topics or headings.

Return JSON in this format:
{
  "summary": "...",
  "topics": ["topic1", "topic2", "topic3", "topic4"]
}

Document Content (Excerpt):
${extractedText.substring(0, 7000)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: summaryPrompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        quickSummary = parsed.summary || '';
        keyTopics = Array.isArray(parsed.topics) ? parsed.topics : [];
      }
    } catch (aiErr) {
      console.warn('Quick summary generation skipped or failed:', aiErr);
      quickSummary = extractedText.substring(0, 200) + '...';
    }

    const storedDoc: StoredDocument = {
      id: docId,
      name: originalname,
      originalName: originalname,
      mimeType: mimetype,
      sizeBytes: size,
      uploadedAt: new Date().toISOString(),
      pageCount,
      wordCount: words,
      characterCount: characters,
      extractedText,
      htmlPreview,
      summary: quickSummary,
      keyTopics,
      base64Data: ext === '.pdf' ? buffer.toString('base64') : undefined,
    };

    documentsStore.set(docId, storedDoc);

    res.json({
      success: true,
      document: {
        id: storedDoc.id,
        name: storedDoc.name,
        mimeType: storedDoc.mimeType,
        sizeBytes: storedDoc.sizeBytes,
        uploadedAt: storedDoc.uploadedAt,
        pageCount: storedDoc.pageCount,
        wordCount: storedDoc.wordCount,
        characterCount: storedDoc.characterCount,
        summary: storedDoc.summary,
        keyTopics: storedDoc.keyTopics,
        snippet: storedDoc.extractedText.substring(0, 350) + (storedDoc.extractedText.length > 350 ? '...' : ''),
      },
    });
  } catch (err: any) {
    console.error('Error processing document upload:', err);
    res.status(500).json({
      error: err.message || 'An unexpected error occurred while processing the document. Please try again.',
    });
  }
});

// API: Load Sample Document
app.post('/api/document/sample', async (req, res) => {
  try {
    const { sampleKey } = req.body;
    const sample = SAMPLE_DOCUMENTS[sampleKey] || SAMPLE_DOCUMENTS.sample_business;
    const docId = `sample_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const words = sample.text.split(/\s+/).filter(Boolean).length;
    const characters = sample.text.length;
    const pageCount = Math.max(1, Math.ceil(words / 350));

    // Generate quick summary
    let quickSummary = '';
    let keyTopics: string[] = [];
    try {
      const summaryPrompt = `Analyze the following document and provide:
1. A concise 2-sentence summary.
2. A list of 4-6 key topics or headings.

Return JSON in this format:
{
  "summary": "...",
  "topics": ["topic1", "topic2", "topic3", "topic4"]
}

Document:
${sample.text.substring(0, 6000)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: summaryPrompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        quickSummary = parsed.summary || '';
        keyTopics = Array.isArray(parsed.topics) ? parsed.topics : [];
      }
    } catch (e) {
      quickSummary = sample.text.substring(0, 200) + '...';
    }

    const storedDoc: StoredDocument = {
      id: docId,
      name: sample.filename,
      originalName: sample.filename,
      mimeType: sample.type,
      sizeBytes: sample.text.length * 2,
      uploadedAt: new Date().toISOString(),
      pageCount,
      wordCount: words,
      characterCount: characters,
      extractedText: sample.text,
      summary: quickSummary,
      keyTopics,
    };

    documentsStore.set(docId, storedDoc);

    res.json({
      success: true,
      document: {
        id: storedDoc.id,
        name: storedDoc.name,
        mimeType: storedDoc.mimeType,
        sizeBytes: storedDoc.sizeBytes,
        uploadedAt: storedDoc.uploadedAt,
        pageCount: storedDoc.pageCount,
        wordCount: storedDoc.wordCount,
        characterCount: storedDoc.characterCount,
        summary: storedDoc.summary,
        keyTopics: storedDoc.keyTopics,
        snippet: storedDoc.extractedText.substring(0, 350) + '...',
      },
    });
  } catch (err: any) {
    console.error('Error loading sample document:', err);
    res.status(500).json({ error: 'Failed to load sample document.' });
  }
});

// API: Get Document Text Preview
app.get('/api/document/:id/text', (req, res) => {
  const { id } = req.params;
  const doc = documentsStore.get(id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found or expired.' });
  }
  res.json({
    id: doc.id,
    name: doc.name,
    pageCount: doc.pageCount,
    wordCount: doc.wordCount,
    text: doc.extractedText,
    htmlPreview: doc.htmlPreview,
  });
});

// API: Delete Document
app.delete('/api/document/:id', (req, res) => {
  const { id } = req.params;
  const deleted = documentsStore.delete(id);
  res.json({ success: deleted });
});

// API: Document-Grounded Q&A (Non-streaming fallback)
app.post('/api/chat', async (req, res) => {
  try {
    const { documentId, question, history = [], quickAction } = req.body;

    if (!documentId) {
      return res.status(400).json({ error: 'Please upload a document first before asking questions.' });
    }

    const doc = documentsStore.get(documentId);
    if (!doc) {
      return res.status(404).json({
        error: 'Document session expired or not found. Please re-upload your document to continue.',
      });
    }

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Please provide a valid question.' });
    }

    const systemInstruction = `You are DocuMind AI, a professional document question-answering assistant for "Sumit Personal Assistant".

Your job is to answer questions using ONLY the contents of the document provided below.

STRICT GROUNDING & ACCURACY RULES:
1. Carefully analyze the uploaded document content before formulating your answer.
2. Answer the user's question using ONLY information directly found or clearly stated in the document.
3. Do NOT invent facts, speculate, hallucinate, or extrapolate beyond what is documented.
4. If the answer cannot be found in the document, clearly and politely say:
   "I couldn't find this information in the uploaded document."
5. Do NOT use outside knowledge or unverified assumptions to fill missing information.
6. Whenever possible and relevant, cite the specific page, section, heading, table, or numerical figure supporting your answer (e.g. "[Section 2.1]", "[Page 3]", or "[Under Financial Highlights]").
7. When the document contains dates, monetary amounts, numbers, percentages, names, eligibility criteria, fees, or deadlines, reproduce them with 100% precision.
8. If the user asks for a summary, provide a well-structured, clear summary with bullet points.
9. If the user asks for a comparison or breakdown, format the response using a structured Markdown table or clean numbered list.
10. If the document contains conflicting information, mention the conflict explicitly rather than picking one value arbitrarily.
11. Keep answers clear, professional, well-formatted (Markdown headings, bold key terms, clean lists), and easy to understand.
12. Never claim that information is present in the document when it is not.`;

    // Prepare conversation context
    let conversationContext = '';
    if (Array.isArray(history) && history.length > 0) {
      conversationContext = history
        .slice(-6) // Keep recent context
        .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');
    }

    const fullPrompt = `DOCUMENT CONTENT:
Filename: ${doc.name}
Total Pages: ${doc.pageCount}
Total Words: ${doc.wordCount}

=== BEGIN DOCUMENT TEXT ===
${doc.extractedText}
=== END DOCUMENT TEXT ===

${conversationContext ? `PRIOR CONVERSATION HISTORY:\n${conversationContext}\n\n` : ''}
CURRENT QUESTION:
${question}

Answer the question strictly based on the document text above, adhering to all instructions.`;

    const startTime = Date.now();
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: fullPrompt,
      config: {
        systemInstruction,
      },
    });

    const elapsedMs = Date.now() - startTime;
    const answer = response.text || "I couldn't find this information in the uploaded document.";

    res.json({
      answer,
      elapsedMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Chat error:', err);
    res.status(500).json({
      error: err.message || 'An error occurred while generating the answer. Please try again.',
    });
  }
});

// API: Document-Grounded Q&A (Server-Sent Events Streaming)
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { documentId, question, history = [] } = req.body;

    if (!documentId) {
      return res.status(400).json({ error: 'Please upload a document first.' });
    }

    const doc = documentsStore.get(documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document session expired. Please upload your file again.' });
    }

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Please provide a valid question.' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const systemInstruction = `You are DocuMind AI, a professional document question-answering assistant for "Sumit Personal Assistant".

Your job is to answer questions using ONLY the contents of the document provided below.

STRICT GROUNDING & ACCURACY RULES:
1. Carefully analyze the uploaded document content before answering.
2. Answer the user's question using ONLY information directly found in the document.
3. Do NOT invent facts or hallucinate details not stated in the document.
4. If the answer cannot be found in the document, clearly say:
   "I couldn't find this information in the uploaded document."
5. Do NOT use outside knowledge to fill missing information.
6. When possible, mention the relevant page, section, heading, or portion of the document supporting the answer.
7. Reproduce dates, numbers, names, fees, and criteria with exact fidelity.
8. If the user asks for a summary, provide a structured summary.
9. If the user asks for a comparison, use a Markdown table.
10. Format with clean Markdown: bullet points, bold key terms, code blocks, or tables where appropriate.
11. Keep answers concise, highly readable, and professional.`;

    let conversationContext = '';
    if (Array.isArray(history) && history.length > 0) {
      conversationContext = history
        .slice(-6)
        .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');
    }

    const fullPrompt = `DOCUMENT CONTENT:
Filename: ${doc.name}
Total Pages: ${doc.pageCount}
Total Words: ${doc.wordCount}

=== BEGIN DOCUMENT TEXT ===
${doc.extractedText}
=== END DOCUMENT TEXT ===

${conversationContext ? `PRIOR CONVERSATION HISTORY:\n${conversationContext}\n\n` : ''}
CURRENT QUESTION:
${question}

Answer the question strictly based on the document text above:`;

    const streamResponse = await ai.models.generateContentStream({
      model: 'gemini-3.7-flash',
      contents: fullPrompt,
      config: {
        systemInstruction,
      },
    });

    for await (const chunk of streamResponse) {
      const textChunk = chunk.text;
      if (textChunk) {
        res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('Streaming error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Failed to stream answer.' });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message || 'Stream generation failed.' })}\n\n`);
      res.end();
    }
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Sumit Personal Assistant - Document Q&A API',
    version: '1.0.0',
  });
});

// Start Express + Vite
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sumit Personal Assistant server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
