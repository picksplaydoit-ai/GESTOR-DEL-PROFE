import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../../lib/supabase';
import { LogIn, UserPlus, Loader2, GraduationCap } from 'lucide-react';
import { cn } from '../../lib/utils';

const authSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  fullName: z.string().min(3, 'Nombre completo requerido').optional(),
});

type AuthFormData = z.infer<typeof authSchema>;

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  const onSubmit = async (data: AuthFormData) => {
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        });
        if (authError) throw authError;

        if (authData.user && data.fullName) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{ id: authData.user.id, full_name: data.fullName }]);
          if (profileError) throw profileError;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Panel Docente</h1>
          <p className="text-slate-500 mt-2 text-center text-sm">
            {isLogin ? 'Bienvenido de nuevo, profesor' : 'Crea tu cuenta de docente'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Nombre Completo</label>
              <input
                {...register('fullName')}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                placeholder="Juan Pérez"
              />
              {errors.fullName && <p className="text-xs text-red-500 ml-1">{errors.fullName.message}</p>}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Correo Electrónico</label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              placeholder="docente@escuela.com"
            />
            {errors.email && <p className="text-xs text-red-500 ml-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Contraseña</label>
            <input
              {...register('password')}
              type="password"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              placeholder="••••••••"
            />
            {errors.password && <p className="text-xs text-red-500 ml-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isLogin ? (
              <>
                <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                Entrar
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Registrarse
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
          >
            {isLogin ? '¿No tienes cuenta? Registrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
          
          <p className="text-[10px] text-slate-400 text-center leading-relaxed">
            Al registrarte aceptas los términos y condiciones de Panel Docente para la gestión de datos académicos.
          </p>
        </div>
      </div>
    </div>
  );
}
