import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Plus, 
  ChevronLeft,
  User,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';
import { Student } from '../../types';
import { cn } from '../../lib/utils';

export function TeamsManager() {
  const { activeGroup, setView } = useAppStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (activeGroup) {
      fetchTeamsData();
    }
  }, [activeGroup]);

  async function fetchTeamsData() {
    if (!activeGroup) return;
    setLoading(true);
    try {
      const [
        { data: teamData },
        { data: studentData },
        { data: membersData }
      ] = await Promise.all([
        supabase.from('teams').select('*').eq('group_id', activeGroup.id),
        supabase.from('students').select('*').eq('group_id', activeGroup.id).eq('is_active', true).order('last_name'),
        supabase.from('team_members').select('*, students(*)').in('student_id', (await supabase.from('students').select('id').eq('group_id', activeGroup.id)).data?.map(s => s.id) || [])
      ]);

      const formattedTeams = teamData?.map(t => ({
        ...t,
        members: membersData?.filter(m => m.team_id === t.id).map(m => m.students) || []
      }));

      setTeams(formattedTeams || []);
      setStudents(studentData || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('¿Seguro que quieres eliminar este equipo?')) return;
    await supabase.from('teams').delete().eq('id', id);
    fetchTeamsData();
  };

  if (!activeGroup) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('groups')} className="p-2 hover:bg-white rounded-full text-slate-400"><ChevronLeft className="w-6 h-6" /></button>
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Equipos</h1>
            <p className="text-slate-500">Organiza a tus alumnos en equipos para trabajos colaborativos.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2 hover:bg-blue-700 transition-all"
        >
          <Plus className="w-5 h-5" />
          Nuevo Equipo
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[1,2,3].map(i => <div key={i} className="h-48 bg-white rounded-3xl animate-pulse border border-slate-200" />)}
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center flex flex-col items-center">
            <Users className="w-16 h-16 text-slate-100 mb-6" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No hay equipos creados</h3>
            <p className="text-slate-500 max-w-sm mb-8">Los equipos te permiten calificar proyectos grupales con un solo clic.</p>
            <button onClick={() => setIsModalOpen(true)} className="text-blue-600 font-bold hover:underline">Crear primer equipo</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div key={team.id} className="dashboard-card p-6 flex flex-col">
               <div className="flex justify-between items-start mb-6">
                 <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                   <ShieldCheck className="w-6 h-6" />
                 </div>
                 <button onClick={() => handleDeleteTeam(team.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                   <Trash2 className="w-5 h-5" />
                 </button>
               </div>
               <h3 className="text-xl font-bold text-slate-900 mb-4">{team.name}</h3>
               <div className="flex-1 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Integrantes ({team.members.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {team.members.map((m: Student) => (
                      <span key={m.id} className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium text-slate-600 flex items-center gap-1.5">
                        <User className="w-3 h-3" />
                        {m.last_name}
                      </span>
                    ))}
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && <TeamModal onClose={() => setIsModalOpen(false)} onSave={fetchTeamsData} students={students} />}
    </div>
  );
}

function TeamModal({ onClose, onSave, students }: { onClose: () => void, onSave: () => void, students: Student[] }) {
  const { activeGroup } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const toggleStudent = (id: string) => {
     setSelectedStudents(prev => 
       prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
     );
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeGroup || selectedStudents.length === 0) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const teamName = formData.get('name') as string;

    try {
      // 1. Create Team
      const { data: newTeam, error: tError } = await supabase
        .from('teams')
        .insert([{ name: teamName, group_id: activeGroup.id }])
        .select()
        .single();
      
      if (tError) throw tError;

      // 2. Add Members
      const members = selectedStudents.map(sId => ({
        team_id: newTeam.id,
        student_id: sId
      }));

      const { error: mError } = await supabase.from('team_members').insert(members);
      if (mError) throw mError;

      onSave();
      onClose();
    } catch (error) {
      console.error('Error creating team:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="flex justify-between items-start">
             <div>
               <h2 className="text-2xl font-bold text-slate-900">Crear Equipo</h2>
               <p className="text-sm text-slate-500">Agrupa alumnos para este grupo escolar.</p>
             </div>
             <div className="bg-purple-50 p-3 rounded-2xl text-purple-600"><Users className="w-6 h-6" /></div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nombre del Equipo</label>
              <input name="name" required placeholder="Ej. Equipo Alfa" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Seleccionar Integrantes ({selectedStudents.length})</label>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-100">
                {students.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleStudent(s.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                      selectedStudents.includes(s.id) 
                        ? "bg-blue-600 border-blue-600 text-white" 
                        : "bg-white border-white text-slate-600 hover:border-slate-100"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full", selectedStudents.includes(s.id) ? "bg-white" : "bg-slate-200")} />
                    <span className="text-xs font-bold truncate">{s.last_name}, {s.first_name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
             <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all">Cancelar</button>
             <button type="submit" disabled={loading || selectedStudents.length === 0} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50">
               {loading ? 'Creando...' : 'Crear Equipo'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
