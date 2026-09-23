import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, FileSpreadsheet, Sparkles, AlertCircle, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { uploadDocument, loadSampleDocument } from '../services/api';
import { DocumentMetadata, UploadProgressState } from '../types';
import { SAMPLE_DOCUMENTS_LIST } from '../sampleDocuments';

interface DocumentUploaderProps {
  onDocumentLoaded: (doc: DocumentMetadata) => void;
  isLoading: boolean;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onDocumentLoaded, isLoading: externalLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadProgressState>('idle');
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    // Validate file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 25MB limit. Please upload a smaller document.');
      return;
    }

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['pdf', 'docx', 'doc', 'txt', 'md'];
    if (!ext || !validExtensions.includes(ext)) {
      setErrorMessage(
        'Unsupported file format. Please upload a PDF (.pdf) or Microsoft Word document (.docx).'
      );
      return;
    }

    try {
      setErrorMessage(null);
      setSelectedFileName(file.name);
      setUploadState('uploading');

      const doc = await uploadDocument(file, (msg, pct) => {
        setStatusMessage(msg);
        setProgressPercent(pct);
      });

      setUploadState('ready');
      setTimeout(() => {
        onDocumentLoaded(doc);
      }, 500);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadState('error');
      setErrorMessage(
        err.message || 'Failed to process document. Please ensure it has readable text and try again.'
      );
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileProcess(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFileProcess(file);
    }
  };

  const handleSampleSelect = async (sampleKey: string) => {
    try {
      setErrorMessage(null);
      setUploadState('uploading');
      setStatusMessage('Loading sample document...');
      setProgressPercent(40);

      const doc = await loadSampleDocument(sampleKey);
      setProgressPercent(100);
      setStatusMessage('Document Ready!');
      setUploadState('ready');

      setTimeout(() => {
        onDocumentLoaded(doc);
      }, 400);
    } catch (err: any) {
      setUploadState('error');
      setErrorMessage(err.message || 'Failed to load sample document.');
    }
  };

  const isBusy = uploadState === 'uploading' || uploadState === 'parsing' || uploadState === 'indexing' || externalLoading;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 py-6 px-4">
      {/* Hero Welcome Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          DocuMind AI Document Intelligence
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Ask questions. Understand your documents.
        </h2>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Upload any PDF or Word (DOCX) document to get grounded answers, precise section citations, comprehensive summaries, and instant insights.
        </p>
      </div>

      {/* Main Drag-and-Drop Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all bg-white shadow-xs ${
          isDragging
            ? 'border-indigo-600 bg-indigo-50/60 ring-4 ring-indigo-100 scale-[1.01]'
            : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileInputChange}
          className="hidden"
          id="doc-file-input"
          disabled={isBusy}
        />

        {/* Processing State */}
        {isBusy ? (
          <div className="py-6 space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900">
                {uploadState === 'ready' ? 'Document Ready!' : 'Processing Document...'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {statusMessage || 'Extracting structured text & pages...'}
              </p>
              {selectedFileName && (
                <p className="text-xs font-mono text-indigo-600 bg-indigo-50 py-1 px-2.5 rounded-md inline-block max-w-full truncate mt-1">
                  {selectedFileName}
                </p>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-medium px-1">
              <span>Reading Content</span>
              <span>{progressPercent}%</span>
            </div>
          </div>
        ) : (
          /* Idle Upload State */
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-100 ring-4 ring-indigo-50">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                Upload a document to get started
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Drag and drop your file here, or click to browse
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer ring-2 ring-indigo-200 focus:outline-none"
              >
                <FileText className="w-4 h-4" />
                Browse Files
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md font-medium text-slate-700">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                PDF (.pdf)
              </span>
              <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md font-medium text-slate-700">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Word (.docx, .doc)
              </span>
              <span className="text-slate-400">Max file size: 25MB</span>
            </div>
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Upload Failed</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* 3 Core Value Props / Use Cases */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">1. Ask Questions</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Get accurate answers grounded strictly in your document with direct references to sections, pages, and clauses.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
            <FileText className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">2. Summarize Content</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Generate executive summaries, key highlights, simplified explanations, and structured overviews in seconds.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">3. Extract Information</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Extract dates, numerical figures, pricing tables, action items, criteria, and comparison charts effortlessly.
          </p>
        </div>
      </div>

      {/* Sample Documents for Instant 1-Click Testing */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Or Try A Sample Document
            </span>
            <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">
              1-Click Demo
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SAMPLE_DOCUMENTS_LIST.map((sample) => (
            <button
              key={sample.key}
              type="button"
              disabled={isBusy}
              onClick={() => handleSampleSelect(sample.key)}
              className="text-left p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-sm transition-all group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      sample.type === 'PDF'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {sample.type}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {sample.pageCount} pages • {sample.size}
                  </span>
                </div>
                <h5 className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                  {sample.title}
                </h5>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {sample.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                <span>Load & Ask</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
