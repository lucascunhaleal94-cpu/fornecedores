import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getDepartmentColor = (dept?: string) => {
  switch (dept) {
    case 'MARKETING': return 'bg-pink-100 text-pink-700 hover:bg-pink-200';
    case 'TÉCNICO': return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
    case 'COMERCIAL': return 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200';
    case 'FINANCEIRO': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200';
    case 'CONTÁBIL': return 'bg-teal-100 text-teal-700 hover:bg-teal-200';
    case 'JURÍDICO': return 'bg-purple-100 text-purple-700 hover:bg-purple-200';
    case 'COMPRAS': return 'bg-amber-100 text-amber-700 hover:bg-amber-200';
    case 'ALMOXARIFADO': return 'bg-stone-100 text-stone-700 hover:bg-stone-200';
    default: return 'bg-slate-100 text-slate-700 hover:bg-slate-200';
  }
};

export const parseLocalDate = (dateString?: string | Date): Date => {
  if (!dateString) return new Date();
  if (dateString instanceof Date) return dateString;
  const str = String(dateString);
  if (!str) return new Date();
  
  // Extract YYYY-MM-DD and append T12:00:00 to force local noon and avoid timezone edge cases
  const isoDateStr = str.substring(0, 10);
  return new Date(`${isoDateStr}T12:00:00`);
};
