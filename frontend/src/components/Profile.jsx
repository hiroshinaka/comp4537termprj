import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '';

export default function Profile({ onLogout, onBackToResume }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [usage, setUsage] = useState({ totalRequests: 0, freeLimit: 0, overFreeLimit: false });
  const [showUsageModal, setShowUsageModal] = useState(false);

  const defaultAvatar = 'https://ui-avatars.com/api/?name=User&background=334155&color=fff';

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const meUrl = API_BASE ? `${API_BASE.replace(/\/$/, '')}/me` : '/me';
      const meRes = await fetch(meUrl, { credentials: 'include' });
      
      if (!meRes.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      const meData = await meRes.json();
      if (meData.success && meData.user) {
        setUserData(meData.user);
      }

      const apiBase = API_BASE ? API_BASE.replace(/\/$/, '') : '';
      const usageRes = await fetch(`${apiBase}/api/me/usage`, { credentials: 'include' });
      
      if (!usageRes.ok) {
        throw new Error('Failed to fetch usage data');
      }
      
      const usageData = await usageRes.json();
      if (usageData.success && usageData.usage) {
        setUsage(usageData.usage);
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      setError(err.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showUsageModal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return undefined;
  }, [showUsageModal]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            <p className="mt-4 text-slate-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button
            onClick={onBackToResume}
            className="text-sm text-slate-600 hover:text-slate-800 border border-slate-200 px-4 py-2 rounded"
          >
            ← Back to Resume
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-sm text-slate-600 hover:text-slate-800 border border-slate-200 px-4 py-2 rounded"
            >
              Logout
            </button>
          )}
        </div>
      </div>

      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow p-6 flex gap-6">
            <div className="relative">
              <img
                src={defaultAvatar}
                alt={userData?.username || 'User'}
                className="h-24 w-24 rounded-full object-cover bg-slate-200"
              />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">
                    {userData?.username || 'User'}
                  </h1>
                  <p className="text-sm text-slate-600">@{userData?.username || 'user'}</p>
                </div>
              </div>

              <div className="mt-4 flex gap-4 items-center">
                <div>
                  <div className="text-sm text-slate-500">Total Tokens Used</div>
                  <div className="font-medium">{usage.totalRequests}</div>
                </div>
                <button 
                  onClick={() => setShowUsageModal(true)} 
                  className="text-left hover:bg-slate-50 px-3 py-2 rounded transition-colors"
                >
                  <div className="text-sm text-slate-500">Usage Status</div>
                  <div className="font-medium text-left text-slate-900">
                    {usage.overFreeLimit ? (
                      <span className="text-red-600">Over Limit</span>
                    ) : (
                      <span className="text-green-600">Within Limit</span>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>

          <section className="mt-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-lg font-semibold text-slate-900">API Usage Details</h2>
                <p className="text-sm text-slate-600 mt-1">Track your API consumption</p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">Total Tokens</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">
                          {usage.totalRequests}
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-slate-200 rounded-full flex items-center justify-center">
                        <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600">Free Tier Limit</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">
                          {usage.freeLimit}
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-blue-200 rounded-full flex items-center justify-center">
                        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className={`${usage.overFreeLimit ? 'bg-red-50' : 'bg-green-50'} rounded-lg p-4`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm ${usage.overFreeLimit ? 'text-red-600' : 'text-green-600'}`}>
                          {usage.overFreeLimit ? 'Over by' : 'Remaining'}
                        </p>
                        <p className={`text-2xl font-bold ${usage.overFreeLimit ? 'text-red-900' : 'text-green-900'} mt-1`}>
                          {usage.overFreeLimit 
                            ? usage.totalRequests - usage.freeLimit
                            : usage.freeLimit - usage.totalRequests
                          }
                        </p>
                      </div>
                      <div className={`h-12 w-12 ${usage.overFreeLimit ? 'bg-red-200' : 'bg-green-200'} rounded-full flex items-center justify-center`}>
                        {usage.overFreeLimit ? (
                          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        ) : (
                          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex justify-between text-sm text-slate-600 mb-2">
                    <span>Usage Progress</span>
                    <span>
                      {Math.min(Math.round((usage.totalRequests / usage.freeLimit) * 100), 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        usage.overFreeLimit
                          ? 'bg-red-600'
                          : usage.totalRequests / usage.freeLimit > 0.8
                          ? 'bg-yellow-500'
                          : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min((usage.totalRequests / usage.freeLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {usage.overFreeLimit && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">
                      ⚠️ You have exceeded your free tier limit. Additional charges may apply.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {showUsageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowUsageModal(false)}
            aria-hidden
          />

          <div className="relative z-60 w-full max-w-sm mx-4">
            <div className="bg-gray-800 text-white rounded-lg shadow-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">API Usage Summary</h3>
                  <p className="text-sm text-slate-300">Your current usage status</p>
                </div>
                <button
                  onClick={() => setShowUsageModal(false)}
                  aria-label="Close"
                  className="ml-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-slate-300 hover:bg-gray-700"
                >
                  <span className="sr-only">Close</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Total Requests</span>
                  <span className="text-xl font-semibold">{usage.totalRequests}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Free Limit</span>
                  <span className="text-xl font-semibold">{usage.freeLimit}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                  <span className="text-sm text-slate-400">Status</span>
                  <span className={`text-xl font-semibold ${usage.overFreeLimit ? 'text-red-400' : 'text-green-400'}`}>
                    {usage.overFreeLimit ? 'Over Limit' : 'Within Limit'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
