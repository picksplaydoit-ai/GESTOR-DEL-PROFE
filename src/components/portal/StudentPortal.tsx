import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  User, 
  BookOpen, 
  GraduationCap, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Loader2,
  Lock
} from 'lucide-react';
import { calculateGrades, StudentGradeResult } from '../../lib/grades';
import { cn, formatGrade } from '../../lib/utils';
import { Student, Group, Rubric, RubricCriterion, Activity, Submission, CourseMaterial, AttendanceStatus } from '../../types';

export function StudentPortal() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState('');
  const [enrollmentId, setEnrollmentId] = useState('');
  const [portalData, setPortalData] = useState<any>(null);
  const [grades, setGrades] = useState<StudentGradeResult | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Intentamos llamar al RPC recomendado para máxima seguridad
      const { data, error: rpcError } = await supabase.rpc('get_student_portal', {
        p_student_public_id: studentId.trim(),
        p_enrollment_id: enrollmentId.trim()
      });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        // Fallback: Si el RPC no existe, intentamos consulta directa (menos seguro pero funcional para demo)
        // Nota: En producción, el profesor DEBE crear el RPC
        const { data: student, error: stError } = await supabase
          .from('students')
          .select('*')
          .eq('student_public_id', studentId.trim())
          .eq('enrollment_id', enrollmentId.trim())
          .eq('is_active', true)
          .single();

        if (stError || !student) {
          throw new Error('Credenciales incorrectas o alumno no encontrado');
        }

        // Si encontramos al alumno, traemos todo lo demás
        const [group, rubricRes, criteria, activities, submissions, attendance, materials] = await Promise.all([
          supabase.from('groups').select('*').eq('id', student.group_id).single(),
          supabase.from('rubrics').select('*').eq('group_id', student.group_id).single(),
          supabase.from('rubric_criteria').select('*').eq('rubric_id', (await supabase.from('rubrics').select('id').eq('group_id', student.group_id).single()).data?.id),
          supabase.from('activities').select('*').eq('group_id', student.group_id).eq('status', 'active'),
          supabase.from('submissions').select('*').eq('student_id', student.id),
          supabase.from('attendance_records').select('*, attendance_sessions!inner(date, group_id)').eq('student_id', student.id).eq('attendance_sessions.group_id', student.group_id),
          supabase.from('course_materials').select('*').eq('group_id', student.group_id).eq('visibility', 'published')
        ]);

        const fullData = {
          student,
          group: group.data,
          rubric: rubricRes.data,
          criteria: criteria.data,
          activities: activities.data,
          submissions: submissions.data,
          attendance: attendance.data,
          materials: materials.data
        };
        setPortalData(fullData);
      } else if (!data) {
        throw new Error('Credenciales incorrectas o alumno no encontrado');
      } else {
        setPortalData(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (portalData) {
      const { student, criteria, activities, submissions, attendance, rubric } = portalData;
      
      const submissionsMap: Record<string, Submission> = {};
      submissions?.forEach((s: Submission) => {
        submissionsMap[`${s.activity_id}_${s.student_id}`] = s;
      });

      const attendanceMap: Record<string, { status: AttendanceStatus, value: number }[]> = {
        [student.id]: attendance?.map((a: any) => ({
          status: a.status,
          value: a.value
        })) || []
      };

      const results = calculateGrades(
        [student],
        criteria || [],
        activities || [],
        submissionsMap,
        attendanceMap,
        rubric || { min_grade: 60, min_attendance: 80 }
      );

      setGrades(results[0]);
    }
  }, [portalData]);

  if (!portalData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-blue-100 border border-slate-200 overflow-hidden">
          <div className="bg-blue-600 p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent animate-pulse" />
            <GraduationCap className="w-16 h-16 text-white mx-auto mb-4 relative" />
            <h1 className="text-2xl font-black text-white relative">Portal del Alumno</h1>
            <p className="text-blue-100 text-sm relative">Consulta tus calificaciones y asistencia</p>
          </div>

          <form onSubmit={handleLogin} className="p-10 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 border border-red-100 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ID de Alumno</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" 
                  placeholder="Ej: AL-12345"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Matrícula / Código</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  value={enrollmentId}
                  onChange={(e) => setEnrollmentId(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" 
                  placeholder="Ingresa tu matrícula"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
              Acceder al Portal
            </button>
          </form>

          <div className="p-6 bg-slate-50 text-center border-t border-slate-100">
            <p className="text-xs text-slate-400 font-bold">Si no conoces tus datos, consulta con tu profesor.</p>
          </div>
        </div>
      </div>
    );
  }

  const { student, group, activities, criteria, submissions, materials } = portalData;

  const missingActivities = activities?.filter((a: Activity) => {
    const sub = submissions?.find((s: Submission) => s.activity_id === a.id);
    return !sub || sub.status === 'not_delivered';
  }) || [];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                <GraduationCap className="text-white w-7 h-7" />
             </div>
             <div>
                <h2 className="font-black text-slate-900 leading-tight">{student.first_name} {student.last_name}</h2>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">{group.subject} • {group.name}</p>
             </div>
          </div>
          <button 
            onClick={() => setPortalData(null)}
            className="p-3 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-red-500"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-8 space-y-8">
        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[4rem] -mr-8 -mt-8 opacity-50" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Calificación</p>
              <div className="flex items-baseline gap-2">
                 <h3 className="text-5xl font-black text-slate-900">{formatGrade(grades?.finalGrade || 0)}</h3>
                 <span className={cn(
                   "text-xs font-black px-2 py-1 rounded-lg uppercase",
                   grades?.status === 'APROBADO' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                 )}>
                   {grades?.status}
                 </span>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-[4rem] -mr-8 -mt-8 opacity-50" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Asistencia</p>
              <div className="flex items-baseline gap-2">
                 <h3 className="text-5xl font-black text-green-600">{Math.round(grades?.attendancePercentage || 0)}%</h3>
                 <p className="text-xs font-bold text-slate-400">{grades?.attendancePresent}/{grades?.attendanceTotal} Clases</p>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-[4rem] -mr-8 -mt-8 opacity-50" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Entregas</p>
              <div className="flex items-baseline gap-2">
                 <h3 className="text-5xl font-black text-amber-500">
                    {submissions?.filter((s: Submission) => s.status === 'delivered').length || 0}
                 </h3>
                 <p className="text-xs font-bold text-slate-400">de {activities?.length || 0} Total</p>
              </div>
           </div>
        </div>

        {/* Grades by Rubric */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h3 className="text-xl font-black text-slate-900">Desempeño por Rubro</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {criteria?.map((c: RubricCriterion) => {
              const grade = grades?.gradesByCriterion[c.id];
              const rubroActivities = activities?.filter((a: Activity) => a.criterion_id === c.id) || [];
              const rubroSubs = submissions?.filter((s: Submission) => rubroActivities.some(ra => ra.id === s.activity_id)) || [];
              const delivered = rubroSubs.filter((s: Submission) => s.status === 'delivered').length;

              return (
                <div key={c.id} className="bg-white p-6 rounded-3xl border border-slate-200 group hover:border-blue-500 transition-all duration-300 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{c.name}</h4>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{c.weight}% del total</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-900">{grade !== undefined ? formatGrade(grade) : '-'}</p>
                      <p className="text-[10px] font-bold text-slate-400">{delivered}/{rubroActivities.length} Entregas</p>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000",
                        grade !== undefined && grade >= 60 ? "bg-blue-600" : "bg-red-500"
                      )}
                      style={{ width: `${grade || 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Pending Activities */}
        {missingActivities.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-5 h-5 text-red-500" />
              <h3 className="text-xl font-black text-slate-900 text-red-600">Actividades Pendientes</h3>
            </div>
            <div className="bg-white rounded-[2rem] border border-red-100 overflow-hidden shadow-xl shadow-red-50/50">
              <div className="divide-y divide-red-50">
                {missingActivities.map((a: Activity) => {
                  const criterion = criteria?.find((c: RubricCriterion) => c.id === a.criterion_id);
                  return (
                    <div key={a.id} className="p-6 flex items-center justify-between hover:bg-red-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                          <XCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{a.title}</p>
                          <p className="text-xs font-bold text-slate-400 uppercase">{criterion?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-red-500 uppercase tracking-widest">Faltante</p>
                        <p className="text-[10px] text-slate-400 font-bold">Fecha límite: {new Date(a.due_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Course Materials */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-xl font-black text-slate-900">Material de Clase</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materials && materials.length > 0 ? (
              materials.map((m: CourseMaterial) => (
                <a 
                  key={m.id} 
                  href={m.external_link || m.file_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{m.title}</h4>
                      <p className="text-xs text-slate-400 font-bold uppercase">{m.material_type} • Sem. {m.week}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                </a>
              ))
            ) : (
              <div className="col-span-full bg-slate-100 p-10 rounded-[2rem] text-center border-2 border-dashed border-slate-200">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-bold">No hay materiales publicados para este grupo todavía.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
