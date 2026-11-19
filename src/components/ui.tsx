import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function Badge({ tone, children, plain }: { tone: string; children: ReactNode; plain?: boolean }) {
  return <span className={`badge ${tone}${plain ? ' plain' : ''}`}>{children}</span>;
}

export function Loading({ text = 'Đang tải dữ liệu…' }: { text?: string }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden /> {text}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function ErrorNote({ error }: { error: string }) {
  if (!error) return null;
  return (
    <div className="notice danger" role="alert">
      <h4>Không đọc được dữ liệu</h4>
      <p>{error}</p>
    </div>
  );
}

export function PageHead({ eyebrow, title, lead, actions }: { eyebrow?: string; title: string; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="page-head-row">
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1>{title}</h1>
        </div>
        {actions && <div className="btn-row">{actions}</div>}
      </div>
      {lead && <p className="lead">{lead}</p>}
    </header>
  );
}

export function SectionTitle({ tag, title, right }: { tag?: string; title: string; right?: ReactNode }) {
  return (
    <div className="section-title">
      <h2>
        {tag && <span className="tag">{tag} · </span>}
        {title}
      </h2>
      {right}
    </div>
  );
}

export function Modal({
  title, sub, onClose, children, footer, narrow,
}: { title: ReactNode; sub?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; narrow?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [onClose]);
  return createPortal(
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${narrow ? ' narrow' : ''}`} role="dialog" aria-modal="true" tabIndex={-1} ref={ref}>
        <div className="modal-head">
          <div style={{ minWidth: 0 }}>
            <h2>{title}</h2>
            {sub && <div className="small muted" style={{ marginTop: 4 }}>{sub}</div>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ---------- Toast: chỉ báo "thành công" SAU KHI máy chủ xác nhận ghi ---------- */
type Toast = { id: number; kind: 'ok' | 'err' | 'info'; text: string };
const ToastCtx = createContext<(kind: Toast['kind'], text: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setList((l) => [...l, { id, kind, text }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), kind === 'err' ? 9000 : 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} role={t.kind === 'err' ? 'alert' : 'status'}>
            <span style={{ flex: 1 }}>{t.text}</span>
            <button className="link-btn" style={{ color: '#fff' }} onClick={() => setList((l) => l.filter((x) => x.id !== t.id))}>Đóng</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/** Bọc thao tác ghi: trạng thái chờ + thông báo kết quả thật */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn: () => Promise<unknown>, okText?: string): Promise<boolean> => {
      setBusy(true);
      try {
        await fn();
        if (okText) toast('ok', okText);
        return true;
      } catch (e) {
        toast('err', (e as Error).message || String(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  return { busy, run };
}

export function Field({ label, hint, children, full }: { label: string; hint?: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={`fg${full ? ' full' : ''}`}>
      <label>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="field-row">
      <div className="fl">{label}</div>
      <div className="fv">{value || <span className="muted">—</span>}</div>
    </div>
  );
}
