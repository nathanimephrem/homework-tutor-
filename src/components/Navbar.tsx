import React from 'react';
import { 
  Bot, 
  MessageSquare, 
  BarChart3, 
  Network, 
  Settings, 
  Sparkles, 
  Flame, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle,
  LogOut,
  User,
  UserCheck
} from 'lucide-react';
import { BotStatus, UserProfile } from '../types';

interface NavbarProps {
  activeTab: 'chat' | 'dashboard' | 'agents' | 'settings';
  setActiveTab: (tab: 'chat' | 'dashboard' | 'agents' | 'settings') => void;
  botStatus: BotStatus;
  user: UserProfile | null;
  onOpenSettings: () => void;
  onLogout?: () => void;
  onOpenAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  botStatus,
  user,
  onOpenSettings,
  onLogout,
  onOpenAuth,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & Bot Identity */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 mr-2 flex-1 sm:flex-initial">
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white font-bold">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <h1 className="font-bold text-slate-100 tracking-tight text-sm sm:text-base md:text-lg flex items-center gap-1.5 whitespace-nowrap truncate">
                AI Homework Tutor
                <span className="hidden sm:inline-flex text-[11px] bg-sky-500/20 text-sky-400 font-medium px-2 py-0.5 rounded-full border border-sky-500/30">
                  Bot API
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 sm:gap-2 truncate whitespace-nowrap">
              <span className="truncate">{user ? `${user.name} • ${user.grade}` : 'Multi-Agent Learning System'}</span>
              {botStatus.botUsername && (
                <span className="hidden sm:inline-flex text-emerald-400 font-mono items-center gap-1 truncate">
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> @{botStatus.botUsername}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
          <button
            id="tab-chat"
            onClick={() => setActiveTab('chat')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'chat'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Telegram Simulator</span>
          </button>

          <button
            id="tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'dashboard'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Progress & Study Plan</span>
          </button>

          <button
            id="tab-agents"
            onClick={() => setActiveTab('agents')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'agents'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Agent Architecture</span>
          </button>
        </nav>

        {/* Right Status & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Streak pill */}
          {user && (
            <div className="hidden sm:flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-semibold">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
              <span>{user.streakDays} Day Streak</span>
            </div>
          )}

          {/* Telegram connection badge / trigger */}
          <button
            id="btn-bot-config-modal"
            onClick={onOpenSettings}
            className={`flex items-center space-x-1.5 text-xs px-2.5 sm:px-3 py-1.5 rounded-lg font-medium border transition-colors ${
              botStatus.hasToken
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {botStatus.hasToken ? (botStatus.isPolling ? 'Live Bot Active' : 'Bot Connected') : 'Bot Setup'}
            </span>
          </button>

          {/* User Log In / Log Out controls */}
          {user ? (
            <button
              id="btn-logout"
              onClick={onLogout}
              title="Log out or switch student account"
              className="flex items-center space-x-1.5 text-xs px-2.5 sm:px-3 py-1.5 rounded-lg font-medium border bg-slate-800/80 hover:bg-red-500/10 border-slate-700 hover:border-red-500/40 text-slate-300 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          ) : (
            <button
              id="btn-open-auth"
              onClick={onOpenAuth}
              className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-sm shadow-sky-600/30 transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>Log In / Sign Up</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile navigation row */}
      <div className="md:hidden flex border-t border-slate-800 bg-slate-900/95 px-2 py-1.5 justify-around text-xs">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg ${
            activeTab === 'chat' ? 'text-sky-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <MessageSquare className="w-4 h-4 mb-0.5" />
          <span>Chat</span>
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg ${
            activeTab === 'dashboard' ? 'text-sky-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <BarChart3 className="w-4 h-4 mb-0.5" />
          <span>Progress</span>
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg ${
            activeTab === 'agents' ? 'text-sky-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Network className="w-4 h-4 mb-0.5" />
          <span>Agents</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center py-1 px-3 rounded-lg text-slate-400"
        >
          <Settings className="w-4 h-4 mb-0.5" />
          <span>Settings</span>
        </button>
        {user && (
          <button
            onClick={onLogout}
            className="flex flex-col items-center py-1 px-3 rounded-lg text-slate-400 hover:text-red-300"
          >
            <LogOut className="w-4 h-4 mb-0.5" />
            <span>Log Out</span>
          </button>
        )}
      </div>
    </header>
  );
};
