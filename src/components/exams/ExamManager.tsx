import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Clock, 
  Settings2, 
  Eye, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  LayoutDashboard,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BrainCircuit,
  Calendar,
  Lock,
  Globe,
  Shield
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore, useAuthStore } from '../../store';
import { Exam, QuestionBank as QuestionType, Activity } from '../../types';
import { cn } from '../../lib/utils';
import { formatLocalDate } from '../../lib/date';
import toast from 'react-hot-toast';

import { ExamResults } from './ExamResults';

export function ExamManager() {
  const { activeGroup } = useAppStore();
  const { user } = useAuthStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [resultsExam, setResultsExam] = useState<Exam | null>(null);

  useEffect(() => {
    if (activeGroup) {
      fetchExams();
    }
  }, [activeGroup]);

  const fetchExams = async () => {
    if (!activeGroup) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('group_id', activeGroup.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('Error al cargar exámenes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este examen? Todos los intentos de los alumnos también se borrarán.')) return;
    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Examen eliminado');
      fetchExams();
    } catch (error) {
      toast.error('Error al eliminar examen');
    }
  };

  if (!activeGroup) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Exámenes</h1>
          <p className="text-slate-500">Configura evaluaciones automáticas para {activeGroup.name}.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setEditingExam(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            Nuevo Examen
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-20 text-center">
            <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Cargando exámenes...</p>
          </div>
        ) : exams.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {exams.map((exam) => (
              <div key={exam.id} className="p-8 hover:bg-slate-50/50 transition-all group">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-start gap-6">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                      exam.status === 'published' ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400"
                    )}>
                      <FileText className="w-8 h-8" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {exam.title}
                        </h4>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                          exam.status === 'published' ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                        )}>
                          {exam.status === 'published' ? 'Publicado' : 'Borrador'}
                        </span>
                        {exam.is_practice && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                            Práctica
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm mb-4 line-clamp-1">{exam.description || 'Sin descripción'}</p>
                      
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatLocalDate(exam.open_date, 'd MMM, HH:mm')} - {formatLocalDate(exam.close_date, 'd MMM, HH:mm')}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          {exam.time_limit ? `${exam.time_limit} min` : 'Sin límite'}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                          <BrainCircuit className="w-3.5 h-3.5" />
                          Intentos: {exam.attempts_allowed}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setEditingExam(exam);
                        setIsFormOpen(true);
                      }}
                      className="p-3 hover:bg-amber-50 hover:text-amber-600 text-slate-400 rounded-xl transition-all"
                      title="Editar"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(exam.id)}
                      className="p-3 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-xl transition-all"
                      title="Eliminar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setResultsExam(exam)}
                      className="bg-white border border-slate-200 text-slate-600 p-3 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                      title="Ver Resultados"
                    >
                      <LayoutDashboard className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-20 text-center">
            <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-[3rem] flex items-center justify-center text-slate-200 mx-auto mb-8">
              <FileText className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No hay exámenes configurados</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-10">Crea evaluaciones que se califiquen solas utilizando tu banco de preguntas maestro.</p>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-6 h-6" />
              Crear primer examen
            </button>
          </div>
        )}
      </div>

      {isFormOpen && (
        <ExamForm 
          exam={editingExam}
          onClose={() => setIsFormOpen(false)}
          onSave={() => {
            setIsFormOpen(false);
            fetchExams();
          }}
        />
      )}

      {resultsExam && (
        <ExamResults 
          exam={resultsExam}
          onClose={() => setResultsExam(null)}
        />
      )}
    </div>
  );
}

