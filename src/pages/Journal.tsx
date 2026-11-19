import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useEntries, useEvidence, useStages } from '../lib/data';
import { ENTRY_STATUS, TEAM_NAMES } from '../lib/defaults';
import { firebaseReady } from '../lib/firebase';
import { fmtRange, sortEntries } from '../lib/format';
import type { Entry, EntryStatus, Stage } from '../lib/types';
import { EntryDetail, OriginBadge, StatusBadge } from '../components/EntryDetail';
import { EntryForm } from '../components/EntryForm';
import { Empty, ErrorNote, Loading, PageHead } from '../components/ui';

type View = 'timeline' | 'stage' | 'person';
const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

function EntryCard({ e, stages, evCount, onOpen, team }: { e: Entry; stages: Stage[]; evCount: number; onOpen: () => void; team: boolean }) {
  const st = stages.find((s) => s.id === e.stageId);
  return (
    <button className="entry" onClick={onOpen}>
      <div className="entry-top">
        <span className="btn-row" style={{ gap: 8 }}>
          <span className="code">{e.code}</span>
          <span className="small muted">{fmtRange(e)}</span>
        </span>
        <span className="btn-row" style={{ gap: 6 }}>
          <OriginBadge o={e.origin} />
          {team && <StatusBadge s={e.status} />}
        </span>
      </div>
      <div className="entry-title">{e.activityTitle}</div>
      <div className="entry-meta">
        {st && <span>Giai đoạn {st.order}</span>}
        <span>{e.performers.join(', ') || e.performersNote}</span>
        <span>{evCount} minh chứng</span>
        {!team && e.verifiedAt && <span>Đã xác nhận</span>}
      </div>
      {e.content && <p className="entry-sum">{e.content}</p>}
    </button>
  );
}

export default function Journal() {
  const { team, me } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = (params.get('view') as View) || 'timeline';
  const stageFilter = params.get('gd') || '';
  const [status, setStatus] = useState<EntryStatus | ''>('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const stages = useStages();
  const entries = useEntries(team);
  const evidence = useEvidence(team);

  const evCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const ev of evidence.data) m.set(ev.entryId, (m.get(ev.entryId) ?? 0) + 1);
    return m;
  }, [evidence.data]);

  const list = sortEntries(entries.data.filter((e) => (!stageFilter || e.stageId === stageFilter) && (!status || e.status === status)));
  const opened = openId ? entries.data.find((e) => e.id === openId) : null;
  const setView = (v: View) => {
    const p = new URLSearchParams(params);
    p.set('view', v);
    setParams(p, { replace: true });
  };
  const setStage = (gd: string) => {
    const p = new URLSearchParams(params);
    if (gd) p.set('gd', gd); else p.delete('gd');
    setParams(p, { replace: true });
  };
  const card = (e: Entry) => <EntryCard key={e.id} e={e} stages={stages.data} evCount={evCount.get(e.id) ?? 0} onOpen={() => setOpenId(e.id)} team={team} />;

  let body: React.ReactNode;
  if (view === 'timeline') {
    const groups: { key: string; label: string; items: Entry[] }[] = [];
    for (const e of list) {
      const key = e.dateStart ? e.dateStart.slice(0, 7) : 'none';
      const label = e.dateStart ? `${MONTHS[Number(e.dateStart.slice(5, 7)) - 1]} / ${e.dateStart.slice(0, 4)}` : 'Chưa xác định thời gian';
      const g = groups.find((x) => x.key === key);
      if (g) g.items.push(e); else groups.push({ key, label, items: [e] });
    }
    body = groups.map((g) => (
      <div key={g.key}>
        <div className="month">{g.label}</div>
        <div className="entries">{g.items.map(card)}</div>
      </div>
    ));
  } else if (view === 'stage') {
    body = stages.data
      .filter((s) => !stageFilter || s.id === stageFilter)
      .map((s) => {
        const items = list.filter((e) => e.stageId === s.id);
        return (
          <div key={s.id}>
            <div className="group-h"><h3>Giai đoạn {s.order}. {s.title}</h3><span className="small muted">{items.length} nhật ký</span></div>
            {items.length ? <div className="entries">{items.map(card)}</div> : <p className="muted small">Chưa có nhật ký.</p>}
          </div>
        );
      });
  } else {
    body = TEAM_NAMES.map((n) => {
      const items = list.filter((e) => e.performers.includes(n));
      return (
        <div key={n}>
          <div className="group-h"><h3>{n}</h3><span className="small muted">{items.length} nhật ký</span></div>
          {items.length ? <div className="entries">{items.map(card)}</div> : <p className="muted small">Chưa có nhật ký.</p>}
        </div>
      );
    });
  }

  return (
    <>
      <PageHead
        eyebrow="Trang 3"
        title="Nhật ký và minh chứng"
        lead={
          team
            ? 'Toàn bộ nhật ký nội bộ của nhóm, kèm trạng thái kiểm duyệt. Chỉ các bản đã được giáo viên xác nhận mới hiển thị cho giám khảo.'
            : 'Các hoạt động nghiên cứu đã được giáo viên hướng dẫn xác nhận, kèm minh chứng đã duyệt. Nhấn vào từng nhật ký để xem đầy đủ các trường và minh chứng.'
        }
        actions={team && me && <button className="btn primary" onClick={() => setAdding(true)}>+ Thêm nhật ký</button>}
      />

      <div className="toolbar">
        <div className="seg" role="group" aria-label="Chế độ xem">
          <button aria-pressed={view === 'timeline'} onClick={() => setView('timeline')}>Dòng thời gian</button>
          <button aria-pressed={view === 'stage'} onClick={() => setView('stage')}>Theo giai đoạn</button>
          <button aria-pressed={view === 'person'} onClick={() => setView('person')}>Theo người thực hiện</button>
        </div>
        <div className="btn-row">
          <select className="input" style={{ width: 'auto', minWidth: 190 }} aria-label="Lọc theo giai đoạn" value={stageFilter} onChange={(e) => setStage(e.target.value)}>
            <option value="">Tất cả giai đoạn</option>
            {stages.data.map((s) => <option key={s.id} value={s.id}>Giai đoạn {s.order}</option>)}
          </select>
          {team && (
            <select className="input" style={{ width: 'auto', minWidth: 190 }} aria-label="Lọc theo trạng thái" value={status} onChange={(e) => setStatus(e.target.value as EntryStatus | '')}>
              <option value="">Mọi trạng thái</option>
              {Object.entries(ENTRY_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          )}
        </div>
      </div>

      <ErrorNote error={entries.error} />
      {entries.loading ? (
        <Loading />
      ) : !firebaseReady ? (
        <Empty>Chưa kết nối Firebase nên chưa có nhật ký nào được lưu.</Empty>
      ) : list.length === 0 ? (
        <Empty>{team ? 'Chưa có nhật ký. Nhấn “Thêm nhật ký” để bắt đầu, hoặc giáo viên nhập 16 dòng từ Phụ lục VIII trong mục Quản trị.' : 'Chưa có nhật ký nào được giáo viên xác nhận công bố.'}</Empty>
      ) : (
        body
      )}

      {opened && <EntryDetail entry={opened} stages={stages.data} onClose={() => setOpenId(null)} />}
      {adding && <EntryForm stages={stages.data} presetStage={stageFilter} onClose={() => setAdding(false)} onSaved={(id) => setOpenId(id)} />}
    </>
  );
}
