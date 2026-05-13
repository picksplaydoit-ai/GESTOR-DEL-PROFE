import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function generateStudentPublicId(index: number): string {
  const year = new Date().getFullYear();
  const sequence = String(index).padStart(4, '0');
  return `ALU-${year}-${sequence}`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatGrade(grade: number): string {
  return grade.toFixed(1);
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'APROBADO': return 'text-green-600 bg-green-50 border-green-200';
    case 'REPROBADO': return 'text-red-600 bg-red-50 border-red-200';
    case 'SD': return 'text-amber-600 bg-amber-50 border-amber-200';
    default: return 'text-slate-600 bg-slate-50 border-slate-200';
  }
}
