import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  ClipboardCheck, 
  BarChart3, 
  LogOut,
  ChevronRight,
  UserCircle,
  ShieldCheck,
  FileText,
  Scale,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { useAppStore, useAuthStore } from '../../store';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

export function Sidebar() {
  const { view, setView, activeGroup, setActiveGroup } = useAppStore();
  const { user, profile } = useAuthStore();

  const globalMenuItems = [
    { id: 'dashboard', label: 'Dashboard General', icon: LayoutDashboard },
    { id: 'groups', label: 'Mis Grupos', icon: GraduationCap },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  const groupMenuItems = [
    { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
    { id: 'students', label: 'Alumnos', icon: Users },
    { id: 'teams', label: 'Equipos', icon: ShieldCheck },
    { id: 'activities', label: 'Actividades', icon: FileText },
    { id: 'attendance', label: 'Asistencia', icon: ClipboardCheck },
    { id: 'rubrics', label: 'Rúbrica', icon: Scale },
    { id: 'analytics', label: 'Reportes', icon: BarChart3 },
  ];

  const handleLogout = () => supabase.auth.signOut();

  const handleBackToGroups = () => {
    setActiveGroup(null);
    setView('groups');
  };

  const menuItems = activeGroup ? groupMenuItems : globalMenuItems;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 z-20">
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 text-blue-600 mb-8">
          <GraduationCap className="w-8 h-8 font-bold" />
          <span className="font-display font-bold text-xl tracking-tight">Panel Docente</span>
        </div>

        {activeGroup && (
          <div className="mb-6">
            <button 
              onClick={handleBackToGroups}
              className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors mb-4 group/back"
            >
              <ArrowLeft className="w-3 h-3 group-hover/back:-translate-x-1 transition-transform" />
              Volver a Mis Grupos
            </button>
            <div className="bg-blue-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-100">
              <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Grupo Activo</p>
              <p className="text-sm font-bold truncate">{activeGroup.name}</p>
              <p className="text-[10px] opacity-70 truncate">{activeGroup.subject}</p>
            </div>
          </div>
        )}

        <nav className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-4">
            {activeGroup ? 'Menú del Grupo' : 'Principal'}
          </p>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                view === item.id 
                  ? "bg-blue-50 text-blue-600 shadow-sm shadow-blue-100" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-transform group-hover:scale-110",
                view === item.id ? "text-blue-600" : "text-slate-400"
              )} />
              {item.label}
              {view === item.id && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 overflow-hidden shrink-0">
            {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
               <UserCircle className="w-6 h-6" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{profile?.full_name || 'Profesor'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all group"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
