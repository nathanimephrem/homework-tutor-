import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TelegramSimulator } from './components/TelegramSimulator';
import { StudentDashboard } from './components/StudentDashboard';
import { AgentInspector } from './components/AgentInspector';
import { BotSettingsModal } from './components/BotSettingsModal';
import { AuthScreen } from './components/AuthScreen';
import { BotStatus, UserProfile } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'agents' | 'settings'>('chat');
  const [botStatus, setBotStatus] = useState<BotStatus>({
    hasToken: false,
    isPolling: false,
  });
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showAuthScreen, setShowAuthScreen] = useState<boolean>(true);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  useEffect(() => {
    fetchBotStatus();
    checkStoredSession();
  }, []);

  const fetchBotStatus = async () => {
    try {
      const res = await fetch('/api/bot/status');
      const data = await res.json();
      setBotStatus(data);
    } catch (e) {
      console.error('Error fetching bot status:', e);
    }
  };

  const checkStoredSession = async () => {
    try {
      const storedId = localStorage.getItem('homework_tutor_user_id');
      if (storedId) {
        const res = await fetch(`/api/users/${storedId}`);
        if (res.ok) {
          const userData = await res.json();
          if (userData && userData.telegramId) {
            setUser(userData);
            setShowAuthScreen(false);
          } else {
            setShowAuthScreen(true);
          }
        } else {
          setShowAuthScreen(true);
        }
      } else {
        // No stored session, prompt user to log in or sign up
        setShowAuthScreen(true);
      }
    } catch (e) {
      console.error('Error checking user session:', e);
      setShowAuthScreen(true);
    } finally {
      setIsInitializing(false);
    }
  };

  const fetchUser = async (targetId?: string) => {
    const idToFetch = targetId || user?.telegramId || localStorage.getItem('homework_tutor_user_id') || 'student_789';
    try {
      const res = await fetch(`/api/users/${idToFetch}`);
      const data = await res.json();
      setUser(data);
    } catch (e) {
      console.error('Error fetching user:', e);
    }
  };

  const handleLoginSuccess = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    localStorage.setItem('homework_tutor_user_id', loggedInUser.telegramId);
    setShowAuthScreen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('homework_tutor_user_id');
    setUser(null);
    setShowAuthScreen(true);
  };

  const currentTelegramId = user?.telegramId || 'student_789';

  const handleLaunchPractice = async (topic: string, subject: string) => {
    setActiveTab('chat');
    try {
      await fetch('/api/simulator/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: currentTelegramId,
          text: `action_practice_topic:${encodeURIComponent(topic)}:${encodeURIComponent(subject)}`,
          callbackData: `action_practice_topic:${encodeURIComponent(topic)}:${encodeURIComponent(subject)}`,
        }),
      });
      fetchUser(currentTelegramId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLaunchStudyPlan = async () => {
    setActiveTab('chat');
    try {
      await fetch('/api/simulator/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: currentTelegramId,
          text: 'I have an upcoming exam next Friday. Create a comprehensive 7-day study plan.',
        }),
      });
      fetchUser(currentTelegramId);
    } catch (e) {
      console.error(e);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading AI Homework Tutor...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in or has logged out, display Log In / Sign Up screen
  if (showAuthScreen || !user) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'settings') {
            setIsSettingsOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        botStatus={botStatus}
        user={user}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        onOpenAuth={() => setShowAuthScreen(true)}
      />

      {/* Main Tab Views */}
      <main className="flex-1">
        {activeTab === 'chat' && (
          <TelegramSimulator
            user={user}
            onRefreshUser={() => fetchUser(currentTelegramId)}
          />
        )}

        {activeTab === 'dashboard' && (
          <StudentDashboard
            user={user}
            onLaunchPractice={handleLaunchPractice}
            onLaunchStudyPlan={handleLaunchStudyPlan}
            onRefreshUser={() => fetchUser(currentTelegramId)}
          />
        )}

        {activeTab === 'agents' && (
          <AgentInspector />
        )}
      </main>

      {/* Bot & Student Settings Modal */}
      <BotSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        botStatus={botStatus}
        user={user}
        onRefreshStatus={fetchBotStatus}
        onRefreshUser={() => fetchUser(currentTelegramId)}
      />
    </div>
  );
}
