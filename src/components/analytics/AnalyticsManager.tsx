import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  ChevronLeft, 
  Download, 
  Search, 
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';
import { StudentGradeResult, calculateGrades } from '../../lib/grades';
import { cn, formatGrade } from '../../lib/utils';

export function AnalyticsManager() {
  const { activeGroup, setView } = useAppStore();
  const [results, setResults] = useState<StudentGradeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (activeGroup) {
      fetchReportData();
    }
  }, [activeGroup]);

  async function fetchReportData() {
    if (!activeGroup) return;
    setLoading(true);
    try {
      const [
        { data: rubric },
        { data: criteria },
        { data: students },
        { data: activities },
        { data: subs },
        { data: attRecords }
      ] = await Promise.all([
        supabase.from('rubrics').select('*').eq('group_id', activeGroup.id).single(),
        supabase.from('rubric_criteria').select('*').eq('rubric_id', (await supabase.from('rubrics').select('id').eq('group_id', activeGroup.id).single()).data?.id),
        supabase.from('students').select('*').eq('group_id', activeGroup.id).eq('is_active', true),
        supabase.from('activities').select('*').eq('group_id', activeGroup.id),
        supabase.from('submissions').select('*').in('activity_id', (await supabase.from('activities').select('id').eq('group_id', activeGroup.id)).data?.map(a => a.id) || []),
        supabase.from('attendance_records').select('*').in('student_id', (await supabase.from('students').select('id').eq('group_id', activeGroup.id)).data?.map(s => s.id) || [])
      ]);

      const subMap: Record<string, any> = {};
      subs?.forEach(s => {
        subMap[`${s.activity_id}_${s.student_id}`] = s;
      });

      const attMap: Record<string, any> = {};
      attRecords?.forEach(r => {
        if (!attMap[r.student_id]) attMap[r.student_id] = [];
        attMap[r.student_id].push(r);
      });

      const grades = calculateGrades(
        students || [],
        criteria || [],
        activities || [],
        subMap,
        attMap,
        rubric || { min_grade: 60, min_attendance: 80 } as any
      );

      setResults(grades);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!activeGroup) return null;

  const filteredResults = results.filter(r => 
    `${r.student.first_name} ${r.student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.student.student_public_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('groups')}
            className="p-2 hover:bg-white rounded-full transition-colors text-slate-400"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Analítica</h1>
            <p className="text-slate-500">Reporte detallado y calificaciones finales del grupo: <span className="font-bold text-blue-600">{activeGroup.name}</span></p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all">
          <Download className="w-5 h-5" />
          Exportar Reporte
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Promedio Grupal', value: (results.reduce((a, b) => a + b.finalGrade, 0) / (results.length || 1)), format: 'grade', icon: TrendingUp, color: 'blue' },
          { label: 'Aprobados', value: results.filter(r => r.status === 'APROBADO').length, format: 'count', icon: CheckCircle2, color: 'green' },
          { label: 'Reprobados', value: results.filter(r => r.status === 'REPROBADO').length, format: 'count', icon: XCircle, color: 'red' },
          { label: 'En SD', value: results.filter(r => r.status === 'SD').length, format: 'count', icon: AlertCircle, color: 'amber' },
        ].map((stat, i) => (
          <div key={i} className="dashboard-card p-6 flex items-center gap-4">
             <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", `bg-${stat.color}-50 text-${stat.color}-600`)}>
               <stat.icon className="w-6 h-6" />
             </div>
             <div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
               <p className="text-2xl font-black text-slate-900">
                 {stat.format === 'grade' ? formatGrade(stat.value) : stat.value}
               </p>
             </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar alumno..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm"
            />
          </div>
          <div className="flex gap-2">
             <span className="text-xs text-slate-400 italic">Total: {results.length} alumnos registrados</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Alumno</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center">Asistencia %</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center">Ponderación Real</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center">Calificación Final</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center">Estatus</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-[10px] uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 [1,2,3].map(i => <tr key={i} className="animate-pulse"><td colSpan={6} className="px-6 py-5 h-16 bg-slate-50/30" /></tr>)
              ) : filteredResults.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400">Sin datos de calificación.</td></tr>
              ) : (
                filteredResults.map((r) => (
                  <tr key={r.student.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-bold text-slate-900 leading-tight">{r.student.last_name}, {r.student.first_name}</p>
                      <p className="text-[10px] font-mono text-slate-400">{r.student.student_public_id}</p>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={cn(
                        "font-bold",
                        r.attendancePercentage < 80 ? "text-red-600" : "text-green-600"
                      )}>
                        {Math.round(r.attendancePercentage)}%
                      </span>
                      <p className="text-[10px] text-slate-400">{r.attendancePresent}/{r.attendanceTotal} clases</p>
                    </td>
                    <td className="px-6 py-5 text-center">
                       <p className="text-sm font-bold text-slate-700">{r.activeWeightSum}% activo</p>
                       <p className="text-[10px] text-slate-400 italic">De 100% total</p>
                    </td>
                    <td className="px-6 py-5 text-center">
                       <span className={cn(
                          "text-xl font-black rounded-lg px-3 py-1",
                          r.finalGrade >= 60 ? "text-blue-600 bg-blue-50" : "text-red-600 bg-red-50"
                       )}>
                         {formatGrade(r.finalGrade)}
                       </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                       <span className={cn(
                         "px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase",
                         r.status === 'APROBADO' ? "bg-green-100 text-green-700" :
                         r.status === 'REPROBADO' ? "bg-red-100 text-red-700" :
                         "bg-amber-100 text-amber-700"
                       )}>
                         {r.status}
                       </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                        <FileText className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
