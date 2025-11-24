import React, { useState, useEffect } from 'react';
import MSG from '../lang/en/messages.js';
const API_BASE = process.env.REACT_APP_API_URL || '';

export default function AdminDashboard({ onLogout }) {
  const [endpointStats, setEndpointStats] = useState([]);
  const [userStats, setUserStats] = useState([]);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' or 'users'

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
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
      setLoading(false);
    } catch (err) {
      console.error('Admin stats error:', err);
      setError(err.message || 'Failed to load admin data');
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setError(null);
    try {
      const url = API_BASE ? `${API_BASE.replace(/\/$/, '')}/api/admin/users?page=${pagination.page}&limit=${pagination.limit}` : `/api/admin/users?page=${pagination.page}&limit=${pagination.limit}`;
      const res = await fetch(url, { credentials: 'include' });
      
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await res.json();
      setUsers(data.users || []);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Fetch users error:', err);
      setError(err.message || 'Failed to load users');
    }
  };

  const handleRoleChange = async (userId, newRoleId) => {
    try {
      const url = API_BASE ? `${API_BASE.replace(/\/$/, '')}/api/admin/users/${userId}/role` : `/api/admin/users/${userId}/role`;
      const res = await fetch(url, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: newRoleId })
      });
      
      if (!res.ok) {
        throw new Error('Failed to update user role');
      }
      
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error('Update role error:', err);
      setError(err.message || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const url = API_BASE ? `${API_BASE.replace(/\/$/, '')}/api/admin/users/${userId}` : `/api/admin/users/${userId}`;
      const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error('Delete user error:', err);
      setError(err.message || 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            <p className="mt-4 text-slate-600">{MSG["loading admin dashboard"]}</p>
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
            <h1 className="text-3xl font-bold text-slate-900">{MSG["admin dashboard"]}</h1>
          </div>

          <div className="mb-6 border-b border-slate-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('stats')}
                className={`${
                  activeTab === 'stats'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                } whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm`}
              >
                API Statistics
              </button>
              <button
                onClick={() => {
                  setActiveTab('users');
                  if (users.length === 0) {
                    fetchUsers();
                  }
                }}
                className={`${
                  activeTab === 'users'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                } whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm`}
              >
                User Management
              </button>
            </nav>
          </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {activeTab === 'stats' ? (
          <>
            <div className="bg-white shadow rounded-lg mb-6">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-900">{MSG["API Endpoint Statistics"]}</h2>
                <p className="text-sm text-slate-500 mt-1">{MSG["Request count"]}</p>
              </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {MSG["method"]}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {MSG["endpoint"]}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {MSG["requests"]}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {endpointStats.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-center text-sm text-slate-500">
                      {MSG["no endpoint"]}
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
            <h2 className="text-xl font-semibold text-slate-900">{MSG["user api consumption"]}</h2>
            <p className="text-sm text-slate-500 mt-1">{MSG["total API requests per user"]}</p>
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
          </>
        ) : (
          // User Management Tab
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">User Management</h2>
              <p className="text-sm text-slate-500 mt-1">Manage user accounts and permissions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-sm text-slate-500">
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-sm text-slate-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {user.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role_id === 1
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role_id === 1 ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          <div className="flex space-x-2">
                            {user.role_id === 1 ? (
                              <button
                                onClick={() => handleRoleChange(user.id, 2)}
                                className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600"
                              >
                                Demote to User
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRoleChange(user.id, 1)}
                                className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                              >
                                Promote to Admin
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(user.id, user.username)}
                              className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total users)
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => fetchUsers(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchUsers(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
