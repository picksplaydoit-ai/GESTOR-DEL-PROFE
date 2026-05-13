import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  FileText, 
  ChevronLeft,
  Users,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit3,
  Search,
  Calculator,
  ShieldCheck,
  Scale,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';
import { Activity, RubricCriterion, Student, Submission, GradingMode } from '../../types';
import { cn } from '../../lib/utils';
import { formatLocalDate } from '../../lib/date.ts';

export function ActivitiesManager() {
  const { activeGroup, setView } = useAppStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  useEffect(() => {
    if (activeGroup) {
      fetchData();
    }
  }, [activeGroup]);

  async function fetchData() {
    if (!activeGroup) return;
    try {
      const [{ data: actData }, { data: rubData }] = await Promise.all([
        supabase.from('activities').select('*').eq('group_id', activeGroup.id).order('due_date', { ascending: false }),
        supabase.from('rubrics').select('*, rubric_criteria(*)').eq('group_id', activeGroup.id).single()
      ]);

      setActivities(actData || []);
      setCriteria(rubData?.rubric_criteria || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteActivity = async (id: string) => {
    if (!confirm('¿Seguro que quieres eliminar esta actividad? Se perderán todas las calificaciones registradas.')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert('Error al eliminar la actividad');
    } finally {
      setLoading(false);
    }
  };

  if (!activeGroup) return null;

  if (selectedActivity) {
    return <GradingManager activity={selectedActivity} onBack={() => { setSelectedActivity(null); fetchData(); }} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => setView('groups')}
          className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-900"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Actividades</h1>
          <p className="text-slate-500">Administra las tareas y exámenes del grupo: <span className="font-bold text-blue-600">{activeGroup.name}</span></p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex gap-4">
           {!loading && criteria.length === 0 && (
             <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 text-xs font-bold animate-pulse">
               <ShieldCheck className="w-4 h-4" />
               Primero debes crear una rúbrica para poder crear actividades.
             </div>
           )}
           <div className="px-4 py-2 border border-slate-100 rounded-xl text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-50">
             Total: {activities.length}
           </div>
        </div>
        <div className="flex gap-3">
          {criteria.length === 0 ? (
            <button
              onClick={() => setView('rubrics')}
              className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-amber-200 flex items-center gap-2 transition-all active:scale-95"
            >
              <Scale className="w-5 h-5" />
              Crear Rúbrica Ahora
            </button>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-200 flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Nueva Actividad
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-white rounded-3xl animate-pulse border border-slate-200" />)}
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center flex flex-col items-center">
            <FileText className="w-16 h-16 text-slate-200 mb-6" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Sin actividades todavía</h3>
            <p className="text-slate-500 max-w-xs mb-8">Debes crear actividades para que los alumnos puedan tener calificaciones en sus respectivos rubros.</p>
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-blue-100">Crear Actividad</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity) => {
            const criterion = criteria.find(c => c.id === activity.criterion_id);
            return (
              <div 
                key={activity.id} 
                onClick={() => setSelectedActivity(activity)}
                className="dashboard-card p-6 cursor-pointer group flex flex-col"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg",
                    activity.type === 'individual' ? "bg-indigo-500 shadow-indigo-100" : "bg-purple-500 shadow-purple-100"
                  )}>
                    {activity.type === 'individual' ? <User className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      activity.status === 'active' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    )}>
                      {activity.status === 'active' ? 'Activa' : 'Cerrada'}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteActivity(activity.id); }}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">{activity.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                      {criterion?.name || 'Sin Rubro'}
                    </span>
                    {activity.grading_mode === 'deliveries' && (
                      <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-amber-100 flex items-center gap-1">
                        <Calculator className="w-3 h-3" /> Cálc. Auto ({activity.total_deliveries})
                      </span>
                    )}
                    {activity.grading_mode === 'boolean' && (
                      <span className="bg-cyan-50 text-cyan-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-cyan-100 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Entregado / No entregado
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Calendar className="w-4 h-4" />
                    <span>{activity.due_date ? formatLocalDate(activity.due_date, "d 'de' MMMM") : 'Sin fecha'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600 font-bold text-sm">
                    Calificar
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && <ActivityModal onClose={() => setIsModalOpen(false)} onSave={fetchData} criteria={criteria} />}
    </div>
  );
}

function GradingManager({ activity, onBack }: { activity: Activity, onBack: () => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Partial<Submission>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGradingData();
  }, [activity]);

  async function fetchGradingData() {
    try {
      const [{ data: studentData }, { data: subData }] = await Promise.all([
        supabase.from('students').select('*').eq('group_id', activity.group_id).order('last_name'),
        supabase.from('submissions').select('*').eq('activity_id', activity.id)
      ]);

      const subMap: Record<string, Partial<Submission>> = {};
      subData?.forEach(s => {
        subMap[s.student_id] = s;
      });

      // Local initial values for students without submission
      studentData?.forEach(s => {
        if (!subMap[s.id]) {
          subMap[s.id] = { status: 'not_delivered', grade: 0, deliveries_count: 0, student_id: s.id, activity_id: activity.id };
        }
      });

      setStudents(studentData || []);
      setSubmissions(subMap);
    } catch (error) {
      console.error('Error fetching grading:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateSubmission = (studentId: string, field: keyof Submission, value: any) => {
    const updated = { ...submissions[studentId], [field]: value };
    
    // Auto-calculate grade if in deliveries mode
    if (activity.grading_mode === 'deliveries' && field === 'deliveries_count') {
      const count = Number(value) || 0;
      updated.grade = Math.round((count / activity.total_deliveries) * 100);
      updated.status = count > 0 ? 'delivered' : 'not_delivered';
    } else if (activity.grading_mode === 'boolean' && (field === 'status' || field === 'grade')) {
      if (field === 'status') {
        updated.grade = value === 'delivered' ? 100 : 0;
        updated.status = value as any;
      } else {
        updated.status = Number(value) >= 60 ? 'delivered' : 'not_delivered';
      }
    } else if (field === 'status') {
      if (value === 'not_delivered') updated.grade = 0;
    }

    setSubmissions({ ...submissions, [studentId]: updated });
  };

  const saveGrades = async () => {
    setSaving(true);
    try {
      const dataToUpsert = Object.values(submissions).filter(s => !!s).map(s => ({
        ...s as any,
        activity_id: activity.id
      }));

      const { error } = await supabase.from('submissions').upsert(dataToUpsert);
      if (error) throw error;
      alert('Calificaciones guardadas correctamente');
    } catch (error) {
      console.error('Error saving grades:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-200">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{activity.title}</h1>
            <p className="text-sm text-slate-500">Registro de calificaciones y entregas</p>
          </div>
        </div>
        <button 
          onClick={saveGrades} 
          disabled={saving}
          className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-blue-200 flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <MoreVertical className="w-5 h-5" />}
          Guardar Cambios
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Alumno</th>
              <th className="px-6 py-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Estatus Entrega</th>
              <th className="px-6 py-4 font-bold text-slate-600 text-xs uppercase tracking-wider">
                {activity.grading_mode === 'deliveries' ? 'Entregas / Total' : 'Calificación'}
              </th>
              {!activity.grading_mode && <th className="px-6 py-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Puntos / 100</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((student) => {
              const sub = submissions[student.id];
              return (
                <tr key={student.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-5">
                    <p className="font-bold text-slate-900">{student.last_name}, {student.first_name}</p>
                    <p className="text-[10px] font-mono text-slate-400">{student.student_public_id}</p>
                  </td>
                  <td className="px-6 py-5">
                    {activity.grading_mode === 'boolean' ? (
                       <div className="flex gap-2">
                        <button 
                          onClick={() => handleUpdateSubmission(student.id, 'status', 'delivered')}
                          className={cn(
                            "flex-1 px-4 py-2 rounded-xl font-bold text-xs transition-all",
                            sub?.status === 'delivered' ? "bg-green-600 text-white shadow-lg shadow-green-100" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          Entregado
                        </button>
                        <button 
                          onClick={() => handleUpdateSubmission(student.id, 'status', 'not_delivered')}
                          className={cn(
                            "flex-1 px-4 py-2 rounded-xl font-bold text-xs transition-all",
                            sub?.status === 'not_delivered' ? "bg-red-600 text-white shadow-lg shadow-red-100" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          No entregado
                        </button>
                      </div>
                    ) : (
                      <select 
                        value={sub?.status || 'not_delivered'}
                        onChange={(e) => handleUpdateSubmission(student.id, 'status', e.target.value)}
                        className={cn(
                          "text-xs font-bold px-3 py-1.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full",
                          sub?.status === 'delivered' ? "bg-green-50 text-green-700 border-green-200" :
                          sub?.status === 'late' ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-red-50 text-red-700 border-red-200"
                        )}
                      >
                        <option value="delivered">Entregado</option>
                        <option value="late">Entrega Tardía</option>
                        <option value="not_delivered">No entregado</option>
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    {activity.grading_mode === 'deliveries' ? (
                      <div className="flex items-center gap-2">
                         <input 
                            type="number" 
                            min="0"
                            max={activity.total_deliveries}
                            value={sub?.deliveries_count || 0}
                            onChange={(e) => handleUpdateSubmission(student.id, 'deliveries_count', e.target.value)}
                            className="w-16 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold"
                         />
                         <span className="text-slate-400 font-medium">/ {activity.total_deliveries}</span>
                         <div className="ml-4 flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Calificación</span>
                            <span className="font-black text-blue-600">{sub?.grade || 0}</span>
                         </div>
                      </div>
                    ) : activity.grading_mode === 'boolean' ? (
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Calificación</span>
                        <div className={cn(
                          "px-4 py-2 rounded-xl font-black text-lg border min-w-[80px] text-center",
                          (sub?.grade || 0) === 100 ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                        )}>
                          {sub?.grade || 0}
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-24 mx-auto">
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          value={sub?.grade || 0}
                          onChange={(e) => handleUpdateSubmission(student.id, 'grade', e.target.value)}
                          className={cn(
                            "w-full px-4 py-2 rounded-xl font-black text-center text-lg border outline-none transition-all",
                            (sub?.grade || 0) >= 60 ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                          )}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivityModal({ onClose, onSave, criteria }: { onClose: () => void, onSave: () => void, criteria: RubricCriterion[] }) {
  const { activeGroup } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [gradingMode, setGradingMode] = useState<GradingMode>('direct');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeGroup) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const { error } = await supabase.from('activities').insert([{
        title: formData.get('title'),
        description: formData.get('description'),
        group_id: activeGroup.id,
        criterion_id: formData.get('criterion_id'),
        type: formData.get('type'),
        grading_mode: gradingMode,
        total_deliveries: gradingMode === 'deliveries' ? Number(formData.get('total_deliveries')) : 1,
        due_date: formData.get('due_date') || new Date().toISOString(),
        status: 'active'
      }]);

      if (error) throw error;
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving activity:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="flex justify-between items-start">
             <div>
               <h2 className="text-2xl font-bold text-slate-900">Nueva Actividad</h2>
               <p className="text-sm text-slate-500">Define los detalles de la tarea o examen.</p>
             </div>
             <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600"><FileText className="w-6 h-6" /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Título de la actividad</label>
              <input name="title" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Rubro de la Rúbrica</label>
              <select name="criterion_id" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold">
                 {criteria.map(c => <option key={c.id} value={c.id}>{c.name} ({c.weight}%)</option>)}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Tipo de actividad</label>
              <select name="type" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold">
                 <option value="individual">👤 Individual</option>
                 <option value="team">👥 Por Equipo</option>
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Modo de Calificación</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                <button 
                  type="button"
                  onClick={() => setGradingMode('direct')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    gradingMode === 'direct' ? "bg-blue-50 border-blue-600 text-blue-900 shadow-sm" : "border-slate-100 text-slate-400 hover:border-slate-200"
                  )}
                >
                  <Edit3 className="w-5 h-5" />
                  <span className="text-sm font-bold text-center">Directa (0-100)</span>
                </button>
                <button 
                  type="button"
                   onClick={() => setGradingMode('deliveries')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    gradingMode === 'deliveries' ? "bg-amber-50 border-amber-600 text-amber-900 shadow-sm" : "border-slate-100 text-slate-400 hover:border-slate-200"
                  )}
                >
                  <Calculator className="w-5 h-5" />
                  <span className="text-sm font-bold text-center">Por Entregas</span>
                </button>
                <button 
                  type="button"
                   onClick={() => setGradingMode('boolean')}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    gradingMode === 'boolean' ? "bg-cyan-50 border-cyan-600 text-cyan-900 shadow-sm" : "border-slate-100 text-slate-400 hover:border-slate-200"
                  )}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-bold text-center">Entregado / No entregado</span>
                </button>
              </div>
            </div>

            {gradingMode === 'deliveries' && (
              <div className="space-y-1 md:col-span-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Total de Trabajos a Entregar</label>
                <input name="total_deliveries" type="number" required defaultValue="10" className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold text-xl" />
                <p className="text-[10px] text-amber-600 italic">Ejemplo: Si el alumno entrega 8 de 10, su calificación será 80.</p>
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-4">
             <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all">Cancelar</button>
             <button type="submit" disabled={loading} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50">
               {loading ? 'Creando...' : 'Crear Actividad'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
