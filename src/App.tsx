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
import { PlanningManager } from './components/planning/PlanningManager';
import { Dashboard } from './components/dashboard/Dashboard';
import { StudentPortal } from './components/portal/StudentPortal';
import { LandingPage } from './components/layout/LandingPage';
import { Loader2, Settings } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

export default function App() {
  const { loading, user } = useAuthStore();
  const { view } = useAppStore();
  useAuth();

  const path = window.location.pathname;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Routing Logic
  if (path === '/alumno') {
    return <StudentPortal />;
  }

  if (path === '/') {
    if (!user) {
      return <LandingPage />;
    }
  }

  if (path === '/login') {
    if (user) {
      window.location.pathname = '/';
      return null;
    }
    return <AuthForm />;
  }

  if (!user) {
    return <LandingPage />;
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
      case 'planning':
        return <PlanningManager />;
      case 'analytics':
        return <AnalyticsManager />;
      case 'settings':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div>
              <h1 className="text-3xl font-display font-bold text-slate-900">Configuración</h1>
              <p className="text-slate-500">Gestiona tus preferencias y ajustes de cuenta.</p>
            </div>
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center">
              <Settings className="w-16 h-16 text-slate-200 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">Sección en Desarrollo</h3>
              <p className="text-slate-500 max-w-sm mx-auto">Próximamente podrás configurar tu perfil, cambiar tu contraseña y ajustar las preferencias de notificaciones.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />
      <Sidebar />
      <main className="pl-64 min-h-screen">
        <div className="p-8 max-w-7xl mx-auto">
          {renderView()}
        </div>
      </main>
    </div>
  );
}
