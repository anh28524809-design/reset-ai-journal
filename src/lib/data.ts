import { useEffect, useState } from 'react';
import {
  arrayRemove, arrayUnion, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query,
  runTransaction, serverTimestamp, setDoc, updateDoc, where, writeBatch,
  type DocumentReference, type Query, type Timestamp,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref as sref, uploadBytesResumable } from 'firebase/storage';
import { db, firebaseReady, storage } from './firebase';
import type { Me } from './auth';
import { DEFAULT_PROJECT, DEFAULT_STAGES } from './defaults';
import type {
  DossierItem, Entry, EntryEditable, Evidence, HistoryItem, ProjectInfo, PublicStats,
  ResultItem, Role, RoleDoc, Stage, StoredFile,
} from './types';

/* ------------------------------------------------------------------ */
/* Hooks đọc dữ liệu thời gian thực                                    */
/* ------------------------------------------------------------------ */

export interface Live<T> {
  data: T;
  loading: boolean;
  error: string;
}

export function useQueryData<T>(make: (() => Query) | null, deps: unknown[]): Live<T[]> {
  const [state, setState] = useState<Live<T[]>>({ data: [], loading: firebaseReady && !!make, error: '' });
  useEffect(() => {
    if (!firebaseReady || !make) {
      setState({ data: [], loading: false, error: '' });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    let q: Query;
    try {
      q = make();
    } catch (e) {
      setState({ data: [], loading: false, error: String(e) });
      return;
    }
    return onSnapshot(
      q,
      (snap) => setState({ data: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T), loading: false, error: '' }),
      (err) => setState({ data: [], loading: false, error: explain(err) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function useDocData<T>(make: (() => DocumentReference) | null, deps: unknown[]): Live<T | null> {
  const [state, setState] = useState<Live<T | null>>({ data: null, loading: firebaseReady && !!make, error: '' });
  useEffect(() => {
    if (!firebaseReady || !make) {
      setState({ data: null, loading: false, error: '' });
      return;
    }
    return onSnapshot(
      make(),
      (s) => setState({ data: s.exists() ? ({ id: s.id, ...s.data() } as T) : null, loading: false, error: '' }),
      (err) => setState({ data: null, loading: false, error: explain(err) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function explain(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code.includes('permission-denied') || code.includes('unauthorized'))
    return 'Không có quyền thực hiện thao tác này (bị Security Rules từ chối).';
  if (code.includes('unavailable')) return 'Mất kết nối tới máy chủ Firebase. Vui lòng kiểm tra mạng.';
  if (code.includes('failed-precondition')) return 'Thiếu chỉ mục (index) Firestore. Xem README để triển khai firestore.indexes.json.';
  if (code.includes('quota')) return 'Vượt giới hạn dung lượng Firebase.';
  if (code.includes('canceled')) return 'Đã hủy tải lên.';
  return (err as Error)?.message || String(err);
}

/* ---------- Thông tin dự án & giai đoạn ---------- */

export function useProject(): ProjectInfo {
  const { data } = useDocData<ProjectInfo>(() => doc(db(), 'settings', 'project'), []);
  return { ...DEFAULT_PROJECT, ...(data ?? {}) };
}

export function useStages(): Live<Stage[]> & { isDefault: boolean } {
  const live = useQueryData<Stage>(() => query(collection(db(), 'stages'), orderBy('order')), []);
  const isDefault = !live.loading && live.data.length === 0;
  return { ...live, data: isDefault ? DEFAULT_STAGES : live.data, isDefault };
}

/* ---------- Nhật ký ---------- */

/** team=true: toàn bộ nhật ký nội bộ; team=false: chỉ bản đã được giáo viên xác nhận và công bố */
export function useEntries(team: boolean): Live<Entry[]> {
  return useQueryData<Entry>(() => collection(db(), team ? 'entries' : 'public_entries'), [team]);
}

export function useEntryHistory(entryId: string | null, enabled: boolean): Live<HistoryItem[]> {
  return useQueryData<HistoryItem>(
    entryId && enabled ? () => query(collection(db(), 'entries', entryId, 'history'), orderBy('at', 'desc')) : null,
    [entryId, enabled],
  );
}

export function useEntryVersions(entryId: string | null, enabled: boolean): Live<(Entry & { archivedAt?: Timestamp; archivedBy?: string })[]> {
  return useQueryData(
    entryId && enabled ? () => collection(db(), 'entries', entryId, 'versions') : null,
    [entryId, enabled],
  );
}

/* ---------- Minh chứng ---------- */

export function useEvidence(team: boolean, entryId?: string): Live<Evidence[]> {
  return useQueryData<Evidence>(() => {
    const c = collection(db(), team ? 'evidence' : 'public_evidence');
    return entryId ? query(c, where('entryId', '==', entryId)) : c;
  }, [team, entryId]);
}

/* ---------- Kết quả & hồ sơ ---------- */

export function useResults(team: boolean): Live<ResultItem[]> {
  return useQueryData<ResultItem>(
    () => (team ? collection(db(), 'results') : query(collection(db(), 'results'), where('published', '==', true))),
    [team],
  );
}

export function useDossier(team: boolean): Live<DossierItem[]> {
  return useQueryData<DossierItem>(
    () => (team ? collection(db(), 'dossier') : query(collection(db(), 'dossier'), where('published', '==', true))),
    [team],
  );
}

export function usePublicStats(): Live<PublicStats | null> {
  return useDocData<PublicStats>(() => doc(db(), 'public_meta', 'stats'), []);
}

export function useRoles(enabled: boolean): Live<RoleDoc[]> {
  return useQueryData<RoleDoc>(enabled ? () => collection(db(), 'roles') : null, [enabled]);
}

/* ------------------------------------------------------------------ */
/* Ghi dữ liệu                                                         */
/* ------------------------------------------------------------------ */

const stamp = (me: Me) => ({ updatedAt: serverTimestamp(), updatedBy: me.uid, updatedByName: me.name });

function historyRef(entryId: string) {
  return doc(collection(db(), 'entries', entryId, 'history'));
}
function historyData(me: Me, action: string, note: string, version: number) {
  return { action, note, version, byUid: me.uid, byName: me.name, at: serverTimestamp() };
}

export async function createEntry(data: EntryEditable, me: Me, importKey = ''): Promise<string> {
  const d = db();
  const counterRef = doc(d, 'counters', 'entries');
  const entryRef = doc(collection(d, 'entries'));
  await runTransaction(d, async (tx) => {
    const c = await tx.get(counterRef);
    const n = c.exists() ? Number(c.data().next) : 1;
    const code = `NK-${String(n).padStart(3, '0')}`;
    tx.set(counterRef, { next: n + 1 });
    tx.set(entryRef, {
      ...data,
      code,
      status: 'draft',
      teacherComment: '',
      verifiedAt: null,
      verifiedByUid: '',
      verifiedByName: '',
      version: 1,
      importKey,
      createdAt: serverTimestamp(),
      createdBy: me.uid,
      createdByName: me.name,
      ...stamp(me),
    });
    tx.set(historyRef(entryRef.id), historyData(me, 'create', importKey ? `Nhập từ ${importKey}` : 'Tạo nhật ký', 1));
  });
  return entryRef.id;
}

/** Chỉnh sửa. Nếu nhật ký đã được xác nhận: lưu phiên bản cũ, tăng số phiên bản, chuyển về "chờ xác nhận". */
export async function updateEntry(entry: Entry, patch: EntryEditable, me: Me): Promise<void> {
  const d = db();
  const ref = doc(d, 'entries', entry.id);
  const b = writeBatch(d);
  if (entry.status === 'verified') {
    const { id: _id, ...snapshot } = entry;
    void _id;
    b.set(doc(d, 'entries', entry.id, 'versions', String(entry.version)), {
      ...snapshot,
      archivedAt: serverTimestamp(),
      archivedBy: me.name,
    });
    b.update(ref, { ...patch, version: entry.version + 1, status: 'submitted', ...stamp(me) });
    b.set(
      historyRef(entry.id),
      historyData(me, 'new_version', `Chỉnh sửa sau xác nhận: lưu trữ phiên bản v${entry.version}, tạo phiên bản v${entry.version + 1} chờ xác nhận lại`, entry.version + 1),
    );
  } else {
    b.update(ref, { ...patch, ...stamp(me) });
    b.set(historyRef(entry.id), historyData(me, 'edit', 'Chỉnh sửa nội dung', entry.version));
  }
  await b.commit();
}

export async function submitEntry(entry: Entry, me: Me): Promise<void> {
  const d = db();
  const b = writeBatch(d);
  b.update(doc(d, 'entries', entry.id), { status: 'submitted', ...stamp(me) });
  b.set(historyRef(entry.id), historyData(me, 'submit', 'Gửi giáo viên xác nhận', entry.version));
  await b.commit();
}

/** Giáo viên xác nhận hoặc trả lại. Thời điểm xác nhận do máy chủ ghi (serverTimestamp), không nhập tay. */
export async function reviewEntry(entry: Entry, decision: 'verified' | 'returned', comment: string, me: Me): Promise<void> {
  const d = db();
  const b = writeBatch(d);
  const ref = doc(d, 'entries', entry.id);
  if (decision === 'verified') {
    b.update(ref, {
      status: 'verified', teacherComment: comment, verifiedAt: serverTimestamp(),
      verifiedByUid: me.uid, verifiedByName: me.name, ...stamp(me),
    });
    const { id: _id, ...snapshot } = entry;
    void _id;
    b.set(doc(d, 'public_entries', entry.id), {
      ...snapshot,
      status: 'verified',
      teacherComment: comment,
      verifiedAt: serverTimestamp(),
      verifiedByUid: me.uid,
      verifiedByName: me.name,
      ...stamp(me),
    });
    b.set(historyRef(entry.id), historyData(me, 'verify', `Giáo viên xác nhận phiên bản v${entry.version}${comment ? ` – ${comment}` : ''}`, entry.version));
  } else {
    b.update(ref, { status: 'returned', teacherComment: comment, ...stamp(me) });
    b.set(historyRef(entry.id), historyData(me, 'return', `Trả lại để bổ sung${comment ? `: ${comment}` : ''}`, entry.version));
  }
  await b.commit();
}

export async function unpublishEntry(entry: Entry, me: Me): Promise<void> {
  const d = db();
  const b = writeBatch(d);
  b.delete(doc(d, 'public_entries', entry.id));
  b.set(historyRef(entry.id), historyData(me, 'unpublish', 'Gỡ khỏi trang công khai', entry.version));
  await b.commit();
}

export async function deleteEntry(entry: Entry): Promise<void> {
  const ev = await getDocs(query(collection(db(), 'evidence'), where('entryId', '==', entry.id)));
  if (!ev.empty) throw new Error('Nhật ký còn minh chứng đính kèm. Hãy xóa minh chứng trước.');
  await deleteDoc(doc(db(), 'entries', entry.id));
}

/* ---------- Tệp ---------- */

export function safeName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 80);
  const ext = dot > 0 ? name.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, '') : '';
  return (base || 'tep') + ext;
}

export function guessType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ino: 'text/plain', c: 'text/plain', cpp: 'text/plain', h: 'text/plain', hpp: 'text/plain', py: 'text/plain',
    md: 'text/markdown', csv: 'text/csv', json: 'application/json', mp4: 'video/mp4',
  };
  return map[ext] ?? 'application/octet-stream';
}

export function uploadFile(path: string, file: File, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(sref(storage(), path), file, { contentType: guessType(file) });
    task.on(
      'state_changed',
      (s) => onProgress(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0),
      (err) => reject(new Error(explain(err))),
      () => resolve(),
    );
  });
}

const urlCache = new Map<string, string>();
export async function fileUrl(path: string): Promise<string> {
  const hit = urlCache.get(path);
  if (hit) return hit;
  const url = await getDownloadURL(sref(storage(), path));
  urlCache.set(path, url);
  return url;
}

export interface EvidenceMeta {
  description: string;
  kind: Evidence['kind'];
  providedBy: string;
  collectedDate: string;
  sensitive: boolean;
}

export async function uploadEvidence(file: File, meta: EvidenceMeta, entry: Entry, me: Me, onProgress: (p: number) => void): Promise<void> {
  const d = db();
  const evRef = doc(collection(d, 'evidence'));
  const path = `evidence/${entry.id}/${evRef.id}/${safeName(file.name)}`;
  await uploadFile(path, file, onProgress);
  try {
    const b = writeBatch(d);
    b.set(evRef, {
      entryId: entry.id,
      entryCode: entry.code,
      fileName: file.name,
      storagePath: path,
      contentType: guessType(file),
      size: file.size,
      ...meta,
      uploadedAt: serverTimestamp(),
      uploadedBy: me.uid,
      uploadedByName: me.name,
      approved: false,
      featured: false,
    });
    b.set(historyRef(entry.id), historyData(me, 'evidence_add', `Thêm minh chứng: ${file.name}`, entry.version));
    await b.commit();
  } catch (e) {
    // Không để tệp "mồ côi" khi ghi metadata thất bại
    await deleteObject(sref(storage(), path)).catch(() => undefined);
    throw new Error(explain(e));
  }
}

export async function updateEvidenceMeta(ev: Evidence, meta: EvidenceMeta): Promise<void> {
  await updateDoc(doc(db(), 'evidence', ev.id), { ...meta });
}

export async function setEvidenceApproval(ev: Evidence, approve: boolean, featured: boolean, me: Me): Promise<void> {
  const d = db();
  const b = writeBatch(d);
  const ref = doc(d, 'evidence', ev.id);
  if (approve) {
    if (ev.sensitive) throw new Error('Minh chứng có thông tin định danh người tham gia không thể công bố.');
    b.update(ref, { approved: true, featured, approvedAt: serverTimestamp(), approvedByName: me.name });
    b.set(doc(d, 'public_evidence', ev.id), {
      entryId: ev.entryId, entryCode: ev.entryCode, fileName: ev.fileName, storagePath: ev.storagePath,
      contentType: ev.contentType, size: ev.size, description: ev.description, kind: ev.kind,
      providedBy: ev.providedBy, collectedDate: ev.collectedDate, uploadedAt: ev.uploadedAt,
      uploadedByName: ev.uploadedByName, approved: true, featured, sensitive: false,
      approvedAt: serverTimestamp(),
    });
  } else {
    b.update(ref, { approved: false, featured: false });
    b.delete(doc(d, 'public_evidence', ev.id));
  }
  b.set(historyRef(ev.entryId), historyData(me, approve ? 'evidence_approve' : 'evidence_unapprove', `${approve ? 'Duyệt công bố' : 'Gỡ duyệt'} minh chứng: ${ev.fileName}`, 0));
  await b.commit();
}

export async function deleteEvidence(ev: Evidence, me: Me): Promise<void> {
  const d = db();
  const b = writeBatch(d);
  b.delete(doc(d, 'evidence', ev.id));
  if (ev.approved) b.delete(doc(d, 'public_evidence', ev.id));
  b.set(historyRef(ev.entryId), historyData(me, 'evidence_delete', `Xóa minh chứng: ${ev.fileName}`, 0));
  await b.commit();
  await deleteObject(sref(storage(), ev.storagePath)).catch(() => undefined);
}

/* ---------- Giai đoạn, dự án, vai trò ---------- */

export async function saveStage(stage: Stage): Promise<void> {
  const { id, ...rest } = stage;
  await setDoc(doc(db(), 'stages', id), { ...rest, updatedAt: serverTimestamp() });
}

export async function seedStages(): Promise<void> {
  const d = db();
  const b = writeBatch(d);
  for (const s of DEFAULT_STAGES) {
    const { id, ...rest } = s;
    b.set(doc(d, 'stages', id), { ...rest, updatedAt: serverTimestamp() });
  }
  await b.commit();
}

export async function saveProject(p: ProjectInfo): Promise<void> {
  await setDoc(doc(db(), 'settings', 'project'), { ...p, updatedAt: serverTimestamp() });
}

export async function setRole(email: string, role: Role, name: string): Promise<void> {
  await setDoc(doc(db(), 'roles', email.trim().toLowerCase()), { role, name: name.trim() });
}
export async function removeRole(email: string): Promise<void> {
  await deleteDoc(doc(db(), 'roles', email));
}

export async function syncStats(s: Omit<PublicStats, 'updatedAt'>): Promise<void> {
  await setDoc(doc(db(), 'public_meta', 'stats'), { ...s, updatedAt: serverTimestamp() });
}

/* ---------- Kết quả ---------- */

export async function saveResult(id: string | null, data: Omit<ResultItem, 'id' | 'updatedAt' | 'updatedByName' | 'rawFiles'>, me: Me): Promise<string> {
  const ref = id ? doc(db(), 'results', id) : doc(collection(db(), 'results'));
  await setDoc(ref, { ...data, updatedAt: serverTimestamp(), updatedByName: me.name, ...(id ? {} : { rawFiles: [] }) }, { merge: true });
  return ref.id;
}

export async function deleteResult(item: ResultItem): Promise<void> {
  for (const f of item.rawFiles ?? []) await deleteObject(sref(storage(), f.path)).catch(() => undefined);
  await deleteDoc(doc(db(), 'results', item.id));
}

function stored(file: File, path: string, me: Me): StoredFile {
  return { name: file.name, path, size: file.size, contentType: guessType(file), uploadedAtISO: new Date().toISOString(), uploadedByName: me.name };
}

/** Bảng dữ liệu gốc — lưu ở vùng private/, chỉ thành viên đọc được (Storage Rules). */
export async function uploadResultRaw(item: ResultItem, file: File, me: Me, onProgress: (p: number) => void): Promise<void> {
  const path = `private/results/${item.id}/${Date.now()}_${safeName(file.name)}`;
  await uploadFile(path, file, onProgress);
  await updateDoc(doc(db(), 'results', item.id), { rawFiles: arrayUnion(stored(file, path, me)), updatedAt: serverTimestamp(), updatedByName: me.name });
}

export async function removeResultRaw(item: ResultItem, f: StoredFile, me: Me): Promise<void> {
  await updateDoc(doc(db(), 'results', item.id), { rawFiles: arrayRemove(f), updatedAt: serverTimestamp(), updatedByName: me.name });
  await deleteObject(sref(storage(), f.path)).catch(() => undefined);
}

/* ---------- Hồ sơ khoa học ---------- */

export async function saveDossier(id: string, patch: Partial<Omit<DossierItem, 'id' | 'files' | 'updatedAt'>>, me: Me): Promise<void> {
  await setDoc(doc(db(), 'dossier', id), { ...patch, updatedAt: serverTimestamp(), updatedByName: me.name }, { merge: true });
}

export async function uploadDossierFile(id: string, base: Partial<DossierItem>, file: File, me: Me, onProgress: (p: number) => void): Promise<void> {
  const path = `dossier/${id}/${Date.now()}_${safeName(file.name)}`;
  await uploadFile(path, file, onProgress);
  await setDoc(
    doc(db(), 'dossier', id),
    { ...base, files: arrayUnion(stored(file, path, me)), updatedAt: serverTimestamp(), updatedByName: me.name },
    { merge: true },
  );
}

export async function removeDossierFile(id: string, f: StoredFile, me: Me): Promise<void> {
  await updateDoc(doc(db(), 'dossier', id), { files: arrayRemove(f), updatedAt: serverTimestamp(), updatedByName: me.name });
  await deleteObject(sref(storage(), f.path)).catch(() => undefined);
}

/* ---------- Sao lưu ---------- */

export async function buildBackup(): Promise<Record<string, unknown>> {
  const d = db();
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), note: 'Sao lưu metadata Firestore. Tệp gốc nằm trên Firebase Cloud Storage theo trường storagePath/path.' };
  const top = ['settings', 'stages', 'entries', 'evidence', 'public_entries', 'public_evidence', 'results', 'dossier', 'roles', 'public_meta', 'counters'];
  for (const name of top) {
    const snap = await getDocs(collection(d, name));
    out[name] = snap.docs.map((x) => ({ id: x.id, ...x.data() }));
  }
  const entries = out.entries as { id: string }[];
  const sub: Record<string, unknown> = {};
  for (const e of entries) {
    const [h, v] = await Promise.all([
      getDocs(collection(d, 'entries', e.id, 'history')),
      getDocs(collection(d, 'entries', e.id, 'versions')),
    ]);
    sub[e.id] = { history: h.docs.map((x) => ({ id: x.id, ...x.data() })), versions: v.docs.map((x) => ({ id: x.id, ...x.data() })) };
  }
  out.entrySubcollections = sub;
  return out;
}
