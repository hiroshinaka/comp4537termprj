import React from 'react';

export default function Landing({ onGoLogin, onGoSignup }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-8 py-12">
          <div className="flex items-start gap-4">
            <div className="text-5xl">🤖</div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 mb-3">Resume Analyzer</h1>
              <p className="text-slate-600 mb-6">Upload or paste your resume and a job posting. Our AI will compare them and give you matched skills, improvement suggestions, and a fit score.</p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => onGoSignup && onGoSignup()}
                  className="py-2.5 px-4 bg-slate-900 text-white rounded-md font-medium hover:bg-slate-700 transition-colors"
                >
                  Get started — Sign up
                </button>

                <button
                  type="button"
                  onClick={() => onGoLogin && onGoLogin()}
                  className="py-2.5 px-4 bg-white border border-slate-200 text-slate-900 rounded-md font-medium hover:bg-slate-50 transition-colors"
                >
                  Log in
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 text-sm text-slate-500">
            <p className="mb-2"><strong>How it works:</strong> The app analyzes the overlap between your resume and the job description, highlights missing skills, and suggests actionable edits.</p>
            <p>You'll be able to paste text or upload files on the analysis screen after logging in.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
