import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { getCameraDevices, startCamera } from '../services/cameraService';
import { GpsLocation, FormState } from '../types';

interface CameraViewProps {
  onCapture: (dataUrl: string, thumbnailDataUrl?: string) => void;
  formState: FormState;
  onFormStateChange: React.Dispatch<React.SetStateAction<FormState>>;
  plantTypes: string[];
  entriesCount: number;
  gps: GpsLocation | null;
  onShowSheet: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onBackupNow: () => void;
  isBackupRunning: boolean;
}

const DAILY_TARGET = 50;
const BRAND_NAME = "PT ENERGI BATUBARA LESTARI";
const MAX_THUMBNAIL_SIZE = 320;
const HEIGHT_MIN_CM = 30;
const HEIGHT_MAX_CM = 500;

const SHUTTER_SOUND_BASE64 = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU92T18AZm9vYmFyYmF6cXV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4";

const IconPanel = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="10" width="7" height="11" rx="1.5" />
    <rect x="3" y="12" width="7" height="9" rx="1.5" />
  </svg>
);

const IconSwitchCamera = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="7" width="18" height="12" rx="2" />
    <path d="m8 7 1.5-2h5L16 7" />
    <path d="M9 12h6" />
    <path d="m13 10 2 2-2 2" />
    <path d="M15 14H9" />
    <path d="m11 16-2-2 2-2" />
  </svg>
);

const IconBackup = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v10" />
    <path d="m8.5 9.5 3.5 3.5 3.5-3.5" />
    <path d="M4 15.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" />
  </svg>
);

