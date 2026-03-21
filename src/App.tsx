import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import CharacterEditPage from './pages/CharacterEditPage';
import SettingsLLMPage from './pages/SettingsLLMPage';
import SettingsTTSPage from './pages/SettingsTTSPage';
import SettingsASRPage from './pages/SettingsASRPage';
import VTuberPage from './pages/VTuberPage';
import HistoryPage from './pages/HistoryPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/characters/new" element={<ProtectedRoute><CharacterEditPage /></ProtectedRoute>} />
        <Route path="/characters/:id/edit" element={<ProtectedRoute><CharacterEditPage /></ProtectedRoute>} />
        <Route path="/settings/llm" element={<ProtectedRoute><SettingsLLMPage /></ProtectedRoute>} />
        <Route path="/settings/tts" element={<ProtectedRoute><SettingsTTSPage /></ProtectedRoute>} />
        <Route path="/settings/asr" element={<ProtectedRoute><SettingsASRPage /></ProtectedRoute>} />
        <Route path="/vtuber/:characterId" element={<ProtectedRoute><VTuberPage /></ProtectedRoute>} />
        <Route path="/history/:characterId" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
