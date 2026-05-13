import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Plus, 
  ChevronLeft,
  User,
  ShieldCheck,
  Zap,
  Dice5,
  RotateCcw,
  LayoutGrid,
  Info
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
  const [modalMode, setModalMode] = useState<'manual' | 'auto'>('manual');

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

  const handleDeleteAllTeams = async () => {
    if (!activeGroup) return;
    if (!confirm('¿Seguro que quieres eliminar TODOS los equipos de este grupo? Esta acción no se puede deshacer.')) return;
    
    const teamIds = teams.map(t => t.id);
    if (teamIds.length === 0) return;

    await supabase.from('teams').delete().in('id', teamIds);
    fetchTeamsData();
  };

  const openModal = (mode: 'manual' | 'auto') => {
    setModalMode(mode);
    setIsModalOpen(true);
  };

  if (!activeGroup) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('groups')} className="p-2 hover:bg-white rounded-full text-slate-400"><ChevronLeft className="w-6 h-6" /></button>
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Equipos</h1>
            <p className="text-slate-500">Organiza a tus alumnos en equipos para trabajos colaborativos.</p>
          </div>
        </div>
        <div className="flex gap-3">
          {teams.length > 0 && (
            <button 
              onClick={handleDeleteAllTeams}
              className="px-4 py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Resetear Equipos
            </button>
          )}
          <button 
            onClick={() => openModal('auto')}
            className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-purple-200 flex items-center gap-2 hover:bg-purple-700 transition-all active:scale-95"
          >
            <Dice5 className="w-5 h-5" />
            Generación Aleatoria
          </button>
          <button 
            onClick={() => openModal('manual')}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Equipo Manual
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[1,2,3].map(i => <div key={i} className="h-48 bg-white rounded-3xl animate-pulse border border-slate-200" />)}
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center flex flex-col items-center">
            <Users className="w-16 h-16 text-slate-100 mb-6" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No hay equipos creados</h3>
            <p className="text-slate-500 max-w-sm mb-8">Puedes crear equipos manualmente o generarlos aleatoriamente basándote en la lista de alumnos.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => openModal('auto')}
                className="bg-purple-50 text-purple-700 px-6 py-3 rounded-2xl font-bold hover:bg-purple-100 transition-all"
              >
                Generar Automáticamente
              </button>
              <button 
                onClick={() => openModal('manual')}
                className="bg-blue-50 text-blue-700 px-6 py-3 rounded-2xl font-bold hover:bg-blue-100 transition-all"
              >
                Crear Manualmente
              </button>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team, index) => (
            <div key={team.id} className="dashboard-card p-6 flex flex-col animate-in zoom-in duration-300" style={{ animationDelay: `${index * 50}ms` }}>
               <div className="flex justify-between items-start mb-6">
                 <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">
                   {index + 1}
                 </div>
                 <button onClick={() => handleDeleteTeam(team.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                   <Trash2 className="w-5 h-5" />
                 </button>
               </div>
               <h3 className="text-xl font-bold text-slate-900 mb-4">{team.name}</h3>
               <div className="flex-1 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                    Integrantes
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{team.members.length}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {team.members.map((m: Student) => (
                      <span key={m.id} className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 hover:bg-white transition-colors">
                        <User className="w-3 h-3 text-slate-400" />
                        {m.last_name.split(' ')[0]} {m.first_name.split(' ')[0]}
                      </span>
                    ))}
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <TeamModal 
          mode={modalMode}
          onClose={() => setIsModalOpen(false)} 
          onSave={fetchTeamsData} 
          students={students} 
        />
      )}
    </div>
  );
}

