import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useEntries, useEvidence, useProject, usePublicStats, useStages } from '../lib/data';
import { FEATURED_PRIORITY } from '../lib/defaults';
import { firebaseReady } from '../lib/firebase';
import { fmtNum, fmtTs, isImage, isVideo } from '../lib/format';
import type { Evidence } from '../lib/types';
import { EvidenceGrid } from '../components/Evidence';
import { StageTimeline } from '../components/Stages';
import { Empty, SectionTitle } from '../components/ui';

function pickFeatured(list: Evidence[]): Evidence[] {
  const score = (e: Evidence) => {
    let s = 0;
    if (e.featured) s += 100;
    const p = FEATURED_PRIORITY.indexOf(e.kind);
    if (p >= 0) s += 40 - p * 5;
    if (isImage(e.contentType) || isVideo(e.contentType)) s += 20;
    return s;
  };
  return [...list].sort((a, b) => score(b) - score(a)).slice(0, 6);
}

export default function Overview() {
  const { team } = useAuth();
  const p = useProject();
  const stages = useStages();
  const entries = useEntries(team);
  const evidence = useEvidence(team);
  const pub = usePublicStats();

  // Chỉ số: thành viên thấy số liệu trực tiếp; giám khảo thấy số liệu công khai do hệ thống đồng bộ từ dữ liệu thật
  const approved = evidence.data.filter((e) => (team ? e.approved : true));
  const stats = team
    ? {
        stages: stages.data.length,
        entries: entries.data.length,
        evidenceApproved: approved.length,
        entriesVerified: entries.data.filter((e) => e.status === 'verified').length,
        note: 'Tính trực tiếp từ Firestore',
      }
    : {
        stages: stages.data.length,
        entries: pub.data?.entries ?? entries.data.length,
        evidenceApproved: evidence.data.length,
        entriesVerified: entries.data.length,
        note: pub.data?.updatedAt ? `Đồng bộ lúc ${fmtTs(pub.data.updatedAt)}` : 'Tính từ dữ liệu đã công bố',
      };
  const featured = pickFeatured(approved);
  const cards = [
    { n: stats.stages, l: 'Giai đoạn nghiên cứu' },
    { n: stats.entries, l: 'Hoạt động có nhật ký' },
    { n: stats.evidenceApproved, l: 'Minh chứng đã được duyệt' },
    { n: stats.entriesVerified, l: 'Hoạt động đã được giáo viên xác nhận' },
  ];

  return (
    <>
      {/* A. Thông tin dự án */}
      <section aria-labelledby="project">
        <div className="page-head" style={{ marginBottom: 16 }}>
          <div className="eyebrow">Hồ sơ dự án khoa học kỹ thuật · {p.field}</div>
        </div>
        <h1 id="project" className="project-title">{p.name}</h1>
        <div className="grid" style={{ alignItems: 'start' }}>
          <div className="card">
            <dl className="kv cols">
              <dt>Lĩnh vực</dt><dd>{p.field}</dd>
              <dt>Đơn vị thực hiện</dt><dd>{p.unit}</dd>
              <dt>Nhóm nghiên cứu</dt>
              <dd>
                {p.members.map((m) => (
                  <div key={m.name}><strong>{m.name}</strong> <span className="small muted">– {m.role}{m.note ? ` · ${m.note}` : ''}</span></div>
                ))}
              </dd>
              <dt>Giáo viên hướng dẫn</dt><dd>{p.advisor}</dd>
              <dt>Thời gian thực hiện</dt><dd>{p.period}</dd>
              <dt>Căn cứ hồ sơ</dt><dd>{p.basis}</dd>
            </dl>
          </div>
          <div className="grid grid-2" style={{ gap: 16 }}>
            {(p.objectives || team) && (
              <div className="card tint">
                <h3>Mục tiêu nghiên cứu</h3>
                {p.objectives ? <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{p.objectives}</p> : <p className="muted small" style={{ margin: 0 }}>Chưa cập nhật. Giáo viên nhập trong mục Quản trị → Thông tin dự án.</p>}
              </div>
            )}
            {(p.questions || team) && (
              <div className="card tint">
                <h3>Câu hỏi nghiên cứu</h3>
                {p.questions ? <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{p.questions}</p> : <p className="muted small" style={{ margin: 0 }}>Chưa cập nhật. Giáo viên nhập trong mục Quản trị → Thông tin dự án.</p>}
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h3>Trạm RESET-AI và quy trình 3T</h3>
          <p style={{ color: 'var(--ink-2)' }}>{p.deviceIntro}</p>
          <div className="t3">
            {p.process3T.map((s, i) => (
              <div className="t3-step" key={i}>
                <span className="n">T{i + 1}</span>
                <strong>{s.title}</strong>
                <span className="small" style={{ color: 'var(--ink-2)' }}>{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* B. Chỉ số */}
      <section className="section" aria-label="Chỉ số tổng quan">
        <SectionTitle tag="B" title="Chỉ số hồ sơ" right={<span className="xs muted">{firebaseReady ? stats.note : 'Chưa kết nối Firebase'}</span>} />
        <div className="grid grid-4">
          {cards.map((c) => (
            <div className="card stat" key={c.l}>
              <div className="num">{firebaseReady ? fmtNum(c.n) : '—'}</div>
              <div className="lbl">{c.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* C. Hành trình */}
      <section className="section">
        <SectionTitle tag="C" title="Hành trình nghiên cứu" right={<Link to="/tien-trinh" className="small">Xem toàn bộ tiến trình →</Link>} />
        <StageTimeline stages={stages.data} entries={entries.data} compact />
      </section>

      {/* D. Minh chứng nổi bật */}
      <section className="section">
        <SectionTitle tag="D" title="Minh chứng nổi bật" right={<Link to="/nhat-ky" className="small">Xem nhật ký và minh chứng →</Link>} />
        {featured.length ? (
          <EvidenceGrid list={featured} />
        ) : (
          <Empty>Chưa có minh chứng nào được giáo viên duyệt công bố. Trang chỉ hiển thị minh chứng thật đã được duyệt — không dùng ảnh minh họa thay thế.</Empty>
        )}
      </section>
    </>
  );
}
