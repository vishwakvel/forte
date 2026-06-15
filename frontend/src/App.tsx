import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Collection } from './pages/Collection';
import { Artists } from './pages/Artists';
import { Rate } from './pages/Rate';
import { Insights } from './pages/Insights';
import { Login } from './pages/Login';
import { AuthCallback } from './pages/AuthCallback';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen mesh-bg flex items-center justify-center"><div className="w-8 h-8 border-2 border-black/10 border-t-accent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/collection" element={<Protected><Collection /></Protected>} />
          <Route path="/artists" element={<Protected><Artists /></Protected>} />
          <Route path="/rate" element={<Protected><Rate /></Protected>} />
          <Route path="/insights" element={<Protected><Insights /></Protected>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
