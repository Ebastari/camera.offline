export interface GpsLocation {
  lat: number;
  lon: number;
  accuracy: number;
}

export type PlantHealthLabel = 'Sehat' | 'Merana' | 'Mati';

export const DEFAULT_PLANT_TYPES = ['Sengon', 'Nangka', 'Mahoni', 'Malapari'] as const;

export interface PlantEntry {
  mode?: 'manual';
  id: string;
  tanggal: string;
  timestamp: string;
  gps?: GpsLocation;
  lokasi: string;
  pekerjaan: string;
  tinggi: number;
  koordinat: string;
  y: number;
  x: number;
  tanaman: string;
  tahunTanam: number;
  pengawas: string;
  vendor: string;
  tim: string;
  kesehatan: PlantHealthLabel;
  gpsQualityAtCapture?: 'Tinggi' | 'Sedang' | 'Rendah' | 'Tidak Tersedia';
  gpsAccuracyAtCapture?: number;
  rawKoordinat?: string;
  revisedKoordinat?: string;
  snappedToGrid?: boolean;
  thumbnail?: string;
  foto: string;
  uploaded?: boolean;
  noPohon: number;
  description?: string;
  linkDrive?: string;
  statusDuplikat?: string;
  statusVerifikasi?: string;
  aiKesehatan?: PlantHealthLabel;
  aiConfidence?: number;
  aiDeskripsi?: string;
  hcvInput?: number;
  hcvDescription?: string;
}

export interface FormState {
  tinggi: number;
  tahunTanam: number;
  jenis: string;
  pekerjaan: string;
  pengawas: string;
  vendor: string;
  tim: string;
  kesehatan: PlantHealthLabel;
}

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}
