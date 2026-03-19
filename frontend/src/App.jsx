import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { C, font, globalStyles, applyTheme } from "./theme/colors";
import useAuth from "./hooks/useAuth";
import NavBar from "./components/NavBar";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import QuestionnairePage from "./pages/QuestionnairePage";
import DashboardPage from "./pages/DashboardPage";
import ProfileEditPage from "./pages/ProfileEditPage";
import MessagesPage from "./pages/MessagesPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

function ProtectedRoute({ children, isLoggedIn, questionnaireCompleted, requireQuestionnaire = false }) {
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (requireQuestionnaire && !questionnaireCompleted) return <Navigate to="/questionnaire" replace />;
  return children;
}

function AppRoutes() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { user, token, isLoggedIn, unreadCount, pendingEmail, devCode, setPendingEmail, setDevCode } = auth;

  const questionnaireCompleted = user?.questionnaire_completed;

  const handleAuth = (userData) => {
    auth.login(userData);
    applyTheme(userData.university);
    navigate(userData.questionnaire_completed ? "/dashboard" : "/questionnaire");
  };

  const handleLogout = () => {
    auth.logout();
    navigate("/");
  };

  const handleQuestionnaireComplete = () => {
    // Update user in localStorage to reflect questionnaire_completed
    const updatedUser = { ...user, questionnaire_completed: true };
    localStorage.setItem("mmr_user", JSON.stringify(updatedUser));
  };

  const handleProfileUpdate = () => {};

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: font.body }}>
      <style>{globalStyles}</style>
      <NavBar isLoggedIn={isLoggedIn} user={user} unreadCount={unreadCount} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        <Route path="/signup" element={<AuthPage mode="signup" onAuth={handleAuth} setPendingEmail={setPendingEmail} setDevCode={setDevCode} />} />
        <Route path="/login" element={<AuthPage mode="login" onAuth={handleAuth} setPendingEmail={setPendingEmail} setDevCode={setDevCode} />} />
        <Route path="/verify" element={<VerifyEmailPage email={pendingEmail} devCode={devCode} />} />
        <Route path="/questionnaire" element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <QuestionnairePage user={user} token={token} onComplete={handleQuestionnaireComplete} />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute isLoggedIn={isLoggedIn} questionnaireCompleted={questionnaireCompleted} requireQuestionnaire>
            <DashboardPage user={user} token={token} />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <ProfileEditPage user={user} token={token} onProfileUpdate={handleProfileUpdate} />
          </ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <MessagesPage user={user} token={token} />
          </ProtectedRoute>
        } />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return <AppRoutes />;
}