function ExamForm({ exam, onClose, onSave }: any) {
  const { user } = useAuthStore();
  const { activeGroup } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'questions'>('config');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<QuestionType[]>([]);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

  useEffect(() => {
    if (activeGroup) {
      fetchActivities();
      fetchAvailableQuestions();
      if (exam) {
        fetchExamQuestions();
      }
    }
  }, [activeGroup, exam]);

  const fetchActivities = async () => {
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('group_id', activeGroup?.id);
    setActivities(data || []);
  };

  const fetchAvailableQuestions = async () => {
    const { data } = await supabase
      .from('question_bank')
      .select('*')
      .eq('professor_id', user?.id);
    setAvailableQuestions(data || []);
  };

  const fetchExamQuestions = async () => {
    const { data } = await supabase
      .from('exam_questions')
      .select('*, question:question_bank(*)')
      .eq('exam_id', exam.id)
      .order('order_index', { ascending: true });
    setExamQuestions(data || []);
  };

  const handleSaveConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data: any = {
      professor_id: user?.id,
      group_id: activeGroup?.id,
      activity_id: formData.get('activity_id') || null,
      title: formData.get('title'),
      description: formData.get('description'),
      unit: Number(formData.get('unit')) || null,
      open_date: formData.get('open_date'),
      close_date: formData.get('close_date'),
      time_limit: Number(formData.get('time_limit')) || null,
      attempts_allowed: Number(formData.get('attempts_allowed')) || 1,
      show_results: formData.get('show_results') === 'on',
      show_correct_answers: formData.get('show_correct_answers') === 'on',
      show_explanation: formData.get('show_explanation') === 'on',
      is_supervised: formData.get('is_supervised') === 'on',
      max_warnings: Number(formData.get('max_warnings')) || 3,
      status: formData.get('status'),
      is_practice: formData.get('is_practice') === 'on',
    };

    try {
      setLoading(true);
      let res;
      if (exam) {
        res = await supabase.from('exams').update(data).eq('id', exam.id).select().single();
      } else {
        res = await supabase.from('exams').insert([data]).select().single();
      }

      if (res.error) throw res.error;
      toast.success(exam ? 'Examen actualizado' : 'Examen creado');
      
      if (!exam) {
        // Switch to questions tab after initial create
        onSave(); // Refresh list so we can continue in edit mode?
        // Actually, better to just keep it open and set exam id
      } else {
        onSave();
      }
    } catch (error) {
      toast.error('Error al guardar configuración');
    } finally {
      setLoading(false);
    }
  };

  const addQuestionToExam = async (q: QuestionType) => {
    if (examQuestions.some(eq => eq.question_id === q.id)) {
      toast.error('Esta pregunta ya está en el examen');
      return;
    }

    try {
      const { error } = await supabase
        .from('exam_questions')
        .insert([{
          exam_id: exam.id,
          question_id: q.id,
          order_index: examQuestions.length,
          custom_points: q.points
        }]);

      if (error) throw error;
      fetchExamQuestions();
    } catch (error) {
      toast.error('Error al agregar pregunta');
    }
  };

  const removeQuestionFromExam = async (id: string) => {
    try {
      const { error } = await supabase
        .from('exam_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchExamQuestions();
    } catch (error) {
      toast.error('Error al quitar pregunta');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-6xl h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
           <div>
              <h3 className="text-3xl font-display font-bold text-slate-900">{exam ? 'Editar' : 'Nuevo'} Examen</h3>
              <p className="text-sm text-slate-500">Configura la evaluación y sus preguntas.</p>
           </div>
           <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button 
                onClick={() => setActiveTab('config')}
                className={cn(
                  "px-6 py-2 rounded-xl text-sm font-bold transition-all",
                  activeTab === 'config' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                Configuración
              </button>
              <button 
                onClick={() => {
                  if (!exam) {
                    toast.error('Primero debes guardar la configuración básica');
                    return;
                  }
                  setActiveTab('questions');
                }}
                className={cn(
                  "px-6 py-2 rounded-xl text-sm font-bold transition-all",
                  activeTab === 'questions' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                Preguntas ({examQuestions.length})
              </button>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
             <Trash2 className="w-6 h-6" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10">
          {activeTab === 'config' ? (
            <form id="examConfigForm" onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
               <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Título del Examen</label>
                    <input name="title" required defaultValue={exam?.title} placeholder="Ej. Primer Parcial: Álgebra" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-lg" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Descripción (instrucciones)</label>
                    <textarea name="description" rows={4} defaultValue={exam?.description} placeholder="Prohibido el uso de calculadora..." className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none font-medium" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Vincular Actividad</label>
                      <select name="activity_id" defaultValue={exam?.activity_id} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-700">
                        <option value="">No vincular</option>
                        {activities.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Estado</label>
                      <select name="status" defaultValue={exam?.status || 'draft'} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-700">
                        <option value="draft">Borrador</option>
                        <option value="published">Publicado (Visible)</option>
                        <option value="closed">Cerrado</option>
                      </select>
                    </div>
                  </div>
               </div>

               <div className="space-y-6 bg-slate-50 p-8 rounded-3xl border border-slate-100">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fecha Apertura</label>
                      <input name="open_date" type="datetime-local" required defaultValue={exam?.open_date || new Date().toISOString().slice(0, 16)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-700" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fecha Cierre</label>
                      <input name="close_date" type="datetime-local" required defaultValue={exam?.close_date} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-700" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tiempo Límite (min)</label>
                      <input name="time_limit" type="number" defaultValue={exam?.time_limit} placeholder="Sin límite" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Intentos Permitidos</label>
                      <input name="attempts_allowed" type="number" defaultValue={exam?.attempts_allowed || 1} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" />
                    </div>
                  </div>

                  <div className="space-y-3 pt-4">
                     <label className="flex items-center gap-3 cursor-pointer group">
                       <input type="checkbox" name="is_practice" defaultChecked={exam?.is_practice} className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500" />
                       <span className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Modo Práctica (no afecta calificación)</span>
                     </label>
                     <label className="flex items-center gap-3 cursor-pointer group">
                       <input type="checkbox" name="show_results" defaultChecked={exam?.show_results ?? true} className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500" />
                       <span className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Mostrar puntaje al terminar</span>
                     </label>
                     <label className="flex items-center gap-3 cursor-pointer group">
                       <input type="checkbox" name="show_correct_answers" defaultChecked={exam?.show_correct_answers} className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500" />
                       <span className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Mostrar respuestas correctas</span>
                     </label>
                     <label className="flex items-center gap-3 cursor-pointer group">
                       <input type="checkbox" name="show_explanation" defaultChecked={exam?.show_explanation} className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500" />
                       <span className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Mostrar explicaciones</span>
                     </label>
                     <div className="pt-4 border-t border-slate-200 mt-4 space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" name="is_supervised" defaultChecked={exam?.is_supervised} className="w-5 h-5 text-indigo-600 rounded-lg focus:ring-indigo-500" />
                          <div className="flex flex-col">
                            <span className="font-bold text-indigo-700 group-hover:text-indigo-900 transition-colors flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              Modo Supervisado (Anti-copia básico)
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Detecta cambio de pestañas, copiar/pegar y capturas</span>
                          </div>
                        </label>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Máximo de Advertencias</label>
                          <input 
                            name="max_warnings" 
                            type="number" 
                            min="1"
                            defaultValue={exam?.max_warnings || 3} 
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold" 
                          />
                        </div>
                     </div>
                  </div>
               </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
               {/* Selected Questions */}
               <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Preguntas Seleccionadas ({examQuestions.length})</h4>
                    <p className="text-xs font-bold text-blue-600">Total: {examQuestions.reduce((sum, eq) => sum + (eq.custom_points || 0), 0)} pts</p>
                  </div>
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {examQuestions.map((eq, idx) => (
                      <div key={eq.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-start gap-4">
                        <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-xs shrink-0">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 line-clamp-2 mb-1">{eq.question?.question_text}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase">{eq.question?.question_type}</span>
                            <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-full">{eq.custom_points} pts</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeQuestionFromExam(eq.id)}
                          className="p-2 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {examQuestions.length === 0 && (
                      <div className="p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-bold">No hay preguntas agregadas</p>
                      </div>
                    )}
                  </div>
               </div>

               {/* Add Questions / Browser */}
               <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Banco Maestro de Preguntas</h4>
                    <button 
                      onClick={() => setIsGeneratorOpen(true)}
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <BrainCircuit className="w-4 h-4" />
                      Generador Automático
                    </button>
                  </div>
                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input placeholder="Filtrar por tema..." className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                  </div>
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {availableQuestions.map(q => (
                      <div key={q.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-blue-400 transition-all shadow-sm">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 line-clamp-1 mb-1">{q.question_text}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase">{q.topic || q.subject}</span>
                            <span className="text-[9px] font-black text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded-full">{q.difficulty}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => addQuestionToExam(q)}
                          disabled={examQuestions.some(eq => eq.question_id === q.id)}
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                            examQuestions.some(eq => eq.question_id === q.id)
                              ? "bg-green-50 text-green-500 opacity-50"
                              : "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100"
                          )}
                        >
                          {examQuestions.some(eq => eq.question_id === q.id) ? <CheckCircle2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        </button>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
           <div className="flex items-center gap-6">
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preguntas</span>
                <span className="text-xl font-black text-slate-900">{examQuestions.length}</span>
             </div>
             <div className="w-[1px] h-8 bg-slate-200" />
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Puntaje Total</span>
                <span className="text-xl font-black text-blue-600">{examQuestions.reduce((sum, eq) => sum + (eq.custom_points || 0), 0)} pts</span>
             </div>
           </div>
           <div className="flex gap-4">
             <button onClick={onClose} className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all font-display">
               Cerrar
             </button>
             {activeTab === 'config' && (
               <button 
                 form="examConfigForm"
                 type="submit" 
                 disabled={loading}
                 className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center gap-2 disabled:opacity-50 font-display"
               >
                 {loading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <ShieldCheck className="w-5 h-5" />}
                 {exam ? 'Guardar Cambios' : 'Crear y Continuar'}
               </button>
             )}
           </div>
        </div>

        {isGeneratorOpen && (
          <ExamGenerator 
            examId={exam.id} 
            availableQuestions={availableQuestions}
            currentQuestions={examQuestions}
            onClose={() => setIsGeneratorOpen(false)}
            onGenerated={() => {
              setIsGeneratorOpen(false);
              fetchExamQuestions();
            }}
          />
        )}
      </div>
    </div>
  );
}

function ExamGenerator({ examId, availableQuestions, onClose, onGenerated }: any) {
  const [counts, setCounts] = useState({
    easy: 0,
    medium: 0,
    hard: 0
  });
  const [topic, setTopic] = useState('all');
  const [loading, setLoading] = useState(false);

  const topics = Array.from(new Set(availableQuestions.map((q: any) => q.topic).filter(Boolean)));

  const handleGenerate = async () => {
    let pool = availableQuestions;
    if (topic !== 'all') {
      pool = pool.filter((q: any) => q.topic === topic);
    }

    const selected: any[] = [];
    ['easy', 'medium', 'hard'].forEach(diff => {
      const diffPool = pool.filter((q: any) => q.difficulty === diff);
      const count = (counts as any)[diff];
      const shuffled = [...diffPool].sort(() => 0.5 - Math.random());
      selected.push(...shuffled.slice(0, count));
    });

    if (selected.length === 0) {
      toast.error('No se encontraron preguntas que coincidan con los criterios');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('exam_questions')
        .insert(selected.map((q, i) => ({
          exam_id: examId,
          question_id: q.id,
          order_index: i,
          custom_points: q.points
        })));

      if (error) throw error;
      toast.success(`Generadas ${selected.length} preguntas correctamente`);
      onGenerated();
    } catch (error) {
      toast.error('Error al generar preguntas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl p-10 animate-in zoom-in-95 duration-200">
        <h3 className="text-2xl font-display font-bold text-slate-900 mb-2">Generador Automático</h3>
        <p className="text-slate-500 mb-8">El sistema seleccionará preguntas al azar basadas en tus criterios.</p>

        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tema específico (opcional)</label>
            <select value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold">
              <option value="all">Todos los temas</option>
              {topics.map((t: any) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-green-600 mb-2 block">Fáciles</label>
              <input 
                type="number" 
                value={counts.easy}
                onChange={(e) => setCounts({...counts, easy: parseInt(e.target.value) || 0})}
                min="0"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-amber-600 mb-2 block">Medias</label>
              <input 
                type="number" 
                value={counts.medium}
                onChange={(e) => setCounts({...counts, medium: parseInt(e.target.value) || 0})}
                min="0"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-red-600 mb-2 block">Difíciles</label>
              <input 
                type="number" 
                value={counts.hard}
                onChange={(e) => setCounts({...counts, hard: parseInt(e.target.value) || 0})}
                min="0"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold" 
              />
            </div>
          </div>

          <div className="flex gap-4 mt-10">
            <button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">
              Cancelar
            </button>
            <button 
              onClick={handleGenerate}
              disabled={loading}
              className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <BrainCircuit className="w-5 h-5" />}
              Generar Examen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShieldCheck({ className }: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
  );
}
