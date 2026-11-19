import { useState } from 'react';
import type { ContentOrigin, DateCertainty, Entry, EntryEditable, Stage } from '../lib/types';
import { DATE_CERTAINTY, ORIGIN, TEAM_NAMES } from '../lib/defaults';
import { createEntry, submitEntry, updateEntry } from '../lib/data';
import { useAuth } from '../lib/auth';
import { Modal, useAction } from './ui';

const EMPTY: EntryEditable = {
  stageId: '', activityTitle: '', dateStart: '', dateEnd: '', dateCertainty: 'exact', dateNote: '', location: '',
  performers: [], performersNote: '', collaborators: '', objective: '', content: '', method: '', result: '',
  difficulties: '', solutions: '', lessons: '', nextSteps: '', origin: 'retrospective', originNote: '',
};

function pick(e: Entry): EntryEditable {
  const o = {} as Record<string, unknown>;
  for (const k of Object.keys(EMPTY)) o[k] = (e as unknown as Record<string, unknown>)[k] ?? (EMPTY as unknown as Record<string, unknown>)[k];
  return o as unknown as EntryEditable;
}

function validate(f: EntryEditable): string {
  if (!f.stageId) return 'Chọn giai đoạn nghiên cứu.';
  if (!f.activityTitle.trim()) return 'Nhập tên hoạt động.';
  if (!f.dateStart) return 'Nhập ngày (hoặc ngày bắt đầu) thực hiện thực tế.';
  if (f.dateEnd && f.dateEnd < f.dateStart) return 'Ngày kết thúc không được trước ngày bắt đầu.';
  if (f.dateCertainty === 'range' && !f.dateEnd) return 'Đã chọn “khoảng thời gian” — cần nhập ngày kết thúc.';
  if (f.dateCertainty === 'approximate' && !f.dateNote.trim()) return 'Ngày ước lượng — cần ghi chú căn cứ/mức độ chắc chắn.';
  if (!f.performers.length && !f.performersNote.trim()) return 'Chọn ít nhất một người thực hiện.';
  if (!f.content.trim()) return 'Nhập nội dung công việc đã thực hiện.';
  return '';
}

