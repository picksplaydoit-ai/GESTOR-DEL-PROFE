import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore, useAuthStore } from '../../store';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { calculateGrades, StudentGradeResult } from '../../lib/grades';
import { cn, formatGrade } from '../../lib/utils';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

export function Dashboard() {
  const { activeGroup, groups, setView, setActiveGroup } = useAppStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState({ totalGroups: 0, totalStudents: 0 });
  const [groupStats, setGroupStats] = useState<StudentGradeResult[]>([]);

  useEffect(() => {
    if (activeGroup) {
      fetchGroupStats();
    } else {
      fetchGlobalStats();
    }
  }, [activeGroup, groups]);

  async function fetchGlobalStats() {
    if (!user) return;
    setLoading(true);
    try {
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .in('group_id', groups.map(g => g.id));
      
      setGlobalStats({
        totalGroups: groups.length,
        totalStudents: studentCount || 0
      });
    } catch (error) {
      console.error('Error fetching global stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchGroupStats() {
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
      subs?.forEach(s => { subMap[`${s.activity_id}_${s.student_id}`] = s; });

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

      setGroupStats(grades);
    } catch (error) {
       console.error('Error in dashboard fetch:', error);
    } finally {
      setLoading(false);
    }
  }

  if (activeGroup) {
    return <GroupDashboard stats={groupStats} loading={loading} groupName={activeGroup.name} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Dashboard General</h1>
        <p className="text-slate-500">Resumen operativo de tus clases y alumnos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Mis Grupos', value: globalStats.totalGroups, icon: GraduationCap, color: 'blue' },
          { label: 'Total Alumnos', value: globalStats.totalStudents, icon: Users, color: 'indigo' },
          { label: 'Actividades Hoy', value: 0, icon: Calendar, color: 'amber' },
          { label: 'Reportes Pendientes', value: globalStats.totalGroups, icon: FileText, color: 'purple' },
        ].map((stat, i) => (
          <div key={i} className="dashboard-card p-6 flex items-center gap-4 border-none shadow-indigo-100/50">
             <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", `bg-${stat.color}-50 text-${stat.color}-600`)}>
               <stat.icon className="w-8 h-8" />
             </div>
             <div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
               <p className="text-3xl font-black text-slate-900 leading-none mt-1">{stat.value}</p>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="dashboard-card p-8 bg-white min-h-[300px]">
           <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
             <TrendingUp className="w-5 h-5 text-blue-600" />
             Rendimiento de Grupos
           </h3>
           <div className="space-y-6">
             {groups.length === 0 ? (
               <p className="text-slate-400 text-center py-10">No hay grupos para mostrar.</p>
             ) : groups.map(g => (
                <button 
                  key={g.id} 
                  onClick={() => { setActiveGroup(g); }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                       {g.name[0]}
                    </div>
                    <div className="text-left">
                       <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{g.name}</p>
                       <p className="text-xs text-slate-500">{g.subject}</p>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 rotate-180 text-slate-300 group-hover:text-blue-600" />
                </button>
             ))}
           </div>
        </div>
        
        <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-blue-200">
           <div className="relative z-10">
             <h3 className="text-2xl font-bold mb-4">Bienvenido al Panel Docente</h3>
             <p className="text-blue-100 mb-8 max-w-sm">
               Usa el menú lateral para gestionar tus alumnos, pasar lista y calificar actividades. Tus dashboards se actualizarán automáticamente.
             </p>
             <button onClick={() => setView('groups')} className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-50 transition-colors">
               Gestionar Grupos
             </button>
           </div>
           <GraduationCap className="absolute -bottom-10 -right-10 w-64 h-64 text-blue-500 opacity-20 rotate-12" />
        </div>
      </div>
    </div>
  );
}

function GroupDashboard({ stats, loading, groupName }: { stats: StudentGradeResult[], loading: boolean, groupName: string }) {
  if (loading) return <div className="p-20 text-center text-slate-400">Cargando analítica...</div>;

  const total = stats.length;
  const approved = stats.filter(s => s.status === 'APROBADO').length;
  const failed = stats.filter(s => s.status === 'REPROBADO').length;
  const sd = stats.filter(s => s.status === 'SD').length;

  const pieData = [
    { name: 'Aprobados', value: approved },
    { name: 'Reprobados', value: failed },
    { name: 'SD', value: sd },
  ];

  const barData = stats.slice(0, 10).map(s => ({
    name: s.student.last_name,
    grade: parseFloat(s.finalGrade.toFixed(1))
  }));

  const riskStudents = stats.filter(s => s.status !== 'APROBADO').slice(0, 5);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
       <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Dashboard: {groupName}</h1>
            <p className="text-slate-500">Analítica detallada del rendimiento grupal.</p>
          </div>
          <div className="flex gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-200">
             Total Alumnos: {total}
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
             <div className="dashboard-card p-10 h-[450px]">
                <h3 className="text-lg font-bold text-slate-900 mb-8">Top 10 Rendimiento de Alumnos</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} domain={[0, 100]} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar dataKey="grade" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
             </div>

             <div className="dashboard-card p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Alumnos en Riesgo Académico
                </h3>
                <div className="space-y-3">
                  {riskStudents.length === 0 ? (
                    <p className="text-slate-400 text-center py-6 italic">No hay alumnos en riesgo detectados.</p>
                  ) : riskStudents.map(s => (
                    <div key={s.student.id} className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border",
                      s.status === 'SD' ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100"
                    )}>
                      <div>
                        <p className="font-bold text-slate-900">{s.student.first_name} {s.student.last_name}</p>
                        <p className="text-xs text-slate-500">ID: {s.student.student_public_id}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-lg font-black", s.status === 'SD' ? "text-amber-600" : "text-red-600")}>
                          {s.status === 'SD' ? `${Math.round(s.attendancePercentage)}% Asist.` : formatGrade(s.finalGrade)}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest">{s.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>

          <div className="space-y-8">
             <div className="dashboard-card p-8 h-[450px] flex flex-col">
                <h3 className="text-lg font-bold text-slate-900 mb-4 text-center">Distribución de Estatus</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 pt-6 border-t border-slate-100 flex justify-around text-center">
                   <div>
                     <p className="text-2xl font-black text-green-600">{approved}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aprobados</p>
                   </div>
                   <div>
                     <p className="text-2xl font-black text-red-600">{failed}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reprobados</p>
                   </div>
                   <div>
                     <p className="text-2xl font-black text-amber-600">{sd}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">S.D.</p>
                   </div>
                </div>
             </div>

             <div className="bg-slate-900 rounded-3xl p-8 text-white">
                <h3 className="text-lg font-bold mb-2">Consejo Académico</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {approved / (total || 1) > 0.8 
                    ? "Excelente rendimiento grupal. Considera aumentar la complejidad de los proyectos." 
                    : "Hay varios alumnos con riesgo de SD. Envía recordatorios de asistencia pronto."}
                </p>
             </div>
          </div>
       </div>
    </div>
  );
}

function ChevronLeft({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m15 18-6-6 6-6"/></svg>;
}
