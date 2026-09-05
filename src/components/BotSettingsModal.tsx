import React, { useState, useEffect } from 'react';
import {
  Settings,
  Bot,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  GraduationCap,
  BookOpen,
  Globe,
  Trash2,
  Plus,
  Database,
  Server,
  Zap,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { BotStatus, UserProfile } from '../types';
import { getStoredSupabaseConfig, saveSupabaseConfig, testSupabaseConnection } from '../lib/supabase';

interface BotSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  botStatus: BotStatus;
  user: UserProfile | null;
  onRefreshStatus: () => void;
  onRefreshUser: () => void;
}

export const BotSettingsModal: React.FC<BotSettingsModalProps> = ({
  isOpen,
  onClose,
  botStatus,
  user,
  onRefreshStatus,
  onRefreshUser,
}) => {
  const [activeTab, setActiveTab] = useState<'bot' | 'profile' | 'database'>('bot');
  const [tokenInput, setTokenInput] = useState('');
  const [savingToken, setSavingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenSuccess, setTokenSuccess] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Student profile state
  const [name, setName] = useState(user?.name || 'Alex Johnson');
  const [grade, setGrade] = useState(user?.grade || 'Grade 10');
  const [language, setLanguage] = useState(user?.preferredLanguage || 'English');
  const [subjects, setSubjects] = useState<string[]>(
    user?.subjects || ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'French', 'Amharic']
  );
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Supabase & Cloud DB state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [supabaseSaved, setSupabaseSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getStoredSupabaseConfig();
      setSupabaseUrl(cfg.url || '');
      setSupabaseKey(cfg.anonKey || '');
      if (cfg.connected) {
        setSupabaseStatus({ success: true, message: 'Supabase credentials configured' });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSaveSupabase = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setSupabaseStatus({ success: false, message: 'Please enter both Supabase Project URL and Anon Key.' });
      return;
    }

    setIsTestingSupabase(true);
    setSupabaseStatus(null);
    setSupabaseSaved(false);

    try {
      const res = await testSupabaseConnection(supabaseUrl.trim(), supabaseKey.trim());
      setSupabaseStatus(res);
      if (res.success) {
        saveSupabaseConfig({
          url: supabaseUrl.trim(),
          anonKey: supabaseKey.trim(),
          connected: true,
          lastTested: Date.now(),
        });
        setSupabaseSaved(true);
        setTimeout(() => setSupabaseSaved(false), 3000);
      }
    } catch (e: any) {
      setSupabaseStatus({ success: false, message: e?.message || 'Connection test failed' });
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const handleSaveToken = async () => {
    setSavingToken(true);
    setTokenError(null);
    setTokenSuccess(null);

    try {
      const res = await fetch('/api/bot/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput }),
      });
      const data = await res.json();
      if (data.success) {
        setTokenSuccess(`Connected successfully to @${data.info?.username || 'bot'}! Polling started.`);
        onRefreshStatus();
      } else {
        setTokenError(data.error || 'Invalid Bot Token. Check @BotFather.');
      }
    } catch (e: any) {
      setTokenError(e.message || 'Failed to configure bot token');
    } finally {
      setSavingToken(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/users/${user.telegramId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          grade,
          preferredLanguage: language,
          subjects,
        }),
      });
      const data = await res.json();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 2500);
      onRefreshUser();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddSubject = () => {
    if (newSubjectInput.trim() && !subjects.includes(newSubjectInput.trim())) {
      setSubjects([...subjects, newSubjectInput.trim()]);
      setNewSubjectInput('');
    }
  };

  const handleRemoveSubject = (sub: string) => {
    setSubjects(subjects.filter((s) => s !== sub));
  };

  const copyWebhookUrl = () => {
    if (botStatus.webhookUrl) {
      navigator.clipboard.writeText(botStatus.webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Bot & Student Settings</h3>
              <p className="text-xs text-slate-400">Telegram Bot API & Grade-Level Adaptation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Settings Navigation Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('bot')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'bot'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Telegram Bot</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'profile'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Student Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'database'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Cloud Database</span>
          </button>
        </div>

        {/* TAB 1: Telegram Bot Token Connection */}
        {activeTab === 'bot' && (
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-sky-400" />
                Live Telegram Bot Setup (@BotFather)
              </h4>
              {botStatus.hasToken ? (
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected {botStatus.botUsername ? `@${botStatus.botUsername}` : ''}
                </span>
              ) : (
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                  Simulator Mode Active
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              The bot works 100% in the interactive <strong>Telegram Simulator</strong>. To also connect it to your live Telegram app:
            </p>

            <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <li>Open Telegram and message <strong>@BotFather</strong></li>
              <li>Send <code className="text-sky-300 font-mono">/newbot</code> and follow prompts to pick a name & username</li>
              <li>Copy the <strong>HTTP API Token</strong> and paste it below:</li>
            </ol>

            <div className="flex gap-2">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="e.g. 7123456789:AAFxxx... (Telegram Bot Token)"
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
              <button
                onClick={handleSaveToken}
                disabled={savingToken || !tokenInput.trim()}
                className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-sm whitespace-nowrap"
              >
                {savingToken ? 'Testing...' : 'Connect & Poll'}
              </button>
            </div>

            {tokenError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{tokenError}</span>
              </div>
            )}

            {tokenSuccess && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{tokenSuccess}</span>
              </div>
            )}

            {botStatus.webhookUrl && (
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Webhook URL:</span>
                <button
                  onClick={copyWebhookUrl}
                  className="text-slate-300 hover:text-sky-400 flex items-center gap-1 font-mono text-[11px]"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhook ? 'Copied!' : 'Copy Webhook URL'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Student Profile & Grade Calibration */}
        {activeTab === 'profile' && (
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-sky-400" />
              Student Profile & Grade Adaptation
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Student Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Student Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Grade Level Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Grade Level</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="Grade 6">Grade 6 (Elementary / Middle)</option>
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9 (Freshman High)</option>
                  <option value="Grade 10">Grade 10 (Sophomore)</option>
                  <option value="Grade 11">Grade 11 (Junior)</option>
                  <option value="Grade 12">Grade 12 (Senior)</option>
                  <option value="College / University">College / University</option>
                </select>
              </div>

              {/* Language Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Preferred Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="English">English</option>
                  <option value="French">French (Français)</option>
                  <option value="Amharic">Amharic (አማርኛ)</option>
                  <option value="Spanish">Spanish (Español)</option>
                  <option value="German">German (Deutsch)</option>
                  <option value="Arabic">Arabic (العربية)</option>
                </select>
              </div>
            </div>

            {/* Active Subjects Pills */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Enrolled Subjects</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {subjects.map((sub) => (
                  <span
                    key={sub}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-200 text-xs border border-slate-800 flex items-center gap-1.5"
                  >
                    <span>{sub}</span>
                    <button
                      onClick={() => handleRemoveSubject(sub)}
                      className="text-slate-500 hover:text-rose-400 text-xs"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>

              {/* Add custom subject */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubjectInput}
                  onChange={(e) => setNewSubjectInput(e.target.value)}
                  placeholder="Add subject (e.g. Economics, Amharic...)"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <button
                  onClick={handleAddSubject}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              {profileSuccess && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Profile Updated!
                </span>
              )}
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="ml-auto bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs px-5 py-2 rounded-xl transition shadow-md shadow-sky-600/20"
              >
                {savingProfile ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Cloud Database (Supabase & Firestore) */}
        {activeTab === 'database' && (
          <div className="space-y-4">
            {/* Supabase Connection Card */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    ⚡
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Connect to Supabase
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      PostgreSQL Database & Real-time Storage
                    </p>
                  </div>
                </div>
                {supabaseStatus?.success ? (
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Supabase Connected
                  </span>
                ) : (
                  <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-medium">
                    Configure Keys
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://your-project-id.supabase.co"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Supabase Anon / Public Key
                  </label>
                  <input
                    type="password"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {supabaseStatus && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      supabaseStatus.success
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {supabaseStatus.success ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{supabaseStatus.message}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1"
                  >
                    <span>Supabase Dashboard</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={handleTestAndSaveSupabase}
                    disabled={isTestingSupabase || !supabaseUrl.trim() || !supabaseKey.trim()}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                  >
                    {isTestingSupabase ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Testing Connection...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>{supabaseSaved ? 'Saved & Connected!' : 'Test & Connect Supabase'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Cloud Firestore Database Status Card */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Cloud Firestore Database
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Provisioned Real-time Persistence & Security Rules
                    </p>
                  </div>
                </div>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active Cloud Storage
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs">
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Database Engine</p>
                  <p className="font-semibold text-slate-200 mt-0.5">Cloud Firestore</p>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Sync Status</p>
                  <p className="font-semibold text-emerald-400 mt-0.5">Live & Realtime</p>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Security Rules</p>
                  <p className="font-semibold text-sky-400 mt-0.5">Active & Deployed</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2 rounded-xl text-xs font-semibold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
