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
  FileText,
  Calendar,
  Filter,
  MoreVertical,
  CheckCircle,
  Clock,
  HelpCircle,
  Scale
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';
import { StudentGradeResult, calculateGrades } from '../../lib/grades';
import { cn, formatGrade } from '../../lib/utils';
import { formatLocalDate } from '../../lib/date';

export function AnalyticsManager() {
  const { activeGroup, setView } = useAppStore();
  const [activeTab, setActiveTab] = useState<'summary' | 'attendance' | 'grades' | 'missing'>('summary');
  const [results, setResults] = useState<StudentGradeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New state for detailed reports
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [allCriteria, setAllCriteria] = useState<any[]>([]);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [rubric, setRubric] = useState<any>(null);

  // Filters
  const [monthFilter, setMonthFilter] = useState('all');

  useEffect(() => {
    if (activeGroup) {
      fetchReportData();
    }
  }, [activeGroup]);

  async function fetchReportData() {
    if (!activeGroup) return;
    setLoading(true);
    try {
      const { data: rubricData } = await supabase.from('rubrics').select('*').eq('group_id', activeGroup.id).single();
      
      const [
        { data: criteria },
        { data: students },
        { data: activities },
        { data: sessions },
        { data: attRecords }
      ] = await Promise.all([
        supabase.from('rubric_criteria').select('*').eq('rubric_id', rubricData?.id),
        supabase.from('students').select('*').eq('group_id', activeGroup.id).eq('is_active', true),
        supabase.from('activities').select('*').eq('group_id', activeGroup.id),
        supabase.from('attendance_sessions').select('*').eq('group_id', activeGroup.id).order('date'),
        supabase.from('attendance_records').select('*').in('student_id', (await supabase.from('students').select('id').eq('group_id', activeGroup.id)).data?.map(s => s.id) || [])
      ]);

      const { data: subs } = await supabase.from('submissions').select('*').in('activity_id', activities?.map(a => a.id) || []);

      setAllSubmissions(subs || []);
      setAllActivities(activities || []);
      setAllCriteria(criteria || []);
      setAllAttendanceRecords(attRecords || []);
      setAllSessions(sessions || []);
      setAllStudents(students || []);
      setRubric(rubricData);

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
        rubricData || { min_grade: 60, min_attendance: 80 } as any
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('groups')}
            className="p-2 hover:bg-white rounded-full transition-colors text-slate-400"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Reportes y Analítica</h1>
            <p className="text-slate-500">Grupo: <span className="font-bold text-blue-600">{activeGroup.name}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all text-sm">
            <Download className="w-4 h-4" />
            Descargar PDF
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl w-fit">
        {[
          { id: 'summary', label: 'Resumen General', icon: TrendingUp },
          { id: 'attendance', label: 'Asistencia', icon: Calendar },
          { id: 'grades', label: 'Calificaciones', icon: Scale },
          { id: 'missing', label: 'Actividades Faltantes', icon: AlertCircle },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === tab.id 
                ? "bg-white text-blue-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Promedio Grupal', value: (results.reduce((a, b) => a + b.finalGrade, 0) / (results.length || 1)), format: 'grade', icon: TrendingUp, color: 'blue' },
              { label: 'Aprobados', value: results.filter(r => r.status === 'APROBADO').length, format: 'count', icon: CheckCircle2, color: 'green' },
              { label: 'Reprobados', value: results.filter(r => r.status === 'REPROBADO').length, format: 'count', icon: XCircle, color: 'red' },
              { label: 'En Riesgo / SD', value: results.filter(r => r.status === 'SD').length, format: 'count', icon: AlertCircle, color: 'amber' },
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

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900">Resumen de Alumnos</h2>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider">Alumno</th>
                    <th className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider text-center">Asistencia %</th>
                    <th className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider text-center">Peso Activo</th>
                    <th className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking_wider text-center">Grade Final</th>
                    <th className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider text-center">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                     [1,2,3].map(i => <tr key={i} className="animate-pulse"><td colSpan={5} className="px-8 py-6 h-16 bg-slate-50/20" /></tr>)
                  ) : filteredResults.length === 0 ? (
                    <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400">Sin datos registrados.</td></tr>
                  ) : (
                    filteredResults.map((r) => (
                      <tr key={r.student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <p className="font-bold text-slate-900">{r.student.last_name}, {r.student.first_name}</p>
                          <p className="text-[10px] font-mono text-slate-400">{r.student.student_public_id}</p>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <div className={cn(
                            "inline-flex items-center gap-1 font-bold text-sm",
                            r.attendancePercentage < (rubric?.min_attendance || 80) ? "text-red-600" : "text-green-600"
                          )}>
                             {Math.round(r.attendancePercentage)}%
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center text-slate-500 font-medium">{r.activeWeightSum}%</td>
                        <td className="px-8 py-5 text-center">
                          <span className={cn(
                            "px-4 py-1.5 rounded-xl font-black text-lg border",
                            r.finalGrade >= (rubric?.min_grade || 60) ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-red-50 text-red-700 border-red-100"
                          )}>
                            {formatGrade(r.finalGrade)}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-center">
                           <span className={cn(
                             "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                             r.status === 'APROBADO' ? "bg-green-100 text-green-700" :
                             r.status === 'REPROBADO' ? "bg-red-100 text-red-700" :
                             "bg-amber-100 text-amber-700"
                           )}>
                             {r.status}
                           </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="dashboard-card p-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Promedio de Asistencia</p>
                <div className="flex items-end gap-2">
                   <p className="text-4xl font-black text-slate-900">
                     {Math.round(results.reduce((a, b) => a + b.attendancePercentage, 0) / (results.length || 1))}%
                   </p>
                   <p className="text-slate-400 font-bold mb-1">Grupal</p>
                </div>
             </div>
             <div className="dashboard-card p-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Sesiones Registradas</p>
                <p className="text-4xl font-black text-slate-900">{allSessions.length}</p>
             </div>
             <div className="dashboard-card p-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Alumnos en Riesgo (SD)</p>
                <p className="text-4xl font-black text-red-600">{results.filter(r => r.attendancePercentage < (rubric?.min_attendance || 80)).length}</p>
             </div>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
                  <h3 className="text-xl font-bold text-slate-900">Reporte Detallado de Asistencia</h3>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                     <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Alumno..." 
                          className="w-full pl-11 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                     </div>
                  </div>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider">Alumno</th>
                        <th className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider text-center">Total Lista</th>
                        <th className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider text-center">Presente</th>
                        <th className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider text-center">Falta</th>
                        <th className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider text-center">Retardo</th>
                        <th className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider text-center">Justificada</th>
                        <th className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider text-center">% Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredResults.map(r => {
                        const studentRecords = allAttendanceRecords.filter(ar => ar.student_id === r.student.id);
                        return (
                          <tr key={r.student.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-5">
                               <p className="font-bold text-slate-900">{r.student.last_name}, {r.student.first_name}</p>
                            </td>
                            <td className="px-8 py-5 text-center font-bold text-slate-600">{studentRecords.length}</td>
                            <td className="px-8 py-5 text-center">
                               <span className="text-green-600 font-bold">{studentRecords.filter(sr => sr.status === 'present').length}</span>
                            </td>
                            <td className="px-8 py-5 text-center">
                               <span className="text-red-600 font-bold">{studentRecords.filter(sr => sr.status === 'absent').length}</span>
                            </td>
                            <td className="px-8 py-5 text-center">
                               <span className="text-amber-600 font-bold">{studentRecords.filter(sr => sr.status === 'late').length}</span>
                            </td>
                            <td className="px-8 py-5 text-center">
                               <span className="text-blue-600 font-bold">{studentRecords.filter(sr => sr.status === 'justified').length}</span>
                            </td>
                            <td className="px-8 py-5 text-center">
                               <div className={cn(
                                 "px-3 py-1 rounded-lg font-black inline-block",
                                 r.attendancePercentage < (rubric?.min_attendance || 80) ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                               )}>
                                 {Math.round(r.attendancePercentage)}%
                               </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
               </div>
           </div>
        </div>
      )}

      {activeTab === 'grades' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                 <h3 className="text-xl font-bold text-slate-900 mb-6">Ponderación de Rúbrica</h3>
                 <div className="space-y-4">
                    {allCriteria.map(c => (
                      <div key={c.id}>
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-slate-700">{c.name}</span>
                            <span className="text-sm font-black text-blue-600">{c.weight}%</span>
                         </div>
                         <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${c.weight}%` }} />
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-center text-center space-y-4">
                 <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600">
                    <Scale className="w-10 h-10" />
                 </div>
                 <div>
                    <h4 className="text-2xl font-black text-slate-900">Configuración Activa</h4>
                    <p className="text-slate-500">Mínimo para aprobar: <span className="font-bold text-slate-900">{rubric?.min_grade}%</span></p>
                    <p className="text-slate-500">Mínimo asistencia: <span className="font-bold text-slate-900">{rubric?.min_attendance}%</span></p>
                 </div>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-xl font-bold text-slate-900">Desglose por Rubro</h3>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">Valores normalizados (0-100)</div>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider">Alumno</th>
                        {allCriteria.map(c => (
                          <th key={c.id} className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider text-center">{c.name}</th>
                        ))}
                        <th className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider text-center bg-blue-50/50">Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {filteredResults.map(r => (
                         <tr key={r.student.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-5">
                               <p className="font-bold text-slate-900">{r.student.last_name}, {r.student.first_name}</p>
                            </td>
                            {allCriteria.map(c => (
                              <td key={c.id} className="px-8 py-5 text-center">
                                 <span className={cn(
                                   "font-bold",
                                   (r.gradesByCriterion[c.id] || 0) < (rubric?.min_grade || 60) ? "text-red-500" : "text-slate-700"
                                 )}>
                                   {r.gradesByCriterion[c.id] !== undefined ? Math.round(r.gradesByCriterion[c.id]) : '-'}
                                 </span>
                              </td>
                            ))}
                            <td className="px-8 py-5 text-center bg-blue-50/20">
                               <span className={cn(
                                 "font-black text-lg",
                                 r.finalGrade < (rubric?.min_grade || 60) ? "text-red-600" : "text-blue-600"
                               )}>
                                 {formatGrade(r.finalGrade)}
                               </span>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
               </div>
           </div>
        </div>
      )}

      {activeTab === 'missing' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                 <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                 <h4 className="text-lg font-bold text-amber-900">Seguimiento de Entregas</h4>
                 <p className="text-amber-700 text-sm">Este reporte muestra únicamente las actividades que tienen estatus <span className="font-bold">No entregado</span> o que no tienen registro de calificación.</p>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-xl font-bold text-slate-900">Actividades No Entregadas</h3>
                  <div className="relative w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Filtrar Alumno..." 
                      className="w-full pl-11 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider">Alumno</th>
                        <th className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider">Actividad</th>
                        <th className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider">Rubro</th>
                        <th className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider">Fecha</th>
                        <th className="px-8 py-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider text-center">Estatus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {allStudents
                        .filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()))
                        .flatMap(student => {
                          return allActivities.map(activity => {
                            const sub = allSubmissions.find(sb => sb.activity_id === activity.id && sb.student_id === student.id);
                            if (!sub || sub.status === 'not_delivered' || (sub.grade === 0 && activity.grading_mode === 'boolean')) {
                              const criterion = allCriteria.find(c => c.id === activity.criterion_id);
                              return (
                                <tr key={`${student.id}_${activity.id}`} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-8 py-5">
                                    <p className="font-bold text-slate-900">{student.last_name}, {student.first_name}</p>
                                  </td>
                                  <td className="px-8 py-5">
                                     <p className="text-sm font-bold text-slate-700">{activity.name}</p>
                                  </td>
                                  <td className="px-8 py-5">
                                     <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded uppercase">{criterion?.name || 'N/A'}</span>
                                  </td>
                                  <td className="px-8 py-5 text-slate-400 text-xs">
                                     {activity.due_date ? formatLocalDate(activity.due_date, 'PP') : 'N/A'}
                                  </td>
                                  <td className="px-8 py-5 text-center">
                                     <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Faltante</span>
                                  </td>
                                </tr>
                              );
                            }
                            return null;
                          });
                        })
                        .filter(Boolean)
                        .slice(0, 100) // Limit to avoid massive render
                       }
                       {results.length > 0 && allSubmissions.length === 0 && (
                          <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400">Excelente, todos los alumnos están al día.</td></tr>
                       )}
                    </tbody>
                  </table>
               </div>
           </div>
        </div>
      )}
    </div>
  );
}

