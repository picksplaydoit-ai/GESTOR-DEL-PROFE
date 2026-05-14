import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  FileText, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Share2, 
  MoreVertical, 
  Trash2, 
  Copy, 
  Calendar, 
  Bookmark, 
  FileArchive, 
  Video, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpRight,
  BookOpen,
  LayoutGrid,
  List,
  Upload,
  AlertCircle,
  FileCode,
  CheckCircle2,
  Zap,
  Layers,
  Maximize,
  Monitor,
  Code
} from 'lucide-react';
import { MaterialViewer } from '../common/MaterialViewer';
import { supabase } from '../../lib/supabase';
import { useAppStore, useAuthStore } from '../../store';
import { CourseMaterial, MaterialVisibility } from '../../types';
import { cn } from '../../lib/utils';
import { formatLocalDate } from '../../lib/date';

const MATERIAL_TYPES = [
  { id: 'pdf', label: 'PDF', icon: FileArchive, color: 'text-red-500 bg-red-50' },
  { id: 'word', label: 'Word', icon: FileText, color: 'text-blue-500 bg-blue-50' },
  { id: 'pptx', label: 'PowerPoint', icon: PresentationIcon, color: 'text-orange-500 bg-orange-50' },
  { id: 'image', label: 'Imagen', icon: ImageIcon, color: 'text-emerald-500 bg-emerald-50' },
  { id: 'video', label: 'Video', icon: Video, color: 'text-purple-500 bg-purple-50' },
  { id: 'link', label: 'Link', icon: LinkIcon, color: 'text-indigo-500 bg-indigo-50' },
  { id: 'note', label: 'Apunte', icon: BookOpen, color: 'text-slate-600 bg-slate-50' },
  { id: 'reading', label: 'Lectura', icon: BookOpen, color: 'text-amber-500 bg-amber-50' },
  { id: 'practice', label: 'Práctica', icon: Zap, color: 'text-cyan-500 bg-cyan-50' },
  { id: 'guide', label: 'Guía', icon: Bookmark, color: 'text-lime-500 bg-lime-50' },
  { id: 'instruction', label: 'Instrucciones', icon: FileCode, color: 'text-pink-500 bg-pink-50' },
  { id: 'html', label: 'HTML', icon: Code, color: 'text-orange-600 bg-orange-50' },
  { id: 'interactive_html', label: 'Interactivo', icon: Monitor, color: 'text-indigo-600 bg-indigo-50' },
  { id: 'other', label: 'Otro', icon: MoreHorizontal, color: 'text-slate-400 bg-slate-50' },
];

function PresentationIcon(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M2 3h20" />
      <path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" />
      <path d="m7 21 5-5 5 5" />
    </svg>
  );
}

