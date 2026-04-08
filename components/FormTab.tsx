import React from 'react';
import { FormState } from '../types';

interface FormTabProps {
  formState: FormState;
  onFormStateChange: React.Dispatch<React.SetStateAction<FormState>>;
  plantTypes: string[];
  onRegisterPlantType: (value: string) => void;
}

const normalizePlantType = (value: string): string => value.trim().replace(/\s+/g, ' ');

export const FormTab: React.FC<FormTabProps> = ({ formState, onFormStateChange, plantTypes, onRegisterPlantType }) => {
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (e.target.type === 'number') {
      const parsed = Number(value);
      onFormStateChange(prev => ({
        ...prev,
        [name]: Number.isFinite(parsed) ? parsed : prev[name as keyof FormState],
      }));
      return;
    }
    onFormStateChange(prev => ({ ...prev, [name]: value }));
  };

  const normalizedPlantType = normalizePlantType(formState.jenis);
  const isCustomPlantType = normalizedPlantType.length > 0 && !plantTypes.some(t => t.toLocaleLowerCase() === normalizedPlantType.toLocaleLowerCase());

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      {/* Administrasi */}
      <div className="bg-slate-50 p-5 rounded-[2.5rem] border border-slate-100 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <span className="text-lg">👤</span>
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">Administrasi</h3>
            <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Auto-Saved Profile</p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { name: 'pekerjaan', label: 'Pekerjaan', placeholder: 'Detail Pekerjaan' },
            { name: 'pengawas', label: 'Pengawas', placeholder: 'Nama Pengawas' },
            { name: 'vendor', label: 'Vendor', placeholder: 'Nama Vendor' },
            { name: 'tim', label: 'Tim', placeholder: 'Tim Lapangan' },
          ].map(field => (
            <div key={field.name}>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{field.label}</label>
              <input
                type="text"
                name={field.name}
                value={(formState as any)[field.name]}
                onChange={handleFormChange}
                placeholder={field.placeholder}
                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Tanaman */}
      <div className="bg-slate-50 p-5 rounded-[2.5rem] border border-slate-100 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <span className="text-lg">🌿</span>
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">Data Tanaman</h3>
            <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Manual Input</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Jenis Tanaman</label>
            <input
              list="plant-types-list"
              name="jenis"
              value={formState.jenis}
              onChange={handleFormChange}
              onBlur={() => onRegisterPlantType(formState.jenis)}
              placeholder="Ketik atau pilih jenis"
              className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
            <datalist id="plant-types-list">
              {plantTypes.map(type => <option key={type} value={type} />)}
            </datalist>
            {isCustomPlantType && (
              <button
                type="button"
                onClick={() => onRegisterPlantType(formState.jenis)}
                className="mt-2 px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-95"
              >
                + Simpan "{normalizedPlantType}"
              </button>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tahun Tanam</label>
            <input
              type="number"
              name="tahunTanam"
              value={formState.tahunTanam}
              onChange={handleFormChange}
              className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tinggi (cm)</label>
            <input
              type="number"
              name="tinggi"
              value={formState.tinggi}
              onChange={handleFormChange}
              min={1}
              max={500}
              className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Kesehatan</label>
            <div className="grid grid-cols-3 gap-3">
              {(['Sehat', 'Merana', 'Mati'] as const).map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onFormStateChange(prev => ({ ...prev, kesehatan: status }))}
                  className={`py-3.5 rounded-2xl text-sm font-extrabold border-2 transition-all active:scale-95 ${
                    formState.kesehatan === status
                      ? status === 'Sehat' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200'
                        : status === 'Merana' ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200'
                        : 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-200'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
