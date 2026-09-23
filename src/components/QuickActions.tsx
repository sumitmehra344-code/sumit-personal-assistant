import React from 'react';
import {
  FileText,
  ListOrdered,
  HelpCircle,
  Brain,
  Hash,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';
import { QuickActionItem } from '../types';

interface QuickActionsProps {
  onSelectAction: (prompt: string, actionId: string) => void;
  disabled?: boolean;
}

const QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: 'summarize',
    label: 'Summarize Document',
    description: 'Concise executive summary with key takeaways',
    icon: 'FileText',
    prompt: 'Please provide a comprehensive yet concise structured summary of the uploaded document, including its primary objectives, major sections, and core takeaways.',
  },
  {
    id: 'key_points',
    label: 'Key Points',
    description: 'Bulleted list of core highlights and findings',
    icon: 'ListOrdered',
    prompt: 'Extract the top 5 to 7 key points and crucial findings from this document in clear, numbered bullet points with relevant section/page citations.',
  },
  {
    id: 'explain_simply',
    label: 'Explain Simply',
    description: 'Plain English summary free of complex jargon',
    icon: 'Brain',
    prompt: 'Explain the core concepts and message of this document in simple, plain English (as if explaining to a non-expert) without losing critical factual accuracy.',
  },
  {
    id: 'important_questions',
    label: 'Important Questions',
    description: 'Top FAQs and critical answers',
    icon: 'HelpCircle',
    prompt: 'Generate the 5 most important questions that anyone reading this document should ask, along with the exact answers found in the text.',
  },
  {
    id: 'generate_quiz',
    label: 'Generate Quiz',
    description: 'Multiple-choice knowledge check',
    icon: 'Sparkles',
    prompt: 'Create a 4-question comprehension quiz based strictly on the uploaded document, with 4 multiple-choice options (A, B, C, D) for each and the correct answer explained at the end.',
  },
  {
    id: 'extract_facts',
    label: 'Extract Facts & Numbers',
    description: 'Dates, metrics, rates, and statistics',
    icon: 'Hash',
    prompt: 'Extract all important statistics, dates, numerical values, monetary amounts, and concrete metrics from the document into a structured comparison table or bulleted list.',
  },
  {
    id: 'action_items',
    label: 'Action Items & Deadlines',
    description: 'Deliverables, obligations, and next steps',
    icon: 'Clock',
    prompt: 'Identify all action items, obligations, required next steps, milestones, and deadlines explicitly mentioned in this document.',
  },
];

export const QuickActions: React.FC<QuickActionsProps> = ({ onSelectAction, disabled }) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'FileText':
        return <FileText className="w-3.5 h-3.5" />;
      case 'ListOrdered':
        return <ListOrdered className="w-3.5 h-3.5" />;
      case 'Brain':
        return <Brain className="w-3.5 h-3.5" />;
      case 'HelpCircle':
        return <HelpCircle className="w-3.5 h-3.5" />;
      case 'Sparkles':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'Hash':
        return <Hash className="w-3.5 h-3.5" />;
      case 'Clock':
        return <Clock className="w-3.5 h-3.5" />;
      default:
        return <Zap className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="py-2">
      <div className="flex items-center gap-1.5 px-1 mb-2">
        <Zap className="w-3.5 h-3.5 text-indigo-600" />
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Quick Insights & Analysis
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectAction(action.prompt, action.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-700 text-slate-700 text-xs font-medium whitespace-nowrap transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
            title={action.description}
          >
            <span className="text-indigo-600">{getIcon(action.icon)}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