export function PlanningManager() {
  const { activeGroup, setView, activeMaterialId, setActiveMaterialId } = useAppStore();
  const { user } = useAuthStore();
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<CourseMaterial | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterVisibility, setFilterVisibility] = useState<string>('all');
  const [deletingMaterial, setDeletingMaterial] = useState<{id: string, filePath?: string} | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, [activeGroup]);

  async function fetchMaterials() {
    if (!activeGroup) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('course_materials')
        .select('*')
        .eq('group_id', activeGroup.id)
        .order('unit', { ascending: true })
        .order('week', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteMaterial = async (id: string, filePath?: string) => {
    setLoading(true);
    try {
      // 1. Delete file from storage if exists
      if (filePath) {
        await supabase.storage.from('course-materials').remove([filePath]);
      }

      // 2. Delete record
      const { error } = await supabase
        .from('course_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDeletingMaterial(null);
      toast.success('Recurso eliminado');
      fetchMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (material: CourseMaterial, newVisibility: MaterialVisibility) => {
    try {
      const { error } = await supabase
        .from('course_materials')
        .update({ visibility: newVisibility })
        .eq('id', material.id);

      if (error) throw error;
      fetchMaterials();
    } catch (error) {
       console.error('Error updating visibility:', error);
    }
  }

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         m.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUnit = filterUnit === 'all' || m.unit?.toString() === filterUnit;
    const matchesVisibility = filterVisibility === 'all' || m.visibility === filterVisibility;
    return matchesSearch && matchesUnit && matchesVisibility;
  });

  const units: number[] = [];
  materials.forEach(m => {
    if (typeof m.unit === 'number' && !units.includes(m.unit)) {
      units.push(m.unit);
    }
  });
  units.sort((a, b) => a - b);

  if (!activeGroup) return null;

  if (activeMaterialId) {
    const activeMaterial = materials.find(m => m.id === activeMaterialId);
    if (!activeMaterial) return null;
    return (
      <div className="h-[calc(100vh-120px)]">
        <MaterialViewer 
          material={activeMaterial} 
          onClose={() => setActiveMaterialId(null)} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('groups')} className="p-2 hover:bg-white rounded-full text-slate-400 group/back">
            <ChevronLeft className="w-6 h-6 group-hover/back:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Planeación del Curso</h1>
            <p className="text-slate-500">Organiza materiales, lecturas y recursos por unidades.</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setEditingMaterial(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nuevo Material
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-12 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
            <input 
              placeholder="Buscar materiales, lecturas..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm"
            />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm"
            >
              <option value="all">Todas las Unidades</option>
              {units.map(u => (
                <option key={u} value={u}>Unidad {u}</option>
              ))}
            </select>

            <select 
              value={filterVisibility}
              onChange={(e) => setFilterVisibility(e.target.value)}
              className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm"
            >
              <option value="all">Visibilidad</option>
              <option value="private">Privados</option>
              <option value="publishable">Para Publicar</option>
              <option value="published">Publicados</option>
            </select>
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-blue-50 text-blue-600" : "text-slate-400 hover:text-slate-600")}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-blue-50 text-blue-600" : "text-slate-400 hover:text-slate-600")}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="md:col-span-12 py-20 flex justify-center">
            <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="md:col-span-12 py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center">
            <Layers className="w-16 h-16 text-slate-100 mb-6" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No hay materiales todavía</h3>
            <p className="text-slate-500 max-w-sm text-center mb-8">Comienza agregando lecturas, archivos o links para que los alumnos tengan sus recursos organizados.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
            >
              Crear primer material
            </button>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMaterials.map((material, idx) => (
                  <MaterialCard 
                    key={material.id} 
                    material={material} 
                    onEdit={() => {
                      setEditingMaterial(material);
                      setIsModalOpen(true);
                    }}
                    onDelete={() => setDeletingMaterial({id: material.id, filePath: material.file_path})}
                    onToggleVisibility={(v) => handleToggleVisibility(material, v)}
                    delay={idx * 50}
                  />
                ))}
              </div>
            ) : (
              <div className="md:col-span-12 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Material</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Organización</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Visibilidad</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredMaterials.map((material) => (
                      <MaterialRow 
                        key={material.id} 
                        material={material} 
                        onEdit={() => {
                          setEditingMaterial(material);
                          setIsModalOpen(true);
                        }}
                        onDelete={() => setDeletingMaterial({id: material.id, filePath: material.file_path})}
                        onToggleVisibility={(v) => handleToggleVisibility(material, v)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {isModalOpen && (
        <MaterialModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={fetchMaterials} 
          editingMaterial={editingMaterial}
        />
      )}

      {deletingMaterial && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-600">
                <Trash2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900">¿Eliminar material?</h3>
                <p className="text-slate-500">Esta acción eliminará el registro y el archivo asociado de forma permanente.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setDeletingMaterial(null)}
                  className="px-4 py-3 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDeleteMaterial(deletingMaterial.id, deletingMaterial.filePath)}
                  disabled={loading}
                  className="px-4 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 shadow-lg shadow-red-100 transition-all flex items-center justify-center"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Eliminar Recurso'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MaterialCard({ material, onEdit, onDelete, onToggleVisibility, delay }: any) {
  const { setView, setActiveMaterialId } = useAppStore();
  const typeInfo = MATERIAL_TYPES.find(t => t.id === material.material_type) || MATERIAL_TYPES[MATERIAL_TYPES.length - 1];
  const Icon = typeInfo.icon;

  const isHtml = material.material_type === 'html' || material.material_type === 'interactive_html';

  const getVisibilityConfig = (visibility: MaterialVisibility) => {
    switch (visibility) {
      case 'published': return { label: 'Publicado', icon: Eye, color: 'text-green-600 bg-green-50' };
      case 'publishable': return { label: 'Por publicar', icon: Share2, color: 'text-amber-600 bg-amber-50' };
      default: return { label: 'Privado', icon: EyeOff, color: 'text-slate-400 bg-slate-100' };
    }
  };

  const vis = getVisibilityConfig(material.visibility);

  return (
    <div 
      className="dashboard-card p-0 group flex flex-col overflow-hidden animate-in zoom-in duration-300"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-6">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", typeInfo.color)}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{material.title}</h3>
            <p className="text-sm text-slate-500 line-clamp-2 mt-1 min-h-[40px]">{material.description || 'Sin descripción'}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {material.unit && (
              <span className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg uppercase tracking-tight">
                U{material.unit}
              </span>
            )}
            {material.week && (
              <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg uppercase tracking-tight">
                Semana {material.week}
              </span>
            )}
            <span className={cn("px-2 py-1 text-[10px] font-black rounded-lg uppercase tracking-tight flex items-center gap-1", vis.color)}>
              <vis.icon className="w-3 h-3" />
              {vis.label}
            </span>
          </div>
        </div>
      </div>

      <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex gap-2">
        {isHtml ? (
          <button 
            onClick={() => setActiveMaterialId(material.id)}
            className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95"
          >
            <Monitor className="w-3 h-3" />
            Abrir interactivo
          </button>
        ) : material.file_url || material.external_link ? (
          <a 
            href={material.file_url || material.external_link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 bg-white border border-slate-200 text-slate-600 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <ExternalLink className="w-3 h-3" />
            Ver Recurso
          </a>
        ) : (
          <div className="flex-1 bg-slate-100 text-slate-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
            No disponible
          </div>
        )}
        
        {isHtml && (
          <button 
            onClick={() => setActiveMaterialId(material.id)}
            className="px-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center"
            title="Pantalla completa"
          >
            <Maximize className="w-4 h-4" />
          </button>
        )}

        {material.visibility !== 'published' && material.material_type !== 'html' && (
          <button 
            onClick={() => onToggleVisibility('published')}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
          >
            Publicar
          </button>
        )}
        {material.activity_id && (
          <div className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center" title="Tiene actividad evaluable">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}

function MaterialRow({ material, onEdit, onDelete, onToggleVisibility }: any) {
  const { setActiveMaterialId } = useAppStore();
  const typeInfo = MATERIAL_TYPES.find(t => t.id === material.material_type) || MATERIAL_TYPES[MATERIAL_TYPES.length - 1];
  const Icon = typeInfo.icon;
  const isHtml = material.material_type === 'html' || material.material_type === 'interactive_html';

  const visConfig = {
    published: { label: 'Publicado', color: 'text-green-600 bg-green-50' },
    publishable: { label: 'Por publicar', color: 'text-amber-600 bg-amber-50' },
    private: { label: 'Privado', color: 'text-slate-400 bg-slate-100' }
  };

  const currentVis = visConfig[material.visibility as MaterialVisibility];

  return (
    <tr className="hover:bg-slate-50 transition-colors group">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", typeInfo.color)}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-900 line-clamp-1">{material.title}</p>
              {isHtml && (
                <button 
                  onClick={() => setActiveMaterialId(material.id)}
                  className="p-1 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-all"
                  title="Abrir interactivo"
                >
                  <Monitor className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 line-clamp-1">{material.description || 'Sin descripción'}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          {material.unit && <span className="text-[10px] uppercase font-black text-blue-600 px-2 py-1 bg-blue-50 rounded-lg">Unidad {material.unit}</span>}
          {material.week && <span className="text-[10px] uppercase font-black text-indigo-600 px-2 py-1 bg-indigo-50 rounded-lg">Semana {material.week}</span>}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex justify-center">
          <button 
            onClick={() => {
              const order: MaterialVisibility[] = ['private', 'publishable', 'published'];
              const currentIdx = order.indexOf(material.visibility);
              const nextIdx = (currentIdx + 1) % order.length;
              onToggleVisibility(order[nextIdx]);
            }}
            className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all hover:scale-105", currentVis?.color)}
          >
            {material.visibility === 'published' ? <Eye className="w-3 h-3" /> : material.visibility === 'publishable' ? <Share2 className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {currentVis?.label}
          </button>
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
           <button onClick={onEdit} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm">
             <MoreVertical className="w-4 h-4" />
           </button>
           <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-xl transition-all shadow-sm">
             <Trash2 className="w-4 h-4" />
           </button>
        </div>
      </td>
    </tr>
  );
}

function MaterialModal({ onClose, onSave, editingMaterial }: any) {
  const { activeGroup, setView } = useAppStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [showActivityConfirm, setShowActivityConfirm] = useState(false);
  const [newMaterialId, setNewMaterialId] = useState<string | null>(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [rubricExists, setRubricExists] = useState(false);

  useEffect(() => {
    checkRubric();
  }, [activeGroup]);

  async function checkRubric() {
    if (!activeGroup) return;
    const { data } = await supabase.from('rubrics').select('id').eq('group_id', activeGroup.id).single();
    setRubricExists(!!data);
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeGroup || !user) return;
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const material_type = formData.get('material_type') as string;
    const unit = formData.get('unit') ? parseInt(formData.get('unit') as string) : null;
    const week = formData.get('week') ? parseInt(formData.get('week') as string) : null;
    const suggested_date = formData.get('suggested_date') as string;
    const private_notes = formData.get('private_notes') as string;
    const visibility = formData.get('visibility') as MaterialVisibility;
    const external_link = formData.get('external_link') as string;

    try {
      let file_url = editingMaterial?.file_url;
      let file_path = editingMaterial?.file_path;

      if (file) {
        // Upload file
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${activeGroup.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('course-materials')
          .upload(filePath, file, {
            contentType: (material_type === 'html' || material_type === 'interactive_html') ? 'text/html' : undefined,
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('course-materials')
          .getPublicUrl(filePath);

        file_url = publicUrl;
        file_path = filePath;
      }

      const materialData = {
        title,
        description,
        material_type,
        unit,
        week,
        suggested_date: suggested_date || null,
        private_notes,
        visibility,
        external_link,
        file_url,
        file_path,
        professor_id: user.id,
        group_id: activeGroup.id,
        reusable: true,
        updated_at: new Date().toISOString()
      };

      let resultId = editingMaterial?.id;

      if (editingMaterial) {
        const { error } = await supabase
          .from('course_materials')
          .update(materialData)
          .eq('id', editingMaterial.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('course_materials')
          .insert([materialData])
          .select()
          .single();
        if (error) throw error;
        resultId = data.id;
      }

      setNewMaterialId(resultId);
      
      if (visibility === 'published' && !editingMaterial?.activity_id) {
        setLoading(false);
        toast.success(editingMaterial ? 'Cambios guardados' : 'Material creado');
        setShowActivityConfirm(true);
      } else {
        toast.success(editingMaterial ? 'Cambios guardados' : 'Material creado');
        onSave();
        onClose();
      }
    } catch (error) {
      console.error('Error saving material:', error);
      toast.error('Error al guardar material');
      setLoading(false);
    }
  };

  if (showActivityConfirm) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200">
           <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600">
                <Zap className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">¿Este material será evaluable?</h3>
                <p className="text-slate-500 mt-2">Puedes convertirlo en una actividad para que cuente en la calificación del alumno.</p>
              </div>

              {!rubricExists && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 text-left">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">Primero debes crear una rúbrica</p>
                    <p className="text-xs text-amber-700">No puedes crear actividades evaluables sin criterios asignados.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => setIsActivityModalOpen(true)}
                  disabled={!rubricExists}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-blue-100"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Sí, convertir en actividad
                </button>
                <button 
                  onClick={() => { onSave(); onClose(); }}
                  className="w-full bg-slate-50 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-100 transition-all"
                >
                  No, solo material de apoyo
                </button>
              </div>
           </div>
        </div>
        {isActivityModalOpen && (
          <CreateActivityFromMaterial 
            materialId={newMaterialId!}
            onSave={() => { onSave(); onClose(); }}
            onClose={() => setIsActivityModalOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <form onSubmit={handleSave} className="flex flex-col md:flex-row h-[90vh] md:h-auto max-h-[95vh]">
          {/* Left panel: Info */}
          <div className="w-full md:w-1/2 p-8 space-y-6 overflow-y-auto">
             <div className="flex justify-between items-start">
               <div>
                 <h2 className="text-2xl font-bold text-slate-900">{editingMaterial ? 'Editar Material' : 'Nuevo Material'}</h2>
                 <p className="text-sm text-slate-500">Organiza tus recursos pedagógicos.</p>
               </div>
               <div className="bg-blue-50 p-3 rounded-2xl text-blue-600"><BookOpen className="w-6 h-6" /></div>
             </div>

             <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Título del material</label>
                  <input name="title" required defaultValue={editingMaterial?.title} placeholder="Ej. Lectura semana 3: Paradigmas" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción o Instrucciones</label>
                  <textarea name="description" defaultValue={editingMaterial?.description} rows={3} placeholder="Breve resumen de qué trata este material..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unidad</label>
                    <input type="number" name="unit" defaultValue={editingMaterial?.unit} placeholder="Ej. 1" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Semana</label>
                    <input type="number" name="week" defaultValue={editingMaterial?.week} placeholder="Ej. 3" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notas Privadas (Solo para ti)</label>
                  <textarea name="private_notes" defaultValue={editingMaterial?.private_notes} rows={2} placeholder="Ideas para la clase, recordatorios..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none italic" />
                </div>
             </div>
          </div>

          {/* Right panel: File & Vis */}
          <div className="w-full md:w-1/2 p-8 bg-slate-50 border-l border-slate-200 space-y-6 overflow-y-auto">
             <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de Material</label>
                  <div className="grid grid-cols-3 gap-2">
                    {MATERIAL_TYPES.map(type => (
                      <label key={type.id} className="relative group cursor-pointer">
                        <input 
                          type="radio" 
                          name="material_type" 
                          value={type.id} 
                          required 
                          defaultChecked={editingMaterial?.material_type === type.id} 
                          className="sr-only peer" 
                        />
                        <div className="flex flex-col items-center justify-center p-3 border-2 border-transparent bg-white rounded-xl text-slate-400 peer-checked:border-blue-600 peer-checked:text-blue-600 transition-all shadow-sm hover:border-slate-200">
                          <type.icon className="w-5 h-5 mb-1" />
                          <span className="text-[10px] font-bold">{type.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recurso (Subir o Link)</label>
                   <div className="space-y-2">
                     <div className="relative group">
                       <input 
                         type="file" 
                         onChange={(e) => setFile(e.target.files?.[0] || null)}
                         className="hidden" 
                         id="file-upload" 
                       />
                       <label 
                         htmlFor="file-upload" 
                         className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-slate-300 bg-white rounded-2xl cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all group"
                       >
                         {file ? (
                           <>
                             <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
                             <p className="text-xs font-bold text-slate-700 text-center">{file.name}</p>
                           </>
                         ) : editingMaterial?.file_url ? (
                            <>
                             <FileArchive className="w-8 h-8 text-blue-500 mb-2" />
                             <p className="text-xs font-bold text-slate-700 text-center">Archivo cargado. Click para cambiar.</p>
                           </>
                         ) : (
                           <>
                             <Upload className="w-8 h-8 text-slate-400 mb-2 group-hover:scale-110 transition-transform" />
                             <p className="text-xs font-bold text-slate-500">Arrastra o haz clic para subir</p>
                             <p className="text-[10px] text-slate-400">PDF, Word, PPTX, HTML, etc.</p>
                           </>
                         )}
                       </label>
                     </div>
                     <div className="relative flex items-center gap-2">
                        <LinkIcon className="absolute left-4 w-4 h-4 text-slate-400" />
                        <input name="external_link" defaultValue={editingMaterial?.external_link} placeholder="O pega un link externo (YouTube, Google Drive...)" className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs" />
                     </div>
                   </div>
                </div>

                <div className="space-y-3">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visibilidad inicial</label>
                   <div className="flex gap-2">
                      {[
                        { id: 'private', label: 'Privado', icon: EyeOff },
                        { id: 'publishable', label: 'Listo', icon: Share2 },
                        { id: 'published', label: 'Publicar', icon: Eye }
                      ].map(v => (
                        <label key={v.id} className="flex-1 cursor-pointer">
                          <input type="radio" name="visibility" value={v.id} defaultChecked={editingMaterial?.visibility ? editingMaterial.visibility === v.id : v.id === 'private'} className="sr-only peer" />
                          <div className="flex flex-col items-center p-3 bg-white border-2 border-transparent rounded-xl text-slate-400 peer-checked:border-blue-600 peer-checked:text-blue-600 transition-all font-bold text-[10px] uppercase shadow-sm">
                            <v.icon className="w-4 h-4 mb-1" />
                            {v.label}
                          </div>
                        </label>
                      ))}
                   </div>
                </div>
             </div>

             <div className="flex gap-3 pt-6">
                <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2">
                  {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Plus className="w-5 h-5" />}
                  {editingMaterial ? 'Guardar Cambios' : 'Crear Material'}
                </button>
             </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateActivityFromMaterial({ materialId, onSave, onClose }: { materialId: string, onSave: () => void, onClose: () => void }) {
  const { activeGroup } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [material, setMaterial] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [activeGroup, materialId]);

  async function fetchData() {
    if (!activeGroup) return;
    const [cRes, mRes] = await Promise.all([
      supabase.from('rubric_criteria').select('*').in('rubric_id', (await supabase.from('rubrics').select('id').eq('group_id', activeGroup.id)).data?.map(r=>r.id) || []),
      supabase.from('course_materials').select('*').eq('id', materialId).single()
    ]);
    setCriteria(cRes.data || []);
    setMaterial(mRes.data);
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeGroup || !material) return;
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const activityData = {
      title: material.title,
      description: material.description,
      group_id: activeGroup.id,
      criterion_id: formData.get('criterion_id') as string,
      type: formData.get('type') as string,
      grading_mode: formData.get('grading_mode') as string,
      total_deliveries: parseInt(formData.get('total_deliveries') as string || '1'),
      due_date: formData.get('due_date') || new Date().toISOString(),
      status: 'active'
    };

    try {
      const { data: newActivity, error: aError } = await supabase
        .from('activities')
        .insert([activityData])
        .select()
        .single();

      if (aError) throw aError;

      // Update material with activity_id
      const { error: mError } = await supabase
        .from('course_materials')
        .update({ activity_id: newActivity.id })
        .eq('id', materialId);

      if (mError) throw mError;

      toast.success('¡Actividad generada con éxito!');
      onSave();
    } catch (error) {
      console.error('Error converting to activity:', error);
      toast.error('Error al generar actividad');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
           <div className="flex justify-between items-start">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                 <Zap className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="text-xl font-bold text-slate-900">Configurar Actividad</h3>
                  <p className="text-sm text-slate-500">Define los parámetros de evaluación.</p>
               </div>
             </div>
             <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all">
               <Trash2 className="w-5 h-5" />
             </button>
           </div>

           <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Criterio de Rúbrica</label>
                <select name="criterion_id" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold">
                   <option value="">Selecciona un criterio</option>
                   {criteria.map(c => (
                     <option key={c.id} value={c.id}>{c.name} ({c.weight}%)</option>
                   ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Tipo de Actividad</label>
                <select name="type" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                  <option value="individual">Individual</option>
                  <option value="team">Por Equipo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Modo de Calificación</label>
                <select name="grading_mode" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold">
                  <option value="direct">Calificación Directa (0-100)</option>
                  <option value="deliveries">Por Entregas / Firmas</option>
                  <option value="boolean">Entregado / No entregado</option>
                </select>
              </div>
           </div>

           <div className="flex gap-4 pt-4">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all">Atrás</button>
              <button type="submit" disabled={loading} className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-2">
                {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Zap className="w-5 h-5" />}
                Crear Actividad
              </button>
           </div>
        </form>
      </div>
    </div>
  );
}

function MaterialViewerWrapper({ material, onBack }: { material: CourseMaterial | undefined, onBack: () => void }) {
  // This is now replaced by the common component call above
  return null;
}
