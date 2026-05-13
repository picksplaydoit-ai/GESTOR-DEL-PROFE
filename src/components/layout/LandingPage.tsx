import React from 'react';
import { GraduationCap, Users, UserCheck, ChevronRight } from 'lucide-react';

export function LandingPage() {
  const navigate = (path: string) => {
    window.location.pathname = path;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-white">
      <div className="max-w-4xl w-full text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-200 mx-auto mb-8">
          <GraduationCap className="text-white w-10 h-10" />
        </div>
        <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">Panel Docente</h1>
        <p className="text-xl text-slate-500 font-medium tracking-tight">Elige cómo deseas ingresar al sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Profesor */}
        <button 
          onClick={() => navigate('/login')}
          className="group text-left bg-white p-10 rounded-[3rem] border-2 border-slate-100 hover:border-blue-500 transition-all duration-500 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-100 hover:-translate-y-2"
        >
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">Soy profesor</h3>
          <p className="text-slate-500 font-medium mb-8 leading-relaxed">
            Gestionar grupos, alumnos, rúbricas y reportes de desempeño académico.
          </p>
          <div className="flex items-center gap-2 text-blue-600 font-black uppercase tracking-widest text-xs">
            Ingresar ahora <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Alumno */}
        <button 
          onClick={() => navigate('/alumno')}
          className="group text-left bg-white p-10 rounded-[3rem] border-2 border-slate-100 hover:border-green-500 transition-all duration-500 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-green-100 hover:-translate-y-2"
        >
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors duration-500">
            <UserCheck className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-green-600 transition-colors">Soy alumno</h3>
          <p className="text-slate-500 font-medium mb-8 leading-relaxed">
            Consultar tus calificaciones finales, porcentajes de asistencia y materiales de clase.
          </p>
          <div className="flex items-center gap-2 text-green-600 font-black uppercase tracking-widest text-xs">
            Consultar mis notas <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      <div className="mt-16 text-slate-400 font-bold text-xs uppercase tracking-widest text-center">
        © 2026 Panel Docente • Sistema de Gestión Académica
      </div>
    </div>
  );
}
