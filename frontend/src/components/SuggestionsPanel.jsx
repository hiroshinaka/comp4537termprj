import React from 'react';
import MSG from '../lang/en/messages.js';
import {
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';

function SkeletonLine() {
  return <div className="mb-2 h-4 w-full animate-pulse rounded bg-slate-200" />;
}

export default function SuggestionsPanel({ suggestions, loading }) {
  // -----------------------------
  // Loading state
  // -----------------------------
  if (loading) {
    return (
      <section className="mt-6">
        <div className="mb-3 flex items-center gap-2 text-sm text-slate-700">
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
          <div className="mt-2 grid grid-cols-2 gap-3">
            <SkeletonLine />
            <SkeletonLine />
          </div>
        </div>
      </section>
    );
  }

  if (!suggestions) return null;

  // -----------------------------
  // Normalize shape: handle { success, suggestions } from API
  // -----------------------------
  let structured =
    suggestions && typeof suggestions === 'object' && 'suggestions' in suggestions
      ? suggestions.suggestions
      : suggestions;

  // If backend returns a plain string, pretty-print it.
  if (typeof structured === 'string') {
    return (
      <section className="mt-6">
        <header className="mb-3 flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-indigo-500" />
          <h3 className="text-lg font-semibold text-slate-900">
            {MSG['suggestions']}
          </h3>
        </header>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <pre className="whitespace-pre-wrap text-sm text-slate-800">{structured}</pre>
        </div>
      </section>
    );
  }

  // If backend returned a flat array of strings, try to convert it into a
  // structured object (summary + suggestions). This handles cases where the
  // LLM returned a simple numbered list with heading markers like
  // ["Professional Summary:", "text...", "Improvement Suggestions:", "..."].
  if (Array.isArray(structured) && structured.every((p) => typeof p === 'string')) {
    const headingRegexLocal = /^\s*(professional summary|summary|improvement suggestions?|improvements?)\s*:?\s*$/i;
    let mode = null;
    let parsed = { summary: '', suggestions: [] };
    for (const item of structured) {
      const t = item.trim();
      if (headingRegexLocal.test(t)) {
        const key = t.toLowerCase();
        if (key.includes('summary')) mode = 'summary';
        else if (key.includes('improv') || key.includes('improvement')) mode = 'suggestions';
        else mode = null;
        continue;
      }
      if (!mode) {
        // If no explicit heading, heuristically decide: first long paragraph -> summary
        if (!parsed.summary && t.length > 80) {
          parsed.summary = t;
        } else {
          parsed.suggestions.push(t.replace(/^[-•*\d.)\s]+/, '').trim());
        }
      } else if (mode === 'summary') {
        parsed.summary = parsed.summary ? parsed.summary + '\n' + t : t;
      } else if (mode === 'suggestions') {
        parsed.suggestions.push(t.replace(/^[-•*\d.)\s]+/, '').trim());
      }
    }

    // If we successfully parsed something useful, use it as the payload
    if (parsed.summary || parsed.suggestions.length > 0) {
      // replace payload with parsed object so downstream rendering handles it
      // (we use the same `result` variable later)
      structured = parsed;
    } else {
      // fallback to raw print
      return (
        <section className="mt-6">
          <header className="mb-3 flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-semibold text-slate-900">{MSG['suggestions']}</h3>
          </header>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <pre className="whitespace-pre-wrap text-sm text-slate-800">{JSON.stringify(structured, null, 2)}</pre>
          </div>
        </section>
      );
    }
  }

  // From here on, we assume `payload` is an object with the fields from the LLM
  const result = structured || {};

  // -----------------------------
  // Normalized fields from backend
  // -----------------------------
  const matchRaw =
    result.matched_pct ?? result.match_pct ?? result.fit_score ?? 0;

  const matchPercent = Math.round(
    typeof matchRaw === 'number'
      ? Math.max(0, Math.min(100, matchRaw))
      : parseFloat(String(matchRaw).replace('%', '')) || 0
  );

  const summaryText = (result.summary || '').trim();

  // Prefer `suggestions` array, but be flexible with `bullets` or `items`
  const rawBullets = Array.isArray(result.suggestions)
    ? result.suggestions
    : Array.isArray(result.bullets)
    ? result.bullets
    : Array.isArray(result.items)
    ? result.items
    : [];

  const headingRegex =
    /^\s*\d*[.)]?\s*(professional summary|summary|improvement suggestions?|improvements?)\s*:?\s*$/i;

  const bullets = rawBullets
    .filter((item) => typeof item === 'string' && item.trim().length > 0)
    .filter((item) => !headingRegex.test(item))
    .filter(
      (item) =>
        !summaryText ||
        item.trim().replace(/^[-•*]\s*/, '') !== summaryText.trim()
    )
    .map((item) => item.replace(/^[-•*]\s*/, '').trim());

  const barColor =
    matchPercent >= 75
      ? 'bg-emerald-500'
      : matchPercent >= 40
      ? 'bg-amber-500'
      : 'bg-rose-500';

  const hasMatched = Array.isArray(result.matched_skills)
    ? result.matched_skills.length > 0
    : false;

  const hasMissing = Array.isArray(result.missing_skills)
    ? result.missing_skills.length > 0
    : false;

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <section className="mt-6">
      {/* Header */}
      <header className="mb-3 flex items-center gap-2">
        <SparklesIcon className="h-5 w-5 text-indigo-500" />
        <h3 className="text-lg font-semibold text-slate-900">
          {MSG['suggestions']}
        </h3>
      </header>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Match header + bar */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-600">
              <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
              <span>Match</span>
            </div>
            <div className="rounded-full bg-slate-900/90 px-3 py-0.5 text-xs font-semibold text-white">
              {matchPercent}%
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full ${barColor} transition-all`}
              style={{ width: `${matchPercent}%` }}
            />
          </div>

          {(hasMatched || hasMissing) && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {hasMatched && (
                <span className="inline-flex max-w-[220px] items-center gap-1 truncate rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span className="font-medium">Matched:</span>
                  <span className="truncate">
                    {result.matched_skills.join(', ')}
                  </span>
                </span>
              )}
              {hasMissing && (
                <span className="inline-flex max-w-[220px] items-center gap-1 truncate rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">
                  <XCircleIcon className="h-4 w-4" />
                  <span className="font-medium">Missing:</span>
                  <span className="truncate">
                    {result.missing_skills.join(', ')}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        {summaryText && (
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Professional Summary
            </h4>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {summaryText}
            </p>
          </div>
        )}

        {/* Improvement Suggestions */}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
        {result.disclaimer && (
          <p className="mt-1 text-[11px] text-slate-500">
            {result.disclaimer}
          </p>
        )}
      </div>
    </section>
  );
}
