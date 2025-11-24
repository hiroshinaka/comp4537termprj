import React, { useState, useEffect, useRef } from 'react';
import SuggestionsPanel from './SuggestionsPanel';

const API_BASE = process.env.REACT_APP_API_URL || '';

export default function ResumeInput({ onAnalyze, onLogout }) {
  const [resume, setResume] = useState('');
  const [job, setJob] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null); // will hold suggestions response
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiUsage, setApiUsage] = useState({
    totalRequests: 0,
    freeLimit: 100,
  });

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e && e.target && e.target.files ? e.target.files[0] : null;
    setSelectedFile(file || null);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    // reset native input so the same file can be re-selected later
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  // Leave API usage mock as-is
  useEffect(() => {
    const mockData = {
      totalRequests: Math.floor(Math.random() * 50) + 10,
      freeLimit: 100,
      overFreeLimit: false,
    };
    setApiUsage(mockData);
  }, []);

  const analyzeUrl = API_BASE
    ? API_BASE.replace(/\/$/, '') + '/analyze'
    : '/analyze';

  const suggestUrl = API_BASE
    ? API_BASE.replace(/\/$/, '') + '/api/suggestions'
    : '/suggestions';

  // Call /api/analyze with FormData (file upload)
  const submitToAnalyzeForm = async (form) => {
    const res = await fetch(analyzeUrl, {
      method: 'POST',
      body: form,
      credentials: 'include',
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'HTTP ' + res.status);
    }
    return res.json();
  };

  // Call /api/analyze with JSON (pasted resume)
  const submitToAnalyzeJson = async (payload) => {
    const res = await fetch(analyzeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'HTTP ' + res.status);
    }
    return res.json();
  };

  // Call /api/suggest with the analysis object
  const submitToSuggestions = async (analysisObj) => {
    const res = await fetch(suggestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        analysis: analysisObj,
        // You can add style / role_hint if you want to override defaults:
        // style: { bullets: 7, max_words: 200, tone: 'professional' },
        // role_hint: 'backend developer',
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'HTTP ' + res.status);
    }
    return res.json();
  };

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
    }
    setError(null);
    setAnalysisResult(null);
    setLoading(true);

    try {
      // Validation for text-only mode
      if (!selectedFile && (!resume || !job)) {
        setError(
          'Please provide resume text and a job description, or upload a file.'
        );
        setLoading(false);
        return;
      }

      // ---------- STEP 1: /api/analyze ----------
      let analyzeData;
      if (selectedFile) {
        const form = new FormData();
        form.append('resume', selectedFile);
        form.append('job', job || '');
        analyzeData = await submitToAnalyzeForm(form);
      } else {
        analyzeData = await submitToAnalyzeJson({ resume, job });
      }

      const analysisObj = analyzeData.analysis || analyzeData;

      // ---------- STEP 2: /api/suggest ----------
      const suggestionsData = await submitToSuggestions(analysisObj);

      // Store full suggestions response
      setAnalysisResult(suggestionsData);

      if (typeof onAnalyze === 'function') {
        onAnalyze({
          resume: selectedFile ? undefined : resume,
          resumeFile: selectedFile || null,
          job,
          analysis: analysisObj,
          suggestions: suggestionsData,
        });
      }
    } catch (err) {
      console.error('Analyze / suggest failed', err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* API Usage (unchanged) */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-700">API Usage</h3>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {apiUsage.totalRequests}{' '}
              <span className="text-sm font-normal text-slate-500">
                / {apiUsage.freeLimit} requests
              </span>
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 mb-1">Remaining</div>
            <div className="text-lg font-semibold text-blue-600">
              {apiUsage.freeLimit - apiUsage.totalRequests}
            </div>
          </div>
        </div>
        <div className="mt-3 bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-300"
            style={{
              width:
                Math.min(
                  (apiUsage.totalRequests / apiUsage.freeLimit) * 100,
                  100
                ) + '%',
            }}
          ></div>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-slate-900">
            Resume Analyzer
          </h2>
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-sm text-slate-600 hover:text-slate-800 border border-slate-200 px-3 py-1 rounded"
            >
              Logout
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Upload resume (optional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700"
            />
            {selectedFile && (
              <div className="mt-2 flex items-center gap-3">
                <div className="text-sm text-slate-500">
                  Selected: {selectedFile.name}
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-sm text-red-600 hover:text-red-800 bg-red-50 border border-red-100 px-2 py-1 rounded"
                >
                  Remove resume
                </button>
              </div>
            )}
          </div>

          {/* Resume paste */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Resume (paste)
            </label>
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              rows={8}
              disabled={!!selectedFile}
              className={
                'w-full rounded border p-3 text-sm focus:ring-1 focus:ring-slate-400 ' +
                (selectedFile
                  ? 'bg-slate-50 opacity-80 cursor-not-allowed border-slate-100'
                  : 'border-slate-200')
              }
              placeholder={
                selectedFile
                  ? 'Disabled because a file is selected. Remove the file to paste resume text.'
                  : 'Paste your resume text here (optional if uploading file)'
              }
            />
            {selectedFile && (
              <div className="mt-1 text-xs text-slate-500">
                Resume paste disabled while a file is selected.
              </div>
            )}
          </div>

          {/* Job description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Job description
            </label>
            <textarea
              value={job}
              onChange={(e) => setJob(e.target.value)}
              rows={8}
              className="w-full rounded border border-slate-200 p-3 text-sm focus:ring-1 focus:ring-slate-400"
              placeholder="Paste the job description to compare against"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 rounded-md text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg
                  className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
              ) : null}
              Analyze
            </button>
          </div>
        </form>
      </div>

      {/* Suggestions */}
      <SuggestionsPanel
        suggestions={
          analysisResult && analysisResult.suggestions
            ? analysisResult.suggestions
            : analysisResult
        }
        loading={loading}
      />
    </div>
  );
}
