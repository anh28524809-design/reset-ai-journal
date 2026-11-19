import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../lib/auth';
import { buildBackup, createEntry, removeRole, saveProject, saveResult, setRole, useEntries, useProject, useRoles } from '../lib/data';
import { TEAM_NAMES } from '../lib/defaults';
import { db } from '../lib/firebase';
import { downloadBlob } from '../lib/format';
import { PHU_LUC_VIII_PRELIM_RESULT, PHU_LUC_VIII_ROWS } from '../lib/phuLucVIII';
import type { ProjectInfo, Role } from '../lib/types';
import { Loading, PageHead, SectionTitle, useAction, useToast } from '../components/ui';

export default function Admin() {
  const { isTeacher, ready } = useAuth();
  if (!ready) return <Loading />;
  if (!isTeacher) return <Navigate to="/" replace />;
  return (
    <>
      <PageHead eyebrow="Quản trị" title="Quản trị ứng dụng" lead="Chỉ giáo viên hướng dẫn truy cập được trang này. Mọi thao tác đều được Security Rules kiểm tra trên máy chủ." />
      <Members />
      <ImportPaper />
      <ProjectForm />
      <Backup />
    </>
  );
}

function Members() {
  const { me } = useAuth();
  const roles = useRoles(true);
  const [f, setF] = useState({ email: '', name: TEAM_NAMES[0], role: 'student' as Role });
  const { busy, run } = useAction();
  return (
    <section className="section" style={{ marginTop: 0 }}>
      <SectionTitle title="Thành viên và phân quyền" />
      <div className="card">
        <p className="small muted">Thành viên đăng nhập bằng tài khoản Google. Tên hiển thị phải trùng với tên trong nhật ký để học sinh sửa được bản nháp mình thực hiện. Giám khảo không cần tài khoản.</p>
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table className="t">
            <thead><tr><th>Email</th><th>Họ tên</th><th>Vai trò</th><th /></tr></thead>
            <tbody>
              {roles.data.map((r) => (
                <tr key={r.id}>
                  <td style={{ overflowWrap: 'anywhere' }}>{r.id}</td>
                  <td>{r.name}</td>
                  <td>{r.role === 'teacher' ? 'Giáo viên (quản trị)' : 'Học sinh'}</td>
                  <td>{r.id !== me?.email.toLowerCase() && <button className="link-btn" onClick={() => confirm(`Thu hồi quyền của ${r.id}?`) && run(() => removeRole(r.id), 'Đã thu hồi quyền.')}>Thu hồi</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', alignItems: 'end' }}>
          <div className="fg"><label>Email Google</label><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="fg"><label>Họ tên</label><input className="input" list="adm-names" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><datalist id="adm-names">{TEAM_NAMES.map((n) => <option key={n} value={n} />)}</datalist></div>
          <div className="fg"><label>Vai trò</label>
            <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
              <option value="student">Học sinh</option>
              <option value="teacher">Giáo viên (quản trị)</option>
            </select>
          </div>
          <button className="btn primary" disabled={busy || !/^\S+@\S+\.\S+$/.test(f.email) || !f.name.trim()} onClick={async () => (await run(() => setRole(f.email, f.role, f.name), 'Đã cấp quyền.')) && setF({ ...f, email: '' })}>Cấp quyền</button>
        </div>
      </div>
    </section>
  );
}

function ImportPaper() {
  const { me } = useAuth();
  const entries = useEntries(true);
  const toast = useToast();
  const [progress, setProgress] = useState<string>('');
  const imported = entries.data.filter((e) => e.importKey?.startsWith('PL8-')).length;

  const doImport = async () => {
    if (!me) return;
    if (!confirm(`Nhập ${PHU_LUC_VIII_ROWS.length} dòng nhật ký từ Phụ lục VIII? Các dòng đã nhập trước đó sẽ được bỏ qua.`)) return;
    let n = 0;
    try {
      for (const r of PHU_LUC_VIII_ROWS) {
        const key = `PL8-${String(r.tt).padStart(2, '0')}`;
        setProgress(`Đang nhập dòng ${r.tt}/${PHU_LUC_VIII_ROWS.length}…`);
        const exists = await getDocs(query(collection(db(), 'entries'), where('importKey', '==', key)));
        if (!exists.empty) continue;
        await createEntry(
          {
            stageId: r.stageId, activityTitle: r.activityTitle, dateStart: r.dateStart, dateEnd: r.dateEnd,
            dateCertainty: r.dateEnd ? 'range' : 'exact',
            dateNote: `Theo Phụ lục VIII (bản ngày 18/11/2026): ${r.dateText}`,
            location: r.location, performers: r.performers, performersNote: r.performersText, collaborators: '',
            objective: '', content: r.content, method: '', result: r.result, difficulties: '', solutions: '', lessons: '', nextSteps: '',
            origin: 'retrospective',
            originNote: `Hồi cứu từ Phụ lục VIII (bản ngày 18/11/2026), dòng ${r.tt}. Minh chứng kê khai trên bản giấy: ${r.evidenceText}.${r.paperConfirm ? ` Cột xác nhận trên bản giấy ghi: “${r.paperConfirm}”.` : ''} Cần tải tệp minh chứng thật và giáo viên xác nhận lại trên hệ thống.`,
          },
          me,
          key,
        );
        n++;
      }
      const res = await getDocs(query(collection(db(), 'results'), where('title', '==', PHU_LUC_VIII_PRELIM_RESULT.title)));
      if (res.empty) {
        await saveResult(null, {
          section: 'survey', order: 1, chartType: 'proportion', evidenceLevel: 'preliminary', published: false,
          interpretation: 'Số liệu nhập từ Phụ lục VIII (dòng 14). Cần đối chiếu với file xử lí số liệu trước khi công bố.',
          ...PHU_LUC_VIII_PRELIM_RESULT,
        }, me);
      }
      toast('ok', `Đã nhập ${n} nhật ký mới (bản nháp, nội dung hồi cứu).`);
    } catch (e) {
      toast('err', `Dừng ở bước nhập — đã lưu ${n} dòng. ${(e as Error).message}`);
    } finally {
      setProgress('');
    }
  };

  return (
    <section className="section">
      <SectionTitle title="Số hóa Phụ lục VIII" />
      <div className="card">
        <p>Nhập 16 dòng nhật ký của bản Phụ lục VIII (ngày 18/11/2026) vào hệ thống. Mỗi dòng được ghi là <strong>nội dung hồi cứu</strong>, ở trạng thái <strong>bản nháp</strong>, kèm ghi chú nguồn và danh mục minh chứng kê khai. Ghi chú “Xác nhận T8…T11” trên bản giấy không được chuyển thành xác nhận điện tử — giáo viên cần xác nhận lại sau khi học sinh bổ sung minh chứng thật.</p>
        <p className="small muted">Kết quả bước đầu ở dòng 14 được nhập thành một bản kết quả chưa công bố để nhóm đối chiếu với file xử lí số liệu.</p>
        <div className="btn-row">
          <button className="btn primary" disabled={!!progress || entries.loading} onClick={doImport}>{progress || 'Nhập từ Phụ lục VIII'}</button>
          <span className="small muted">Đã nhập: {imported}/{PHU_LUC_VIII_ROWS.length}</span>
        </div>
      </div>
    </section>
  );
}

function ProjectForm() {
  const current = useProject();
  const [p, setP] = useState<ProjectInfo | null>(null);
  const v = p ?? current;
  const set = (patch: Partial<ProjectInfo>) => setP({ ...v, ...patch });
  const { busy, run } = useAction();
  const inp = (k: keyof ProjectInfo, label: string, area = false) => (
    <div className="fg full">
      <label>{label}</label>
      {area ? (
        <textarea className="input" rows={3} value={v[k] as string} onChange={(e) => set({ [k]: e.target.value } as Partial<ProjectInfo>)} />
      ) : (
        <input className="input" value={v[k] as string} onChange={(e) => set({ [k]: e.target.value } as Partial<ProjectInfo>)} />
      )}
    </div>
  );
  return (
    <section className="section">
      <SectionTitle title="Thông tin dự án (trang Tổng quan)" />
      <div className="card form">
        <div className="form-grid">
          {inp('name', 'Tên dự án', true)}
          {inp('field', 'Lĩnh vực')}
          {inp('unit', 'Đơn vị thực hiện')}
          {inp('period', 'Thời gian thực hiện')}
          {inp('basis', 'Căn cứ hồ sơ')}
          {inp('advisor', 'Giáo viên hướng dẫn')}
          {inp('objectives', 'Mục tiêu nghiên cứu', true)}
          {inp('questions', 'Câu hỏi nghiên cứu', true)}
          {inp('deviceIntro', 'Giới thiệu thiết bị RESET-AI', true)}
        </div>
        <fieldset className="fieldset">
          <legend>Thành viên nhóm</legend>
          {v.members.map((m, i) => (
            <div key={i} className="form-grid" style={{ marginBottom: 10 }}>
              <input className="input" aria-label="Họ tên" value={m.name} onChange={(e) => set({ members: v.members.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
              <input className="input" aria-label="Vai trò" value={m.role} onChange={(e) => set({ members: v.members.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)) })} />
              <input className="input full" aria-label="Ghi chú" value={m.note ?? ''} onChange={(e) => set({ members: v.members.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)) })} />
            </div>
          ))}
        </fieldset>
        <fieldset className="fieldset">
          <legend>Quy trình 3T</legend>
          {v.process3T.map((s, i) => (
            <div key={i} className="form-grid" style={{ marginBottom: 10 }}>
              <input className="input" aria-label={`Bước ${i + 1}`} value={s.title} onChange={(e) => set({ process3T: v.process3T.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
              <input className="input" aria-label={`Mô tả bước ${i + 1}`} value={s.desc} onChange={(e) => set({ process3T: v.process3T.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)) })} />
            </div>
          ))}
        </fieldset>
        <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn primary" disabled={busy || !p} onClick={async () => (await run(() => saveProject(v), 'Đã lưu thông tin dự án.')) && setP(null)}>Lưu thông tin dự án</button>
        </div>
      </div>
    </section>
  );
}

function Backup() {
  const { busy, run } = useAction();
  return (
    <section className="section">
      <SectionTitle title="Sao lưu và xuất dữ liệu" />
      <div className="card">
        <p>Tải toàn bộ metadata Firestore (nhật ký, lịch sử, phiên bản, minh chứng, kết quả, hồ sơ, phân quyền) thành một tệp JSON. Tệp gốc (ảnh, video, tài liệu) vẫn nằm trên Firebase Cloud Storage theo đường dẫn ghi trong tệp sao lưu.</p>
        <button
          className="btn primary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const data = await buildBackup();
              downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `reset-ai-backup-${new Date().toISOString().slice(0, 10)}.json`);
            }, 'Đã tạo tệp sao lưu.')
          }
        >
          {busy ? 'Đang tổng hợp…' : 'Tải tệp sao lưu (.json)'}
        </button>
      </div>
    </section>
  );
}
