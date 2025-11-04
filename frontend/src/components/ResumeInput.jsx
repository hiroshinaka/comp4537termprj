import React, { useState } from 'react';

export default function ResumeInput({ onAnalyze, onLogout }) {
  const [resume, setResume] = useState('');
  const [job, setJob] = useState('');
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!resume.trim() || !job.trim()) {
      setError('Please provide both your resume and the job description.');
      return;
    }
    setError('');
    const payload = { resume: resume.trim(), job: job.trim() };
    if (typeof onAnalyze === 'function') {
      onAnalyze(payload);
    } else {
      console.log('Analyze requested:', payload);
    }
  };

  const handleFileChange = (e) => {
    setFileError('');
    const f = e.target.files && e.target.files[0];
    if (!f) {
      setSelectedFile(null);
      return;
    }

    // Accept common resume types
    const allowed = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(f.type)) {
      setFileError('Unsupported file type. Please upload PDF, DOC or DOCX.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(f);
  };

  const handleSubmitWithFile = async (e) => {
    e.preventDefault();
    setError('');
    setFileError('');

    if (!selectedFile && !resume.trim()) {
      setError('Please provide a resume (paste text) or upload a file.');
      return;
    }
    if (!job.trim()) {
      setError('Please provide the job description.');
      return;
    }

    // If a file is provided, prefer sending that to the server for parsing
    if (selectedFile) {
      const payload = { resumeFile: selectedFile, job: job.trim() };
      if (typeof onAnalyze === 'function') {
        onAnalyze(payload);
      } else {
        // Default behavior: POST multipart/form-data to /analyze
        try {
          const form = new FormData();
          form.append('resume', selectedFile);
          form.append('job', job.trim());

          const res = await fetch('/analyze', {
            method: 'POST',
            body: form,
          });
          const data = await res.json();
          console.log('Analyze response:', data);
        } catch (err) {
          console.error('File analyze error:', err);
          setFileError('Upload failed. See console for details.');
        }
      }

      return;
    }

    // No file — fallback to pasted text
    handleSubmit(e);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 flex justify-center">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between border-b px-6 py-4 bg-slate-900">
          <h1 className="text-white text-lg font-semibold">Resume Analyzer</h1>
          {onLogout && (
            <button
              type="button"
              className="text-sm text-white/90 hover:text-white underline underline-offset-2"
              onClick={onLogout}
            >
              Logout
            </button>
          )}
        </div>

        <div className="px-6 py-5">
          <div className="space-y-3 mb-6">
            <div className="flex gap-3">
              <div className="shrink-0 h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">🤖</div>
              <div className="bg-slate-100 text-slate-900 px-4 py-3 rounded-2xl rounded-tl-sm text-sm">
                Paste your resume text in the first box and the job description in the second box. Then click Analyze.
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitWithFile} className="grid grid-cols-1 gap-4">
            <div className="flex flex-col">
              <label htmlFor="resumeFile" className="text-sm font-medium text-gray-700 mb-1">Upload resume (PDF / DOC / DOCX) — optional</label>
              <input
                id="resumeFile"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                className="mt-0.5"
              />
              {selectedFile && (
                <div className="mt-2 text-sm text-slate-700 flex items-center gap-3">
                  <span className="truncate max-w-xs">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-xs text-slate-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}
              {fileError && <p className="text-sm text-red-600 mt-1">{fileError}</p>}
            </div>

            <div className="flex flex-col">
              <label htmlFor="resume" className="text-sm font-medium text-gray-700 mb-1">Your Resume</label>
              <textarea
                id="resume"
                rows={10}
                value={resume}
              onChange={(e) => setResume(e.target.value)}
                placeholder="Paste resume text here..."
                className="w-full rounded-md border border-gray-300 shadow-sm text-sm p-3 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
              disabled={!!selectedFile}
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="job" className="text-sm font-medium text-gray-700 mb-1">Job Description</label>
              <textarea
                id="job"
                rows={10}
                value={job}
                onChange={(e) => setJob(e.target.value)}
                placeholder="Paste job description here..."
                className="w-full rounded-md border border-gray-300 shadow-sm text-sm p-3 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
              />
            </div>

            <div className="flex flex-col items-stretch gap-2">
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                className="w-full md:w-auto self-end py-2.5 px-4 bg-slate-900 text-white font-semibold rounded-md shadow-sm hover:bg-slate-700 transition-colors"
              >
                Analyze
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