const IconWarning = () => (
  <svg viewBox="0 0 24 24" className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3 2.5 20h19L12 3Z" />
    <path d="M12 9v5" />
    <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const IconCamera = () => (
  <svg viewBox="0 0 24 24" className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 8h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
    <path d="m8 8 1.6-2h4.8L16 8" />
    <circle cx="12" cy="14" r="4" />
  </svg>
);

export const CameraView: React.FC<CameraViewProps> = ({
  onCapture,
  formState,
  onFormStateChange,
  plantTypes,
  entriesCount,
  gps,
  onShowSheet,
  showToast,
  onBackupNow,
  isBackupRunning,
}) => {
  const availablePlantTypes = plantTypes.length > 0 ? plantTypes : ['Sengon', 'Nangka', 'Mahoni', 'Malapari'];

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | undefined>(undefined);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [needsUserAction, setNeedsUserAction] = useState(false);
  const [showPlantTypePicker, setShowPlantTypePicker] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [localMode, setLocalMode] = useState<'offline' | 'fast' | 'lite'>('offline');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shutterSoundRef = useRef<HTMLAudioElement>(null);
  const cameraInitStartRef = useRef<number>(Date.now());

  const progressPercentage = useMemo(() => Math.min(100, (entriesCount / DAILY_TARGET) * 100), [entriesCount]);

  const stopCurrentStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const initializeCamera = useCallback(async (deviceId?: string) => {
    cameraInitStartRef.current = Date.now();
    setCameraLoading(true);
    setCameraError(null);
    setNeedsUserAction(false);

    // Stop existing stream first
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    try {
      const stream = await startCamera(deviceId);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
          setCameraLoading(false);
        } catch {
          setNeedsUserAction(true);
          setCameraLoading(false);
        }
        const currentTrack = stream.getVideoTracks()[0];
        if (currentTrack) {
          const settings = currentTrack.getSettings();
          setCurrentDeviceId(settings.deviceId);
        }
      }
    } catch (err: any) {
      setCameraError(err.name === 'NotAllowedError' ? 'Izin kamera ditolak' : 'Gagal memuat kamera');
      setCameraLoading(false);
    }
  }, []);

  // Startup: initialize camera once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const videoDevices = await getCameraDevices();
        if (cancelled) return;
        setDevices(videoDevices);
        const backCamera = videoDevices.find(d => /back|rear|environment/i.test(d.label));
        await initializeCamera(backCamera?.deviceId || videoDevices[0]?.deviceId);
      } catch {
        if (!cancelled) {
          setCameraError('Perangkat tidak didukung');
          setCameraLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      stopCurrentStream();
    };
  }, []);

  // Re-init on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!videoRef.current?.srcObject) {
          getCameraDevices().then(videoDevices => {
            setDevices(videoDevices);
            const backCamera = videoDevices.find(d => /back|rear|environment/i.test(d.label));
            initializeCamera(backCamera?.deviceId || videoDevices[0]?.deviceId);
          }).catch(() => {});
        }
      } else {
        stopCurrentStream();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!cameraLoading) return;
    const timer = window.setInterval(() => {
      if (Date.now() - cameraInitStartRef.current > 10000) {
        setCameraLoading(false);
        setNeedsUserAction(true);
        setCameraError('Kamera tidak merespons. Tekan Aktifkan Kamera.');
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cameraLoading]);

  const handleRetryPlay = async () => {
    // If there's no stream, re-initialize camera fully
    if (!videoRef.current?.srcObject || cameraError) {
      setCameraError(null);
      setCameraLoading(true);
      try {
        const videoDevices = await getCameraDevices();
        setDevices(videoDevices);
        const backCamera = videoDevices.find(d => /back|rear|environment/i.test(d.label));
        await initializeCamera(backCamera?.deviceId || videoDevices[0]?.deviceId);
      } catch {
        setCameraError('Gagal memuat kamera. Coba lagi.');
        setCameraLoading(false);
      }
      return;
    }
    // If stream exists but paused, just play
    if (videoRef.current) {
      try { await videoRef.current.play(); setNeedsUserAction(false); } catch { showToast('Gagal memulai video.', 'error'); }
    }
  };

  const handleSwitchCamera = useCallback(() => {
    if (devices.length < 2) { showToast('Hanya satu kamera terdeteksi.', 'info'); return; }
    const currentIndex = devices.findIndex(d => d.deviceId === currentDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];
    if (nextDevice) initializeCamera(nextDevice.deviceId);
  }, [devices, currentDeviceId, initializeCamera, showToast]);

  const handleCaptureClick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) {
      showToast('Tunggu kamera siap...', 'info');
      return;
    }

    if (navigator.vibrate) navigator.vibrate([50]);
    if (shutterSoundRef.current) { shutterSoundRef.current.currentTime = 0; shutterSoundRef.current.play().catch(() => {}); }

    const MAX_CAPTURE = 1920;
    const scale = Math.min(1, MAX_CAPTURE / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Watermark
    const margin = 20;
    const lh = Math.max(18, Math.round(canvas.height * 0.022));
    ctx.font = `bold ${lh}px sans-serif`;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = Math.max(2, Math.round(lh * 0.1));

    const tanggal = new Date().toLocaleString('id-ID');
    const koordinat = gps ? `${gps.lat.toFixed(6)},${gps.lon.toFixed(6)}` : 'GPS Searching...';

    const lines = [
      `Lokasi: ${koordinat}`,
      `Pohon: ${entriesCount + 1} | Jenis: ${formState.jenis}`,
      `Tinggi: ${formState.tinggi} cm | Status: ${formState.kesehatan}`,
      `Waktu: ${tanggal}`
    ];
    lines.forEach((t, i) => {
      const y = canvas.height - margin - (lines.length - 1 - i) * (lh + 8);
      ctx.strokeText(t, margin, y);
      ctx.fillText(t, margin, y);
    });

    const brandWidth = ctx.measureText(BRAND_NAME).width;
    ctx.strokeText(BRAND_NAME, canvas.width - margin - brandWidth, margin + lh);
    ctx.fillText(BRAND_NAME, canvas.width - margin - brandWidth, margin + lh);

    // Thumbnail
    const thumbnailCanvas = document.createElement('canvas');
    const thumbnailScale = Math.min(1, MAX_THUMBNAIL_SIZE / Math.max(canvas.width, canvas.height));
    thumbnailCanvas.width = Math.max(1, Math.round(canvas.width * thumbnailScale));
    thumbnailCanvas.height = Math.max(1, Math.round(canvas.height * thumbnailScale));
    const thumbnailContext = thumbnailCanvas.getContext('2d');
    let thumbnailDataUrl: string | undefined;
    if (thumbnailContext) {
      thumbnailContext.drawImage(canvas, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
      thumbnailDataUrl = thumbnailCanvas.toDataURL('image/jpeg', 0.6);
    }
    thumbnailCanvas.width = 0;
    thumbnailCanvas.height = 0;

    onCapture(canvas.toDataURL('image/jpeg', 0.85), thumbnailDataUrl);
  }, [onCapture, formState, gps, entriesCount, showToast]);

  return (
    <div className="relative w-screen h-[100dvh] min-h-[100dvh] bg-black overflow-hidden flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedData={() => { if (cameraLoading) setCameraLoading(false); }}
        onError={() => { setCameraLoading(false); setCameraError('Video stream gagal dimuat.'); }}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${cameraLoading ? 'opacity-0' : 'opacity-100'}`}
      />

      {(cameraError || needsUserAction) && (
        <div className="z-50 flex flex-col items-center gap-6 px-10 text-center animate-in fade-in duration-500">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 text-white">
            {cameraError ? <IconWarning /> : <IconCamera />}
          </div>
          <p className="text-white font-black text-sm uppercase tracking-widest">{cameraError || 'Kamera Siap'}</p>
          {(needsUserAction || cameraError) && (
            <button onClick={handleRetryPlay} className="px-8 py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-full shadow-2xl active:scale-95">
              Aktifkan Kamera
            </button>
          )}
        </div>
      )}

      {cameraLoading && !cameraError && (
        <div className="z-20 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin" />
          <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Initializing Lens...</span>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
      <audio ref={shutterSoundRef} src={SHUTTER_SOUND_BASE64} preload="auto" />

      {/* Top Panel */}
      <div className="absolute top-0 left-0 right-0 px-3 py-3 flex justify-between items-start z-30 pointer-events-none safe-top">
        <div className="pointer-events-auto" />

        <div className="flex flex-col items-end gap-2 pointer-events-auto max-w-[220px]">
          <div className="w-full bg-black/15 backdrop-blur-sm px-3 py-2 rounded-2xl border border-white/5 shadow-md">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[8px] font-black text-white/60 uppercase tracking-widest">Panel Kamera</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onBackupNow}
                  disabled={isBackupRunning}
                  className="h-6 px-2 rounded-lg bg-cyan-400/15 text-cyan-100 text-[8px] font-black border border-cyan-200/25 flex items-center justify-center gap-1 disabled:opacity-50"
                  title="Backup spreadsheet"
                >
                  <IconBackup />
                  <span>{isBackupRunning ? 'WAIT' : 'BACKUP'}</span>
                </button>
                <button
                  onClick={() => setShowPanel(p => !p)}
                  className="w-5 h-5 rounded-md bg-white/10 text-white/90 text-[10px] font-black border border-white/20 flex items-center justify-center"
                >
                  {showPanel ? '-' : '+'}
                </button>
              </div>
            </div>

            {!showPanel && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[9px] font-black text-white">{entriesCount}/{DAILY_TARGET}</span>
                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${gps && gps.accuracy <= 10 ? 'bg-emerald-400' : 'bg-red-500'}`} />
                  <span className="text-[7px] font-black text-white/80 uppercase">
                    {gps ? (gps.accuracy <= 10 ? 'Akurasi OK' : 'Akurasi Rendah') : 'GPS Searching'}
                  </span>
                </div>
              </div>
            )}

            {showPanel && (
              <>
                <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${progressPercentage}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase tracking-widest text-amber-300">FULL OFFLINE</span>
                  <span className="text-[8px] text-white/60 font-bold">{entriesCount} foto</span>
                </div>
                <p className="mt-1 text-[8px] text-white/75 font-bold truncate">
                  GPS {gps ? `${gps.lat.toFixed(6)}, ${gps.lon.toFixed(6)}` : '--'}
                </p>
                {gps && (
                  <p className="mt-0.5 text-[8px] text-white/55 font-bold">
                    Akurasi ±{gps.accuracy < 10 ? gps.accuracy.toFixed(1) : Math.round(gps.accuracy)}m
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {/* Plant Type Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPlantTypePicker(p => !p)}
                className={`backdrop-blur-sm px-2 py-1 rounded-lg border flex items-center gap-1.5 active:scale-95 ${
                  showPlantTypePicker ? 'bg-emerald-500/18 border-emerald-300/30' : 'bg-black/15 border-white/5'
                }`}
              >
                <svg className="w-3.5 h-3.5 text-emerald-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20c0-4.5 2.2-7.6 6.6-9.3 1.6-.6 2.4-2.4 1.9-4-2.7.1-5 .7-6.9 1.8A8.64 8.64 0 0 0 12 10.2 8.64 8.64 0 0 0 10.4 8.5c-1.9-1.1-4.2-1.7-6.9-1.8-.5 1.6.3 3.4 1.9 4C9.8 12.4 12 15.5 12 20Z" />
                </svg>
                <span className="text-[7px] font-black uppercase tracking-widest text-emerald-100">
                  {formState.jenis || 'Tanaman'}
                </span>
              </button>

              {showPlantTypePicker && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[220px] rounded-2xl bg-black/85 backdrop-blur-xl border border-white/10 shadow-2xl p-2.5">
                  <div className="px-1 pb-2 flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-white/70 uppercase tracking-[0.16em]">Jenis Tanaman</span>
                    <button onClick={() => setShowPlantTypePicker(false)} className="w-6 h-6 rounded-full bg-white/10 text-white/80 text-xs flex items-center justify-center">×</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {availablePlantTypes.map(type => (
                      <button
                        key={type}
                        onClick={() => { onFormStateChange(prev => ({ ...prev, jenis: type })); setShowPlantTypePicker(false); }}
                        className={`min-h-[46px] rounded-xl px-3 text-[13px] font-extrabold border transition-all active:scale-[0.98] ${
                          formState.jenis === type
                            ? 'bg-white border-emerald-300 text-emerald-700 shadow-lg'
                            : 'bg-white/8 border-white/15 text-white hover:bg-white/14'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* GPS Status */}
            {!gps && (
              <div className="bg-red-500/10 backdrop-blur-sm px-2 py-1 rounded-lg border border-red-500/15 flex items-center gap-2 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-[7px] font-black text-red-200 uppercase tracking-widest">GPS SEARCHING</span>
              </div>
            )}
            {gps && Number.isFinite(gps.accuracy) && (
              <div className={`backdrop-blur-sm px-2 py-1 rounded-lg border flex items-center gap-1.5 ${
                gps.accuracy < 5 ? 'bg-emerald-500/10 border-emerald-500/15' : gps.accuracy <= 10 ? 'bg-amber-500/10 border-amber-500/15' : 'bg-red-500/10 border-red-500/15'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${gps.accuracy < 5 ? 'bg-emerald-400' : gps.accuracy <= 10 ? 'bg-amber-400' : 'bg-red-400'}`} />
                <span className={`text-[7px] font-black uppercase tracking-widest ${gps.accuracy < 5 ? 'text-emerald-200' : gps.accuracy <= 10 ? 'text-amber-200' : 'text-red-200'}`}>
                  GPS ±{gps.accuracy < 10 ? gps.accuracy.toFixed(1) : Math.round(gps.accuracy)}m
                </span>
              </div>
            )}

            {/* Height Display */}
            <div className="backdrop-blur-sm px-2 py-1 rounded-lg border bg-emerald-500/10 border-emerald-500/15 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[7px] font-black uppercase tracking-widest text-emerald-200">±{formState.tinggi}cm</span>
            </div>

            {/* Kesehatan Display */}
            <div className={`backdrop-blur-sm px-2 py-1 rounded-lg border flex items-center gap-1.5 ${
              formState.kesehatan === 'Sehat' ? 'bg-emerald-500/10 border-emerald-500/15' :
              formState.kesehatan === 'Merana' ? 'bg-amber-500/10 border-amber-500/15' : 'bg-red-500/10 border-red-500/15'
            }`}>
              <span className={`text-[7px] font-black uppercase tracking-widest ${
                formState.kesehatan === 'Sehat' ? 'text-emerald-200' : formState.kesehatan === 'Merana' ? 'text-amber-200' : 'text-red-200'
              }`}>
                {formState.kesehatan}
              </span>
            </div>

            {/* Mode Toggle: Offline → Fast → Lite → (redirect back) */}
            <button
              type="button"
              onClick={() => {
                const current = localMode;
                if (current === 'offline') {
                  setLocalMode('fast');
                } else if (current === 'fast') {
                  setLocalMode('lite');
                } else {
                  // lite → buka link fast/lite dan reset
                  window.open('https://camera.montana-tech.info/', '_blank');
                  setLocalMode('offline');
                }
              }}
              className={`backdrop-blur-sm px-2 py-1 rounded-lg border flex items-center gap-1.5 active:scale-95 transition-all ${
                localMode === 'offline'
                  ? 'bg-orange-500/10 border-orange-400/20'
                  : localMode === 'fast'
                    ? 'bg-sky-500/10 border-sky-400/20'
                    : 'bg-amber-500/10 border-amber-400/20'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${
                localMode === 'offline' ? 'bg-orange-400 shadow-[0_0_4px_rgba(251,146,60,0.6)]'
                  : localMode === 'fast' ? 'bg-sky-300'
                  : 'bg-amber-300'
              }`} />
              <span className={`text-[7px] font-black uppercase tracking-widest ${
                localMode === 'offline' ? 'text-orange-200'
                  : localMode === 'fast' ? 'text-sky-100'
                  : 'text-amber-200'
              }`}>
                {localMode === 'offline' ? 'Offline' : localMode === 'fast' ? 'Sync Fast' : 'Sync Lite'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-40 safe-bottom">
        <div className="mx-3 mb-3 space-y-3">
          {/* Height Slider */}
          <div className="mx-auto w-full max-w-[560px] bg-black/14 backdrop-blur-md rounded-[1.1rem] border border-white/5 p-2 flex flex-col gap-2 shadow-lg">
            <div className="flex justify-between items-center px-1.5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[9px] font-black text-white uppercase tracking-wider">Manual</span>
              </div>
              <span className="text-[10px] font-black text-white bg-emerald-500/65 px-2.5 py-1 rounded-xl border border-emerald-300/20">
                {formState.tinggi} cm
              </span>
            </div>
            <div className="px-1.5 py-1.5">
              <input
                type="range" min={HEIGHT_MIN_CM} max={HEIGHT_MAX_CM} value={formState.tinggi}
                onChange={e => onFormStateChange(prev => ({ ...prev, tinggi: parseInt(e.target.value) }))}
                className="w-full h-3.5 bg-emerald-600/20 rounded-full appearance-none cursor-pointer outline-none
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                  [&::-webkit-slider-thumb]:shadow-[0_0_16px_rgba(255,255,255,0.7),0_0_8px_rgba(0,0,0,0.18)]
                  [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-emerald-500
                  [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-emerald-500
                  [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white"
              />
              {/* Kesehatan Quick Toggle */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(['Sehat', 'Merana', 'Mati'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => onFormStateChange(prev => ({ ...prev, kesehatan: status }))}
                    className={`py-2 rounded-xl border text-[8px] font-black uppercase tracking-wide transition-all active:scale-95 ${
                      formState.kesehatan === status
                        ? status === 'Sehat' ? 'bg-emerald-500/30 border-emerald-300/40 text-emerald-100'
                          : status === 'Merana' ? 'bg-amber-500/30 border-amber-300/40 text-amber-100'
                          : 'bg-red-500/30 border-red-300/40 text-red-100'
                        : 'bg-black/20 border-white/10 text-white/70'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center px-2 pt-1">
            <button
              onClick={onShowSheet}
              className="w-14 h-14 rounded-full bg-black/15 backdrop-blur-sm border border-white/5 text-white/70 flex items-center justify-center shadow-lg active:scale-90"
            >
              <IconPanel />
            </button>

            <button
              onClick={handleCaptureClick}
              disabled={cameraLoading || !!cameraError || needsUserAction}
              className="group relative w-24 h-24 flex items-center justify-center active:scale-95 transition-all disabled:opacity-20"
            >
              <div className="absolute inset-0 rounded-full border-[6px] border-white scale-110 group-active:scale-100 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)]" />
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl ring-4 ring-black/5">
                <div className="w-12 h-12 rounded-full border border-black/5" />
              </div>
            </button>

            <button
              onClick={handleSwitchCamera}
              className="w-14 h-14 rounded-full bg-black/15 backdrop-blur-sm border border-white/5 text-white/70 flex items-center justify-center shadow-lg active:scale-90"
            >
              <IconSwitchCamera />
            </button>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />
    </div>
  );
};
