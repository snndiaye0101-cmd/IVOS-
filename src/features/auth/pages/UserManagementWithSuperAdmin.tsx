import React, { useState } from 'react';
import { Users, Shield } from 'lucide-react';
import UserManagementPage from './UserManagementPage';
import SuperAdminPanel from '../../settings/pages/SuperAdminPanel';

export default function UserManagementWithSuperAdmin() {
  const [activeTab, setActiveTab] = useState<'users' | 'superadmin'>('users');

  return (
    <div className="w-full min-h-screen">
      {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200 mb-6 sticky top-0 z-10">
        <div className="flex gap-1 px-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-all relative ${
              activeTab === 'users'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-5 h-5" />
            Gestion Utilisateurs
          </button>
          <button
            onClick={() => setActiveTab('superadmin')}
            className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-all relative ${
              activeTab === 'superadmin'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield className="w-5 h-5" />
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
