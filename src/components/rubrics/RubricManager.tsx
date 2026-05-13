import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronLeft,
  Settings,
  Scale
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store';
import { Rubric, RubricCriterion } from '../../types';
import { cn } from '../../lib/utils';

export function RubricManager() {
  const { activeGroup, setView } = useAppStore();
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [criteria, setCriteria] = useState<Partial<RubricCriterion>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState({ min_grade: 60, min_attendance: 80 });

  useEffect(() => {
    if (activeGroup) {
      fetchRubric();
    }
  }, [activeGroup]);

  async function fetchRubric() {
    if (!activeGroup) return;
    try {
      // Fetch or Create Rubric
      let { data: rubricData, error: rError } = await supabase
        .from('rubrics')
        .select('*')
        .eq('group_id', activeGroup.id)
        .single();

      if (rError && rError.code === 'PGRST116') {
        const { data: newRubric, error: cError } = await supabase
          .from('rubrics')
          .insert([{ group_id: activeGroup.id, min_grade: 60, min_attendance: 80 }])
          .select()
          .single();
        if (cError) throw cError;
        rubricData = newRubric;
      } else if (rError) throw rError;

      setRubric(rubricData);
      setLocalSettings({ 
        min_grade: rubricData.min_grade || 60, 
        min_attendance: rubricData.min_attendance || 80 
      });

      // Fetch Criteria
      const { data: criteriaData, error: crError } = await supabase
        .from('rubric_criteria')
        .select('*')
        .eq('rubric_id', rubricData.id);

      if (crError) throw crError;
      setCriteria(criteriaData || []);
    } catch (error) {
      console.error('Error fetching rubric:', error);
    } finally {
      setLoading(false);
    }
  }

  const addCriterion = () => {
    setCriteria([...criteria, { name: '', weight: 0, description: '' }]);
  };

  const removeCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const updateCriterion = (index: number, field: keyof RubricCriterion, value: any) => {
    const newCriteria = [...criteria];
    newCriteria[index] = { ...newCriteria[index], [field]: value };
    setCriteria(newCriteria);
  };

  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const isValid = totalWeight === 100 && criteria.length > 0 && criteria.every(c => c.name && c.weight > 0);

  const handleSave = async () => {
    if (!isValid || !rubric) return;
    setSaving(true);
    try {
      // Update Main Rubric Settings
      await supabase
        .from('rubrics')
        .update({ 
          min_grade: localSettings.min_grade, 
          min_attendance: localSettings.min_attendance 
        })
        .eq('id', rubric.id);

      // Clean and Insert Criteria (Simple way: delete and re-insert)
      await supabase.from('rubric_criteria').delete().eq('rubric_id', rubric.id);
      
      const criteriaToInsert = criteria.map(c => ({
        rubric_id: rubric.id,
        name: c.name,
        weight: c.weight,
        description: c.description
      }));

      const { error } = await supabase.from('rubric_criteria').insert(criteriaToInsert);
      if (error) throw error;
      
      alert('Rúbrica guardada exitosamente');
      fetchRubric();
    } catch (error) {
      console.error('Error saving rubric:', error);
      alert('Error al guardar la rúbrica');
    } finally {
      setSaving(false);
    }
  };

  if (!activeGroup) return null;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => setView('groups')}
          className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-900"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Rúbrica de Evaluación</h1>
          <p className="text-slate-500">Define los criterios y porcentajes para el grupo: <span className="font-bold text-blue-600">{activeGroup.name}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">Criterios de Evaluación</h3>
              </div>
              <button 
                onClick={addCriterion}
                className="text-blue-600 hover:text-blue-700 font-bold text-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Añadir Criterio
              </button>
            </div>

            <div className="p-8 space-y-4">
              {criteria.map((criterion, index) => (
                <div key={index} className="flex gap-4 items-start group animate-in slide-in-from-left-2 duration-200" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="flex-1 space-y-1">
                    <input 
                      value={criterion.name}
                      onChange={(e) => updateCriterion(index, 'name', e.target.value)}
                      placeholder="Nombre del criterio (Ej. Tareas)"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="w-32 space-y-1 relative">
                    <input 
                      type="number"
                      value={criterion.weight || ''}
                      onChange={(e) => updateCriterion(index, 'weight', Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-center font-bold pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                  </div>
                  <button 
                    onClick={() => removeCriterion(index)}
                    className="p-3 text-slate-300 hover:text-red-500 transition-colors mt-0.5"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}

              {criteria.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl">
                   <p className="text-slate-400 text-sm">No has añadido criterios todavía.</p>
                   <button onClick={addCriterion} className="text-blue-600 text-sm font-bold mt-2">Crear primer criterio</button>
                </div>
              )}
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Suma Total</p>
                <div className={cn(
                  "text-3xl font-black flex items-center gap-2",
                  totalWeight === 100 ? "text-green-600" : "text-amber-500"
                )}>
                  {totalWeight}%
                  {totalWeight === 100 ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                </div>
              </div>
              {totalWeight !== 100 && (
                <p className="text-xs text-amber-600 font-medium max-w-[200px] text-right italic">
                  La suma debe ser exactamente 100 para poder guardar la rúbrica.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-5 h-5 text-slate-400" />
              <h3 className="font-bold text-slate-900">Mínimos del Grupo</h3>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 text-balance">Calificación Mínima Aprobatoria</label>
              <input 
                type="number"
                value={localSettings.min_grade}
                onChange={(e) => setLocalSettings({...localSettings, min_grade: Number(e.target.value)})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 text-balance">Asistencia Mínima (%)</label>
              <input 
                type="number"
                value={localSettings.min_attendance}
                onChange={(e) => setLocalSettings({...localSettings, min_attendance: Number(e.target.value)})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-lg"
              />
              <p className="text-[10px] text-slate-400 italic">Si el alumno tiene menos de este porcentaje, su estatus será 'SD'.</p>
            </div>

            <button 
              onClick={handleSave}
              disabled={!isValid || saving}
              className="w-full pt-4"
            >
              <div className={cn(
                "w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all shadow-xl",
                isValid 
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 active:scale-95" 
                  : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
              )}>
                {saving ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                Guardar Configuración
              </div>
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 text-sm text-amber-700 space-y-3">
             <div className="flex gap-2">
               <AlertTriangle className="w-5 h-5 shrink-0" />
               <p className="font-bold">Importante</p>
             </div>
             <p className="leading-relaxed">
               Los cambios en la rúbrica recalcularán automáticamente las calificaciones finales de todos los alumnos en este grupo. Asegúrate de que los porcentajes sean correctos.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
