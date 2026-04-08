import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CameraView } from './components/CameraView';
import { BottomSheet } from './components/BottomSheet';
import { useLocalStorage } from './hooks/useLocalStorage';
import { writeExifData } from './services/exifService';
import { exportSpreadsheetBackup, exportToZIP } from './services/exportService';
import { watchGpsLocation } from './services/gpsService';
import { saveEntry, getAllEntries, getEntryCount, getRecentEntriesPreview, clearAllEntries } from './services/dbService';
import { Toast } from './components/Toast';
import { PlantEntry, GpsLocation, ToastState, FormState, DEFAULT_PLANT_TYPES } from './types';

const MAX_ACTIVE_ENTRIES = 60;
const BRAND_NAME = 'Montana Camera Offline';

const normalizePlantType = (value: string): string => value.trim().replace(/\s+/g, ' ');

const mergePlantTypes = (...groups: Array<readonly string[] | string[] | undefined>): string[] => {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const group of groups) {
    if (!group) continue;
    for (const pt of group) {
      const n = normalizePlantType(pt);
      if (!n) continue;
      const key = n.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(n);
    }
  }
  return merged;
};

const classifyGpsQuality = (gps: GpsLocation | null): 'Tinggi' | 'Sedang' | 'Rendah' | 'Tidak Tersedia' => {
  if (!gps || !Number.isFinite(gps.accuracy)) return 'Tidak Tersedia';
  if (gps.accuracy < 5) return 'Tinggi';
  if (gps.accuracy <= 10) return 'Sedang';
  return 'Rendah';
};

