import React, { useState } from 'react';
import { PlantEntry, FormState } from '../types';
import { FormTab } from './FormTab';
import { DataTab } from './DataTab';

const IconInput = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 20h16" /><path d="M5 16.5V6.8a2 2 0 0 1 .6-1.4l2-2a2 2 0 0 1 1.4-.6h9a2 2 0 0 1 2 2v11.7" /><path d="M8 8h8M8 12h8" />
  </svg>
);

const IconHistory = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v4h4" /><path d="M12 7v6l4 2" />
  </svg>
);

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  entries: PlantEntry[];
  totalEntriesCount: number;
  formState: FormState;
  onFormStateChange: React.Dispatch<React.SetStateAction<FormState>>;
  plantTypes: string[];
  onRegisterPlantType: (value: string) => void;
  onClearData: () => void;
  onBackupNow: () => void;
  isBackupRunning: boolean;
  onExportZip: () => void;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  entries,
  totalEntriesCount,
  formState,
  onFormStateChange,
  plantTypes,
  onRegisterPlantType,
  onClearData,
  onBackupNow,
  isBackupRunning,
  onExportZip,
}) => {
  const [activeTab, setActiveTab] = useState('form');

  return (
    <div
      className={`fixed inset-0 z-40 transition-all duration-500 ease-in-out ${isOpen ? 'bg-black/70 backdrop-blur-sm opacity-100' : 'bg-transparent opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div
        className={`absolute bottom-0 left-0 right-0 h-[94vh] bg-white rounded-t-[50px] shadow-[0_-30px_60px_-15px_rgba(0,0,0,0.5)] transition-transform duration-500 flex flex-col ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="w-full py-5 flex items-center justify-center flex-shrink-0 group focus:outline-none">
          <div className="h-1.5 w-14 bg-slate-200 rounded-full group-hover:bg-slate-300 transition-all" />
        </button>

        <div className="px-6 pb-6">
          <nav className="flex items-center bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200 shadow-inner">
            {[
              { id: 'form', label: 'Input', icon: <IconInput /> },
              { id: 'data', label: 'Histori', icon: <IconHistory /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                  activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">{tab.icon}<span>{tab.label}</span></span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-6">
          {activeTab === 'form' && (
            <FormTab
              formState={formState}
              onFormStateChange={onFormStateChange}
              plantTypes={plantTypes}
              onRegisterPlantType={onRegisterPlantType}
            />
          )}
          {activeTab === 'data' && (
            <>
              <DataTab entries={entries} totalEntriesCount={totalEntriesCount} />

              {/* Export & Danger Zone */}
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] px-1">Export & Backup</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={onBackupNow}
                    disabled={isBackupRunning}
                    className="py-4 rounded-2xl bg-cyan-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-cyan-200 active:scale-95 disabled:opacity-50"
                  >
                    {isBackupRunning ? 'EXPORTING...' : 'CSV BACKUP'}
                  </button>
                  <button
                    onClick={onExportZip}
                    className="py-4 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200 active:scale-95"
                  >
                    ZIP + FOTO
                  </button>
                </div>

                <button
                  onClick={onClearData}
                  className="w-full py-4 rounded-2xl bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest border-2 border-red-100 active:scale-95 mt-4"
                >
                  HAPUS SEMUA DATA
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
