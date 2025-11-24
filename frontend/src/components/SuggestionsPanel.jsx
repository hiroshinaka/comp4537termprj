import React from 'react';
import MSG from '../lang/en/messages.js';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
function SkeletonLine() {
  return <div className="h-4 bg-slate-200 rounded w-full mb-3 animate-pulse" />;
}

export default function SuggestionsPanel({ suggestions, loading }) {
  // suggestions can be: string, array, or object (with typical keys)
  if (loading) {
    return (
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-3">
          <svg className="animate-spin h-5 w-5 text-slate-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <div className="text-sm text-slate-700">{MSG["loading suggestions"]}</div>
        </div>
        <div className="bg-white rounded-md p-4 border border-slate-100">
          <SkeletonLine />
          <SkeletonLine />
          <SkeletonLine />
          <div className="grid grid-cols-2 gap-3 mt-2">
            <SkeletonLine />
            <SkeletonLine />
          </div>
        </div>
      </div>
    );
  }

  if (!suggestions) return null;

  // Render common shapes
  if (typeof suggestions === 'string') {
    return (
      <div className="mt-6">
        <div className="bg-white rounded-md p-4 border border-slate-100">
          <pre className="whitespace-pre-wrap text-sm text-slate-800">{suggestions}</pre>
        </div>
      </div>
    );
  }

  // If it's an object with an array under 'suggestions' or 'items'
  const list = Array.isArray(suggestions.suggestions)
    ? suggestions.suggestions
    : Array.isArray(suggestions.items)
    ? suggestions.items
    : Array.isArray(suggestions)
    ? suggestions
    : null;

  if (list) {
  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium text-slate-800 mb-3">{MSG["suggestions"]}</h3>
      <div className="bg-white rounded-md p-4 border border-slate-100 text-sm text-slate-800">
        {/* Match / score bar if available */}
        {(suggestions.matched_pct || suggestions.match_pct || suggestions.fit_score) && (
          <div className="mb-3 flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-slate-600">Match</span>
              <div className="px-2 py-1 rounded-md text-sm font-semibold bg-slate-100 text-slate-800">
                {Math.round(
                  suggestions.matched_pct ||
                  suggestions.match_pct ||
                  suggestions.fit_score
                )}% 
              </div>
            </div>
            <div className="w-48 bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  (suggestions.matched_pct || suggestions.match_pct || suggestions.fit_score) >= 75
                    ? 'bg-emerald-500'
                    : (suggestions.matched_pct || suggestions.match_pct || suggestions.fit_score) >= 40
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    suggestions.matched_pct ||
                      suggestions.match_pct ||
                      suggestions.fit_score ||
                      0
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Summary from backend if present */}
        {suggestions.summary && (
          <div className="mb-4 text-slate-800 whitespace-pre-wrap">
            {suggestions.summary}
          </div>
        )}

        {/* Bullet suggestions */}
        <ul className="space-y-3 text-slate-800">
          {list.map((it, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="mt-1 shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-50 text-blue-600 font-semibold">
                {idx + 1}
              </span>
              <div className="flex-1">
                {typeof it === 'string' ? (
                  <div>{it}</div>
                ) : (
                  <pre className="whitespace-pre-wrap">{JSON.stringify(it, null, 2)}</pre>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

  // Fallback: pretty-print object
  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium text-slate-800 mb-3">{MSG["suggestions"]}</h3>
      <div className="bg-white rounded-md p-4 border border-slate-100">
        {/* show match/score summary if available */}
        {(suggestions && (suggestions.matched_pct || suggestions.match_pct || suggestions.fit_score)) && (
          <div className="mb-3 flex items-center gap-4">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
              <div className="text-sm text-slate-700 font-semibold">{(suggestions.matched_pct || suggestions.match_pct || suggestions.fit_score) + (String(suggestions.matched_pct || suggestions.match_pct || suggestions.fit_score).includes('%') ? '' : '%')}</div>
            </div>
            {suggestions.matched_skills && suggestions.matched_skills.length > 0 && (
              <div className="text-sm text-slate-600">Matched: <span className="font-medium text-slate-800">{suggestions.matched_skills.join(', ')}</span></div>
            )}
            {suggestions.missing_skills && suggestions.missing_skills.length > 0 && (
              <div className="ml-auto text-sm text-rose-600">Missing: <span className="font-medium text-rose-700">{suggestions.missing_skills.join(', ')}</span></div>
            )}
          </div>
        )}
        <pre className="whitespace-pre-wrap text-sm text-slate-800">{JSON.stringify(suggestions, null, 2)}</pre>
      </div>
    </div>
  );
}
