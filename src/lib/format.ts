import type { Timestamp } from 'firebase/firestore';
import type { Entry } from './types';
import { DATE_CERTAINTY } from './defaults';

export function fmtDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function fmtRange(e: Pick<Entry, 'dateStart' | 'dateEnd'>): string {
  if (!e.dateStart) return 'Chưa xác định';
  if (!e.dateEnd || e.dateEnd === e.dateStart) return fmtDate(e.dateStart);
  return `${fmtDate(e.dateStart)} – ${fmtDate(e.dateEnd)}`;
}

export function fmtCertainty(e: Pick<Entry, 'dateCertainty' | 'dateNote'>): string {
  const base = DATE_CERTAINTY[e.dateCertainty] ?? '';
  return e.dateNote ? `${base} · ${e.dateNote}` : base;
}

export function fmtTs(ts: Timestamp | null | undefined, withTime = true): string {
  if (!ts || typeof ts.toDate !== 'function') return '—';
  const d = ts.toDate();
  const p = (n: number) => String(n).padStart(2, '0');
  const date = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  return withTime ? `${date} ${p(d.getHours())}:${p(d.getMinutes())}` : date;
}

export function fmtIso(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function fmtSize(b: number): string {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

export function fmtNum(n: number, digits = 0): string {
  return n.toLocaleString('vi-VN', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export const isImage = (ct: string) => /^image\/(jpeg|png|jpg)$/i.test(ct);
export const isVideo = (ct: string) => /^video\//i.test(ct);
export const isPdf = (ct: string) => ct === 'application/pdf';

export function fileLabel(name: string): string {
  return (name.split('.').pop() ?? '').toUpperCase().slice(0, 4) || 'TỆP';
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function sortEntries(list: Entry[]): Entry[] {
  return [...list].sort((a, b) => (a.dateStart || '9').localeCompare(b.dateStart || '9') || a.code.localeCompare(b.code));
}
