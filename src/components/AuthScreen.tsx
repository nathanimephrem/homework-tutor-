import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  Camera, 
  GraduationCap, 
  BookOpen, 
  BrainCircuit, 
  Flame, 
  CheckCircle2, 
  ArrowRight, 
  User, 
  Lock, 
  Languages, 
  Check, 
  Zap, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { UserProfile } from '../types';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

const AVAILABLE_GRADES = [
  'Grade 7 (Middle School)',
  'Grade 8 (Middle School)',
  'Grade 9 (High School)',
  'Grade 10 (High School)',
  'Grade 11 (AP / IB)',
  'Grade 12 (AP / IB / Senior)',
  'College / University',
];

const AVAILABLE_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'English Literature',
  'History',
  'Geography',
  'Economics',
];

const AVAILABLE_LANGUAGES = [
  { code: 'English', label: 'English (US/UK)' },
  { code: 'Spanish', label: 'Español' },
  { code: 'French', label: 'Français' },
  { code: 'Amharic', label: 'አማርኛ (Amharic)' },
  { code: 'German', label: 'Deutsch' },
  { code: 'Arabic', label: 'العربية' },
];

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  
  // Login Form State
  const [loginQuery, setLoginQuery] = useState('AlexStudent');
  const [loginPassword, setLoginPassword] = useState('••••••••');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Sign Up Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [grade, setGrade] = useState('Grade 10 (High School)');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    'Mathematics',
    'Physics',
    'Chemistry',
    'English Literature',
  ]);
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupError, setSignupError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Available existing accounts for quick login
  const [existingUsers, setExistingUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    fetchExistingAccounts();
  }, []);

  const fetchExistingAccounts = async () => {
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const users = await res.json();
        setExistingUsers(users);
      }
    } catch (e) {
      console.warn('Could not fetch existing accounts:', e);
    }
  };

  const handleLogin = async (e?: React.FormEvent, customUserQuery?: string) => {
    if (e) e.preventDefault();
    setLoginError(null);
    const targetQuery = customUserQuery || loginQuery;

    if (!targetQuery.trim()) {
      setLoginError('Please enter your username, email, or Telegram handle.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: targetQuery }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setLoginError(data.error || 'Account not found. Please check your username or Sign Up.');
        setIsLoggingIn(false);
        return;
      }

      // Store in localStorage for persistent session
      localStorage.setItem('homework_tutor_user_id', data.user.telegramId);
      onLoginSuccess(data.user);
    } catch (err: any) {
      setLoginError('Connection error. Please try again.');
      setIsLoggingIn(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    if (!name.trim()) {
      setSignupError('Please enter your name.');
      return;
    }

    if (selectedSubjects.length === 0) {
      setSignupError('Please choose at least one subject you study.');
      return;
    }

    setIsSigningUp(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim() || name.toLowerCase().replace(/\s+/g, '_'),
          grade,
          subjects: selectedSubjects,
          preferredLanguage,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setSignupError(data.error || 'Could not create student profile.');
        setIsSigningUp(false);
        return;
      }

      // Store in localStorage for persistent session
      localStorage.setItem('homework_tutor_user_id', data.user.telegramId);
      onLoginSuccess(data.user);
    } catch (err: any) {
      setSignupError('Signup error. Please check your connection.');
      setIsSigningUp(false);
    }
  };

  const toggleSubject = (subj: string) => {
    if (selectedSubjects.includes(subj)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter((s) => s !== subj));
      }
    } else {
      setSelectedSubjects([...selectedSubjects, subj]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 selection:bg-sky-500 selection:text-white">
      {/* Background visual accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-sky-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-10 w-[500px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto w-full">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-xl shadow-sky-500/25 mb-4 text-white">
            <Bot className="w-9 h-9" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            AI Homework Tutor
          </h1>
          <p className="mt-2 text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
            Your 24/7 Intelligent Multi-Agent Learning Assistant on Telegram & Web
          </p>

          {/* Key feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs">
            <span className="bg-slate-900 border border-slate-800 text-sky-400 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <Camera className="w-3.5 h-3.5" /> Photo Homework Solver
            </span>
            <span className="bg-slate-900 border border-slate-800 text-indigo-400 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <GraduationCap className="w-3.5 h-3.5" /> Socratic Step Tutor
            </span>
            <span className="bg-slate-900 border border-slate-800 text-emerald-400 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <BookOpen className="w-3.5 h-3.5" /> 7-Day Study Plans
            </span>
          </div>
        </div>

        {/* Main Auth Container Card */}
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left / Main Auth Form Column (7 cols) */}
          <div className="p-6 sm:p-8 lg:col-span-7 flex flex-col justify-between">
            <div>
              {/* Tab Switcher: Log In vs Sign Up */}
              <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 mb-6">
                <button
                  id="tab-login-btn"
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setLoginError(null);
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    mode === 'login'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Log In</span>
                </button>
                <button
                  id="tab-signup-btn"
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setSignupError(null);
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    mode === 'signup'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Sign Up</span>
                </button>
              </div>

              {/* LOG IN FORM */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Username / Email / Telegram ID
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="login-username-input"
                        type="text"
                        value={loginQuery}
                        onChange={(e) => setLoginQuery(e.target.value)}
                        placeholder="e.g. AlexStudent or student_789"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Password / Passcode
                      </label>
                      <span className="text-xs text-slate-500 hover:text-sky-400 cursor-pointer">
                        Forgot passcode?
                      </span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="login-password-input"
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                      />
                    </div>
                  </div>

                  {loginError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <button
                    id="btn-login-submit"
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-3 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isLoggingIn ? (
                      <span>Logging in...</span>
                    ) : (
                      <>
                        <span>Log In to Study Hub</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* 1-Click Fast Demo Student Login */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <p className="text-xs text-slate-400 mb-2 font-medium">
                      🚀 Instant One-Click Demo Access:
                    </p>
                    <button
                      id="btn-demo-quick-login"
                      type="button"
                      onClick={() => handleLogin(undefined, 'AlexStudent')}
                      className="w-full py-2.5 px-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/50 rounded-xl text-xs font-medium text-slate-200 flex items-center justify-between transition-all group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                          AJ
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-slate-200 group-hover:text-sky-300 transition-colors">
                            Alex Johnson (Grade 10)
                          </p>
                          <p className="text-[10px] text-slate-400">
                            6-Day Streak • 7 Study Plans • Math, Physics, Chemistry
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-sky-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Launch <Zap className="w-3 h-3 fill-sky-400" />
                      </span>
                    </button>
                  </div>
                </form>
              )}

              {/* SIGN UP FORM */}
              {mode === 'signup' && (
                <form onSubmit={handleSignUp} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Full Name *
                      </label>
                      <input
                        id="signup-name-input"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Sarah Jenkins"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Telegram / Username
                      </label>
                      <input
                        id="signup-username-input"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="@sarah_studies"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Academic Grade / Level
                    </label>
                    <select
                      id="signup-grade-select"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition-colors"
                    >
                      {AVAILABLE_GRADES.map((g) => (
                        <option key={g} value={g} className="bg-slate-900 text-slate-100">
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Target Subjects
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {selectedSubjects.length} selected
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {AVAILABLE_SUBJECTS.map((subj) => {
                        const isSelected = selectedSubjects.includes(subj);
                        return (
                          <button
                            type="button"
                            key={subj}
                            onClick={() => toggleSubject(subj)}
                            className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors flex items-center gap-1 ${
                              isSelected
                                ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-sky-400" />}
                            <span>{subj}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Language
                      </label>
                      <select
                        id="signup-language-select"
                        value={preferredLanguage}
                        onChange={(e) => setPreferredLanguage(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition-colors"
                      >
                        {AVAILABLE_LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-100">
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Password / PIN
                      </label>
                      <input
                        id="signup-password-input"
                        type="password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="Create PIN"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>
                  </div>

                  {signupError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{signupError}</span>
                    </div>
                  )}

                  <button
                    id="btn-signup-submit"
                    type="submit"
                    disabled={isSigningUp}
                    className="w-full py-3 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isSigningUp ? (
                      <span>Creating Profile...</span>
                    ) : (
                      <>
                        <span>Sign Up & Start Learning</span>
                        <Sparkles className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            <p className="text-center text-xs text-slate-500 mt-4">
              Protected by Telegram Multi-Agent Session Security
            </p>
          </div>

          {/* Right Column: Features & Multi-Agent Highlights (5 cols) */}
          <div className="bg-slate-950/60 p-6 sm:p-8 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs uppercase tracking-wider mb-4">
                <BrainCircuit className="w-4 h-4" />
                <span>Multi-Agent Capabilities</span>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">Vision Homework Agent</p>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Snap or upload any math equation, diagram, or worksheet for instant OCR and step-by-step guidance.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">Socratic Tutor Agent</p>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Interactive Socratic dialogue that hints and coaches you rather than just giving away final answers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">7-Day Study Planner</p>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Automatically structures comprehensive day-by-day exam roadmaps tailored to your weaknesses.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Flame className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">Streak & XP Rewards</p>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Gamified motivation tracking subject mastery, test readiness, and practice scores.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cloud Database Persistence Badge */}
            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Cloud Database & Sync
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Online
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                All homework solutions, quiz scores, and 7-day study plans persist automatically with Supabase & Firestore cloud sync.
              </p>
            </div>

            {/* Existing Accounts Switcher list */}
            {existingUsers.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <p className="text-[11px] text-slate-400 font-semibold mb-2">
                  Existing Accounts on this App:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {existingUsers.map((u) => (
                    <button
                      key={u.telegramId}
                      type="button"
                      onClick={() => handleLogin(undefined, u.username || u.telegramId)}
                      className="text-[11px] bg-slate-900 hover:bg-slate-850 border border-slate-700/60 hover:border-sky-500/40 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <User className="w-3 h-3 text-sky-400" />
                      <span>{u.name}</span>
                      <span className="text-[10px] text-slate-500">({u.grade})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
