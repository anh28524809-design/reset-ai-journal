import { useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { deleteResult, removeResultRaw, saveResult, uploadResultRaw, useResults } from '../lib/data';
import { CHART_TYPE, EVIDENCE_LEVEL, RESULT_SECTION } from '../lib/defaults';
import { fmtIso, fmtSize, fmtTs } from '../lib/format';
import type { ChartType, EvidenceLevel, ResultItem, ResultRow, ResultSection } from '../lib/types';
import { BarChart, DataTable, ProportionChart } from '../components/Charts';
import { useFileUrl } from '../components/Evidence';
import { Badge, Empty, ErrorNote, Loading, Modal, PageHead, SectionTitle, useAction, useToast } from '../components/ui';

type Draft = Omit<ResultItem, 'id' | 'updatedAt' | 'updatedByName' | 'rawFiles'>;

function RawLink({ path, name }: { path: string; name: string }) {
  const { url } = useFileUrl(path);
  return url ? <a href={url} target="_blank" rel="noreferrer">{name}</a> : <span>{name}</span>;
}

function ResultCard({ r }: { r: ResultItem }) {
  const { team, teacher, me } = useAuth();
  const [showTable, setShowTable] = useState(false);
  const [edit, setEdit] = useState(false);
  const [prog, setProg] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { busy, run } = useAction();
  const toast = useToast();
  const lvl = EVIDENCE_LEVEL[r.evidenceLevel] ?? EVIDENCE_LEVEL.descriptive;
  const canEdit = team && !!me && (teacher || !r.published);

  return (
    <article className="card chart-card">
      <div className="stage-head">
        <h3 style={{ margin: 0 }}>{r.title}</h3>
        <span className="btn-row" style={{ gap: 6 }}>
          <Badge tone={r.evidenceLevel === 'sufficient' ? 'ok' : 'neutral'} plain>{lvl.label}</Badge>
          {team && (r.published ? <Badge tone="ok">Đã công bố</Badge> : <Badge tone="warn">Chưa công bố</Badge>)}
        </span>
      </div>
      <div className="chart-meta">
        <span><b>Đơn vị:</b> {r.unit || '—'}</span>
        <span><b>Cỡ mẫu:</b> {r.sampleSize || '—'}</span>
        <span><b>Nguồn dữ liệu:</b> {r.source || '—'}</span>
        <span><b>Thời điểm thu thập:</b> {r.collectedAt || '—'}</span>
      </div>
      {r.chartType === 'bar' && r.rows.length > 0 && <BarChart rows={r.rows} unit={r.unit} />}
      {r.chartType === 'proportion' && r.rows.length > 0 && <ProportionChart rows={r.rows} />}
      {(r.chartType === 'table' || showTable) && r.rows.length > 0 && <DataTable rows={r.rows} unit={r.unit} proportion={r.chartType === 'proportion'} />}
      {r.interpretation && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{r.interpretation}</p>}
      <p className="xs muted" style={{ margin: 0 }}>{lvl.note}</p>
      <div className="btn-row">
        {r.chartType !== 'table' && r.chartType !== 'text' && r.rows.length > 0 && (
          <button className="btn sm ghost" onClick={() => setShowTable(!showTable)}>{showTable ? 'Ẩn bảng số liệu' : 'Xem bảng số liệu'}</button>
        )}
        {canEdit && <button className="btn sm" onClick={() => setEdit(true)}>Sửa</button>}
        {teacher && me && (
          <button className="btn sm" disabled={busy} onClick={() => run(() => saveResult(r.id, { ...strip(r), published: !r.published }, me), r.published ? 'Đã gỡ công bố.' : 'Đã công bố kết quả.')}>
            {r.published ? 'Gỡ công bố' : 'Công bố'}
          </button>
        )}
      </div>
      {team && (
        <div className="card tint" style={{ padding: 14 }}>
          <strong className="small">Bảng dữ liệu gốc (chỉ thành viên nhóm xem được)</strong>
          <ul className="small" style={{ margin: '6px 0', paddingLeft: 18 }}>
            {(r.rawFiles ?? []).map((f) => (
              <li key={f.path}>
                <RawLink path={f.path} name={f.name} /> <span className="muted xs">· {fmtSize(f.size)} · {fmtIso(f.uploadedAtISO)} · {f.uploadedByName}</span>
                {canEdit && <> · <button className="link-btn xs" onClick={() => confirm(`Xóa tệp ${f.name}?`) && run(() => removeResultRaw(r, f, me!), 'Đã xóa tệp.')}>Xóa</button></>}
              </li>
            ))}
            {!(r.rawFiles ?? []).length && <li className="muted">Chưa đính kèm.</li>}
          </ul>
          {canEdit && (
            <>
              <button className="btn sm" disabled={prog !== null} onClick={() => fileRef.current?.click()}>{prog !== null ? `Đang tải ${Math.round(prog * 100)}%` : 'Đính kèm dữ liệu gốc'}</button>
              <input ref={fileRef} type="file" hidden accept=".xlsx,.xls,.csv,.pdf,.docx,.json,.zip" onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file || !me) return;
                setProg(0);
                try {
                  await uploadResultRaw(r, file, me, setProg);
                  toast('ok', 'Đã lưu tệp dữ liệu gốc vào vùng riêng tư.');
                } catch (err) {
                  toast('err', (err as Error).message);
                } finally {
                  setProg(null);
                }
              }} />
            </>
          )}
        </div>
      )}
      {team && <p className="xs muted" style={{ margin: 0 }}>Cập nhật {fmtTs(r.updatedAt)} · {r.updatedByName}</p>}
      {edit && <ResultForm item={r} section={r.section} onClose={() => setEdit(false)} />}
    </article>
  );
}

