import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useStore } from './store';
import { Navbar } from './components/Navbar';
import { ChatAssistant } from './components/ChatAssistant';
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const CatalogPage = React.lazy(() => import('./pages/CatalogPage').then(m => ({ default: m.CatalogPage })));
const BookDetailPage = React.lazy(() => import('./pages/BookDetailPage').then(m => ({ default: m.BookDetailPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

// Protected Route Wrapper
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, checkingAuth } = useStore();

  if (checkingAuth) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F0EA'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid var(--primary)',
          borderTopColor: 'transparent',
          animation: 'spin 1s linear infinite',
          boxShadow: '4px 4px 0px #000000'
        }} />
        <p style={{ marginTop: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>VALIDATING SESSION...</p>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  const { checkAuth, notification, user } = useStore();

  useEffect(() => {
    checkAuth();
  }, []);

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={20} color="#047857" />;
      case 'error': return <AlertCircle size={20} color="#B91C1C" />;
      default: return <Info size={20} color="#1E3A8A" />;
    }
  };

  const getToastBg = (type: string) => {
    switch (type) {
      case 'success': return 'var(--success)';
      case 'error': return 'var(--error)';
      default: return 'var(--info)';
    }
  };

  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F4F0EA' }}>
        <React.Suspense fallback={
          <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#F4F0EA'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '5px solid var(--primary)',
              borderTopColor: 'transparent',
              animation: 'spin 1s linear infinite',
              boxShadow: '4px 4px 0px #000000'
            }} />
            <p style={{ marginTop: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>LOADING PAGE...</p>
          </div>
        }>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route
                path="*"
                element={
                  <>
                    <Navbar />
                    <main style={{ flex: 1 }}>
                      <Routes>
                        <Route path="/" element={<CatalogPage />} />
                        <Route path="/books/:id" element={<BookDetailPage />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </main>
                    {/* Floating AI Chat Assistant for Members */}
                    {user?.role === 'member' && <ChatAssistant />}
                  </>
                }
              />
            </Route>
          </Routes>
        </React.Suspense>

        {/* Global Brutalist Toast Notification */}
        {notification && (
          <div
            className="brut-toast"
            style={{
              backgroundColor: getToastBg(notification.type),
            }}
          >
            {getToastIcon(notification.type)}
            <span>{notification.message}</span>
          </div>
        )}
      </div>
    </BrowserRouter>
  );
};

export default App;
