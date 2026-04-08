import { PlantEntry } from '../types';

declare const JSZip: any;
declare const saveAs: any;

const escapeCSV = (val: any): string => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const SPREADSHEET_HEADERS = [
  'ID',
  'Tanggal',
  'Lokasi',
  'Pekerjaan',
  'Tinggi',
  'Koordinat',
  'Y',
  'X',
  'Tanaman',
  'Tahun Tanam',
  'Pengawas',
  'Vendor',
  'Link Drive',
  'No Pohon',
  'Kesehatan',
  'poop',
  'Status_Duplikat',
  'Eco_BiomassaKg',
  'Eco_KarbonKgC',
  'Koordinat_Asli',
  'Koordinat_Revisi',
  'AI_Kesehatan',
  'AI_Confidence',
  'AI_Deskripsi',
  'HCV_Input',
  'Eco_UpdatedAt',
  'Path',
  'Gambar',
  'Tim',
  'Gambar_Nama_File',
  'FileID',
  'HCV_Deskripsi',
  'Description',
  'GPS_Quality',
  'GPS_Accuracy_M',
  'Status_Verifikasi',
  'Eco_JarakTerdekatM',
  'Eco_KepadatanHa',
  'Eco_CCI',
  'Eco_JarakRata2M',
  'Eco_AreaHa',
  'Eco_SesuaiJarak',
  'Eco_CCI_Grade',
  'Eco_JarakStdM',
  'Eco_KesesuaianJarakPct',
  'Eco_GpsMedianM',
] as const;

const formatCoordinateValue = (value: number | undefined): string => {
  if (!Number.isFinite(value)) return '';
  return String(value).replace('.', ',');
};

const formatFixedNumber = (value: number | undefined, digits: number): string => {
  if (!Number.isFinite(value)) return '';
  return Number(value).toFixed(digits);
};

const buildDriveFileName = (entry: PlantEntry): string => `Gambar Montana (${entry.id}).jpg`;
const buildDrivePath = (entry: PlantEntry): string => `Montana V2_Images/${buildDriveFileName(entry)}`;

const extractDriveFileId = (linkDrive: string | undefined): string => {
  const value = String(linkDrive || '').trim();
  if (!value) return '';
  const patterns = [/\/d\/([^/]+)/i, /[?&]id=([^&]+)/i];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }
  return '';
};

const buildPoopHtml = (linkDrive: string | undefined): string => {
  const value = String(linkDrive || '').trim();
  if (!value) return '';
  return `<a href="${value}" target="_blank" rel="noopener noreferrer">Buka Foto</a>`;
};

const toSpreadsheetRow = (entry: PlantEntry): string[] => {
  const linkDrive = String(entry.linkDrive || '').trim();
  const drivePath = buildDrivePath(entry);
  const driveFileName = buildDriveFileName(entry);
  const driveFileId = extractDriveFileId(linkDrive);
  const poopHtml = buildPoopHtml(linkDrive);
  const koordinat = String(entry.rawKoordinat || entry.koordinat || '').trim();

  return [
    entry.id,
    entry.tanggal || new Date(entry.timestamp).toLocaleString('id-ID'),
    entry.lokasi,
    entry.pekerjaan,
    entry.tinggi,
    koordinat,
    formatCoordinateValue(entry.y),
    formatCoordinateValue(entry.x),
    entry.tanaman,
    entry.tahunTanam,
    entry.pengawas,
    entry.vendor,
    linkDrive,
    entry.noPohon,
    entry.kesehatan,
    poopHtml,
    entry.statusDuplikat || 'UNIK',
    '', // Eco_BiomassaKg
    '', // Eco_KarbonKgC
    koordinat, // Koordinat_Asli
    '', // Koordinat_Revisi
    '', // AI_Kesehatan
    '', // AI_Confidence
    '', // AI_Deskripsi
    '', // HCV_Input
    '', // Eco_UpdatedAt
    drivePath,
    drivePath,
    entry.tim,
    driveFileName,
    driveFileId,
    '', // HCV_Deskripsi
    entry.description || '',
    entry.gpsQualityAtCapture || '',
    formatFixedNumber(entry.gpsAccuracyAtCapture, 1),
    entry.statusVerifikasi || '',
    '', // Eco_JarakTerdekatM
    '', // Eco_KepadatanHa
    '', // Eco_CCI
    '', // Eco_JarakRata2M
    '', // Eco_AreaHa
    '', // Eco_SesuaiJarak
    '', // Eco_CCI_Grade
    '', // Eco_JarakStdM
    '', // Eco_KesesuaianJarakPct
    '', // Eco_GpsMedianM
  ].map(escapeCSV);
};

export const getSpreadsheetBackupFileName = (date: Date = new Date()): string => {
  const timestamp = date.toISOString().slice(0, 19).replace(/[T:]/g, '-');
  return `backup_offline_spreadsheet_${timestamp}.csv`;
};

export const exportSpreadsheetBackup = async (entries: PlantEntry[]): Promise<{ fileName: string; total: number }> => {
  const fileName = getSpreadsheetBackupFileName();
  const rows = entries.map(toSpreadsheetRow);
  const csvContent = ['\uFEFF' + SPREADSHEET_HEADERS.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, fileName);
  return { fileName, total: entries.length };
};

const getBase64Payload = (dataUrl: string): string => {
  if (!dataUrl) return '';
  const commaIndex = dataUrl.indexOf(',');
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
};

export const exportToZIP = async (entries: PlantEntry[]) => {
  const zip = new JSZip();
  const imagesFolder = zip.folder('images');
  if (!imagesFolder) return;

  const exportableEntries = entries.filter((e) => Boolean(e.foto));
  for (const entry of exportableEntries) {
    const base64Data = getBase64Payload(entry.foto);
    if (base64Data) {
      imagesFolder.file(`Gambar Montana (${entry.id}).jpg`, base64Data, { base64: true, compression: 'STORE' });
    }
  }

  const headers = ['ID', 'Timestamp', 'Tinggi (cm)', 'Jenis', 'Kesehatan', 'Lokasi', 'Tahun Tanam', 'Image File'];
  const rows = entries.map(e => [e.id, e.timestamp, e.tinggi, e.tanaman, e.kesehatan, e.lokasi, e.tahunTanam, `images/Gambar Montana (${e.id}).jpg`].map(escapeCSV));
  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  zip.file('data_monitoring.csv', csvContent);

  const content = await zip.generateAsync({ type: 'blob', streamFiles: true, compression: 'STORE' });
  saveAs(content, 'monitoring_offline_export.zip');
};
