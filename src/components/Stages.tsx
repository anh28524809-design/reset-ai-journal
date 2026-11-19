import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Activity, ActivityStatus, Entry, Stage, StageStatus } from '../lib/types';
import { ACTIVITY_STATUS, STAGE_STATUS, TEAM_NAMES } from '../lib/defaults';
import { saveStage } from '../lib/data';
import { Badge, Modal, useAction } from './ui';

export function StageBadge({ s }: { s: StageStatus }) {
  const v = STAGE_STATUS[s] ?? STAGE_STATUS.none;
  return <Badge tone={v.tone}>{v.label}</Badge>;
}

function Period({ st }: { st: Stage }) {
  if (st.period && st.periodVerified) return <span>{st.period}</span>;
  if (st.period) return <span>{st.period} <span className="xs">(chưa xác minh)</span></span>;
  return <span>Thời gian: chưa xác minh</span>;
}

/** Timeline giai đoạn. compact=true: chỉ tóm tắt, mở từng giai đoạn khi nhấn "Xem chi tiết". */
export function StageTimeline({ stages, entries, compact, editable }: { stages: Stage[]; entries: Entry[]; compact?: boolean; editable?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState<Stage | null>(null);
  const count = (id: string) => entries.filter((e) => e.stageId === id);
  return (
    <>
      <ol className="stages">
        {stages.map((st) => {
          const list = count(st.id);
          const verified = list.filter((e) => e.status === 'verified').length;
          const expanded = !compact || open === st.id;
          return (
            <li key={st.id} className={`stage ${st.status === 'confirmed' ? 'confirmed' : ''}`}>
              <span className="stage-num" aria-hidden>{st.order}</span>
              <div className="stage-card">
                <div className="stage-head">
                  <h3><span className="sr-only">Giai đoạn {st.order}. </span>{st.title}</h3>
                  <StageBadge s={st.status} />
                </div>
                <div className="stage-meta">
                  <Period st={st} />
                  <span>{list.length} nhật ký · {verified} đã xác nhận</span>
                </div>
                <p className="stage-desc">{st.description}</p>
                {compact && (
                  <button className="link-btn" style={{ marginTop: 8 }} aria-expanded={expanded} onClick={() => setOpen(expanded ? null : st.id)}>
                    {expanded ? 'Thu gọn' : 'Xem chi tiết'}
                  </button>
                )}
                {expanded && (
                  <div className="stage-detail">
                    <ul className="acts">
                      {st.activities.map((a, i) => (
                        <li key={a.id}>
                          <span className="a-title">
                            <span className="a-idx">{st.order}.{i + 1}</span>
                            <span>
                              {a.title}
                              {a.assignee && <span className="xs muted"> · {a.assignee}</span>}
                            </span>
                          </span>
                          <span className={`xs ${a.status === 'done' ? '' : 'muted'}`} style={{ whiteSpace: 'nowrap', fontWeight: a.status === 'done' ? 600 : 400 }}>
                            {ACTIVITY_STATUS[a.status]}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="btn-row" style={{ marginTop: 12 }}>
                      <Link className="btn sm" to={`/nhat-ky?view=stage&gd=${st.id}`}>Xem nhật ký giai đoạn {st.order}</Link>
                      {editable && <button className="btn sm ghost" onClick={() => setEdit(st)}>Sửa giai đoạn</button>}
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {edit && <StageEditor stage={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

export function StageEditor({ stage, onClose }: { stage: Stage; onClose: () => void }) {
  const [s, setS] = useState<Stage>(JSON.parse(JSON.stringify(stage)) as Stage);
  const { busy, run } = useAction();
  const setAct = (i: number, p: Partial<Activity>) => setS({ ...s, activities: s.activities.map((a, j) => (j === i ? { ...a, ...p } : a)) });
  const move = (i: number, d: number) => {
    const arr = [...s.activities];
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setS({ ...s, activities: arr });
  };
  return (
    <Modal
      title={`Sửa giai đoạn ${s.order}`}
      sub="Trạng thái được cập nhật thủ công — không tự đánh dấu hoàn thành theo ngày dự kiến."
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Hủy</button>
          <button className="btn primary" disabled={busy || !s.title.trim()} onClick={async () => (await run(() => saveStage(s), 'Đã lưu cấu trúc giai đoạn.')) && onClose()}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
        </>
      }
    >
      <div className="form">
        <div className="form-grid">
          <div className="fg full">
            <label>Tên giai đoạn</label>
            <input className="input" value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} />
          </div>
          <div className="fg full">
            <label>Mô tả ngắn</label>
            <textarea className="input" rows={2} value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} />
          </div>
          <div className="fg">
            <label>Khoảng thời gian thực hiện</label>
            <input className="input" value={s.period} placeholder="VD: 01/8/2026 – 31/8/2026" onChange={(e) => setS({ ...s, period: e.target.value })} />
            <label className="check">
              <input type="checkbox" checked={s.periodVerified} onChange={(e) => setS({ ...s, periodVerified: e.target.checked })} />
              Đã xác minh bằng minh chứng
            </label>
          </div>
          <div className="fg">
            <label>Trạng thái hồ sơ</label>
            <select className="input" value={s.status} onChange={(e) => setS({ ...s, status: e.target.value as StageStatus })}>
              {Object.entries(STAGE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
        <fieldset className="fieldset">
          <legend>Hoạt động & phân công</legend>
          <div className="grid" style={{ gap: 10 }}>
            {s.activities.map((a, i) => (
              <div key={a.id} className="card flat" style={{ padding: 12 }}>
                <div className="form-grid">
                  <div className="fg full">
                    <input className="input" aria-label={`Hoạt động ${i + 1}`} value={a.title} onChange={(e) => setAct(i, { title: e.target.value })} />
                  </div>
                  <select className="input" aria-label="Trạng thái" value={a.status} onChange={(e) => setAct(i, { status: e.target.value as ActivityStatus })}>
                    {Object.entries(ACTIVITY_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <select className="input" aria-label="Phân công" value={a.assignee ?? ''} onChange={(e) => setAct(i, { assignee: e.target.value })}>
                    <option value="">— Chưa phân công —</option>
                    {TEAM_NAMES.map((n) => <option key={n}>{n}</option>)}
                    <option>Cả nhóm</option>
                  </select>
                </div>
                <div className="btn-row" style={{ marginTop: 8 }}>
                  <button className="btn sm ghost" onClick={() => move(i, -1)} disabled={i === 0}>↑ Lên</button>
                  <button className="btn sm ghost" onClick={() => move(i, 1)} disabled={i === s.activities.length - 1}>↓ Xuống</button>
                  <button className="btn sm ghost danger" onClick={() => setS({ ...s, activities: s.activities.filter((_, j) => j !== i) })}>Xóa</button>
                </div>
              </div>
            ))}
            <button className="btn" onClick={() => setS({ ...s, activities: [...s.activities, { id: `${s.id}a${Date.now()}`, title: '', status: 'todo' }] })}>+ Thêm hoạt động</button>
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}
