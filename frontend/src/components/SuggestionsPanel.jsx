import React from 'react';

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
          <div className="text-sm text-slate-700">Loading suggestions…</div>
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
        <h3 className="text-lg font-medium text-slate-800 mb-3">Suggestions</h3>
        <div className="bg-white rounded-md p-4 border border-slate-100">
          <ul className="list-disc list-inside space-y-2 text-sm text-slate-800">
            {list.map((it, idx) => (
              <li key={idx}>{typeof it === 'string' ? it : JSON.stringify(it)}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // If the object has a text/content field
  if (suggestions.text || suggestions.content) {
    const text = suggestions.text || suggestions.content;
    return (
      <div className="mt-6">
        <h3 className="text-lg font-medium text-slate-800 mb-3">Suggestions</h3>
        <div className="bg-white rounded-md p-4 border border-slate-100 text-sm text-slate-800">
          <div className="whitespace-pre-wrap">{text}</div>
        </div>
      </div>
    );
  }

  // Fallback: pretty-print object
  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium text-slate-800 mb-3">Suggestions</h3>
      <div className="bg-white rounded-md p-4 border border-slate-100">
        <pre className="whitespace-pre-wrap text-sm text-slate-800">{JSON.stringify(suggestions, null, 2)}</pre>
      </div>
    </div>
  );
}
