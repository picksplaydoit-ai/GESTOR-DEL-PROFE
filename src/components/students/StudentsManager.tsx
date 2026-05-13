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
  ChevronLeft,
  Edit2,
  AlertTriangle
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
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [importPreview, setImportPreview] = useState<ImportStudent[] | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');

  interface ImportStudent {
    first_name: string;
    last_name: string;
    enrollment_id: string;
    email: string;
    id?: string; // for local editing tracking
  }

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

  const splitFullName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return { first_name: '', last_name: '' };
    if (parts.length === 1) return { first_name: parts[0], last_name: '' };
    if (parts.length === 2) return { first_name: parts[1], last_name: parts[0] };
    
    // Heuristic: first 2 tokens = last name, rest = first name
    // Example: BASULTO ALVAREZ BRENDA JAQUELINE
    // parts: ["BASULTO", "ALVAREZ", "BRENDA", "JAQUELINE"]
    // last: BASULTO ALVAREZ, first: BRENDA JAQUELINE
    return {
      last_name: parts.slice(0, 2).join(' '),
      first_name: parts.slice(2).join(' ')
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rawData = results.data as any[];
          const processed = rawData.map((row, index) => {
            let first_name = row.first_name || row.nombre || '';
            let last_name = row.last_name || row.apellido || '';
            let enrollment_id = row.enrollment_id || row.matricula || row.id || '';
            let email = row.email || row.correo || '';

            // Google Contacts detection
            if (row['Name']) {
              const split = splitFullName(row['Name']);
              first_name = split.first_name;
              last_name = split.last_name;
            }
            if (row['Notes']) enrollment_id = row['Notes'];
            if (row['E-mail 1 - Value']) email = row['E-mail 1 - Value'];

            return {
              id: `temp-${index}`,
              first_name: String(first_name).trim(),
              last_name: String(last_name).trim(),
              enrollment_id: String(enrollment_id).trim(),
              email: String(email).trim(),
            };
          }).filter(s => s.first_name || s.last_name);

          validateImport(processed);
          setImportPreview(processed);
        }
      });
      // Reset input
      e.target.value = '';
    }
  };

  const validateImport = (data: ImportStudent[]) => {
    const errors: string[] = [];
    const enrollments = new Set();
    const emails = new Set();

    data.forEach((s, i) => {
      if (s.enrollment_id) {
        if (enrollments.has(s.enrollment_id)) {
          errors.push(`Fila ${i + 1}: Matrícula duplicada en el archivo (${s.enrollment_id})`);
        }
        enrollments.add(s.enrollment_id);
      }
      if (s.email) {
        if (emails.has(s.email)) {
          errors.push(`Fila ${i + 1}: Correo duplicado en el archivo (${s.email})`);
        }
        emails.add(s.email);
      }

      // Check against current students
      if (students.find(existing => existing.enrollment_id === s.enrollment_id)) {
        errors.push(`Fila ${i + 1}: Matrícula ${s.enrollment_id} ya existe en este grupo.`);
      }
      if (s.email && students.find(existing => existing.email === s.email)) {
        errors.push(`Fila ${i + 1}: Correo ${s.email} ya existe en este grupo.`);
      }
    });

    setImportErrors(errors);
  };

  const updatePreviewRow = (index: number, field: keyof ImportStudent, value: string) => {
    if (!importPreview) return;
    const updated = [...importPreview];
    updated[index] = { ...updated[index], [field]: value };
    setImportPreview(updated);
    validateImport(updated);
  };

  const processImport = async () => {
    if (!importPreview || !activeGroup || importErrors.length > 0) return;
    setLoading(true);
    
    try {
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });
      
      const newStudents = importPreview.map((row, index) => ({
        first_name: row.first_name,
        last_name: row.last_name,
        enrollment_id: row.enrollment_id,
        email: row.email,
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
      setImportErrors(['Error al guardar en la base de datos. Verifica los datos e intenta de nuevo.']);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este alumno? Se eliminarán sus calificaciones, asistencias y pertenencia a equipos.')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      fetchStudents();
      setSelectedStudents(prev => prev.filter(sId => sId !== id));
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Error al eliminar el alumno.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`¿Seguro que deseas eliminar a los ${selectedStudents.length} alumnos seleccionados?`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('students').delete().in('id', selectedStudents);
      if (error) throw error;
      fetchStudents();
      setSelectedStudents([]);
    } catch (error) {
      console.error('Error deleting selected students:', error);
      alert('Error al eliminar los alumnos seleccionados.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (confirmDeleteText !== 'ELIMINAR') return;
    setLoading(true);
    try {
      const { error } = await supabase.from('students').delete().eq('group_id', activeGroup.id);
      if (error) throw error;
      fetchStudents();
      setSelectedStudents([]);
      setIsDeleteAllModalOpen(false);
      setConfirmDeleteText('');
    } catch (error) {
      console.error('Error deleting all students:', error);
      alert('Error al eliminar todos los alumnos.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
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
          <button 
            onClick={() => setIsDeleteAllModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-all shadow-sm border border-red-100"
          >
            <Trash2 className="w-5 h-5" />
            <span>Eliminar Todo</span>
          </button>
          <label className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm">
            <Upload className="w-5 h-5" />
            <span>Importar CSV</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
          <button 
            onClick={() => {
              setEditingStudent(null);
              setIsModalOpen(true);
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <UserPlus className="w-5 h-5" />
            <span>Agregar Manual</span>
          </button>
        </div>
      </div>

      {selectedStudents.length > 0 && (
        <div className="bg-blue-600 text-white px-6 py-4 rounded-2xl flex items-center justify-between shadow-lg shadow-blue-100 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <CheckCircle2 className="w-6 h-6" />
            <p className="font-bold">{selectedStudents.length} alumnos seleccionados</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setSelectedStudents([])}
              className="px-4 py-2 text-sm font-bold hover:bg-white/10 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleDeleteSelected}
              className="bg-white text-red-600 px-6 py-2 rounded-lg text-sm font-black shadow-lg hover:bg-red-50 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar Seleccionados
            </button>
          </div>
        </div>
      )}

      {importPreview && (
        <div className={cn(
          "bg-white border rounded-2xl p-6 shadow-xl animate-in slide-in-from-top-4 duration-300",
          importErrors.length > 0 ? "border-red-200" : "border-blue-200"
        )}>
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className={cn("w-6 h-6", importErrors.length > 0 ? "text-red-500" : "text-blue-600")} />
                <div>
                  <h3 className="font-bold text-slate-900">Vista previa de importación ({importPreview.length} alumnos)</h3>
                  <p className="text-xs text-slate-500">Puedes corregir los datos directamente en la tabla antes de confirmar.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setImportPreview(null)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                <button 
                  onClick={processImport} 
                  disabled={loading || importErrors.length > 0}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Procesando...' : 'Confirmar Importación'}
                </button>
              </div>
           </div>

           {importErrors.length > 0 && (
             <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl space-y-1">
               <div className="flex items-center gap-2 text-red-600 font-bold text-sm mb-1">
                 <AlertCircle className="w-4 h-4" />
                 Corrige los siguientes errores:
               </div>
               {importErrors.map((err, i) => (
                 <p key={i} className="text-xs text-red-500 ml-6 tracking-tight">• {err}</p>
               ))}
             </div>
           )}

           <div className="max-h-96 overflow-y-auto bg-white rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold text-slate-600">Nombre(s)</th>
                    <th className="px-4 py-3 font-bold text-slate-600">Apellido(s)</th>
                    <th className="px-4 py-3 font-bold text-slate-600">Matrícula</th>
                    <th className="px-4 py-3 font-bold text-slate-600">Correo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importPreview.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-2 py-1">
                        <input 
                          value={row.first_name} 
                          onChange={(e) => updatePreviewRow(i, 'first_name', e.target.value)}
                          className="w-full px-2 py-1.5 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none rounded bg-transparent transition-all"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input 
                          value={row.last_name} 
                          onChange={(e) => updatePreviewRow(i, 'last_name', e.target.value)}
                          className="w-full px-2 py-1.5 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none rounded bg-transparent transition-all"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input 
                          value={row.enrollment_id} 
                          onChange={(e) => updatePreviewRow(i, 'enrollment_id', e.target.value)}
                          className="w-full px-2 py-1.5 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none rounded bg-transparent font-mono transition-all"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input 
                          value={row.email} 
                          onChange={(e) => updatePreviewRow(i, 'email', e.target.value)}
                          className="w-full px-2 py-1.5 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none rounded bg-transparent transition-all"
                        />
                      </td>
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
              <th className="px-6 py-4 w-10">
                <input 
                  type="checkbox" 
                  checked={selectedStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
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
                  <td colSpan={6} className="px-6 py-4 h-16 bg-slate-50/50" />
                </tr>
              ))
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center text-slate-400">
                    <Search className="w-12 h-12 mb-3 opacity-20" />
                    <p className="font-medium text-slate-500">No se encontraron alumnos</p>
                    <p className="text-xs">Usa el botón "Agregar Manual" para comenzar.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.id} className={cn("hover:bg-slate-50/80 transition-colors", selectedStudents.includes(student.id) && "bg-blue-50/30")}>
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => toggleSelectStudent(student.id)}
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
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
                    <div className="flex gap-2">
                       <button 
                        onClick={() => {
                          setEditingStudent(student);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteStudent(student.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <StudentModal 
          onClose={() => {
            setIsModalOpen(false);
            setEditingStudent(null);
          }} 
          onSave={fetchStudents} 
          editingStudent={editingStudent}
        />
      )}

      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-600">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900">¿Eliminar TODOS los alumnos?</h3>
                <p className="text-slate-500">Se eliminarán permanentemente todos los alumnos de este grupo, junto con sus calificaciones y récords.</p>
                <div className="pt-4 space-y-3 text-left">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Escribe ELIMINAR para confirmar</p>
                  <input 
                    type="text" 
                    value={confirmDeleteText}
                    onChange={(e) => setConfirmDeleteText(e.target.value.toUpperCase())}
                    placeholder="ELIMINAR"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-center font-black tracking-widest placeholder:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setIsDeleteAllModalOpen(false)}
                  className="px-4 py-3 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteAll}
                  disabled={loading || confirmDeleteText !== 'ELIMINAR'}
                  className="px-4 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 shadow-lg shadow-red-100 transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentModal({ onClose, onSave, editingStudent }: { onClose: () => void; onSave: () => void; editingStudent?: Student | null }) {
  const { activeGroup } = useAppStore();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeGroup) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const studentData = {
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      enrollment_id: formData.get('enrollment_id'),
      email: formData.get('email'),
      group_id: activeGroup.id
    };

    try {
      if (editingStudent) {
        const { error } = await supabase
          .from('students')
          .update(studentData)
          .eq('id', editingStudent.id);
        if (error) throw error;
      } else {
        const { count } = await supabase.from('students').select('*', { count: 'exact', head: true });
        const { error } = await supabase.from('students').insert([{
          ...studentData,
          student_public_id: generateStudentPublicId((count || 0) + 1)
        }]);
        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Error al guardar el alumno.');
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
              <h2 className="text-2xl font-bold text-slate-900">
                {editingStudent ? 'Editar Alumno' : 'Agregar Alumno'}
              </h2>
              <p className="text-sm text-slate-500">
                {editingStudent ? 'Actualiza los datos del estudiante.' : 'Completa los datos del nuevo estudiante.'}
              </p>
            </div>
            <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl">
              <UserPlus className="w-6 h-6" />
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nombre(s)</label>
                <input name="first_name" defaultValue={editingStudent?.first_name} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Apellido(s)</label>
                <input name="last_name" defaultValue={editingStudent?.last_name} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Matrícula / Código</label>
              <input name="enrollment_id" defaultValue={editingStudent?.enrollment_id} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Correo Electrónico (Opcional)</label>
              <input name="email" type="email" defaultValue={editingStudent?.email} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
            
            <div className="flex gap-4 mt-8">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="submit" disabled={loading} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2">
                {loading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                {editingStudent ? 'Guardar Cambios' : 'Guardar Alumno'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
