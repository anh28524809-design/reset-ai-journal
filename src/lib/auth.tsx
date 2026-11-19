import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, firebaseReady, googleProvider } from './firebase';
import type { Role, RoleDoc } from './types';

export interface Me {
  uid: string;
  name: string;
  email: string;
}

interface AuthCtx {
  ready: boolean;
  user: User | null;
  me: Me | null;
  role: Role | null;
  /** Thành viên có quyền (giáo viên hoặc học sinh) */
  isMember: boolean;
  isTeacher: boolean;
  /** Đang xem với quyền thành viên (không bật chế độ xem như giám khảo) */
  team: boolean;
  /** Quyền chỉnh sửa giáo viên đang có hiệu lực */
  teacher: boolean;
  viewAsPublic: boolean;
  setViewAsPublic: (v: boolean) => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseReady);
  const [roleDoc, setRoleDoc] = useState<RoleDoc | null>(null);
  const [roleReady, setRoleReady] = useState(true);
  const [viewAsPublic, setViewAsPublic] = useState(false);

  useEffect(() => {
    if (!firebaseReady) return;
    return onAuthStateChanged(auth(), (u) => {
      setUser(u);
      setAuthReady(true);
      if (!u) {
        setRoleDoc(null);
        setViewAsPublic(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    setRoleReady(false);
    return onSnapshot(
      doc(db(), 'roles', user.email.toLowerCase()),
      (s) => {
        setRoleDoc(s.exists() ? ({ id: s.id, ...s.data() } as RoleDoc) : null);
        setRoleReady(true);
      },
      () => {
        setRoleDoc(null);
        setRoleReady(true);
      },
    );
  }, [user]);

  const value = useMemo<AuthCtx>(() => {
    const role = roleDoc?.role ?? null;
    const isMember = role === 'teacher' || role === 'student';
    const isTeacher = role === 'teacher';
    const me: Me | null = user
      ? { uid: user.uid, email: user.email ?? '', name: roleDoc?.name || user.displayName || user.email || 'Người dùng' }
      : null;
    return {
      ready: authReady && roleReady,
      user,
      me,
      role,
      isMember,
      isTeacher,
      team: isMember && !viewAsPublic,
      teacher: isTeacher && !viewAsPublic,
      viewAsPublic,
      setViewAsPublic,
      signIn: async () => {
        await signInWithPopup(auth(), googleProvider);
      },
      signOut: async () => {
        await fbSignOut(auth());
      },
    };
  }, [user, roleDoc, authReady, roleReady, viewAsPublic]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