export function EntryForm({ entry, stages, onClose, onSaved, presetStage }: {
  entry?: Entry;
  stages: Stage[];
  onClose: () => void;
  onSaved?: (id: string) => void;
  presetStage?: string;
}) {
  const { me } = useAuth();
  const [f, setF] = useState<EntryEditable>(entry ? pick(entry) : { ...EMPTY, stageId: presetStage ?? '', performers: me && TEAM_NAMES.includes(me.name) ? [me.name] : [] });
  const [err, setErr] = useState('');
  const { busy, run } = useAction();
  const set = <K extends keyof EntryEditable>(k: K, v: EntryEditable[K]) => setF((x) => ({ ...x, [k]: v }));
  const stage = stages.find((s) => s.id === f.stageId);
  const afterVerify = entry?.status === 'verified';

  const save = async (andSubmit: boolean) => {
    const v = validate(f);
    setErr(v);
    if (v || !me) return;
    let id = entry?.id ?? '';
    const ok = await run(async () => {
      if (entry) {
        await updateEntry(entry, f, me);
        if (andSubmit && entry.status !== 'verified' && entry.status !== 'submitted') await submitEntry({ ...entry, ...f }, me);
      } else {
        id = await createEntry(f, me);
        if (andSubmit) await submitEntry({ id, version: 1 } as Entry, me);
      }
    }, andSubmit ? 'Đã lưu và gửi giáo viên xác nhận.' : 'Đã lưu nhật ký lên Firestore.');
    if (ok) {
      onSaved?.(id);
      onClose();
    }
  };

  const ta = (k: keyof EntryEditable, label: string, hint?: string, rows = 3) => (
    <div className="fg full">
      <label htmlFor={`f-${k}`}>{label}</label>
      <textarea id={`f-${k}`} className="input" rows={rows} value={f[k] as string} onChange={(e) => set(k, e.target.value as never)} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );

  return (
    <Modal
      title={entry ? `Chỉnh sửa nhật ký ${entry.code}` : 'Thêm nhật ký nghiên cứu'}
      sub={entry ? `Phiên bản hiện tại v${entry.version}` : 'Mã nhật ký và ngày nhập hệ thống được tạo tự động khi lưu.'}
      onClose={onClose}
      footer={
        <>
          {err && <span className="small" style={{ color: 'var(--danger)', marginRight: 'auto', fontWeight: 600 }}>{err}</span>}
          <button className="btn" onClick={onClose} disabled={busy}>Hủy</button>
          {!afterVerify && entry?.status !== 'submitted' && (
            <button className="btn" onClick={() => save(false)} disabled={busy}>Lưu bản nháp</button>
          )}
          <button className="btn primary" onClick={() => save(entry?.status !== 'submitted')} disabled={busy}>
            {busy ? 'Đang lưu…' : afterVerify ? 'Lưu phiên bản mới' : entry?.status === 'submitted' ? 'Lưu' : 'Lưu và gửi xác nhận'}
          </button>
        </>
      }
    >
      <div className="form">
        {afterVerify && (
          <div className="notice warn">
            <h4>Nhật ký đã được giáo viên xác nhận</h4>
            <p>Khi lưu, phiên bản v{entry!.version} được lưu trữ nguyên trạng; nội dung mới trở thành phiên bản v{entry!.version + 1} và cần giáo viên xác nhận lại. Trang công khai vẫn hiển thị phiên bản đã xác nhận cho tới khi có xác nhận mới.</p>
          </div>
        )}

        <fieldset className="fieldset">
          <legend>Thông tin hoạt động</legend>
          <div className="form-grid">
            <div className="fg">
              <label htmlFor="f-stage">Giai đoạn nghiên cứu *</label>
              <select id="f-stage" className="input" value={f.stageId} onChange={(e) => set('stageId', e.target.value)}>
                <option value="">— Chọn giai đoạn —</option>
                {stages.map((s) => <option key={s.id} value={s.id}>Giai đoạn {s.order}. {s.title}</option>)}
              </select>
            </div>
            <div className="fg">
              <label htmlFor="f-act">Tên hoạt động *</label>
              <input id="f-act" className="input" list="stage-acts" value={f.activityTitle} onChange={(e) => set('activityTitle', e.target.value)} />
              <datalist id="stage-acts">{stage?.activities.map((a) => <option key={a.id} value={a.title} />)}</datalist>
            </div>
            <div className="fg">
              <label htmlFor="f-ds">Ngày thực hiện / bắt đầu *</label>
              <input id="f-ds" type="date" className="input" value={f.dateStart} onChange={(e) => set('dateStart', e.target.value)} />
            </div>
            <div className="fg">
              <label htmlFor="f-de">Ngày kết thúc (nếu là khoảng)</label>
              <input id="f-de" type="date" className="input" value={f.dateEnd} onChange={(e) => set('dateEnd', e.target.value)} />
            </div>
            <div className="fg">
              <label htmlFor="f-dc">Mức độ chắc chắn của thời gian</label>
              <select id="f-dc" className="input" value={f.dateCertainty} onChange={(e) => set('dateCertainty', e.target.value as DateCertainty)}>
                {Object.entries(DATE_CERTAINTY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="fg">
              <label htmlFor="f-dn">Căn cứ xác định thời gian</label>
              <input id="f-dn" className="input" value={f.dateNote} onChange={(e) => set('dateNote', e.target.value)} placeholder="VD: theo biên bản họp; theo lịch sử chỉnh sửa Drive" />
            </div>
            <div className="fg full">
              <label htmlFor="f-loc">Địa điểm thực hiện</label>
              <input id="f-loc" className="input" value={f.location} onChange={(e) => set('location', e.target.value)} />
            </div>
            <div className="fg full">
              <span className="lbl">Người thực hiện *</span>
              <div className="checks">
                {TEAM_NAMES.map((n) => (
                  <label key={n} className="check">
                    <input type="checkbox" checked={f.performers.includes(n)} onChange={(e) => set('performers', e.target.checked ? [...f.performers, n] : f.performers.filter((x) => x !== n))} />
                    {n}
                  </label>
                ))}
              </div>
              <input className="input" value={f.performersNote} onChange={(e) => set('performersNote', e.target.value)} placeholder="Ghi chú vai trò, VD: Đàm Khánh An (chính)" />
            </div>
            <div className="fg full">
              <label htmlFor="f-col">Người phối hợp</label>
              <input id="f-col" className="input" value={f.collaborators} onChange={(e) => set('collaborators', e.target.value)} />
            </div>
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Nội dung nhật ký</legend>
          <div className="form-grid">
            {ta('objective', 'Mục tiêu hoạt động')}
            {ta('content', 'Nội dung công việc đã thực hiện *', undefined, 4)}
            {ta('method', 'Phương pháp hoặc cách thức thực hiện')}
            {ta('result', 'Kết quả thực tế', 'Chỉ ghi kết quả có thật, có thể kiểm chứng bằng minh chứng.')}
            {ta('difficulties', 'Khó khăn phát sinh')}
            {ta('solutions', 'Cách khắc phục hoặc điều chỉnh')}
            {ta('lessons', 'Bài học kinh nghiệm')}
            {ta('nextSteps', 'Công việc tiếp theo')}
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Nguồn gốc nội dung</legend>
          <div className="form-grid">
            <div className="fg full">
              <div className="checks" role="radiogroup">
                {(Object.keys(ORIGIN) as ContentOrigin[]).map((k) => (
                  <label key={k} className="check">
                    <input type="radio" name="origin" checked={f.origin === k} onChange={() => set('origin', k)} />
                    {ORIGIN[k].label}
                  </label>
                ))}
              </div>
              <span className="hint">{ORIGIN[f.origin].hint}</span>
            </div>
            {ta('originNote', 'Ghi chú nguồn gốc', 'VD: hồi cứu từ biên bản họp ngày …; suy luận từ lịch sử chỉnh sửa tệp.', 2)}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}