const App: React.FC = () => {
  const [entries, setEntries] = useState<PlantEntry[]>([]);
  const [isBottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [totalEntriesCount, setTotalEntriesCount] = useState(0);

  const [formState, setFormState] = useLocalStorage<FormState>('offlineFormState', {
    tinggi: 30,
    tahunTanam: new Date().getFullYear(),
    jenis: 'Sengon',
    pekerjaan: '',
    pengawas: '',
    vendor: '',
    tim: '',
    kesehatan: 'Sehat',
  });
  const [plantTypes, setPlantTypes] = useLocalStorage<string[]>('offlinePlantTypes', [...DEFAULT_PLANT_TYPES]);
  const [gps, setGps] = useState<GpsLocation | null>(null);
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const backupInProgressRef = useRef(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  const refreshEntries = useCallback(async () => {
    try {
      const [recent, count] = await Promise.all([getRecentEntriesPreview(MAX_ACTIVE_ENTRIES), getEntryCount()]);
      setEntries(recent);
      setTotalEntriesCount(count);
    } catch (err) {
      console.error('Gagal memuat database:', err);
    }
  }, []);

  useEffect(() => { void refreshEntries(); }, [refreshEntries]);

  // GPS watch
  useEffect(() => {
    const watchId = watchGpsLocation(
      (loc) => setGps(loc),
      (err) => console.warn('GPS Error:', err.message),
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const registerPlantType = useCallback((value: string) => {
    const normalized = normalizePlantType(value);
    if (!normalized) return;
    setFormState(prev => prev.jenis === normalized ? prev : { ...prev, jenis: normalized });
    setPlantTypes(prev => {
      const merged = mergePlantTypes(DEFAULT_PLANT_TYPES, prev, [normalized]);
      return merged.length === prev.length && merged.every((v, i) => v === prev[i]) ? prev : merged;
    });
  }, [setFormState, setPlantTypes]);

  const handleCapture = useCallback(async (dataUrl: string, thumbnailDataUrl?: string) => {
    const now = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    const id = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`;
    const koordinat = gps ? `${gps.lat.toFixed(6)},${gps.lon.toFixed(6)}` : '';

    const entry: PlantEntry = {
      mode: 'manual',
      id,
      tanggal: now.toLocaleDateString('id-ID'),
      timestamp: now.toISOString(),
      gps: gps || undefined,
      lokasi: koordinat,
      pekerjaan: formState.pekerjaan,
      tinggi: formState.tinggi,
      koordinat,
      y: gps?.lon || 0,
      x: gps?.lat || 0,
      tanaman: formState.jenis,
      tahunTanam: formState.tahunTanam,
      pengawas: formState.pengawas,
      vendor: formState.vendor,
      tim: formState.tim,
      kesehatan: formState.kesehatan,
      gpsQualityAtCapture: classifyGpsQuality(gps),
      gpsAccuracyAtCapture: gps?.accuracy,
      rawKoordinat: koordinat,
      thumbnail: thumbnailDataUrl,
      foto: '',
      uploaded: false,
      noPohon: totalEntriesCount + 1,
    };

    try {
      const exifDataUrl = await writeExifData(dataUrl, entry);
      entry.foto = exifDataUrl;
    } catch {
      entry.foto = dataUrl;
    }

    // Auto-download foto
    try {
      const link = document.createElement('a');
      link.href = entry.foto;
      link.download = `Gambar Montana (${entry.id}).jpg`;
      link.click();
    } catch {}

    try {
      await saveEntry(entry);
      await refreshEntries();
      showToast(`Pohon #${entry.noPohon} tersimpan + foto didownload.`, 'success');
    } catch (err) {
      console.error('Gagal menyimpan:', err);
      showToast('Gagal menyimpan data.', 'error');
    }
  }, [formState, gps, totalEntriesCount, refreshEntries, showToast]);

  const handleBackupNow = useCallback(async () => {
    if (backupInProgressRef.current) return;
    backupInProgressRef.current = true;
    setIsBackupRunning(true);
    try {
      const allEntries = await getAllEntries();
      if (allEntries.length === 0) { showToast('Belum ada data untuk dibackup.', 'info'); return; }
      const result = await exportSpreadsheetBackup(allEntries);
      showToast(`Backup CSV berhasil (${result.total} entri).`, 'success');
    } catch (err) {
      showToast('Backup gagal.', 'error');
    } finally {
      backupInProgressRef.current = false;
      setIsBackupRunning(false);
    }
  }, [showToast]);

  const handleExportZip = useCallback(async () => {
    try {
      const allEntries = await getAllEntries();
      if (allEntries.length === 0) { showToast('Belum ada data untuk diexport.', 'info'); return; }
      showToast('Membuat ZIP...', 'info');
      await exportToZIP(allEntries);
      showToast('Export ZIP berhasil.', 'success');
    } catch {
      showToast('Export ZIP gagal.', 'error');
    }
  }, [showToast]);

  const handleClearData = useCallback(async () => {
    if (!confirm('HAPUS SEMUA DATA? Tindakan ini tidak bisa dibatalkan.')) return;
    try {
      await clearAllEntries();
      await refreshEntries();
      showToast('Semua data berhasil dihapus.', 'success');
    } catch {
      showToast('Gagal menghapus data.', 'error');
    }
  }, [refreshEntries, showToast]);

  const availablePlantTypes = mergePlantTypes(DEFAULT_PLANT_TYPES, plantTypes);

  return (
    <>
      <CameraView
        onCapture={handleCapture}
        formState={formState}
        onFormStateChange={setFormState}
        plantTypes={availablePlantTypes}
        entriesCount={totalEntriesCount}
        gps={gps}
        onShowSheet={() => setBottomSheetOpen(true)}
        showToast={showToast}
        onBackupNow={handleBackupNow}
        isBackupRunning={isBackupRunning}
      />
      <BottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        entries={entries}
        totalEntriesCount={totalEntriesCount}
        formState={formState}
        onFormStateChange={setFormState}
        plantTypes={availablePlantTypes}
        onRegisterPlantType={registerPlantType}
        onClearData={handleClearData}
        onBackupNow={handleBackupNow}
        isBackupRunning={isBackupRunning}
        onExportZip={handleExportZip}
      />
      {toast && <Toast toast={toast} />}
    </>
  );
};

export default App;
