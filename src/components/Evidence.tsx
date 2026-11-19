import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Entry, Evidence, EvidenceKind } from '../lib/types';
import { ACCEPT_FILES, EVIDENCE_KIND, MAX_FILE_MB, TEAM_NAMES } from '../lib/defaults';
import { fileLabel, fmtSize, fmtTs, isImage, isPdf, isVideo } from '../lib/format';
import { deleteEvidence, fileUrl, setEvidenceApproval, updateEvidenceMeta, uploadEvidence, type EvidenceMeta } from '../lib/data';
import { useAuth } from '../lib/auth';
import { Badge, Empty, Modal, useAction, useToast } from './ui';

export function useFileUrl(path: string | undefined): { url: string; error: string } {
  const [state, setState] = useState({ url: '', error: '' });
  useEffect(() => {
    let alive = true;
    if (!path) return;
    fileUrl(path)
      .then((url) => alive && setState({ url, error: '' }))
      .catch(() => alive && setState({ url: '', error: 'Không có quyền xem hoặc tệp không tồn tại' }));
    return () => {
      alive = false;
    };
  }, [path]);
  return state;
}

export function Lightbox({ ev, onClose }: { ev: Pick<Evidence, 'storagePath' | 'contentType' | 'fileName' | 'description'>; onClose: () => void }) {
  const { url, error } = useFileUrl(ev.storagePath);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={ev.description || ev.fileName}>
      <div className="lightbox-bar">
        <span className="t">{ev.description || ev.fileName}</span>
        <div className="btn-row">
          {url && <a className="btn sm" href={url} target="_blank" rel="noreferrer">Mở / tải xuống</a>}
          <button className="btn sm" onClick={onClose}>Đóng</button>
        </div>
      </div>
      <div className="lightbox-body" onClick={(e) => e.target === e.currentTarget && onClose()}>
        {error && <p style={{ color: '#fff' }}>{error}</p>}
        {!url && !error && <span className="spinner" />}
        {url && isImage(ev.contentType) && <img src={url} alt={ev.description || ev.fileName} />}
        {url && isVideo(ev.contentType) && <video src={url} controls autoPlay playsInline />}
        {url && isPdf(ev.contentType) && <iframe src={url} title={ev.fileName} />}
        {url && !isImage(ev.contentType) && !isVideo(ev.contentType) && !isPdf(ev.contentType) && (
          <div style={{ color: '#fff', textAlign: 'center' }}>
            <p>Không xem trước được định dạng này.</p>
            <a className="btn" href={url} target="_blank" rel="noreferrer">Tải xuống {ev.fileName}</a>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Thumb({ ev, onOpen }: { ev: Evidence; onOpen: () => void }) {
  const media = isImage(ev.contentType) || isVideo(ev.contentType);
  const { url } = useFileUrl(media ? ev.storagePath : undefined);
  return (
    <button className="ev-thumb" onClick={onOpen} aria-label={`Xem ${ev.description || ev.fileName}`}>
      {isImage(ev.contentType) && url ? (
        <img src={url} alt={ev.description || ev.fileName} loading="lazy" />
      ) : isVideo(ev.contentType) && url ? (
        <>
          <video src={`${url}#t=0.5`} muted preload="metadata" playsInline />
          <span className="play">VIDEO</span>
        </>
      ) : media ? (
        <span className="spinner" />
      ) : (
        <span className="ext">{fileLabel(ev.fileName)}</span>
      )}
    </button>
  );
}

export function EvidenceCard({ ev, manage }: { ev: Evidence; manage?: boolean }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const { me, teacher } = useAuth();
  const { busy, run } = useAction();
  const mine = me && ev.uploadedBy === me.uid;
  return (
    <div className="ev">
      <Thumb ev={ev} onOpen={() => setOpen(true)} />
      <div className="ev-body">
        <div className="btn-row" style={{ gap: 6 }}>
          <span className="chip">{EVIDENCE_KIND[ev.kind] ?? ev.kind}</span>
          {manage && (ev.approved ? <Badge tone="ok">Đã duyệt công bố</Badge> : <Badge tone="neutral">Chưa duyệt</Badge>)}
          {manage && ev.sensitive && <Badge tone="danger">Có thông tin định danh</Badge>}
          {ev.featured && <Badge tone="info" plain>Nổi bật</Badge>}
        </div>
        <span className="ev-desc">{ev.description || ev.fileName}</span>
        <span className="ev-name">
          {ev.fileName} {ev.size ? `· ${fmtSize(ev.size)}` : ''}
        </span>
        <span className="xs muted">
          Người cung cấp: {ev.providedBy || '—'}
          {ev.collectedDate ? ` · Thu thập: ${ev.collectedDate}` : ''}
          <br />
          Tải lên hệ thống: {fmtTs(ev.uploadedAt)} · <span className="code">{ev.entryCode}</span>
        </span>
      </div>
      {manage && me && (teacher || (mine && !ev.approved)) && (
        <div className="ev-actions">
          {teacher && !ev.approved && !ev.sensitive && (
            <button className="btn sm primary" disabled={busy} onClick={() => run(() => setEvidenceApproval(ev, true, false, me), 'Đã duyệt công bố minh chứng.')}>Duyệt</button>
          )}
          {teacher && ev.approved && (
            <>
              <button className="btn sm" disabled={busy} onClick={() => run(() => setEvidenceApproval(ev, true, !ev.featured, me), ev.featured ? 'Đã bỏ nổi bật.' : 'Đã đặt làm minh chứng nổi bật.')}>
                {ev.featured ? 'Bỏ nổi bật' : 'Đặt nổi bật'}
              </button>
              <button className="btn sm" disabled={busy} onClick={() => run(() => setEvidenceApproval(ev, false, false, me), 'Đã gỡ khỏi trang công khai.')}>Gỡ duyệt</button>
            </>
          )}
          {(teacher || (mine && !ev.approved)) && <button className="btn sm ghost" onClick={() => setEdit(true)}>Sửa mô tả</button>}
          {(teacher || (mine && !ev.approved)) && (
            <button
              className="btn sm ghost danger"
              disabled={busy}
              onClick={() => confirm(`Xóa vĩnh viễn minh chứng "${ev.fileName}"? Không thể khôi phục.`) && run(() => deleteEvidence(ev, me), 'Đã xóa minh chứng.')}
            >
              Xóa
            </button>
          )}
        </div>
      )}
      {open && <Lightbox ev={ev} onClose={() => setOpen(false)} />}
      {edit && <EvidenceMetaModal ev={ev} onClose={() => setEdit(false)} />}
    </div>
  );
}

function EvidenceMetaModal({ ev, onClose }: { ev: Evidence; onClose: () => void }) {
  const [m, setM] = useState<EvidenceMeta>({
    description: ev.description, kind: ev.kind, providedBy: ev.providedBy, collectedDate: ev.collectedDate, sensitive: ev.sensitive,
  });
  const { busy, run } = useAction();
  return (
    <Modal
      narrow
      title="Sửa thông tin minh chứng"
      sub={ev.fileName}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Hủy</button>
          <button className="btn primary" disabled={busy || !m.description.trim()} onClick={async () => (await run(() => updateEvidenceMeta(ev, m), 'Đã lưu thông tin minh chứng.')) && onClose()}>
            Lưu
          </button>
        </>
      }
    >
      <MetaFields m={m} set={setM} lockSensitive={ev.approved} />
    </Modal>
  );
}

function MetaFields({ m, set, lockSensitive }: { m: EvidenceMeta; set: (m: EvidenceMeta) => void; lockSensitive?: boolean }) {
  return (
    <div className="form-grid">
      <div className="fg full">
        <label>Mô tả minh chứng *</label>
        <input className="input" value={m.description} onChange={(e) => set({ ...m, description: e.target.value })} placeholder="VD: Ảnh trạm RESET-AI sau khi lắp ráp hoàn chỉnh" />
      </div>
      <div className="fg">
        <label>Loại minh chứng</label>
        <select className="input" value={m.kind} onChange={(e) => set({ ...m, kind: e.target.value as EvidenceKind })}>
          {Object.entries(EVIDENCE_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="fg">
        <label>Người cung cấp</label>
        <input className="input" list="team-names" value={m.providedBy} onChange={(e) => set({ ...m, providedBy: e.target.value })} />
        <datalist id="team-names">{TEAM_NAMES.map((n) => <option key={n} value={n} />)}</datalist>
      </div>
      <div className="fg full">
        <label>Ngày tạo / thu thập (nếu xác định được)</label>
        <input className="input" value={m.collectedDate} onChange={(e) => set({ ...m, collectedDate: e.target.value })} placeholder="VD: 30/9/2026, hoặc “khoảng cuối tháng 9/2026”" />
        <span className="hint">Ghi đúng mức độ chắc chắn. Để trống nếu không xác định được.</span>
      </div>
      <label className="check full">
        <input type="checkbox" checked={m.sensitive} disabled={lockSensitive} onChange={(e) => set({ ...m, sensitive: e.target.checked })} />
        <span>Tệp có thông tin định danh người tham gia (họ tên, lớp, email…) — chỉ thành viên nhóm được xem, không công bố.</span>
      </label>
    </div>
  );
}

export function EvidenceGrid({ list, manage, empty }: { list: Evidence[]; manage?: boolean; empty?: string }) {
  if (!list.length) return <Empty>{empty ?? 'Chưa có minh chứng.'}</Empty>;
  return (
    <div className="ev-grid">
      {list.map((ev) => <EvidenceCard key={ev.id} ev={ev} manage={manage} />)}
    </div>
  );
}

/* ---------- Tải minh chứng ---------- */

interface Pending {
  key: string;
  file: File;
  meta: EvidenceMeta;
  progress: number;
  state: 'ready' | 'uploading' | 'done' | 'error';
  error: string;
}

const ALLOWED = ACCEPT_FILES.split(',');

export function Uploader({ entry }: { entry: Entry }) {
  const { me } = useAuth();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [items, setItems] = useState<Pending[]>([]);
  const [running, setRunning] = useState(false);

  const add = (files: FileList | null) => {
    if (!files || !me) return;
    const next: Pending[] = [];
    for (const f of Array.from(files)) {
      const ext = '.' + (f.name.split('.').pop() ?? '').toLowerCase();
      let error = '';
      if (!ALLOWED.includes(ext)) error = `Định dạng ${ext} không được hỗ trợ.`;
      else if (f.size > MAX_FILE_MB * 1024 * 1024) error = `Tệp vượt quá ${MAX_FILE_MB} MB.`;
      next.push({
        key: `${f.name}-${f.size}-${Math.random()}`,
        file: f,
        meta: { description: '', kind: guessKind(ext), providedBy: me.name, collectedDate: '', sensitive: false },
        progress: 0,
        state: error ? 'error' : 'ready',
        error,
      });
    }
    setItems((l) => [...l, ...next]);
  };

  const patch = (key: string, p: Partial<Pending>) => setItems((l) => l.map((x) => (x.key === key ? { ...x, ...p } : x)));

  const uploadAll = async () => {
    if (!me) return;
    setRunning(true);
    let ok = 0;
    let fail = 0;
    for (const it of items.filter((x) => x.state === 'ready')) {
      if (!it.meta.description.trim()) {
        patch(it.key, { state: 'ready', error: 'Cần nhập mô tả trước khi tải lên.' });
        fail++;
        continue;
      }
      patch(it.key, { state: 'uploading', error: '' });
      try {
        await uploadEvidence(it.file, it.meta, entry, me, (p) => patch(it.key, { progress: p }));
        patch(it.key, { state: 'done', progress: 1 });
        ok++;
      } catch (e) {
        patch(it.key, { state: 'error', error: (e as Error).message });
        fail++;
      }
    }
    setRunning(false);
    if (ok) toast('ok', `Đã lưu ${ok} minh chứng lên Firebase.`);
    if (fail) toast('err', `${fail} tệp chưa được tải lên. Xem chi tiết trong danh sách.`);
  };

  const ready = items.filter((x) => x.state === 'ready').length;

  return (
    <div>
      <div
        className={`drop${over ? ' over' : ''}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
      >
        <strong>Chọn hoặc kéo thả tệp minh chứng</strong>
        <div className="small muted">Ảnh JPG/PNG · PDF · Word · Excel · Video MP4 · Mã nguồn, tài liệu kỹ thuật · tối đa {MAX_FILE_MB} MB/tệp · có thể chọn nhiều tệp</div>
        <input ref={input} type="file" multiple accept={ACCEPT_FILES} hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </div>

      {items.length > 0 && (
        <div className="up-list">
          {items.map((it) => (
            <div className="up-item" key={it.key}>
              <div className="up-head">
                <span>{it.file.name} <span className="muted xs">({fmtSize(it.file.size)})</span></span>
                {it.state !== 'uploading' && it.state !== 'done' && (
                  <button className="btn sm ghost" onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}>Bỏ</button>
                )}
              </div>
              {it.state === 'ready' && (
                <div style={{ marginTop: 10 }}>
                  <MetaFields m={it.meta} set={(meta) => patch(it.key, { meta })} />
                </div>
              )}
              {(it.state === 'uploading' || it.state === 'done') && (
                <div className="progress" aria-label="Tiến trình tải lên"><span style={{ width: `${Math.round(it.progress * 100)}%` }} /></div>
              )}
              {it.state === 'uploading' && <div className="up-state">Đang tải lên… {Math.round(it.progress * 100)}%</div>}
              {it.state === 'done' && <div className="up-state ok">Đã lưu trên Firebase Storage và Firestore.</div>}
              {it.error && <div className="up-state err">{it.error}</div>}
            </div>
          ))}
          <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
            {items.some((x) => x.state === 'done' || x.state === 'error') && !running && (
              <button className="btn ghost" onClick={() => setItems((l) => l.filter((x) => x.state === 'ready' || x.state === 'uploading'))}>Dọn danh sách</button>
            )}
            <button className="btn primary" disabled={!ready || running} onClick={uploadAll}>
              {running ? 'Đang tải lên…' : `Tải lên ${ready} tệp`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function guessKind(ext: string): EvidenceKind {
  if (['.ino', '.c', '.cpp', '.h', '.hpp', '.py', '.js', '.ts', '.json', '.zip'].includes(ext)) return 'ma_nguon';
  if (['.xls', '.xlsx', '.csv'].includes(ext)) return 'phan_tich';
  if (['.doc', '.docx', '.pdf', '.md', '.txt'].includes(ext)) return 'tai_lieu';
  return 'khac';
}
