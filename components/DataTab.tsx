import React, { useState, useMemo } from 'react';
import { PlantEntry } from '../types';

interface DataTabProps {
  entries: PlantEntry[];
  totalEntriesCount: number;
}

const ITEMS_PER_PAGE = 10;

export const DataTab: React.FC<DataTabProps> = ({ entries, totalEntriesCount }) => {
  const [currentPage, setCurrentPage] = useState(1);

  const getPreviewSrc = (entry: PlantEntry): string => entry.thumbnail || entry.foto;

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [entries]);

  const latestEntry = sortedEntries[0];

  const paginatedEntries = useMemo(() => {
    return sortedEntries.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [sortedEntries, currentPage]);

  const totalPages = Math.ceil(entries.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-12">
      <div className="flex justify-between items-end px-2">
        <div className="flex flex-col gap-1">
          <h3 className="font-black text-lg text-slate-800 leading-none">Penyimpanan Offline</h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{totalEntriesCount} Entri Tersimpan</span>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="py-24 text-center space-y-4">
          <div className="w-24 h-24 bg-slate-50 rounded-[3rem] flex items-center justify-center text-4xl mx-auto shadow-inner grayscale opacity-40">📸</div>
          <p className="text-slate-800 text-sm font-black uppercase tracking-widest">Belum Ada Data</p>
        </div>
      ) : (
        <>
          <div className="px-1">
            <div className="bg-white p-2 rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
              <div className="relative aspect-[4/3] w-full rounded-[2.5rem] overflow-hidden bg-slate-100">
                <img src={getPreviewSrc(latestEntry)} className="w-full h-full object-cover" alt="Terakhir" />
                <div className="absolute top-5 left-5">
                  <div className="px-4 py-2 rounded-2xl backdrop-blur-xl border bg-amber-500/80 border-amber-400/50 shadow-2xl">
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Offline</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {totalEntriesCount > entries.length && (
            <p className="px-3 text-[9px] font-bold text-slate-500">Menampilkan {entries.length} entri terbaru.</p>
          )}

          <div className="space-y-4 pt-4">
            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] px-3">Riwayat Pengamatan</h4>
            <div className="space-y-3 px-1">
              {paginatedEntries.map(entry => (
                <div key={entry.id} className="bg-white p-4 rounded-[2rem] border border-slate-100 flex gap-4 items-center active:scale-[0.98] transition-all">
                  <div className="relative h-16 w-16 rounded-[1.25rem] overflow-hidden flex-shrink-0 bg-slate-50 border border-slate-50">
                    <img src={getPreviewSrc(entry)} className="h-full w-full object-cover" loading="lazy" alt="thumbnail" />
                    <div className={`absolute inset-x-0 bottom-0 h-1 ${entry.kesehatan === 'Sehat' ? 'bg-green-500' : entry.kesehatan === 'Mati' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm text-slate-800">Pohon #{entry.noPohon}</p>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">{entry.tanaman} • {entry.tinggi} cm</span>
                    <div className="mt-1">
                      <span className={`text-[8px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        entry.gpsQualityAtCapture === 'Tinggi' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        entry.gpsQualityAtCapture === 'Sedang' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        entry.gpsQualityAtCapture === 'Rendah' ? 'bg-red-50 text-red-700 border border-red-100' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        GPS: {entry.gpsQualityAtCapture || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="text-[16px]">💾</div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-8 px-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 disabled:opacity-20">←</button>
                <div className="flex gap-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${currentPage === i + 1 ? 'w-8 bg-blue-600' : 'w-1.5 bg-slate-200'}`} />
                  ))}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-blue-600 disabled:opacity-20">→</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
