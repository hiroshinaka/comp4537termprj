import React, { useState, useEffect } from 'react';
import SuggestionsPanel from './SuggestionsPanel';

const API_BASE = process.env.REACT_APP_API_URL || '';

export default function ResumeInput({ onAnalyze, onLogout }) {
  const [resume, setResume] = useState('');
  const [job, setJob] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiUsage, setApiUsage] = useState({ totalRequests: 0, freeLimit: 100 });

  const handleFileChange = (e) => setSelectedFile(e.target.files?.[0] || null);

  // TODO: link this to backend later for fetching API limit usage
  useEffect(() => {
    const mockData = {
      totalRequests: Math.floor(Math.random() * 50) + 10,
      freeLimit: 100,
      overFreeLimit: false
    };
    setApiUsage(mockData);
  }, []);

  const submitToServer = async (form) => {
    const url = API_BASE ? `${API_BASE.replace(/\/$/, '')}/api/analyze` : '/api/analyze';
    const res = await fetch(url, { method: 'POST', body: form, credentials: 'include' });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json();
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError(null);
    setAnalysisResult(null);
    setLoading(true);

    try {
      if (selectedFile) {
        const form = new FormData();
        form.append('resume', selectedFile);
        form.append('job', job || '');
        const data = await submitToServer(form);
        setAnalysisResult(data);
        if (typeof onAnalyze === 'function') onAnalyze({ resumeFile: selectedFile, job });
        setLoading(false);
        return;
      }

      if (!resume || !job) {
        setError('Please provide resume text and a job description, or upload a file.');
        setLoading(false);
        return;
      }

      const resp = await fetch(API_BASE ? `${API_BASE.replace(/\/$/, '')}/api/analyze` : '/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resume, job }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setAnalysisResult(data);
      if (typeof onAnalyze === 'function') onAnalyze({ resume, job });
    } catch (err) {
      console.error('Analyze failed', err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-700">API Usage</h3>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {apiUsage.totalRequests} <span className="text-sm font-normal text-slate-500">/ {apiUsage.freeLimit} requests</span>
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
            style={{ width: `${Math.min((apiUsage.totalRequests / apiUsage.freeLimit) * 100, 100)}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-slate-900">Resume Analyzer</h2>
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Upload resume (optional)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700"
            />
            {selectedFile && <div className="mt-2 text-sm text-slate-500">Selected: {selectedFile.name}</div>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Resume (paste)</label>
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              rows={8}
              className="w-full rounded border border-slate-200 p-3 text-sm focus:ring-1 focus:ring-slate-400"
              placeholder="Paste your resume text here (optional if uploading file)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Job description</label>
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
              className={`inline-flex items-center px-4 py-2 rounded-md text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
              ) : null}
              Analyze
            </button>
          </div>
        </form>
      </div>

      <SuggestionsPanel suggestions={analysisResult && analysisResult.suggestions ? analysisResult.suggestions : analysisResult} loading={loading} />
    </div>
  );
}
