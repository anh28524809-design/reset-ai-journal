import { firebaseReady, projectId } from '../lib/firebase';
import { PageHead } from '../components/ui';

export default function Setup() {
  return (
    <>
      <PageHead
        eyebrow="Cấu hình"
        title="Kết nối Firebase"
        lead={firebaseReady ? `Ứng dụng đã được build với cấu hình Firebase của dự án “${projectId}”.` : 'Ứng dụng chưa có cấu hình Firebase nên chưa lưu được dữ liệu. Thực hiện một lần theo các bước dưới đây.'}
      />
      <div className="card">
        <ol style={{ paddingLeft: 22, margin: 0, display: 'grid', gap: 12 }}>
          <li>Vào <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer">console.firebase.google.com</a>, tạo dự án mới (ví dụ <code>reset-ai-journal</code>).</li>
          <li><strong>Authentication</strong> → Sign-in method → bật <strong>Google</strong>. Tại Settings → Authorized domains, thêm tên miền trang web (ví dụ <code>&lt;tên-tài-khoản&gt;.github.io</code>).</li>
          <li><strong>Firestore Database</strong> → Create database (chế độ production, vùng <code>asia-southeast1</code>).</li>
          <li><strong>Storage</strong> → Get started. Firebase yêu cầu gói Blaze (trả theo mức dùng, có hạn mức miễn phí) để dùng Cloud Storage cho dự án mới.</li>
          <li>Triển khai Security Rules trong mã nguồn: <code>firebase deploy --only firestore:rules,storage</code> (hoặc dán nội dung <code>firestore.rules</code>, <code>storage.rules</code> vào tab Rules). Khi được hỏi, cho phép Storage đọc Firestore (cross-service rules).</li>
          <li>Project settings → Your apps → thêm <strong>Web app</strong>, sao chép 6 giá trị cấu hình (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).</li>
          <li>Trên GitHub: Settings → Secrets and variables → Actions → tab <strong>Variables</strong>, tạo 6 biến <code>VITE_FIREBASE_API_KEY</code>, <code>VITE_FIREBASE_AUTH_DOMAIN</code>, <code>VITE_FIREBASE_PROJECT_ID</code>, <code>VITE_FIREBASE_STORAGE_BUCKET</code>, <code>VITE_FIREBASE_MESSAGING_SENDER_ID</code>, <code>VITE_FIREBASE_APP_ID</code>. Sau đó chạy lại workflow “Deploy to GitHub Pages”.</li>
          <li>Tạo tài khoản quản trị đầu tiên: Firestore → collection <code>roles</code> → document ID là email Google của giáo viên (viết thường) với 2 trường <code>role</code> = <code>teacher</code>, <code>name</code> = <code>Vũ Thúy Mai</code>. Sau đó giáo viên đăng nhập và cấp quyền cho học sinh trong trang Quản trị.</li>
        </ol>
      </div>
      <div className="notice info" style={{ marginTop: 20 }}>
        <h4>Về tính trung thực của dữ liệu</h4>
        <p>Ứng dụng không chứa dữ liệu mẫu. Khi chưa kết nối, không thao tác nào báo “lưu thành công”. Ngày nhập hệ thống, thời điểm xác nhận và lịch sử thay đổi do máy chủ Firebase ghi và được Security Rules bảo vệ khỏi chỉnh sửa.</p>
      </div>
    </>
  );
}
