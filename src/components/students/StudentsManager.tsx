import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Upload, 
  Search, 
  UserPlus, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  FileSpreadsheet,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';
import { Student } from '../../types';
import { generateStudentPublicId, cn } from '../../lib/utils';
import Papa from 'papaparse';

export function StudentsManager() {
  const { activeGroup, setView } = useAppStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);

  useEffect(() => {
    if (activeGroup) {
      fetchStudents();
    }
  }, [activeGroup]);

  async function fetchStudents() {
    if (!activeGroup) return;
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('group_id', activeGroup.id)
        .order('last_name', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          setImportPreview(results.data.filter((row: any) => row.nombre || row.first_name));
        }
      });
    }
  };

  const processImport = async () => {
    if (!importPreview || !activeGroup) return;
    setLoading(true);
    
    try {
      // Get current count for ID generation
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });
      
      const newStudents = importPreview.map((row, index) => ({
        first_name: row.nombre || row.first_name,
        last_name: row.apellido || row.last_name,
        enrollment_id: row.matricula || row.id || '',
        email: row.correo || row.email || '',
        group_id: activeGroup.id,
        student_public_id: generateStudentPublicId((count || 0) + index + 1),
        is_active: true
      }));

      const { error } = await supabase.from('students').insert(newStudents);
      if (error) throw error;
      
      setImportPreview(null);
      fetchStudents();
    } catch (error) {
      console.error('Error importing students:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!activeGroup) return null;

  const filteredStudents = students.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student_public_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.enrollment_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-display font-bold text-slate-900">Alumnos</h1>
          <p className="text-slate-500">Gestión de integrantes del grupo: <span className="font-bold text-blue-600">{activeGroup.name}</span></p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nombre, ID o matrícula..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
          />
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <label className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm">
            <Upload className="w-5 h-5" />
            <span>Importar CSV</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <UserPlus className="w-5 h-5" />
            <span>Agregar Manual</span>
          </button>
        </div>
      </div>

      {importPreview && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 animate-in slide-in-from-top-4 duration-300">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                <h3 className="font-bold text-blue-900">Vista previa de importación ({importPreview.length} alumnos)</h3>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setImportPreview(null)} className="text-sm font-semibold text-blue-600 hover:underline">Cancelar</button>
                <button 
                  onClick={processImport} 
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Confirmar Importación
                </button>
              </div>
           </div>
           <div className="max-h-60 overflow-y-auto bg-white rounded-xl border border-blue-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 font-bold text-slate-600">Nombre</th>
                    <th className="px-4 py-2 font-bold text-slate-600">Apellido</th>
                    <th className="px-4 py-2 font-bold text-slate-600">Matrícula</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importPreview.map((row, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">{row.nombre || row.first_name}</td>
                      <td className="px-4 py-2">{row.apellido || row.last_name}</td>
                      <td className="px-4 py-2">{row.matricula || row.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 font-bold text-slate-600 text-sm">ID Público</th>
              <th className="px-6 py-4 font-bold text-slate-600 text-sm">Nombre Completo</th>
              <th className="px-6 py-4 font-bold text-slate-600 text-sm">Matrícula</th>
              <th className="px-6 py-4 font-bold text-slate-600 text-sm">Estatus</th>
              <th className="px-6 py-4 font-bold text-slate-600 text-sm">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [1, 2, 3].map(i => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-6 py-4 h-16 bg-slate-50/50" />
                </tr>
              ))
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center text-slate-400">
                    <Search className="w-12 h-12 mb-3 opacity-20" />
                    <p className="font-medium text-slate-500">No se encontraron alumnos</p>
                    <p className="text-xs">Usa el botón "Agregar Manual" para comenzar.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-slate-500">{student.student_public_id}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{student.first_name} {student.last_name}</p>
                    <p className="text-xs text-slate-500">{student.email || 'Sin correo'}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{student.enrollment_id}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit",
                      student.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    )}>
                      {student.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {student.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && <StudentModal onClose={() => setIsModalOpen(false)} onSave={fetchStudents} />}
    </div>
  );
}

function StudentModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const { activeGroup } = useAppStore();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeGroup) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const { count } = await supabase.from('students').select('*', { count: 'exact', head: true });
      
      const { error } = await supabase.from('students').insert([{
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        enrollment_id: formData.get('enrollment_id'),
        email: formData.get('email'),
        group_id: activeGroup.id,
        student_public_id: generateStudentPublicId((count || 0) + 1)
      }]);

      if (error) throw error;
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving student:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Agregar Alumno</h2>
              <p className="text-sm text-slate-500">Completa los datos del nuevo estudiante.</p>
            </div>
            <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl">
              <UserPlus className="w-6 h-6" />
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nombre(s)</label>
                <input name="first_name" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Apellido(s)</label>
                <input name="last_name" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Matrícula / Código</label>
              <input name="enrollment_id" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Correo Electrónico (Opcional)</label>
              <input name="email" type="email" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
            
            <div className="flex gap-4 mt-8">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="submit" disabled={loading} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-70">
                {loading ? 'Guardando...' : 'Guardar Alumno'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
