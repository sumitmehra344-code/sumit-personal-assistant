export interface SampleDocConfig {
  key: string;
  title: string;
  filename: string;
  type: 'PDF' | 'DOCX';
  category: string;
  size: string;
  pageCount: number;
  description: string;
  suggestedQuestions: string[];
}

export const SAMPLE_DOCUMENTS_LIST: SampleDocConfig[] = [
  {
    key: 'sample_business',
    title: 'Acme Corp Q4 Performance & Strategic Plan',
    filename: 'Acme_Corp_Q4_Performance_Report.pdf',
    type: 'PDF',
    category: 'Finance & Strategy',
    size: '1.4 MB',
    pageCount: 6,
    description: 'Comprehensive financial report detailing $428.5M revenue, AcmeCloud ARR growth, regional breakdown, and FY2026 AI investments.',
    suggestedQuestions: [
      'What was the total revenue for FY2025 and how much did it grow YoY?',
      'How much revenue did AcmeCloud Enterprise generate?',
      'What are the 4 key strategic priorities for FY2026?',
      'Compare North America, Europe, and APAC regional revenue in a table.',
    ],
  },
  {
    key: 'sample_contract',
    title: 'Master Services & Remote Work Agreement',
    filename: 'Master_Services_Agreement_2026.docx',
    type: 'DOCX',
    category: 'Legal & HR',
    size: '480 KB',
    pageCount: 4,
    description: 'Legal agreement covering hourly rates ($110–$220/hr), Net 30 payment terms, VPN security requirements, NDA period, and termination clauses.',
    suggestedQuestions: [
      'What is the standard billing rate for a Principal Architect and Senior Engineer?',
      'What are the payment terms and late fee interest rates?',
      'What are the remote work and VPN security requirements?',
      'How many days of notice are required for termination without cause?',
    ],
  },
  {
    key: 'sample_research',
    title: 'Clinical Trial: Multimodal AI in Diagnostic Radiography',
    filename: 'Diagnostic_AI_Clinical_Study.pdf',
    type: 'PDF',
    category: 'Medical Research',
    size: '2.1 MB',
    pageCount: 8,
    description: 'Clinical trial evaluating 14,250 patient scans, showing an 11.6% diagnostic sensitivity increase and 58% report turnaround time reduction.',
    suggestedQuestions: [
      'How many total patients were in the study and what were their demographics?',
      'What was the difference in diagnostic sensitivity between AI-assisted vs standard radiologist review?',
      'By what percentage did documentation turnaround time decrease?',
      'What edge cases and false-positive risks were noted in the report?',
    ],
  },
];
