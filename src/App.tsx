import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthCallbackPage from './pages/AuthCallbackPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfileEditPage = lazy(() => import('./pages/ProfileEditPage'));
const CharacterEditPage = lazy(() => import('./pages/CharacterEditPage'));
const SettingsLLMPage = lazy(() => import('./pages/SettingsLLMPage'));
const SettingsTTSPage = lazy(() => import('./pages/SettingsTTSPage'));
const SettingsASRPage = lazy(() => import('./pages/SettingsASRPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const VTuberSession = lazy(() => import('./pages/VTuberSession'));

function lazyPage(page: ReactNode) {
  return <Suspense fallback={null}>{page}</Suspense>;
}

function protectedPage(page: ReactNode) {
  return <ProtectedRoute>{lazyPage(page)}</ProtectedRoute>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/dashboard" element={protectedPage(<DashboardPage />)} />
        <Route path="/profile/edit" element={protectedPage(<ProfileEditPage />)} />
        <Route path="/characters/new" element={protectedPage(<CharacterEditPage />)} />
        <Route path="/characters/:id/edit" element={protectedPage(<CharacterEditPage />)} />
        <Route path="/settings/llm" element={protectedPage(<SettingsLLMPage />)} />
        <Route path="/settings/tts" element={protectedPage(<SettingsTTSPage />)} />
        <Route path="/settings/asr" element={protectedPage(<SettingsASRPage />)} />
        <Route path="/vtuber/:characterId" element={protectedPage(<VTuberSession />)} />
        <Route path="/history/:characterId" element={protectedPage(<HistoryPage />)} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
