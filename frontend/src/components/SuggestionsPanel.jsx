import React from 'react';
import MSG from '../lang/en/messages.js';
import {
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';

function SkeletonLine() {
  return <div className="h-4 w-full rounded bg-slate-200 mb-2 animate-pulse" />;
}

export default function SuggestionsPanel({ suggestions, loading }) {
  // -----------------------------
  // Loading state
  // -----------------------------
  if (loading) {
    return (
      <section className="mt-6">
        <div className="flex items-center gap-2 mb-3 text-slate-700 text-sm">
          <svg
            className="h-4 w-4 animate-spin text-slate-700"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
          <span>{MSG['loading suggestions']}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <SkeletonLine />
          <SkeletonLine />
          <SkeletonLine />
          <div className="grid grid-cols-2 gap-3 mt-2">
            <SkeletonLine />
            <SkeletonLine />
          </div>
        </div>
      </section>
    );
  }

  if (!suggestions) return null;

  // If backend ever returns a plain string / array, just pretty-print it.
  if (typeof suggestions === 'string' || Array.isArray(suggestions)) {
    return (
      <section className="mt-6">
        <header className="flex items-center gap-2 mb-3">
          <SparklesIcon className="h-5 w-5 text-indigo-500" />
          <h3 className="text-lg font-semibold text-slate-900">
            {MSG['suggestions']}
          </h3>
        </header>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <pre className="whitespace-pre-wrap text-sm text-slate-800">
            {typeof suggestions === 'string'
              ? suggestions
              : JSON.stringify(suggestions, null, 2)}
          </pre>
        </div>
      </section>
    );
  }

  // -----------------------------
  // Normalized fields from backend
  // -----------------------------
  const matchRaw =
    suggestions.matched_pct ??
    suggestions.match_pct ??
    suggestions.fit_score ??
    0;

  const matchPercent = Math.round(
    typeof matchRaw === 'number'
      ? Math.max(0, Math.min(100, matchRaw))
      : parseFloat(String(matchRaw).replace('%', '')) || 0
  );

  const summaryText = (suggestions.summary || '').trim();

  // Raw bullets from backend
  const rawBullets = Array.isArray(suggestions.suggestions)
    ? suggestions.suggestions
    : [];

  // Remove headings like "Professional Summary:" / "Improvement Suggestions:"
  const headingRegex =
    /^\s*\d*[\.\)]?\s*(professional summary|summary|improvement suggestions?|improvements?)\s*:?\s*$/i;

  const bullets = rawBullets
    .filter((item) => typeof item === 'string' && item.trim().length > 0)
    .filter((item) => !headingRegex.test(item))
    // Don’t duplicate the summary inside the list if LLM echoed it
    .filter(
      (item) =>
        !summaryText ||
        item.trim().replace(/^[-•*]\s*/, '') !== summaryText.trim()
    )
    .map((item) => item.replace(/^[-•*]\s*/, '').trim()); // strip leading "-" / "•"

  // Progress bar color based on match
  const barColor =
    matchPercent >= 75
      ? 'bg-emerald-500'
      : matchPercent >= 40
      ? 'bg-amber-500'
      : 'bg-rose-500';

  const hasMatched = Array.isArray(suggestions.matched_skills)
    ? suggestions.matched_skills.length > 0
    : false;

  const hasMissing = Array.isArray(suggestions.missing_skills)
    ? suggestions.missing_skills.length > 0
    : false;

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <section className="mt-6">
      {/* Header */}
      <header className="flex items-center gap-2 mb-3">
        <SparklesIcon className="h-5 w-5 text-indigo-500" />
        <h3 className="text-lg font-semibold text-slate-900">
          {MSG['suggestions']}
        </h3>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        {/* Match header + bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-600">
              <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
              <span>Match</span>
            </div>
            <div className="rounded-full bg-slate-900/90 px-3 py-0.5 text-xs font-semibold text-white">
              {matchPercent}%
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full ${barColor} transition-all`}
              style={{ width: `${matchPercent}%` }}
            />
          </div>

          {/* Matched / Missing skill pills */}
          {(hasMatched || hasMissing) && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {hasMatched && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span className="font-medium">Matched:</span>
                  <span className="truncate max-w-[220px]">
                    {suggestions.matched_skills.join(', ')}
                  </span>
                </span>
              )}
              {hasMissing && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">
                  <XCircleIcon className="h-4 w-4" />
                  <span className="font-medium">Missing:</span>
                  <span className="truncate max-w-[220px]">
                    {suggestions.missing_skills.join(', ')}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        {summaryText && (
          <div>
            <h4 className="text-xs font-semibold tracking-wide text-slate-500 uppercase mb-1">
              Professional Summary
            </h4>
            <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
              {summaryText}
            </p>
          </div>
        )}

        {/* Improvement Suggestions */}
        <div>
          <h4 className="text-xs font-semibold tracking-wide text-slate-500 uppercase mb-2">
            Improvement Suggestions
          </h4>
          {bullets.length > 0 ? (
            <ol className="space-y-3 text-sm text-slate-800">
              {bullets.map((text, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                    {idx + 1}
                  </span>
                  <p className="leading-relaxed">{text}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-600">
              No improvement suggestions were generated. Try providing a more
              detailed job description or resume.
            </p>
          )}
        </div>

        {/* Disclaimer */}
        {suggestions.disclaimer && (
          <p className="mt-1 text-[11px] text-slate-500">
            {suggestions.disclaimer}
          </p>
        )}
      </div>
    </section>
  );
}
