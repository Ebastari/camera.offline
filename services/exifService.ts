import { PlantEntry } from '../types';

const ensurePiexif = async () => {
  const PIEXIF_URL = 'https://cdn.jsdelivr.net/npm/piexifjs@1.0.4/piexif.js';
  if (typeof (window as any).piexif !== 'undefined') return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PIEXIF_URL}"]`);
    if (existing) { resolve(); return; }
    const script = document.createElement('script');
    script.src = PIEXIF_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load piexifjs'));
    document.head.appendChild(script);
  });

  let retries = 0;
  while (typeof (window as any).piexif === 'undefined' && retries < 10) {
    await new Promise(r => setTimeout(r, 50));
    retries++;
  }
};

const degToExifDMS = (deg: number): [[number, number], [number, number], [number, number]] => {
  const absolute = Math.abs(deg);
  const d = Math.floor(absolute);
  const m = Math.floor((absolute - d) * 60);
  const s = Math.round((absolute - d - m / 60) * 3600 * 1000000);
  return [[d, 1], [m, 1], [s, 1000000]];
};

export const writeExifData = async (dataUrl: string, entryData: Omit<PlantEntry, 'foto'>): Promise<string> => {
  try {
    await ensurePiexif();
    const piexif = (window as any).piexif;
    if (!piexif) return dataUrl;

    const { id, tinggi, tanaman, gps, timestamp, kesehatan } = entryData;
    const dt = new Date(timestamp);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const exifDate = `${dt.getFullYear()}:${pad(dt.getMonth() + 1)}:${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;

    const zerothIfd: Record<number, any> = {
      [piexif.ImageIFD.Make]: 'Montana Camera Offline',
      [piexif.ImageIFD.Model]: 'Montana Offline v1',
      [piexif.ImageIFD.Software]: 'Montana Camera Offline',
      [piexif.ImageIFD.ImageDescription]: `${tanaman} | ${tinggi}cm | ${kesehatan} | ID:${id}`,
    };

    const exifIfd: Record<number, any> = {
      [piexif.ExifIFD.DateTimeOriginal]: exifDate,
      [piexif.ExifIFD.DateTimeDigitized]: exifDate,
    };

    const gpsIfd: Record<number, any> = {};
    if (gps) {
      gpsIfd[piexif.GPSIFD.GPSLatitudeRef] = gps.lat >= 0 ? 'N' : 'S';
      gpsIfd[piexif.GPSIFD.GPSLatitude] = degToExifDMS(gps.lat);
      gpsIfd[piexif.GPSIFD.GPSLongitudeRef] = gps.lon >= 0 ? 'E' : 'W';
      gpsIfd[piexif.GPSIFD.GPSLongitude] = degToExifDMS(gps.lon);
    }

    const exifObj = { '0th': zerothIfd, Exif: exifIfd, GPS: gpsIfd };
    const exifBytes = piexif.dump(exifObj);
    return piexif.insert(exifBytes, dataUrl);
  } catch (err) {
    console.warn('[EXIF] Gagal menulis EXIF:', err);
    return dataUrl;
  }
};
