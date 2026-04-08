import React from 'react';
import { ToastState } from '../types';

export const Toast: React.FC<{ toast: ToastState }> = ({ toast }) => (
  <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] max-w-[90vw] px-5 py-3 rounded-2xl text-white text-xs font-bold shadow-2xl animate-in fade-in slide-in-from-top-3 duration-300 ${
    toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-slate-700'
  }`}>
    {toast.message}
  </div>
);