function strip(r: ResultItem): Draft {
  const { id: _i, updatedAt: _u, updatedByName: _n, rawFiles: _f, ...rest } = r;
  void _i; void _u; void _n; void _f;
  return rest;
}

function ResultForm({ item, section, onClose }: { item?: ResultItem; section: ResultSection; onClose: () => void }) {
  const { me, teacher } = useAuth();
  const [d, setD] = useState<Draft>(
    item ? strip(item) : {
      section, order: Date.now(), title: '', chartType: 'bar', unit: '', sampleSize: '', source: '', collectedAt: '',
      rows: [{ label: '', value: 0 }], interpretation: '', evidenceLevel: 'descriptive', published: false,
    },
  );
  const { busy, run } = useAction();
  const setRow = (i: number, p: Partial<ResultRow>) => setD({ ...d, rows: d.rows.map((r, j) => (j === i ? { ...r, ...p } : r)) });
  const err =
    !d.title.trim() ? 'Nhập tên biểu đồ/kết quả.'
    : !d.unit.trim() || !d.sampleSize.trim() || !d.source.trim() || !d.collectedAt.trim() ? 'Cần đủ đơn vị, cỡ mẫu, nguồn dữ liệu và thời điểm thu thập.'
    : d.chartType !== 'text' && d.rows.some((r) => !r.label.trim() || Number.isNaN(r.value)) ? 'Mỗi dòng số liệu cần nhãn và giá trị.'
    : d.chartType === 'proportion' && d.rows.some((r) => !r.total || r.total < r.value) ? 'Biểu đồ tỷ lệ: tổng (n) phải lớn hơn hoặc bằng giá trị.'
    : '';

  return (
    <Modal
      title={item ? 'Sửa kết quả' : 'Thêm kết quả'}
      sub={RESULT_SECTION[d.section].title}
      onClose={onClose}
      footer={
        <>
          {err && <span className="small" style={{ color: 'var(--danger)', marginRight: 'auto', fontWeight: 600 }}>{err}</span>}
          {item && teacher && (
            <button className="btn ghost danger" disabled={busy} onClick={() => confirm('Xóa kết quả này và các tệp dữ liệu gốc kèm theo?') && run(() => deleteResult(item), 'Đã xóa kết quả.').then((ok) => ok && onClose())}>Xóa</button>
          )}
          <button className="btn" onClick={onClose}>Hủy</button>
          <button className="btn primary" disabled={busy || !!err} onClick={async () => me && (await run(() => saveResult(item?.id ?? null, d, me), 'Đã lưu kết quả lên Firestore.')) && onClose()}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
        </>
      }
    >
      <div className="form">
        <div className="notice info small">Chỉ nhập số liệu thật đã thu thập và xử lý. Không đưa ra kết luận về hiệu quả nếu dữ liệu chưa đủ để chứng minh.</div>
        <div className="form-grid">
          <div className="fg full"><label>Tên biểu đồ / kết quả *</label><input className="input" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></div>
          <div className="fg"><label>Phần</label>
            <select className="input" value={d.section} onChange={(e) => setD({ ...d, section: e.target.value as ResultSection })}>
              {Object.entries(RESULT_SECTION).map(([k, v]) => <option key={k} value={k}>{v.title}</option>)}
            </select>
          </div>
          <div className="fg"><label>Hình thức trình bày</label>
            <select className="input" value={d.chartType} onChange={(e) => setD({ ...d, chartType: e.target.value as ChartType })}>
              {Object.entries(CHART_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="fg"><label>Đơn vị *</label><input className="input" value={d.unit} placeholder="VD: lượt trả lời, %, điểm" onChange={(e) => setD({ ...d, unit: e.target.value })} /></div>
          <div className="fg"><label>Cỡ mẫu *</label><input className="input" value={d.sampleSize} placeholder="VD: n = 257" onChange={(e) => setD({ ...d, sampleSize: e.target.value })} /></div>
          <div className="fg"><label>Nguồn dữ liệu *</label><input className="input" value={d.source} onChange={(e) => setD({ ...d, source: e.target.value })} /></div>
          <div className="fg"><label>Thời điểm thu thập *</label><input className="input" value={d.collectedAt} placeholder="VD: 17/11 – 18/11/2026" onChange={(e) => setD({ ...d, collectedAt: e.target.value })} /></div>
          <div className="fg full"><label>Mức độ bằng chứng</label>
            <select className="input" value={d.evidenceLevel} onChange={(e) => setD({ ...d, evidenceLevel: e.target.value as EvidenceLevel })}>
              {Object.entries(EVIDENCE_LEVEL).map(([k, v]) => <option key={k} value={k}>{v.label} — {v.note}</option>)}
            </select>
          </div>
        </div>
        {d.chartType !== 'text' && (
          <fieldset className="fieldset">
            <legend>Số liệu</legend>
            <div className="grid" style={{ gap: 8 }}>
              {d.rows.map((r, i) => (
                <div key={i} className="form-grid" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)' + (d.chartType === 'proportion' ? ' minmax(0,1fr)' : '') + ' auto', alignItems: 'end' }}>
                  <div className="fg"><label className="xs">Nhãn</label><input className="input" value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} /></div>
                  <div className="fg"><label className="xs">Giá trị</label><input className="input" type="number" value={r.value} onChange={(e) => setRow(i, { value: Number(e.target.value) })} /></div>
                  {d.chartType === 'proportion' && <div className="fg"><label className="xs">Tổng (n)</label><input className="input" type="number" value={r.total ?? ''} onChange={(e) => setRow(i, { total: Number(e.target.value) })} /></div>}
                  <button className="btn sm ghost danger" onClick={() => setD({ ...d, rows: d.rows.filter((_, j) => j !== i) })} aria-label="Xóa dòng">Xóa</button>
                </div>
              ))}
              <button className="btn sm" onClick={() => setD({ ...d, rows: [...d.rows, { label: '', value: 0 }] })}>+ Thêm dòng</button>
            </div>
          </fieldset>
        )}
        <div className="fg"><label>Diễn giải (tương xứng với bằng chứng)</label><textarea className="input" rows={4} value={d.interpretation} onChange={(e) => setD({ ...d, interpretation: e.target.value })} /></div>
        {!teacher && <p className="xs muted">Kết quả do học sinh nhập ở trạng thái chưa công bố; giáo viên kiểm tra và công bố.</p>}
      </div>
    </Modal>
  );
}

