import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { syncStats, useEntries, useEvidence, usePublicStats, useStages } from './lib/data';
import { Layout } from './components/Layout';
import { Loading, ToastProvider } from './components/ui';
import Overview from './pages/Overview';
import Progress from './pages/Progress';
import Journal from './pages/Journal';

const Results = lazy(() => import('./pages/Results'));
const Dossier = lazy(() => import('./pages/Dossier'));
const Admin = lazy(() => import('./pages/Admin'));
const Setup = lazy(() => import('./pages/Setup'));

/** Giáo viên đăng nhập: đồng bộ chỉ số công khai từ dữ liệu thật (không nhập tay) */
function StatsSync() {
  const entries = useEntries(true);
  const evidence = useEvidence(true);
  const stages = useStages();
  const pub = usePublicStats();
  useEffect(() => {
    if (entries.loading || evidence.loading || stages.loading || pub.loading || entries.error) return;
    const next = {
      stages: stages.data.length,
      entries: entries.data.length,
      evidenceApproved: evidence.data.filter((e) => e.approved).length,
      entriesVerified: entries.data.filter((e) => e.status === 'verified').length,
    };
    const cur = pub.data;
    if (!cur || cur.stages !== next.stages || cur.entries !== next.entries || cur.evidenceApproved !== next.evidenceApproved || cur.entriesVerified !== next.entriesVerified) {
      syncStats(next).catch(() => undefined);
    }
  }, [entries, evidence, stages, pub]);
  return null;
}

function Shell() {
  const { isTeacher } = useAuth();
  return (
    <Layout>
      {isTeacher && <StatsSync />}
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/tien-trinh" element={<Progress />} />
          <Route path="/nhat-ky" element={<Journal />} />
          <Route path="/ket-qua" element={<Results />} />
          <Route path="/ho-so" element={<Dossier />} />
          <Route path="/quan-tri" element={<Admin />} />
          <Route path="/huong-dan" element={<Setup />} />
          <Route path="*" element={<Overview />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <Shell />
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  );
}
