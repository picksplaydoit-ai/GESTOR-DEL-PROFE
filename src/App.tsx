/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from './hooks/useAuth';
import { useAuthStore, useAppStore } from './store';
import { AuthForm } from './components/auth/AuthForm';
import { Sidebar } from './components/layout/Sidebar';
import { GroupsList } from './components/groups/GroupsList';
import { StudentsManager } from './components/students/StudentsManager';
import { RubricManager } from './components/rubrics/RubricManager';
import { ActivitiesManager } from './components/activities/ActivitiesManager';
import { AttendanceManager } from './components/attendance/AttendanceManager';
import { AnalyticsManager } from './components/analytics/AnalyticsManager';
import { TeamsManager } from './components/groups/TeamsManager';
import { Dashboard } from './components/dashboard/Dashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { loading, user } = useAuthStore();
  const { view } = useAppStore();
  useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard />;
      case 'groups':
        return <GroupsList />;
      case 'students':
        return <StudentsManager />;
      case 'teams':
        return <TeamsManager />;
      case 'activities':
        return <ActivitiesManager />;
      case 'attendance':
        return <AttendanceManager />;
      case 'rubrics':
        return <RubricManager />;
      case 'analytics':
        return <AnalyticsManager />;
      default:
        return <div>Sección en construcción...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="pl-64 min-h-screen">
        <div className="p-8 max-w-7xl mx-auto">
          {renderView()}
        </div>
      </main>
    </div>
  );
}