function TeamModal({ 
  mode, 
  onClose, 
  onSave, 
  students 
}: { 
  mode: 'manual' | 'auto',
  onClose: () => void, 
  onSave: () => void, 
  students: Student[] 
}) {
  const { activeGroup } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [autoMode, setAutoMode] = useState<'count' | 'size'>('count');
  const [autoValue, setAutoValue] = useState(2);

  const toggleStudent = (id: string) => {
     setSelectedStudents(prev => 
       prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
     );
  };

  const handleManualSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeGroup || selectedStudents.length === 0) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const teamName = formData.get('name') as string;

    try {
      const { data: newTeam, error: tError } = await supabase
        .from('teams')
        .insert([{ name: teamName, group_id: activeGroup.id }])
        .select()
        .single();
      
      if (tError) throw tError;

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

  const handleAutoGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeGroup || students.length === 0) return;
    setLoading(true);

    try {
      // Shuffle students
      const shuffled = [...students].sort(() => Math.random() - 0.5);
      const totalStudents = shuffled.length;
      
      let teamsToCreate: Student[][] = [];
      
      if (autoMode === 'count') {
        const teamCount = Math.min(autoValue, totalStudents);
        teamsToCreate = Array.from({ length: teamCount }, () => []);
        shuffled.forEach((student, i) => {
          teamsToCreate[i % teamCount].push(student);
        });
      } else {
        const teamSize = Math.max(1, Math.min(autoValue, totalStudents));
        for (let i = 0; i < totalStudents; i += teamSize) {
          teamsToCreate.push(shuffled.slice(i, i + teamSize));
        }
      }

      // 1. Create Teams
      const teamsData = teamsToCreate.map((_, i) => ({
        name: `Equipo ${i + 1}`,
        group_id: activeGroup.id
      }));

      const { data: createdTeams, error: tError } = await supabase
        .from('teams')
        .insert(teamsData)
        .select();

      if (tError) throw tError;

      // 2. Create Members
      const membersToInsert: any[] = [];
      createdTeams.forEach((team, i) => {
        teamsToCreate[i].forEach(student => {
          membersToInsert.push({
            team_id: team.id,
            student_id: student.id
          });
        });
      });

      const { error: mError } = await supabase.from('team_members').insert(membersToInsert);
      if (mError) throw mError;

      onSave();
      onClose();
    } catch (error) {
      console.error('Error auto-generating teams:', error);
      alert('Error al generar equipos aleatorios');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        {mode === 'manual' ? (
          <form onSubmit={handleManualSave} className="p-8 space-y-6">
            <div className="flex justify-between items-start">
               <div>
                 <h2 className="text-2xl font-bold text-slate-900">Crear Equipo Manual</h2>
                 <p className="text-sm text-slate-500">Selecciona libremente a los integrantes.</p>
               </div>
               <div className="bg-blue-50 p-3 rounded-2xl text-blue-600"><UserPlus className="w-6 h-6" /></div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nombre del Equipo</label>
                <input name="name" required placeholder="Ej. Equipo Dinamita" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" />
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
        ) : (
          <form onSubmit={handleAutoGenerate} className="p-8 space-y-6">
            <div className="flex justify-between items-start">
               <div>
                 <h2 className="text-2xl font-bold text-slate-900">Generación Aleatoria</h2>
                 <p className="text-sm text-slate-500">Distribuye automáticamente a todos los alumnos ({students.length}).</p>
               </div>
               <div className="bg-purple-50 p-3 rounded-2xl text-purple-600"><Dice5 className="w-6 h-6" /></div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 text-amber-700">
              <Info className="w-5 h-5 shrink-0" />
              <p className="text-xs font-medium leading-relaxed">
                Esta acción creará múltiples equipos y distribuirá a todos los alumnos activos del grupo.
                Si ya existen equipos, los nuevos se añadirán a la lista.
              </p>
            </div>

            <div className="space-y-6">
               <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Estrategia de distribución</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setAutoMode('count')}
                      className={cn(
                        "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                        autoMode === 'count' ? "bg-purple-50 border-purple-600 text-purple-900 shadow-sm" : "border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <LayoutGrid className="w-5 h-5" />
                      <span className="text-sm font-bold">Número de equipos</span>
                    </button>
                    <button 
                      type="button"
                       onClick={() => setAutoMode('size')}
                      className={cn(
                        "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                        autoMode === 'size' ? "bg-purple-50 border-purple-600 text-purple-900 shadow-sm" : "border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <Users className="w-5 h-5" />
                      <span className="text-sm font-bold">Alumnos por equipo</span>
                    </button>
                  </div>
               </div>

               <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                    {autoMode === 'count' ? '¿Cuántos equipos quieres crear?' : '¿Cuántos alumnos por cada equipo?'}
                  </label>
                  <div className="flex items-center gap-6">
                    <input 
                      type="range" 
                      min="1" 
                      max={students.length} 
                      value={autoValue}
                      onChange={(e) => setAutoValue(parseInt(e.target.value))}
                      className="flex-1 accent-purple-600"
                    />
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl font-black">
                      {autoValue}
                    </div>
                  </div>
                  <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {autoMode === 'count' 
                      ? `~${Math.ceil(students.length / autoValue)} alumnos por equipo` 
                      : `~${Math.ceil(students.length / autoValue)} equipos totales`}
                  </p>
               </div>
            </div>

            <div className="flex gap-4 pt-4">
               <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all">Cancelar</button>
               <button type="submit" disabled={loading || students.length === 0} className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-xl shadow-purple-200 flex items-center justify-center gap-2">
                 {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Zap className="w-5 h-5" />}
                 Generar Equipos
               </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