export default function Results() {
  const { team, me } = useAuth();
  const results = useResults(team);
  const [adding, setAdding] = useState<ResultSection | null>(null);
  const sections: ResultSection[] = ['survey', 'device', 'intervention'];
  return (
    <>
      <PageHead
        eyebrow="Trang 4"
        title="Kết quả nghiên cứu"
        lead="Chỉ trình bày số liệu thật đã thu thập. Mỗi biểu đồ ghi rõ đơn vị, cỡ mẫu, nguồn dữ liệu và thời điểm thu thập. Kết luận về hiệu quả chỉ được nêu khi dữ liệu đủ để chứng minh."
      />
      <ErrorNote error={results.error} />
      {results.loading ? <Loading /> : sections.map((s, i) => {
        const items = results.data.filter((r) => r.section === s).sort((a, b) => a.order - b.order);
        return (
          <section className="section" key={s} style={i === 0 ? { marginTop: 0 } : undefined}>
            <SectionTitle tag={`Phần ${i + 1}`} title={RESULT_SECTION[s].title} right={team && me && <button className="btn sm" onClick={() => setAdding(s)}>+ Thêm kết quả</button>} />
            {items.length ? <div className="grid grid-2">{items.map((r) => <ResultCard key={r.id} r={r} />)}</div> : <Empty>{RESULT_SECTION[s].empty}</Empty>}
          </section>
        );
      })}
      {adding && <ResultForm section={adding} onClose={() => setAdding(null)} />}
    </>
  );
}
