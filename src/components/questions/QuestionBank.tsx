import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Copy,
  Tag,
  Circle,
  Hash,
  Type,
  CheckCircle2,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store';
import { QuestionBank as QuestionType } from '../../types';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

export function QuestionBank() {
  const { user } = useAuthStore();
  const [questions, setQuestions] = useState<QuestionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionType | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchQuestions();
  }, [user]);

  const fetchQuestions = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('question_bank')
        .select('*')
        .eq('professor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Error al cargar banco de preguntas');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].toLowerCase().split(',');
      
      const newQuestions = lines.slice(1).map(line => {
        const values = line.split(',');
        if (values.length < 2) return null;
        
        const getVal = (headerName: string) => {
          const idx = headers.indexOf(headerName);
          return idx !== -1 ? values[idx]?.trim() : '';
        };

        const type = getVal('tipo') || 'multiple_choice';
        const options = [];
        if (type === 'multiple_choice') {
          ['opcion_a', 'opcion_b', 'opcion_c', 'opcion_d'].forEach(h => {
             const opt = getVal(h);
             if (opt) options.push(opt);
          });
        }

        return {
          professor_id: user.id,
          question_type: type,
          question_text: getVal('pregunta'),
          points: Number(getVal('puntos')) || 1,
          subject: (getVal('materia') || 'General').trim(),
          topic: getVal('tema') || '',
          unit: Number(getVal('unidad')) || null,
          difficulty: (getVal('dificultad') || 'medium').toLowerCase() as any,
          options: options.length > 0 ? options : [],
          correct_answer: getVal('correcta'),
          status: 'active'
        };
      }).filter(Boolean);

      if (newQuestions.length > 0) {
        try {
          const { error } = await supabase.from('question_bank').insert(newQuestions);
          if (error) throw error;
          toast.success(`Importadas ${newQuestions.length} preguntas`);
          fetchQuestions();
        } catch (error) {
          toast.error('Error al importar CSV');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta pregunta?')) return;
    try {
      const { error } = await supabase
        .from('question_bank')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Pregunta eliminada');
      fetchQuestions();
    } catch (error) {
      toast.error('Error al eliminar pregunta');
    }
  };

  const handleDuplicate = async (question: QuestionType) => {
    try {
      const { id, created_at, updated_at, ...newData } = question;
      const { error } = await supabase
        .from('question_bank')
        .insert([{
          ...newData,
          question_text: `${newData.question_text} (Copia)`,
          professor_id: user?.id
        }]);

      if (error) throw error;
      toast.success('Pregunta duplicada');
      fetchQuestions();
    } catch (error) {
      toast.error('Error al duplicar pregunta');
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question_text.toLowerCase().includes(search.toLowerCase()) ||
                         q.topic?.toLowerCase().includes(search.toLowerCase()) ||
                         q.subject.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || q.question_type === filterType;
    const matchesDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
    return matchesSearch && matchesType && matchesDifficulty;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'multiple_choice': return <Circle className="w-4 h-4" />;
      case 'true_false': return <CheckCircle2 className="w-4 h-4" />;
      case 'numeric': return <Hash className="w-4 h-4" />;
      case 'short_answer': return <Type className="w-4 h-4" />;
      default: return <HelpCircle className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-amber-600 bg-amber-50';
      case 'hard': return 'text-red-600 bg-red-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Banco de Preguntas</h1>
          <p className="text-slate-500">Gestiona tus reactivos y utilízalos en cualquier examen.</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".csv" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Importar
          </button>
          <button 
            onClick={() => {
              setEditingQuestion(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            Nueva Pregunta
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Preguntas</p>
          <h3 className="text-2xl font-black text-slate-900">{questions.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Fáciles</p>
          <h3 className="text-2xl font-black text-green-600">{questions.filter(q => q.difficulty === 'easy').length}</h3>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Medias</p>
          <h3 className="text-2xl font-black text-amber-600">{questions.filter(q => q.difficulty === 'medium').length}</h3>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Difíciles</p>
          <h3 className="text-2xl font-black text-red-600">{questions.filter(q => q.difficulty === 'hard').length}</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por pregunta, tema o materia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <select 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-600"
        >
          <option value="all">Todos los tipos</option>
          <option value="multiple_choice">Opción Múltiple</option>
          <option value="true_false">Verdadero/Falso</option>
          <option value="numeric">Numérica</option>
          <option value="short_answer">Respuesta Corta</option>
        </select>
        <select 
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-600"
        >
          <option value="all">Todas las dificultades</option>
          <option value="easy">Fácil</option>
          <option value="medium">Media</option>
          <option value="hard">Difícil</option>
        </select>
      </div>

      {/* List */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-20 text-center">
            <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Cargando banco de preguntas...</p>
          </div>
        ) : filteredQuestions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredQuestions.map((q) => (
              <div key={q.id} className="p-6 hover:bg-slate-50/50 transition-all group flex items-start gap-6">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                  {getTypeIcon(q.question_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                      getDifficultyColor(q.difficulty)
                    )}>
                      {q.difficulty}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {q.subject} {q.topic ? `• ${q.topic}` : ''}
                    </span>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider px-2 py-0.5 bg-blue-50 rounded-full">
                      {q.points} pts
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2 leading-snug">{q.question_text}</h4>
                  {q.explanation && (
                    <p className="text-sm text-slate-500 italic">Retroalimentación: {q.explanation}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleDuplicate(q)}
                    className="p-2 hover:bg-blue-50 hover:text-blue-600 text-slate-400 rounded-lg transition-all"
                    title="Duplicar"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      setEditingQuestion(q);
                      setIsFormOpen(true);
                    }}
                    className="p-2 hover:bg-amber-50 hover:text-amber-600 text-slate-400 rounded-lg transition-all"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(q.id)}
                    className="p-2 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-lg transition-all"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-200 mx-auto mb-6">
              <Plus className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No hay preguntas todavía</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-8">Comienza a crear tu banco maestro de reactivos para utilizarlos en tus exámenes.</p>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Crear primera pregunta
            </button>
          </div>
        )}
      </div>

      {isFormOpen && (
        <QuestionForm 
          question={editingQuestion}
          onClose={() => setIsFormOpen(false)}
          onSave={() => {
            setIsFormOpen(false);
            fetchQuestions();
          }}
        />
      )}
    </div>
  );
}

function QuestionForm({ question, onClose, onSave }: any) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState(question?.question_type || 'multiple_choice');
  const [options, setOptions] = useState<string[]>(question?.options || ['', '', '', '']);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data: any = {
      professor_id: user?.id,
      subject: formData.get('subject'),
      topic: formData.get('topic'),
      unit: Number(formData.get('unit')) || null,
      difficulty: formData.get('difficulty'),
      question_type: type,
      question_text: formData.get('question_text'),
      explanation: formData.get('explanation'),
      points: Number(formData.get('points')) || 1,
      estimated_time: Number(formData.get('estimated_time')) || 5,
    };

    if (type === 'multiple_choice') {
      data.options = options.filter(o => o.trim() !== '');
      data.correct_answer = formData.get('correct_answer');
    } else if (type === 'true_false') {
      data.correct_boolean = formData.get('correct_boolean') === 'true';
    } else if (type === 'numeric') {
      data.correct_value = Number(formData.get('correct_value'));
      data.tolerance = Number(formData.get('tolerance')) || 0;
    } else if (type === 'short_answer') {
      const answers = formData.get('accepted_answers') as string;
      data.accepted_answers = answers.split(',').map(a => a.trim().toLowerCase());
    }

    try {
      setLoading(true);
      if (question) {
        const { error } = await supabase
          .from('question_bank')
          .update(data)
          .eq('id', question.id);
        if (error) throw error;
        toast.success('Pregunta actualizada');
      } else {
        const { error } = await supabase
          .from('question_bank')
          .insert([data]);
        if (error) throw error;
        toast.success('Pregunta creada');
      }
      onSave();
    } catch (error) {
      toast.error('Error al guardar pregunta');
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    if (options.length < 6) setOptions([...options, '']);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== idx));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit} className="p-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-3xl font-display font-bold text-slate-900">{question ? 'Editar' : 'Nueva'} Pregunta</h3>
              <p className="text-slate-500">Configura los detalles de tu reactivo maestro.</p>
            </div>
            <button 
              type="button" 
              onClick={onClose}
              className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Tipo de Pregunta</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'multiple_choice', label: 'Opción Múltiple', icon: Circle },
                    { id: 'true_false', label: 'Verdadero/Falso', icon: CheckCircle2 },
                    { id: 'numeric', label: 'Numérica', icon: Hash },
                    { id: 'short_answer', label: 'Respuesta Corta', icon: Type }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl border font-bold transition-all",
                        type === t.id 
                          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" 
                          : "bg-white border-slate-200 text-slate-600 hover:border-blue-400"
                      )}
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Contexto</label>
                <div className="grid grid-cols-2 gap-4">
                   <input 
                    name="subject" 
                    required 
                    defaultValue={question?.subject} 
                    placeholder="Materia (ej. Física)" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  />
                  <input 
                    name="topic" 
                    defaultValue={question?.topic} 
                    placeholder="Tema (ej. Dinámica)" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Dificultad</label>
                  <select name="difficulty" defaultValue={question?.difficulty || 'medium'} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-700">
                    <option value="easy">Fácil</option>
                    <option value="medium">Media</option>
                    <option value="hard">Difícil</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Puntos</label>
                  <input name="points" type="number" step="0.5" defaultValue={question?.points || 1} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Tiempo (min)</label>
                  <input name="estimated_time" type="number" defaultValue={question?.estimated_time || 5} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Texto de la Pregunta</label>
                <textarea 
                  name="question_text" 
                  required 
                  rows={4} 
                  defaultValue={question?.question_text} 
                  placeholder="Escribe aquí el enunciado..." 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none font-medium" 
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Explicación / Retroalimentación</label>
                <textarea 
                  name="explanation" 
                  rows={2} 
                  defaultValue={question?.explanation} 
                  placeholder="Por qué esta es la respuesta correcta..." 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-sm" 
                />
              </div>
            </div>

            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
               <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                 <Tag className="w-5 h-5 text-blue-600" />
                 Configuración de Respuesta
               </h4>

               {type === 'multiple_choice' && (
                 <div className="space-y-4">
                   {options.map((opt, idx) => (
                     <div key={idx} className="flex items-center gap-3">
                       <input 
                         type="radio" 
                         name="correct_answer" 
                         value={opt} 
                         required
                         defaultChecked={question?.correct_answer === opt}
                         className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                        />
                       <div className="flex-1 relative">
                          <input 
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...options];
                              newOpts[idx] = e.target.value;
                              setOptions(newOpts);
                            }}
                            placeholder={`Opción ${idx + 1}`}
                            className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          />
                          {options.length > 2 && (
                            <button 
                              type="button" 
                              onClick={() => removeOption(idx)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                            >
                              <XIcon className="w-4 h-4" />
                            </button>
                          )}
                       </div>
                     </div>
                   ))}
                   {options.length < 6 && (
                     <button 
                      type="button" 
                      onClick={addOption}
                      className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold hover:border-blue-400 hover:text-blue-600 transition-all"
                     >
                       + Agregar opción
                     </button>
                   )}
                   <p className="text-[10px] text-slate-400 font-bold uppercase mt-4">Marca el círculo de la respuesta correcta</p>
                 </div>
               )}

               {type === 'true_false' && (
                 <div className="space-y-4">
                    <label className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl cursor-pointer hover:border-blue-400 transition-all">
                      <input type="radio" name="correct_boolean" value="true" defaultChecked={question?.correct_boolean === true} className="w-5 h-5 text-blue-600" />
                      <span className="font-bold text-slate-700">Verdadero</span>
                    </label>
                    <label className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl cursor-pointer hover:border-blue-400 transition-all">
                      <input type="radio" name="correct_boolean" value="false" defaultChecked={question?.correct_boolean === false} className="w-5 h-5 text-blue-600" />
                      <span className="font-bold text-slate-700">Falso</span>
                    </label>
                 </div>
               )}

               {type === 'numeric' && (
                 <div className="space-y-6">
                   <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Respuesta Correcta</label>
                     <input name="correct_value" type="number" step="any" required defaultValue={question?.correct_value} placeholder="0.00" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-xl" />
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tolerancia (+/-)</label>
                     <input name="tolerance" type="number" step="any" defaultValue={question?.tolerance || 0} placeholder="0.00" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" />
                   </div>
                 </div>
               )}

               {type === 'short_answer' && (
                 <div className="space-y-6">
                   <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Respuestas Aceptadas</label>
                     <textarea 
                        name="accepted_answers" 
                        required 
                        rows={4} 
                        defaultValue={question?.accepted_answers?.join(', ')} 
                        placeholder="Escribe las respuestas correctas separadas por comas..." 
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none font-medium" 
                      />
                     <p className="text-xs text-slate-500 mt-2">Se validará sin importar mayúsculas/minúsculas ni espacios extra.</p>
                   </div>
                 </div>
               )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 mt-12 pt-8 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose}
              className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all font-display"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center gap-2 disabled:opacity-50 font-display"
            >
              {loading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <ShieldCheck className="w-5 h-5" />}
              {question ? 'Guardar Cambios' : 'Crear Pregunta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function XIcon({ className }: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  );
}

function ShieldCheck({ className }: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
  );
}
