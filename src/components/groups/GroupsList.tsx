import React, { useEffect, useState } from 'react';
import { Plus, Search, MoreVertical, GraduationCap, Calendar, BookOpen, ChevronRight, Trash2, Edit2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore, useAuthStore } from '../../store';
import { Group } from '../../types';
import { cn } from '../../lib/utils';

export function GroupsList() {
  const { user } = useAuthStore();
  const { groups, setGroups, setActiveGroup, setView } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
  }, [user]);

  async function fetchGroups() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('professor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSelectGroup = (group: Group) => {
    setActiveGroup(group);
    setView('dashboard');
  };

  const handleDeleteGroup = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchGroups();
      setDeletingGroupId(null);
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Error al eliminar el grupo. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-slate-900">Mis Grupos</h1>
          <p className="text-slate-500">Gestiona tus clases, alumnos y rúbricas desde un solo lugar.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-200 flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nuevo Grupo
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No tienes grupos registrados</h3>
          <p className="text-slate-500 max-w-sm mb-6">Comienza creando tu primer grupo para registrar alumnos y tomar asistencia.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-blue-600 font-semibold hover:underline"
          >
            Crear mi primer grupo ahora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div
              key={group.id}
              className="dashboard-card p-6 flex flex-col group hover:border-blue-200 transition-all"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setActiveMenu(activeMenu === group.id ? null : group.id)}
                    className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-lg transition-all"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  
                  {activeMenu === group.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-20 animate-in fade-in zoom-in duration-200">
                        <button 
                          onClick={() => {
                            setEditingGroup(group);
                            setIsModalOpen(true);
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4 text-blue-500" />
                          Editar Grupo
                        </button>
                        <button 
                          onClick={() => {
                            setDeletingGroupId(group.id);
                            setActiveMenu(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex-1 space-y-2">
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{group.name}</h3>
                <p className="text-slate-500 font-medium">{group.subject}</p>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Calendar className="w-4 h-4" />
                  <span>{group.period}</span>
                </div>
                <div className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded inline-flex items-center justify-center uppercase tracking-wider">
                  {group.school_year}
                </div>
              </div>

              <button 
                onClick={() => handleSelectGroup(group)}
                className="w-full mt-6 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Entrar al grupo
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <GroupModal 
          onClose={() => {
            setIsModalOpen(false);
            setEditingGroup(null);
          }} 
          onSave={fetchGroups} 
          editingGroup={editingGroup}
        />
      )}

      {deletingGroupId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-600">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900">¿Eliminar este grupo?</h3>
                <p className="text-slate-500">Esta acción eliminará también sus alumnos, rúbrica, actividades, asistencia, equipos, materiales y reportes asociados.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setDeletingGroupId(null)}
                  className="px-4 py-3 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDeleteGroup(deletingGroupId)}
                  disabled={loading}
                  className="px-4 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 shadow-lg shadow-red-100 transition-all flex items-center justify-center"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Eliminar definitivamente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupModal({ onClose, onSave, editingGroup }: { onClose: () => void; onSave: () => void; editingGroup?: Group | null }) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const groupData = {
      name: formData.get('name'),
      subject: formData.get('subject'),
      school_year: formData.get('school_year'),
      period: formData.get('period'),
      professor_id: user?.id
    };

    try {
      if (editingGroup) {
        const { error } = await supabase
          .from('groups')
          .update(groupData)
          .eq('id', editingGroup.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('groups').insert([groupData]);
        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving group:', error);
      alert('Error al guardar el grupo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            {editingGroup ? 'Editar Grupo' : 'Crear Nuevo Grupo'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nombre del Grupo</label>
              <input name="name" required defaultValue={editingGroup?.name} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Ej. 101 - Matutino" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Materia</label>
              <input name="subject" required defaultValue={editingGroup?.subject} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Ej. Matemáticas I" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Ciclo Escolar</label>
                <input name="school_year" defaultValue={editingGroup?.school_year} placeholder="2026-2027" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Periodo / Parcial</label>
                <input name="period" defaultValue={editingGroup?.period} placeholder="1er Parcial" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
            </div>
            
            <div className="flex gap-4 mt-8">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="submit" disabled={loading} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2">
                {loading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                {editingGroup ? 'Guardar Cambios' : 'Crear Grupo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
