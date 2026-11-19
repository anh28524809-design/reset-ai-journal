import { useAuth } from '../lib/auth';
import { seedStages, useEntries, useStages } from '../lib/data';
import { StageTimeline } from '../components/Stages';
import { ErrorNote, Loading, PageHead, useAction } from '../components/ui';

export default function Progress() {
  const { team, teacher } = useAuth();
  const stages = useStages();
  const entries = useEntries(team);
  const { busy, run } = useAction();

  return (
    <>
      <PageHead
        eyebrow="Trang 2"
        title="Tiến trình nghiên cứu"
        lead="Sáu giai đoạn của dự án, mỗi giai đoạn gồm các hoạt động nhỏ. Trạng thái hồ sơ do giáo viên cập nhật dựa trên nhật ký và minh chứng — không tự động đánh dấu hoàn thành theo ngày dự kiến."
      />
      <ErrorNote error={stages.error} />
      {teacher && stages.isDefault && !stages.loading && (
        <div className="notice info">
          <h4>Cấu trúc giai đoạn chưa được lưu</h4>
          <p>Đang hiển thị cấu trúc 6 giai đoạn mặc định theo đề cương. Lưu vào Firestore để có thể sửa, thêm, sắp xếp hoạt động và phân công.</p>
          <button className="btn primary sm" disabled={busy} onClick={() => run(seedStages, 'Đã lưu cấu trúc 6 giai đoạn.')}>Lưu cấu trúc giai đoạn</button>
        </div>
      )}
      {stages.loading ? <Loading /> : <StageTimeline stages={stages.data} entries={entries.data} editable={teacher && !stages.isDefault} />}
    </>
  );
}
