import React, { useState, useRef } from 'react';
import { 
  ChevronLeft, 
  Maximize, 
  ExternalLink, 
  FileArchive, 
  Plus,
  X
} from 'lucide-react';
import { CourseMaterial } from '../../types';
import { cn } from '../../lib/utils';

interface MaterialViewerProps {
  material: CourseMaterial;
  onClose: () => void;
  isPortal?: boolean;
}

export function MaterialViewer({ material, onClose, isPortal = false }: MaterialViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const isHtml = material.material_type === 'html' || material.material_type === 'interactive_html';
  const isImage = material.material_type === 'image';
  const isPdf = material.material_type === 'pdf';
  const fileUrl = material.file_url || material.external_link;

  const content = (
    <div className={cn(
      "flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500",
      isPortal ? "fixed inset-0 bg-white z-[60]" : "h-full"
    )}>
      <div className={cn(
        "flex items-center justify-between p-6 bg-white border-b border-slate-200",
        isPortal ? "" : "mb-6 rounded-t-3xl"
      )}>
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 group/back">
            <ChevronLeft className="w-6 h-6 group-hover/back:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 line-clamp-1">{material.title}</h1>
            <p className="text-xs md:text-sm text-slate-500 line-clamp-1">
              {material.description || (isHtml ? 'Simulador Interactivo' : 'Recurso de clase')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {fileUrl && (
            <a 
              href={fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden md:flex bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold items-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir
            </a>
          )}
          {(isHtml || isPdf) && (
            <button 
              onClick={toggleFullscreen}
              className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-sm"
            >
              <Maximize className="w-4 h-4" />
              <span className="hidden md:inline">Pantalla Completa</span>
            </button>
          )}
          <button 
            onClick={onClose}
            className="bg-slate-900 text-white px-4 md:px-6 py-2 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 text-sm"
          >
            {isPortal ? 'Cerrar' : 'Salir'}
          </button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className={cn(
          "flex-1 bg-slate-50 overflow-hidden relative group flex items-center justify-center",
          !isPortal && "rounded-b-[2.5rem] border-8 border-slate-900/10 shadow-2xl",
          isFullscreen ? "rounded-none border-0" : ""
        )}
      >
        {isImage ? (
          <img 
            src={fileUrl} 
            alt={material.title} 
            className="max-w-full max-h-full object-contain"
            referrerPolicy="no-referrer"
          />
        ) : (isHtml || isPdf) ? (
          <iframe 
            src={fileUrl}
            className="w-full h-full border-none bg-white"
            title={material.title}
            sandbox={isHtml ? "allow-scripts allow-same-origin allow-forms" : undefined}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="text-center p-12">
            <FileArchive className="w-20 h-20 text-slate-200 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Vista previa no disponible</h3>
            <p className="text-slate-500 mb-8">Este tipo de archivo requiere descargarse para ser visualizado correctamente.</p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <a 
                href={fileUrl} 
                download
                className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5 rotate-45" />
                Descargar Archivo
              </a>
              <a 
                href={fileUrl} 
                target="_blank" 
                rel="noreferrer"
                className="bg-white border border-slate-200 text-slate-600 px-8 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all inline-flex items-center gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                Abrir Externo
              </a>
            </div>
          </div>
        )}
        
        {isFullscreen && (
          <button 
            onClick={toggleFullscreen}
            className="absolute top-6 right-6 p-4 bg-slate-900/80 text-white rounded-2xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-800"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );

  return content;
}
