import { useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { removeDossierFile, saveDossier, uploadDossierFile, useDossier, useEntries, useEvidence, useProject, useStages } from '../lib/data';
import { DEFAULT_DOSSIER, DOSSIER_STATUS, TEAM_NAMES } from '../lib/defaults';
import { exportPhuLucVIII } from '../lib/exportDocx';
import { firebaseReady } from '../lib/firebase';
import { fmtSize, fmtTs } from '../lib/format';
import type { DossierItem, DossierStatus } from '../lib/types';
import { useFileUrl } from '../components/Evidence';
import { Badge, ErrorNote, Loading, Modal, PageHead, SectionTitle, useAction, useToast } from '../components/ui';

function FileLink({ path, name }: { path: string; name: string }) {
  const { url, error } = useFileUrl(path);
  if (error) return <span className="muted">{name}</span>;
  return url ? <a href={url} target="_blank" rel="noreferrer">{name}</a> : <span>{name}</span>;
}

function Row({ base, item }: { base: { id: string; code: string; title: string }; item?: DossierItem }) {
  const { team, teacher, me } = useAuth();
  const [edit, setEdit] = useState(false);
  const [prog, setProg] = useState<number | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { run } = useAction();
  const status = (item?.status ?? 'missing') as DossierStatus;
  const st = DOSSIER_STATUS[status];
  const locked = !teacher && !!item?.published;
  const files = item?.files ?? [];

  return (
    <div className="card dos">
      <div className="d-code">{base.code}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{base.title}</div>
        <div className="d-files">
          {files.length ? (
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {files.map((f) => (
                <li key={f.path}>
                  <FileLink path={f.path} name={f.name} /> <span className="xs muted">· {fmtSize(f.size)}</span>
                  {team && !locked && me && <> · <button className="link-btn xs" onClick={() => confirm(`Xóa tệp ${f.name}?`) && run(() => removeDossierFile(base.id, f, me), 'Đã xóa tệp.')}>Xóa</button></>}
                </li>
              ))}
            </ul>
          ) : (
            <span className="muted">{team || item ? 'Chưa có tệp đính kèm' : 'Không có tệp công khai'}</span>
          )}
        </div>
        {item?.note && <div className="xs muted" style={{ marginTop: 4 }}>{item.note}</div>}
      </div>
      <div className="small">
        <span className="xs muted" style={{ display: 'block' }}>Người phụ trách</span>
        {item?.owner || '—'}
      </div>
      <div className="small">
        {team || item ? <Badge tone={st.tone}>{st.label}</Badge> : <Badge tone="neutral">Chưa công bố</Badge>}
        {team && <div style={{ marginTop: 4 }}>{item?.published ? <Badge tone="ok" plain>Công khai</Badge> : <Badge tone="neutral" plain>Nội bộ</Badge>}</div>}
        <span className="xs muted" style={{ display: 'block', marginTop: 4 }}>Cập nhật: {fmtTs(item?.updatedAt, false)}</span>
      </div>
      <div className="btn-row">
        {team && me && !locked && (
          <>
            <button className="btn sm" disabled={prog !== null} onClick={() => ref.current?.click()}>{prog !== null ? `${Math.round(prog * 100)}%` : 'Tải tệp'}</button>
            <input ref={ref} type="file" hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip" onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setProg(0);
              try {
                await uploadDossierFile(base.id, { code: base.code, title: base.title, ...(item ? {} : { status: 'drafting', owner: '', note: '', published: false }) }, file, me, setProg);
                toast('ok', `Đã lưu ${file.name} lên Firebase.`);
              } catch (err) {
                toast('err', (err as Error).message);
              } finally {
                setProg(null);
              }
            }} />
            <button className="btn sm ghost" onClick={() => setEdit(true)}>Sửa</button>
          </>
        )}
      </div>
      {edit && <DossierForm base={base} item={item} onClose={() => setEdit(false)} />}
    </div>
  );
}

function DossierForm({ base, item, onClose }: { base: { id: string; code: string; title: string }; item?: DossierItem; onClose: () => void }) {
  const { me, teacher } = useAuth();
  const [f, setF] = useState({ owner: item?.owner ?? '', status: item?.status ?? ('missing' as DossierStatus), note: item?.note ?? '', published: item?.published ?? false });
  const { busy, run } = useAction();
  return (
    <Modal
      narrow
      title={`${base.code}: ${base.title}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Hủy</button>
          <button className="btn primary" disabled={busy} onClick={async () => me && (await run(() => saveDossier(base.id, { code: base.code, title: base.title, ...f, ...(item ? {} : { files: [] }) } as never, me), 'Đã lưu thông tin hồ sơ.')) && onClose()}>
            Lưu
          </button>
        </>
      }
    >
      <div className="form">
        <div className="fg">
          <label>Người phụ trách</label>
          <input className="input" list="dos-owner" value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} />
          <datalist id="dos-owner">{TEAM_NAMES.map((n) => <option key={n} value={n} />)}</datalist>
        </div>
        <div className="fg">
          <label>Trạng thái</label>
          <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as DossierStatus })}>
            {Object.entries(DOSSIER_STATUS).map(([k, v]) => <option key={k} value={k} disabled={!teacher && k === 'done'}>{v.label}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>Ghi chú</label>
          <textarea className="input" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </div>
        {teacher && (
          <label className="check">
            <input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} />
            Công khai cho giám khảo xem và tải xuống
          </label>
        )}
      </div>
    </Modal>
  );
}

export default function Dossier() {
  const { team } = useAuth();
  const dossier = useDossier(team);
  const project = useProject();
  const stages = useStages();
  const entries = useEntries(team);
  const evidence = useEvidence(team);
  const { busy, run } = useAction();

  const doExport = (scope: 'verified' | 'all') =>
    run(
      () => exportPhuLucVIII({ project, stages: stages.data, entries: entries.data, evidence: team ? evidence.data.filter((e) => !e.sensitive) : evidence.data, scope }),
      'Đã tạo tệp Word Phụ lục VIII.',
    );

  return (
    <>
      <PageHead
        eyebrow="Trang 5"
        title="Hồ sơ khoa học"
        lead="Danh mục hồ sơ dự thi theo Kế hoạch 5999. Giám khảo chỉ xem được các mục hồ sơ đã được giáo viên công bố."
      />
      <ErrorNote error={dossier.error} />
      {dossier.loading ? <Loading /> : (
        <div className="dossier">
          {DEFAULT_DOSSIER.map((b) => <Row key={b.id} base={b} item={dossier.data.find((d) => d.id === b.id)} />)}
        </div>
      )}

      <section className="section">
        <SectionTitle title="Xuất nhật ký theo Phụ lục VIII" />
        <div className="card">
          <p>Tạo tệp Word (.docx) gồm phần thông tin chung, bảng nhật ký đúng các cột của Phụ lục VIII (TT, Ngày, Nội dung, Địa điểm, Người thực hiện, Minh chứng, Kết quả, Xác nhận của người hướng dẫn) và phần chi tiết đầy đủ các trường. Ô ký được để trống để ký tay — ứng dụng không tạo chữ ký.</p>
          <div className="btn-row">
            <button className="btn primary" disabled={busy || !firebaseReady} onClick={() => doExport('verified')}>Xuất bản đã xác nhận (.docx)</button>
            {team && <button className="btn" disabled={busy} onClick={() => doExport('all')}>Xuất toàn bộ, kèm trạng thái (.docx)</button>}
          </div>
        </div>
      </section>
    </>
  );
}
