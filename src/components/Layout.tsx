import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { firebaseReady } from '../lib/firebase';
import { useAction } from './ui';

export const NAV = [
  { to: '/', label: 'Tổng quan' },
  { to: '/tien-trinh', label: 'Tiến trình nghiên cứu' },
  { to: '/nhat-ky', label: 'Nhật ký và minh chứng' },
  { to: '/ket-qua', label: 'Kết quả nghiên cứu' },
  { to: '/ho-so', label: 'Hồ sơ khoa học' },
];

function usePresent() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const f = () => {
      const active = !!document.fullscreenElement;
      setOn(active);
      document.body.classList.toggle('present', active);
    };
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);
  const toggle = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else {
      // iOS Safari: không hỗ trợ Fullscreen API — vẫn phóng to chữ
      document.body.classList.toggle('present');
      setOn(document.body.classList.contains('present'));
    }
  };
  return { on, toggle };
}

function UserMenu() {
  const { user, me, role, isMember, isTeacher, viewAsPublic, setViewAsPublic, signIn, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { busy, run } = useAction();
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!firebaseReady) return null;
  if (!user)
    return (
      <button className="btn sm" disabled={busy} onClick={() => run(signIn)}>
        Đăng nhập
      </button>
    );
  const initials = (me?.name ?? '?').split(' ').slice(-1)[0].slice(0, 1).toUpperCase();
  return (
    <div className="menu" ref={ref}>
      <button className="icon-btn" style={{ borderRadius: '50%', padding: 0 }} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} aria-label="Tài khoản">
        <span className="avatar">{initials}</span>
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          <div className="who">
            <strong>{me?.name}</strong>
            <span className="xs muted">{me?.email}</span>
            <div className="xs" style={{ marginTop: 4 }}>
              {role === 'teacher' ? 'Giáo viên hướng dẫn · quản trị' : role === 'student' ? 'Học sinh nghiên cứu' : 'Chưa được cấp quyền — chỉ xem như giám khảo'}
            </div>
          </div>
          {isMember && (
            <button role="menuitemcheckbox" aria-checked={viewAsPublic} onClick={() => { setViewAsPublic(!viewAsPublic); setOpen(false); }}>
              {viewAsPublic ? '✓ ' : ''}Xem như giám khảo (kiểm tra trước khi công bố)
            </button>
          )}
          {isTeacher && <Link to="/quan-tri" onClick={() => setOpen(false)}>Quản trị ứng dụng</Link>}
          <button onClick={() => { setOpen(false); void run(signOut); }}>Đăng xuất</button>
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  const { on, toggle } = usePresent();
  const { user, isMember, ready, viewAsPublic, setViewAsPublic } = useAuth();
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  return (
    <>
      <a href="#main" className="sr-only">Bỏ qua điều hướng</a>
      <header className="header">
        <div className="container header-in">
          <Link to="/" className="brand" aria-label="RESET-AI – trang tổng quan">
            <span className="brand-mark">RA</span>
            <span className="brand-text">
              <strong>RESET-AI</strong>
              <span>Hồ sơ và nhật ký nghiên cứu khoa học</span>
            </span>
          </Link>
          <nav className="nav" aria-label="Điều hướng chính">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'}>{n.label}</NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <button className="icon-btn" onClick={toggle} title={on ? 'Thoát trình chiếu' : 'Chế độ trình chiếu toàn màn hình'} aria-label={on ? 'Thoát trình chiếu' : 'Trình chiếu toàn màn hình'}>
              {on ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
              )}
            </button>
            <UserMenu />
            <button className="icon-btn menu-btn" aria-expanded={menu} aria-label="Mở menu" onClick={() => setMenu(!menu)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
          </div>
        </div>
        {menu && (
          <nav className="mobile-nav" aria-label="Điều hướng chính">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'}>{n.label}</NavLink>
            ))}
          </nav>
        )}
      </header>
      {viewAsPublic && (
        <div className="preview-bar">
          <div className="container">
            <span>Đang xem như giám khảo — chỉ hiển thị nội dung đã được giáo viên duyệt.</span>
            <button className="btn sm" onClick={() => setViewAsPublic(false)}>Thoát chế độ xem trước</button>
          </div>
        </div>
      )}
      <main id="main">
        <div className="container">
          {!firebaseReady && <SetupBanner />}
          {firebaseReady && ready && user && !isMember && (
            <div className="notice info">
              <h4>Tài khoản chưa được cấp quyền</h4>
              <p>Bạn đang xem với quyền giám khảo. Liên hệ giáo viên hướng dẫn để được thêm vào danh sách thành viên.</p>
            </div>
          )}
          {children}
        </div>
      </main>
      <footer className="footer">
        <div className="container">
          <p style={{ marginBottom: 4 }}><strong>RESET-AI</strong> · Trường THPT Chuyên Bắc Kạn · Lĩnh vực Khoa học xã hội và hành vi</p>
          <p style={{ margin: 0 }}>
            Đây là hồ sơ tổng hợp bổ sung từ quá trình nghiên cứu đã thực hiện, không phải nhật ký được ghi trực tiếp tại thời điểm diễn ra hoạt động. Mỗi bản ghi nêu rõ nguồn gốc nội dung và thời điểm nhập hệ thống.
          </p>
        </div>
      </footer>
    </>
  );
}

function SetupBanner() {
  return (
    <div className="notice warn" role="status">
      <h4>Chưa kết nối Firebase — dữ liệu chưa thể lưu</h4>
      <p>
        Ứng dụng đang hiển thị cấu trúc hồ sơ mặc định. Mọi thao tác đăng nhập, ghi nhật ký và tải minh chứng đều bị tắt cho tới khi cấu hình Firebase.{' '}
        <Link to="/huong-dan">Xem các bước cấu hình</Link>.
      </p>
    </div>
  );
}
