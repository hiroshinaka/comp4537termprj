import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '';

export default function AdminDashboard({ onLogout }) {
  const [endpointStats, setEndpointStats] = useState([]);
  const [userStats, setUserStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpointUrl = API_BASE ? `${API_BASE.replace(/\/$/, '')}/api/admin/endpoint-stats` : '/api/admin/endpoint-stats';
      const userUrl = API_BASE ? `${API_BASE.replace(/\/$/, '')}/api/admin/user-stats` : '/api/admin/user-stats';

      const [endpointRes, userRes] = await Promise.all([
        fetch(endpointUrl, { credentials: 'include' }),
        fetch(userUrl, { credentials: 'include' })
      ]);

      if (!endpointRes.ok || !userRes.ok) {
        throw new Error('Failed to fetch admin stats');
      }

      const endpointData = await endpointRes.json();
      const userData = await userRes.json();

      setEndpointStats(endpointData.data || []);
      setUserStats(userData.data || []);
    } catch (err) {
      console.error('Admin stats error:', err);
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            <p className="mt-4 text-slate-600">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {onLogout && (
        <div className="bg-white border-b border-slate-200 px-6 py-3">
          <div className="max-w-7xl mx-auto flex justify-end">
            <button
              onClick={onLogout}
              className="text-sm text-slate-600 hover:text-slate-800 border border-slate-200 px-4 py-2 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      )}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">API Endpoint Statistics</h2>
            <p className="text-sm text-slate-500 mt-1">Request counts for all endpoints</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Endpoint
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Requests
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {endpointStats.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-center text-sm text-slate-500">
                      No endpoint data available
                    </td>
                  </tr>
                ) : (
                  endpointStats.map((stat, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {stat.method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        {stat.endpoint}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {stat.requests}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">User API Consumption</h2>
            <p className="text-sm text-slate-500 mt-1">Total API requests per user</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Total Requests
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {userStats.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-center text-sm text-slate-500">
                      No user data available
                    </td>
                  </tr>
                ) : (
                  userStats.map((user, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {user.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {user.total_requests}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
