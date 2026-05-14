import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronLeft,
  ArrowRight,
  Shield
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export function ExamResults({ exam, onClose }: any) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [exam.id]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      // Fetch attempts with security warnings count
      const { data: attempts } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          student:students(first_name, last_name, enrollment_id),
          security_events_count:exam_security_events(count)
        `)
        .eq('exam_id', exam.id)
        .eq('status', 'completed');

      // Fetch answers for detailed analysis
      const { data: answers } = await supabase
        .from('exam_answers')
        .select('*, question:question_bank(question_text, topic)')
        .eq('attempt_id', (attempts?.[0]?.id || '')); // This is just a sample for structure

      if (!attempts || attempts.length === 0) {
        setStats({ totalAttempts: 0, averageScore: 0 });
        return;
      }

      const totalScore = attempts.reduce((sum, a) => sum + (a.score || 0), 0);
      const avg = totalScore / attempts.length;

      setStats({
        totalAttempts: attempts.length,
        averageScore: avg,
        attempts: attempts
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center"><div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" /></div>;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-4">
             <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
               <ChevronLeft className="w-6 h-6" />
             </button>
             <div>
               <h3 className="text-2xl font-display font-bold text-slate-900">Estadísticas: {exam.title}</h3>
               <p className="text-sm text-slate-500">Análisis de desempeño del grupo.</p>
             </div>
           </div>
           <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alumnos</p>
                <p className="text-xl font-black text-slate-900">{stats?.totalAttempts}</p>
              </div>
              <div className="w-[1px] h-8 bg-slate-200" />
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Promedio</p>
                <p className="text-xl font-black text-blue-600">{stats?.averageScore.toFixed(1)}</p>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-100">
                 <BarChart3 className="w-8 h-8 mb-4 opacity-50" />
                 <p className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">Participación</p>
                 <h4 className="text-3xl font-black">{stats?.totalAttempts} Entregas</h4>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-200">
                 <Users className="w-8 h-8 mb-4 text-green-500" />
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Aprobados</p>
                 <h4 className="text-3xl font-black text-slate-900">
                   {stats?.attempts?.filter((a: any) => a.score >= 60).length}
                 </h4>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-200">
                 <XCircle className="w-8 h-8 mb-4 text-red-500" />
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Reprobados</p>
                 <h4 className="text-3xl font-black text-slate-900">
                   {stats?.attempts?.filter((a: any) => a.score < 60).length}
                 </h4>
              </div>
           </div>

           <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-4">Resultados Individuales</h5>
           <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Alumno</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Puntaje</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Advertencias</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Completado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats?.attempts?.map((attempt: any) => {
                    const warnCount = attempt.security_events_count?.[0]?.count || 0;
                    return (
                      <tr key={attempt.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{attempt.student?.first_name} {attempt.student?.last_name}</p>
                          <p className="text-xs text-slate-400 font-bold">{attempt.student?.enrollment_id}</p>
                        </td>
                        <td className="px-6 py-4 text-center font-black text-lg">
                          <span className={cn(attempt.score >= 60 ? "text-blue-600" : "text-red-500")}>
                            {attempt.score.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <div className={cn(
                             "flex items-center justify-center gap-1 font-black",
                             warnCount > 0 ? "text-amber-600" : "text-slate-300"
                           )}>
                             <Shield className="w-4 h-4" />
                             <span>{warnCount}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <span className={cn(
                             "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                             attempt.score >= 60 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                           )}>
                             {attempt.score >= 60 ? 'Aprobado' : 'Reprobado'}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-bold text-slate-500">
                          {new Date(attempt.completed_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
}
