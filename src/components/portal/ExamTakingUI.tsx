import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  AlertCircle,
  Hash,
  CheckCircle2,
  Circle,
  Type,
  Loader2,
  Timer,
  Shield,
  FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

export function ExamTakingUI({ exam, student, onComplete }: any) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [warnings, setWarnings] = useState<number>(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [examResult, setExamResult] = useState<any>(null);
  const timerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasStarted) {
      startExam();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasStarted]);

  // Security Event Listeners
  useEffect(() => {
    if (!hasStarted || !exam.is_supervised || isBlocked || examResult) return;

    const recordSecurityEvent = async (type: string, metadata: any = {}) => {
      if (attemptId) {
        setWarnings(prev => {
          const next = prev + 1;
          if (exam.max_warnings && next >= exam.max_warnings) {
            setIsBlocked(true);
            if (timerRef.current) clearInterval(timerRef.current);
          }
          return next;
        });

        toast.error(`¡ADVERTENCIA DE SEGURIDAD! Se ha registrado un evento de tipo: ${type}`, {
          duration: 5000,
          position: 'top-center'
        });

        try {
          await supabase.from('exam_security_events').insert([{
            exam_attempt_id: attemptId,
            student_id: student.id,
            event_type: type,
            user_agent: navigator.userAgent,
            metadata
          }]);
        } catch (e) {
          console.error('Error recording security event:', e);
        }
      }
    };

    const handleBlur = () => recordSecurityEvent('tab_blur');
    const handleVisibility = () => {
      if (document.hidden) recordSecurityEvent('visibility_hidden');
    };
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      recordSecurityEvent('copy');
    };
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      recordSecurityEvent('paste');
    };
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      recordSecurityEvent('right_click');
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordSecurityEvent('fullscreen_exit');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common cheating shortcuts
      const isCheatingKey = (
        (e.ctrlKey || e.metaKey) && ['c', 'v', 'p', 's', 'r'].includes(e.key.toLowerCase()) ||
        e.key === 'PrintScreen' ||
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I')
      );

      if (isCheatingKey) {
        e.preventDefault();
        recordSecurityEvent('key_combo', { key: e.key });
      }
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasStarted, attemptId, exam.is_supervised, isBlocked, examResult, exam.max_warnings, student.id]);

  const requestFullscreen = () => {
    if (containerRef.current) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error('Error entering fullscreen:', err);
      });
    }
  };

  const startExam = async () => {
    try {
      setLoading(true);
      if (exam.is_supervised) {
        requestFullscreen();
      }
      // 1. Create attempt
      const { data: attempt, error: attemptError } = await supabase
        .from('exam_attempts')
        .insert([{
          exam_id: exam.id,
          student_id: student.id,
          status: 'in_progress'
        }])
        .select()
        .single();

      if (attemptError) throw attemptError;
      setAttemptId(attempt.id);

      // 2. Fetch questions
      const { data: qData, error: qError } = await supabase
        .from('exam_questions')
        .select('*, question:question_bank(*)')
        .eq('exam_id', exam.id)
        .order('order_index', { ascending: true });

      if (qError) throw qError;
      
      // Shuffle options for multiple choice if needed (advanced)
      setQuestions(qData || []);

      // 3. Set timer
      if (exam.time_limit) {
        setTimeLeft(exam.time_limit * 60);
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev === null) return null;
            if (prev <= 1) {
              clearInterval(timerRef.current);
              handleSubmit();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (error) {
      console.error('Error starting exam:', error);
      toast.error('Error al iniciar el examen');
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentIdx]?.question;

  const handleAnswerChange = (val: any) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: val
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    // Validate if all answered (optional warning)
    const unansweredCount = questions.length - Object.keys(answers).length;
    if (unansweredCount > 0 && timeLeft !== 0) {
      if (!confirm(`Tienes ${unansweredCount} preguntas sin responder. ¿Deseas enviar el examen de todas formas?`)) {
        return;
      }
    }

    try {
      setIsSubmitting(true);
      if (timerRef.current) clearInterval(timerRef.current);
      if (document.fullscreenElement) document.exitFullscreen();

      let totalScore = 0;
      let correctCount = 0;
      let wrongCount = 0;
      const totalPointsPossible = questions.reduce((sum, eq) => sum + (eq.custom_points || eq.question.points), 0);

      const answerRows = questions.map(eq => {
        const q = eq.question;
        const studentAnswer = answers[q.id];
        let isCorrect = false;
        let pointsEarned = 0;

        // Auto-grading logic
        if (q.question_type === 'multiple_choice') {
          isCorrect = studentAnswer === q.correct_answer;
        } else if (q.question_type === 'true_false') {
          isCorrect = studentAnswer === q.correct_boolean;
        } else if (q.question_type === 'numeric') {
          const val = parseFloat(studentAnswer);
          const diff = Math.abs(val - q.correct_value);
          isCorrect = diff <= (q.tolerance || 0);
        } else if (q.question_type === 'short_answer') {
          const normalized = studentAnswer?.toString().trim().toLowerCase() || '';
          isCorrect = q.accepted_answers?.includes(normalized);
        }

        if (isCorrect) {
          pointsEarned = eq.custom_points || q.points;
          totalScore += pointsEarned;
          correctCount++;
        } else {
          wrongCount++;
        }

        return {
          attempt_id: attemptId,
          question_id: q.id,
          answer_text: q.question_type === 'multiple_choice' || q.question_type === 'short_answer' ? String(studentAnswer || '') : null,
          answer_boolean: q.question_type === 'true_false' ? Boolean(studentAnswer) : null,
          answer_numeric: q.question_type === 'numeric' ? parseFloat(studentAnswer) : null,
          is_correct: isCorrect,
          points_earned: pointsEarned
        };
      });

      // 1. Save answers
      const { error: ansError } = await supabase
        .from('exam_answers')
        .insert(answerRows);

      if (ansError) throw ansError;

      const finalGrade = (totalScore / totalPointsPossible) * 100;

      // 2. Finalize attempt
      const { error: attError } = await supabase
        .from('exam_attempts')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          score: totalScore
        })
        .eq('id', attemptId);

      if (attError) throw attError;

      // 3. Integrate with activities if linked
      if (exam.activity_id && !exam.is_practice) {
        const { data: existingSub } = await supabase
          .from('submissions')
          .select('id')
          .eq('activity_id', exam.activity_id)
          .eq('student_id', student.id)
          .single();

        if (existingSub) {
          await supabase.from('submissions').update({
            grade: finalGrade,
            status: 'delivered',
            updated_at: new Date().toISOString()
          }).eq('id', existingSub.id);
        } else {
          await supabase.from('submissions').insert([{
            activity_id: exam.activity_id,
            student_id: student.id,
            grade: finalGrade,
            deliveries_count: 1,
            status: 'delivered'
          }]);
        }
      }

      setExamResult({
        totalScore,
        maxPoints: totalPointsPossible,
        correctCount,
        wrongCount,
        grade: finalGrade,
        answers: answerRows,
        questions: questions
      });

      toast.success('Examen enviado correctamente');
    } catch (error) {
      console.error('Error submitting exam:', error);
      toast.error('Error al enviar el examen');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[3rem] border border-slate-200">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="font-bold text-slate-900 font-display">Iniciando examen...</p>
      </div>
    );
  }

  if (examResult) {
    return (
      <div className="bg-white rounded-[3.5rem] border-8 border-slate-900/5 shadow-2xl overflow-hidden flex flex-col p-10 items-center justify-center min-h-[600px] text-center">
         <div className="w-24 h-24 bg-blue-100 rounded-[2.5rem] flex items-center justify-center mb-6">
            <CheckCircle2 className="w-12 h-12 text-blue-600" />
         </div>
         <h2 className="text-4xl font-display font-black text-slate-900 mb-2">¡Examen Completado!</h2>
         <p className="text-slate-500 font-medium mb-12">Tus respuestas han sido registradas correctamente.</p>

         <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl mb-12">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Calificación</span>
               <span className={cn("text-3xl font-black", examResult.grade >= 60 ? "text-green-600" : "text-red-500")}>
                 {examResult.grade.toFixed(1)}/100
               </span>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Aciertos</span>
               <span className="text-3xl font-black text-blue-600">{examResult.correctCount}</span>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Errores</span>
               <span className="text-3xl font-black text-slate-300">{examResult.wrongCount}</span>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tiempo</span>
               <span className="text-3xl font-black text-slate-900">
                  {Math.floor((exam.time_limit * 60 - (timeLeft || 0)) / 60)}m
               </span>
            </div>
         </div>

         {exam.show_results && (
            <div className="w-full max-w-4xl space-y-4 mb-12 text-left">
               <h4 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">Revisión de Preguntas</h4>
               <div className="space-y-4">
                  {examResult.questions.map((eq: any, idx: number) => {
                     const ans = examResult.answers.find((a: any) => a.question_id === eq.question_id);
                     const q = eq.question;
                     return (
                        <div key={idx} className={cn(
                          "p-6 rounded-3xl border transition-all",
                          ans?.is_correct ? "bg-green-50/50 border-green-100" : "bg-red-50/50 border-red-100"
                        )}>
                           <div className="flex items-center gap-3 mb-2">
                              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black bg-white shadow-sm border border-slate-200">
                                 {idx + 1}
                              </span>
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                ans?.is_correct ? "text-green-600" : "text-red-600"
                              )}>
                                 {ans?.is_correct ? 'Correcto' : 'Incorrecto'}
                              </span>
                           </div>
                           <p className="font-bold text-slate-800 mb-4">{q.question_text}</p>
                           
                           {exam.show_correct_answers && (
                              <div className="space-y-2 text-sm font-medium">
                                 <p className="text-slate-600"><span className="text-xs font-black text-slate-400 uppercase">Respuesta Correcta:</span> {q.correct_answer || (q.correct_boolean ? 'Verdadero' : 'Falso') || q.correct_value}</p>
                                 {exam.show_explanation && q.explanation && (
                                    <div className="mt-4 p-4 bg-white/60 rounded-2xl border border-blue-100 text-blue-700 italic">
                                       <p className="text-[10px] font-black uppercase not-italic mb-1 text-blue-400">Explicación:</p>
                                       {q.explanation}
                                    </div>
                                 )}
                              </div>
                           )}
                        </div>
                     );
                  })}
               </div>
            </div>
         )}

         <button 
           onClick={() => onComplete()}
           className="px-12 py-4 bg-slate-900 text-white rounded-[2rem] font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
         >
           Regresar al Portal
         </button>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="bg-white rounded-[3.5rem] border-8 border-red-100 shadow-2xl overflow-hidden flex flex-col p-20 items-center justify-center min-h-[600px] text-center animate-in zoom-in-95">
         <div className="w-24 h-24 bg-red-100 rounded-[2.5rem] flex items-center justify-center mb-6">
            <Shield className="w-12 h-12 text-red-600" />
         </div>
         <h2 className="text-4xl font-display font-black text-slate-900 mb-4 tracking-tight">¡EXAMEN BLOQUEADO!</h2>
         <p className="text-slate-500 font-bold max-w-md mx-auto leading-relaxed">
           Has excedido el número máximo de advertencias de seguridad permitidas por el profesor ({exam.max_warnings}). 
           Tu intento ha sido suspendido y notificado a la coordinación.
         </p>
         <button 
           onClick={() => onComplete()}
           className="mt-12 px-12 py-4 bg-red-600 text-white rounded-[2rem] font-black hover:bg-red-700 transition-all shadow-xl shadow-red-100"
         >
           Salir del Examen
         </button>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="bg-white rounded-[3.5rem] border-8 border-slate-900/5 shadow-2xl overflow-hidden flex flex-col p-16 items-center justify-center min-h-[600px] animate-in slide-in-from-bottom-10 duration-700">
         <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-blue-200">
           <FileText className="w-10 h-10 text-white" />
         </div>
         <h2 className="text-4xl font-display font-black text-slate-900 mb-2">{exam.title}</h2>
         <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-8">{exam.time_limit} Minutos • {questions.length} Preguntas</p>
         
         <div className="max-w-xl w-full bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 mb-10 space-y-6">
           <div>
             <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Instrucciones</h4>
             <p className="text-slate-600 leading-relaxed font-medium">{exam.description || 'Contesta todas las preguntas de manera honesta.'}</p>
           </div>
           
           {exam.is_supervised && (
             <div className="p-6 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-100">
               <div className="flex items-center gap-3 mb-4">
                 <Shield className="w-5 h-5" />
                 <h4 className="font-black text-sm uppercase tracking-wider">Modo Supervisado Activo</h4>
               </div>
               <p className="text-xs font-medium opacity-90 leading-relaxed">
                 Este examen detectará cambios de pestaña, pérdida de foco, intentos de copiar/pegar y salir de pantalla completa. 
                 Si superas {exam.max_warnings} advertencias, el examen se bloqueará automáticamente. 
                 <br/><br/>
                 <b>Al iniciar, se activará el modo de pantalla completa.</b>
               </p>
             </div>
           )}

           <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
             <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
             <p className="text-xs font-bold text-amber-700 leading-tight italic">
               "Declaro que realizaré este examen con honestidad académica, sin apoyo de terceros ni materiales no autorizados."
             </p>
           </div>
         </div>

         <button 
           onClick={() => setHasStarted(true)}
           className="px-12 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xl hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 transform hover:scale-105"
         >
           ¡Comenzar Examen Ahora!
         </button>
      </div>
    );
  }

  const progress = questions.length > 0 ? ((currentIdx + 1) / questions.length) * 100 : 0;

  return (
    <div ref={containerRef} className="bg-white rounded-none md:rounded-[3.5rem] md:border-8 border-slate-900/5 shadow-2xl overflow-hidden flex flex-col min-h-screen md:min-h-[600px] animate-in slide-in-from-bottom-10 duration-700 relative select-none">
      
      {/* Watermark */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] rotate-[-20deg] select-none flex flex-wrap gap-20 items-center justify-center overflow-hidden">
         {[...Array(20)].map((_, i) => (
            <div key={i} className="text-slate-900 font-black text-2xl uppercase whitespace-nowrap">
              {student.first_name} {student.last_name} • {student.enrollment_id} • {new Date().toLocaleDateString()}
            </div>
         ))}
      </div>

      {/* Header */}
      <div className="p-8 border-b border-slate-100 flex items-center justify-between relative z-10">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 italic font-black text-white text-xl">
              ?
            </div>
            <div>
               <h3 className="text-xl font-bold text-slate-900 line-clamp-1">{exam.title}</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pregunta {currentIdx + 1} de {questions.length}</p>
            </div>
         </div>

         <div className="flex items-center gap-4">
           {exam.is_supervised && (
             <div className={cn(
               "px-4 py-2 rounded-xl flex items-center gap-2 border transition-all",
               warnings > 0 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-100 text-slate-400"
             )}>
                <Shield className="w-4 h-4" />
                <span className="text-xs font-black">ADVERTENCIAS: {warnings}/{exam.max_warnings}</span>
             </div>
           )}

           {timeLeft !== null && (
             <div className={cn(
               "px-6 py-3 rounded-2xl flex items-center gap-3 transition-colors",
               timeLeft < 60 ? "bg-red-50 text-red-600 shadow-lg shadow-red-50" : "bg-slate-100 text-slate-700 font-black"
             )}>
                <Timer className={cn("w-5 h-5", timeLeft < 60 && "animate-pulse")} />
                <span className="text-2xl font-mono">{formatTime(timeLeft)}</span>
             </div>
           )}
         </div>
      </div>

      <div className="h-1 bg-slate-100">
         <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Question Content */}
      <div className="flex-1 p-10 max-w-4xl mx-auto w-full">
         {currentQuestion ? (
           <div className="space-y-10">
              <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                 <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-700">
                       {currentQuestion.question_type}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">
                       {questions[currentIdx].custom_points || currentQuestion.points} Puntos
                    </span>
                 </div>
                 <h4 className="text-2xl md:text-3xl font-display font-bold text-slate-900 leading-tight">
                   {currentQuestion.question_text}
                 </h4>
              </div>

              <div className="grid grid-cols-1 gap-4">
                 {currentQuestion.question_type === 'multiple_choice' && (
                   currentQuestion.options?.map((opt: string, i: number) => (
                     <button
                       key={i}
                       onClick={() => handleAnswerChange(opt)}
                       className={cn(
                         "p-6 rounded-[2rem] border-2 text-left font-bold transition-all transition-colors flex items-center gap-4 group",
                         answers[currentQuestion.id] === opt
                           ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100"
                           : "bg-white border-slate-100 text-slate-700 hover:border-blue-400"
                       )}
                     >
                       <div className={cn(
                         "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0",
                         answers[currentQuestion.id] === opt ? "border-white" : "border-slate-200 group-hover:border-blue-400"
                       )}>
                         {answers[currentQuestion.id] === opt && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                       </div>
                       <span className="text-lg">{opt}</span>
                     </button>
                   ))
                 )}

                 {currentQuestion.question_type === 'true_false' && (
                   <div className="grid grid-cols-2 gap-6">
                      <button
                        onClick={() => handleAnswerChange(true)}
                        className={cn(
                          "p-8 rounded-[2.5rem] border-4 text-center transition-all",
                          answers[currentQuestion.id] === true
                            ? "bg-green-600 border-green-600 text-white shadow-xl shadow-green-100"
                            : "bg-white border-slate-100 text-slate-500 hover:border-green-400"
                        )}
                      >
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                        <span className="text-xl font-black uppercase">Verdadero</span>
                      </button>
                      <button
                        onClick={() => handleAnswerChange(false)}
                        className={cn(
                          "p-8 rounded-[2.5rem] border-4 text-center transition-all",
                          answers[currentQuestion.id] === false
                            ? "bg-red-600 border-red-600 text-white shadow-xl shadow-red-100"
                            : "bg-white border-slate-100 text-slate-500 hover:border-red-400"
                        )}
                      >
                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                        <span className="text-xl font-black uppercase">Falso</span>
                      </button>
                   </div>
                 )}

                 {currentQuestion.question_type === 'numeric' && (
                   <div className="max-w-xs mx-auto w-full text-center space-y-4">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Ingresa tu respuesta numérica</p>
                      <input 
                        type="number"
                        step="any"
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-8 py-6 bg-slate-50 border border-slate-200 rounded-3xl text-center text-4xl font-black outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                      />
                   </div>
                 )}

                 {currentQuestion.question_type === 'short_answer' && (
                   <div className="w-full space-y-4">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Escribe tu respuesta</p>
                      <textarea 
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        placeholder="Escribe aquí..."
                        className="w-full px-8 py-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-xl font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all min-h-[150px] resize-none"
                      />
                   </div>
                 )}
              </div>
           </div>
         ) : (
           <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-10 h-10 text-slate-200 animate-spin" />
           </div>
         )}
      </div>

      {/* Footer Navigation */}
      <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
         <button 
           disabled={currentIdx === 0}
           onClick={() => setCurrentIdx(prev => prev - 1)}
           className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all disabled:opacity-30"
         >
           <ChevronLeft className="w-5 h-5" />
           Anterior
         </button>

         <div className="flex items-center gap-2">
            {[...Array(questions.length)].map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  i === currentIdx ? "w-6 bg-blue-600" : answers[questions[i]?.question?.id] !== undefined ? "bg-blue-300" : "bg-slate-300"
                )} 
              />
            ))}
         </div>

         <div className="flex gap-4">
            {currentIdx < questions.length - 1 ? (
              <button 
                onClick={() => setCurrentIdx(prev => prev + 1)}
                className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              >
                Siguiente
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-10 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Finalizar Examen
              </button>
            )}
         </div>
      </div>
    </div>
  );
}
