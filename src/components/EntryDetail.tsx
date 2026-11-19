import { useState } from 'react';
import type { Entry, Stage } from '../lib/types';
import { ENTRY_STATUS, ORIGIN } from '../lib/defaults';
import { fmtCertainty, fmtRange, fmtTs } from '../lib/format';
import { deleteEntry, reviewEntry, submitEntry, unpublishEntry, useEntryHistory, useEntryVersions, useEvidence } from '../lib/data';
import { useAuth } from '../lib/auth';
import { Badge, FieldRow, Loading, Modal, useAction } from './ui';
import { EvidenceGrid, Uploader } from './Evidence';
import { EntryForm } from './EntryForm';
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export function StatusBadge({ s }: { s: Entry['status'] }) {
  const v = ENTRY_STATUS[s] ?? ENTRY_STATUS.draft;
  return <Badge tone={v.tone}>{v.label}</Badge>;
}

export function OriginBadge({ o }: { o: Entry['origin'] }) {
  return <span className="chip" title={ORIGIN[o]?.hint}>{ORIGIN[o]?.label ?? o}</span>;
}

export function isOwner(e: Entry, uid?: string, name?: string): boolean {
  return !!uid && (e.createdBy === uid || (!!name && e.performers.includes(name)));
}

export function EntryDetail({ entry, stages, onClose }: { entry: Entry; stages: Stage[]; onClose: () => void }) {
  const { team, teacher, me } = useAuth();
  const [tab, setTab] = useState<'content' | 'evidence' | 'history'>('content');
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState(entry.teacherComment ?? '');
  const ev = useEvidence(team, entry.id);
  const { busy, run } = useAction();
  const stage = stages.find((s) => s.id === entry.stageId);
  const owner = isOwner(entry, me?.uid, me?.name);
  const canEdit = team && !!me && (teacher || (owner && ['draft', 'returned', 'verified'].includes(entry.status)));

  const actions = me && team && (
    <>
      {(teacher || (owner && entry.status === 'draft' && entry.version === 1)) && entry.status !== 'verified' && (
        <button
          className="btn ghost danger"
          disabled={busy}
          style={{ marginRight: 'auto' }}
          onClick={() => confirm(`Xóa nhật ký ${entry.code}? Thao tác không thể hoàn tác.`) && run(() => deleteEntry(entry), 'Đã xóa nhật ký.').then((ok) => ok && onClose())}
        >
          Xóa
        </button>
      )}
      {owner && entry.status === 'submitted' && !teacher && (
        <button className="btn" disabled={busy} onClick={() => run(() => withdraw(entry, me), 'Đã rút lại để chỉnh sửa.')}>Rút lại để chỉnh sửa</button>
      )}
      {canEdit && (
        <button className="btn" onClick={() => setEditing(true)}>{entry.status === 'verified' ? 'Chỉnh sửa (tạo phiên bản mới)' : 'Chỉnh sửa'}</button>
      )}
      {(owner || teacher) && ['draft', 'returned'].includes(entry.status) && (
        <button className="btn primary" disabled={busy} onClick={() => run(() => submitEntry(entry, me), 'Đã gửi giáo viên xác nhận.')}>Gửi xác nhận</button>
      )}
      {teacher && entry.status === 'verified' && (
        <button className="btn" disabled={busy} onClick={() => confirm('Gỡ nhật ký này khỏi trang công khai?') && run(() => unpublishEntry(entry, me), 'Đã gỡ khỏi trang công khai.')}>Gỡ công bố</button>
      )}
    </>
  );

  return (
    <>
      <Modal
        title={<><span className="code">{entry.code}</span> · {entry.activityTitle}</>}
        sub={
          <span className="btn-row" style={{ gap: 8 }}>
            <StatusBadge s={entry.status} /> <OriginBadge o={entry.origin} /> <span>Phiên bản v{entry.version}</span>
          </span>
        }
        onClose={onClose}
        footer={actions}
      >
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'content'} onClick={() => setTab('content')}>Nội dung</button>
          <button role="tab" aria-selected={tab === 'evidence'} onClick={() => setTab('evidence')}>Minh chứng ({ev.data.length})</button>
          {team && <button role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}>Lịch sử & phiên bản</button>}
        </div>

        {tab === 'content' && (
          <>
            {teacher && entry.status === 'submitted' && (
              <div className="notice info">
                <h4>Kiểm tra và xác nhận</h4>
                <p className="small">Thời điểm xác nhận do máy chủ ghi tự động và không chỉnh sửa được. Ứng dụng không tạo chữ ký thay giáo viên.</p>
                <textarea className="input" rows={3} placeholder="Nhận xét của giáo viên" value={comment} onChange={(e) => setComment(e.target.value)} />
                <div className="btn-row" style={{ marginTop: 10 }}>
                  <button className="btn primary" disabled={busy} onClick={() => run(() => reviewEntry(entry, 'verified', comment, me!), 'Đã xác nhận nhật ký và công bố cho giám khảo.')}>Xác nhận</button>
                  <button className="btn" disabled={busy || !comment.trim()} onClick={() => run(() => reviewEntry(entry, 'returned', comment, me!), 'Đã trả lại để học sinh bổ sung.')}>Trả lại để bổ sung</button>
                </div>
              </div>
            )}
            {entry.status === 'returned' && entry.teacherComment && (
              <div className="notice warn"><h4>Giáo viên yêu cầu bổ sung</h4><p>{entry.teacherComment}</p></div>
            )}
            <div className="fields">
              <FieldRow label="Mã nhật ký" value={<span className="code">{entry.code}</span>} />
              <FieldRow label="Giai đoạn" value={stage ? `Giai đoạn ${stage.order}. ${stage.title}` : ''} />
              <FieldRow label="Tên hoạt động" value={entry.activityTitle} />
              <FieldRow label="Thời gian thực hiện" value={<>{fmtRange(entry)}<div className="small muted">{fmtCertainty(entry)}</div></>} />
              <FieldRow label="Ngày nhập hệ thống" value={<>{fmtTs(entry.createdAt)} <span className="small muted">(tự động, không sửa được)</span></>} />
              <FieldRow label="Địa điểm" value={entry.location} />
              <FieldRow label="Người thực hiện" value={[entry.performers.join(', '), entry.performersNote].filter(Boolean).join(' — ')} />
              <FieldRow label="Người phối hợp" value={entry.collaborators} />
              <FieldRow label="Mục tiêu hoạt động" value={entry.objective} />
              <FieldRow label="Nội dung đã thực hiện" value={entry.content} />
              <FieldRow label="Phương pháp / cách thức" value={entry.method} />
              <FieldRow label="Kết quả thực tế" value={entry.result} />
              <FieldRow label="Khó khăn phát sinh" value={entry.difficulties} />
              <FieldRow label="Cách khắc phục / điều chỉnh" value={entry.solutions} />
              <FieldRow label="Bài học kinh nghiệm" value={entry.lessons} />
              <FieldRow label="Công việc tiếp theo" value={entry.nextSteps} />
              <FieldRow label="Nguồn gốc nội dung" value={<><OriginBadge o={entry.origin} /> {entry.originNote}</>} />
              <FieldRow label="Trạng thái kiểm duyệt" value={<StatusBadge s={entry.status} />} />
              <FieldRow label="Nhận xét của giáo viên" value={entry.teacherComment} />
              <FieldRow
                label="Ngày giáo viên xác nhận"
                value={entry.verifiedAt ? `${fmtTs(entry.verifiedAt)} — ${entry.verifiedByName} (xác nhận điện tử trên hệ thống)` : ''}
              />
              {team && <FieldRow label="Cập nhật gần nhất" value={`${fmtTs(entry.updatedAt)} — ${entry.updatedByName}`} />}
            </div>
          </>
        )}

        {tab === 'evidence' && (
          <div className="grid" style={{ gap: 20 }}>
            {team && me && <Uploader entry={entry} />}
            {ev.loading ? <Loading /> : <EvidenceGrid list={ev.data} manage={team} empty={team ? 'Chưa có minh chứng cho nhật ký này.' : 'Chưa có minh chứng đã được duyệt cho nhật ký này.'} />}
          </div>
        )}

        {tab === 'history' && team && <History entry={entry} />}
      </Modal>
      {editing && <EntryForm entry={entry} stages={stages} onClose={() => setEditing(false)} />}
    </>
  );
}

