import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  ChevronLeft, 
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Save,
  Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';
import { Student, AttendanceStatus } from '../../types';
import { cn } from '../../lib/utils';
import { getCurrentLocalDate, formatLocalDate } from '../../lib/date.ts';

export function AttendanceManager() {
  const { activeGroup, setView } = useAppStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<string, { status: AttendanceStatus, value: number }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getCurrentLocalDate());
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (activeGroup) {
      fetchData();
    }
  }, [activeGroup, selectedDate]);

  async function fetchData() {
    if (!activeGroup) return;
    setLoading(true);
    try {
      // 1. Get/Create Session for the date
      let { data: sessionData, error: sError } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('group_id', activeGroup.id)
        .eq('date', selectedDate)
        .single();

      if (sError && sError.code === 'PGRST116') {
        setSessionId(null);
        setRecords({});
      } else if (sError) throw sError;
      else {
        setSessionId(sessionData.id);
        // Load existing records
        const { data: recData, error: rError } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('session_id', sessionData.id);
        
        if (rError) throw rError;
        const recMap: Record<string, { status: AttendanceStatus, value: number }> = {};
        recData?.forEach(r => {
          recMap[r.student_id] = { status: r.status, value: r.value };
        });
        setRecords(recMap);
      }

      // 2. Fetch Students
      const { data: studentData, error: stError } = await supabase
        .from('students')
        .select('*')
        .eq('group_id', activeGroup.id)
        .eq('is_active', true)
        .order('last_name');

      if (stError) throw stError;
      setStudents(studentData || []);

      // If no records, initialize all as present
      if (Object.keys(records).length === 0) {
        const initial: Record<string, { status: AttendanceStatus, value: number }> = {};
        studentData?.forEach(s => {
          initial[s.id] = { status: 'present', value: 1 };
        });
        setRecords(initial);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStatus = (studentId: string, status: AttendanceStatus) => {
    let value = 0;
    if (status === 'present' || status === 'justified') value = 1;
    if (status === 'late') value = 0.5;
    if (status === 'absent') value = 0;

    setRecords({
      ...records,
      [studentId]: { status, value }
    });
  };

  const handleSave = async () => {
    if (!activeGroup) return;
    setSaving(true);
    try {
      let currentSessionId = sessionId;

      // 1. Create session if it doesn't exist
      if (!currentSessionId) {
        const { data: newSession, error: nsError } = await supabase
          .from('attendance_sessions')
          .insert([{ group_id: activeGroup.id, date: selectedDate }])
          .select()
          .single();
        
        if (nsError) throw nsError;
        currentSessionId = newSession.id;
        setSessionId(currentSessionId);
      }

      // 2. Upsert records
      const recordsToUpsert = (Object.entries(records) as [string, { status: AttendanceStatus, value: number }][]).map(([studentId, data]) => ({
        session_id: currentSessionId,
        student_id: studentId,
        status: data.status,
        value: data.value
      }));

      const { error: upsError } = await supabase.from('attendance_records').upsert(recordsToUpsert);
      if (upsError) throw upsError;

      alert('Asistencia guardada correctamente');
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Error al guardar asistencia');
    } finally {
      setSaving(false);
    }
  };

  if (!activeGroup) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('groups')}
            className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-900"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Pasar Lista</h1>
            <p className="text-slate-500">Grupo: <span className="font-bold text-blue-600">{activeGroup.name}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 shadow-sm"
            />
          </div>
          <button 
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
            Guardar Lista
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
           <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
             {formatLocalDate(selectedDate)}
           </p>
           <div className="flex gap-4">
             <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
               <CheckCircle2 className="w-3 h-3" />
               {(Object.values(records) as { status: AttendanceStatus, value: number }[]).filter(r => r.status === 'present').length} Presentes
             </div>
             <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
               <XCircle className="w-3 h-3" />
               {(Object.values(records) as { status: AttendanceStatus, value: number }[]).filter(r => r.status === 'absent').length} Faltas
             </div>
           </div>
        </div>
        
        <table className="w-full text-left">
          <thead className="border-b border-slate-100">
            <tr>
              <th className="px-8 py-4 font-bold text-slate-400 text-[10px] uppercase tracking-[0.2em] w-1/2">Alumno</th>
              <th className="px-8 py-4 font-bold text-slate-400 text-[10px] uppercase tracking-[0.2em] text-center">Estatus de Asistencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={2} className="px-8 py-6 h-12 bg-slate-50/30" />
                </tr>
              ))
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-8 py-20 text-center text-slate-400 font-medium">
                  No hay alumnos activos en este grupo para pasar lista.
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const current = records[student.id] || { status: 'present' };
                return (
                  <tr key={student.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                          {student.first_name[0]}{student.last_name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{student.last_name}, {student.first_name}</p>
                          <p className="text-[10px] font-mono text-slate-400">{student.student_public_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-center gap-2">
                         {[
                           { id: 'present', label: 'P', color: 'green', icon: CheckCircle2 },
                           { id: 'absent', label: 'F', color: 'red', icon: XCircle },
                           { id: 'late', label: 'R', color: 'amber', icon: Clock },
                           { id: 'justified', label: 'J', color: 'blue', icon: HelpCircle }
                         ].map((opt) => (
                           <button
                             key={opt.id}
                             onClick={() => handleUpdateStatus(student.id, opt.id as AttendanceStatus)}
                             className={cn(
                               "w-12 h-12 rounded-xl border-2 flex flex-col items-center justify-center transition-all group relative",
                               current.status === opt.id 
                                 ? `border-${opt.color}-500 bg-${opt.color}-50 text-${opt.color}-600 scale-110 shadow-sm z-10` 
                                 : "border-slate-100 bg-white text-slate-300 hover:border-slate-200 hover:text-slate-400"
                             )}
                             title={opt.id.charAt(0).toUpperCase() + opt.id.slice(1)}
                           >
                             {current.status === opt.id && <Check className="absolute top-1 right-1 w-3 h-3" />}
                             <opt.icon className="w-5 h-5 mb-0.5" />
                             <span className="text-[10px] font-black">{opt.label}</span>
                           </button>
                         ))}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
