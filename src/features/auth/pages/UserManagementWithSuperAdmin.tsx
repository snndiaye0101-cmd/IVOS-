import React, { useState } from 'react';
import { Users, Shield } from 'lucide-react';
import UserManagementPage from './UserManagementPage';
import SuperAdminPanel from '../../settings/pages/SuperAdminPanel';

export default function UserManagementWithSuperAdmin() {
  const [activeTab, setActiveTab] = useState<'users' | 'superadmin'>('users');

  return (
    <div className="min-h-screen w-full">
      {/* Tabs Navigation */}
      <div className="sticky top-0 z-10 mb-6 border-b border-gray-200 bg-white">
        <div className="flex gap-1 px-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`relative flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all ${
              activeTab === 'users'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="h-5 w-5" />
            Gestion Utilisateurs
          </button>
          <button
            onClick={() => setActiveTab('superadmin')}
            className={`relative flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all ${
              activeTab === 'superadmin'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield className="h-5 w-5" />
            Contrôle Super Admin
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-0">
        {activeTab === 'users' ? <UserManagementPage /> : <SuperAdminPanel />}
      </div>
    </div>
  );
}