async function withdraw(entry: Entry, me: { uid: string; name: string }) {
  await updateDoc(doc(db(), 'entries', entry.id), { status: 'draft', updatedAt: serverTimestamp(), updatedBy: me.uid, updatedByName: me.name });
}

function History({ entry }: { entry: Entry }) {
  const h = useEntryHistory(entry.id, true);
  const v = useEntryVersions(entry.id, true);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="grid" style={{ gap: 24 }}>
      <div>
        <h3>Lịch sử thay đổi</h3>
        {h.loading ? <Loading /> : (
          <ul className="hist">
            {h.data.map((x) => (
              <li key={x.id}>
                <span>{x.note}</span>
                <span className="xs muted">{fmtTs(x.at)} · {x.byName}{x.version ? ` · v${x.version}` : ''}</span>
              </li>
            ))}
            {!h.data.length && <li className="muted">Chưa có lịch sử.</li>}
          </ul>
        )}
      </div>
      <div>
        <h3>Phiên bản đã lưu trữ</h3>
        <p className="small muted">Mỗi lần chỉnh sửa sau khi giáo viên xác nhận, phiên bản cũ được lưu nguyên trạng tại đây và không thể sửa hoặc xóa.</p>
        {v.data.length === 0 && <p className="muted small">Chưa có phiên bản lưu trữ.</p>}
        {[...v.data].sort((a, b) => Number(b.id) - Number(a.id)).map((x) => (
          <div key={x.id} className="card flat" style={{ marginBottom: 10, padding: 14 }}>
            <div className="btn-row" style={{ justifyContent: 'space-between' }}>
              <strong>Phiên bản v{x.id}</strong>
              <span className="xs muted">Lưu trữ {fmtTs(x.archivedAt)} · xác nhận {fmtTs(x.verifiedAt)} bởi {x.verifiedByName || '—'}</span>
              <button className="link-btn" onClick={() => setOpen(open === x.id ? null : x.id)}>{open === x.id ? 'Thu gọn' : 'Xem nội dung'}</button>
            </div>
            {open === x.id && (
              <div className="fields" style={{ marginTop: 10 }}>
                <FieldRow label="Tên hoạt động" value={x.activityTitle} />
                <FieldRow label="Thời gian" value={fmtRange(x)} />
                <FieldRow label="Nội dung" value={x.content} />
                <FieldRow label="Kết quả" value={x.result} />
                <FieldRow label="Nhận xét GV" value={x.teacherComment} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
