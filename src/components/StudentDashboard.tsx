import React, { useState, useEffect } from 'react';
import {
  Flame,
  Trophy,
  Target,
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  BrainCircuit,
  GraduationCap
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import confetti from 'canvas-confetti';
import { UserProfile, StudyPlan, PracticeSessionRecord, SubjectProgress } from '../types';

interface StudentDashboardProps {
  user: UserProfile | null;
  onLaunchPractice: (topic: string, subject: string) => void;
  onLaunchStudyPlan: () => void;
  onRefreshUser: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  onLaunchPractice,
  onLaunchStudyPlan,
  onRefreshUser,
}) => {
  const [progressData, setProgressData] = useState<{
    subjectProgress: SubjectProgress[];
    strongestTopic: string;
    weakestTopic: string;
    totalQuestions: number;
    totalCorrect: number;
    overallAccuracy: number;
    streakDays: number;
    xp: number;
  } | null>(null);

  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [practiceHistory, setPracticeHistory] = useState<PracticeSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUserId = user?.telegramId || 'student_789';

  useEffect(() => {
    loadDashboardData();
  }, [currentUserId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [progRes, plansRes] = await Promise.all([
        fetch(`/api/users/${currentUserId}/progress`),
        fetch(`/api/users/${currentUserId}/study-plans`),
      ]);

      const progJson = await progRes.json();
      const plansJson = await plansRes.json();

      if (progJson.progress) {
        setProgressData(progJson.progress);
        setPracticeHistory(progJson.practiceHistory || []);
      }
      if (Array.isArray(plansJson)) {
        setStudyPlans(plansJson);
      }
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (planId: string, dayNumber: number, taskIdx: number) => {
    try {
      const res = await fetch(`/api/users/${currentUserId}/study-plans/${planId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayNumber, taskIndex: taskIdx }),
      });
      const data = await res.json();
      if (data.success) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
        loadDashboardData();
        onRefreshUser();
      }
    } catch (e) {
      console.error('Task toggle error:', e);
    }
  };

  const barColors = ['#38bdf8', '#818cf8', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#fb7185'];

  if (loading && !progressData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Computing learning metrics & progress...</p>
        </div>
      </div>
    );
  }

  const activePlan = studyPlans[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Student Profile Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-sky-500/20">
              <GraduationCap className="w-9 h-9" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-2xl font-bold text-white tracking-tight">{user?.name || 'Alex Johnson'}</h2>
                <span className="text-xs bg-sky-500/20 text-sky-300 font-semibold px-3 py-1 rounded-full border border-sky-500/30">
                  {user?.grade || 'Grade 10'}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Telegram Student Account: <span className="font-mono text-slate-300">@{user?.username || 'student_789'}</span>
              </p>
            </div>
          </div>

          {/* Key Stats Pill Group */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3.5 text-center">
              <div className="flex items-center justify-center text-amber-400 gap-1 text-xs font-semibold uppercase mb-1">
                <Flame className="w-4 h-4 fill-amber-400" />
                Streak
              </div>
              <p className="text-xl font-bold text-white">{progressData?.streakDays || 6} <span className="text-xs font-normal text-slate-400">days</span></p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3.5 text-center">
              <div className="flex items-center justify-center text-emerald-400 gap-1 text-xs font-semibold uppercase mb-1">
                <Target className="w-4 h-4" />
                Accuracy
              </div>
              <p className="text-xl font-bold text-white">{progressData?.overallAccuracy || 84}%</p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3.5 text-center">
              <div className="flex items-center justify-center text-sky-400 gap-1 text-xs font-semibold uppercase mb-1">
                <BookOpen className="w-4 h-4" />
                Questions
              </div>
              <p className="text-xl font-bold text-white">{progressData?.totalQuestions || 127}</p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3.5 text-center">
              <div className="flex items-center justify-center text-indigo-400 gap-1 text-xs font-semibold uppercase mb-1">
                <Trophy className="w-4 h-4" />
                Mastery XP
              </div>
              <p className="text-xl font-bold text-white">{progressData?.xp || 340} <span className="text-xs font-normal text-slate-400">XP</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Strongest vs Weakest Topic Action Callouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strongest topic */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Sparkles className="w-4 h-4" />
                🔥 Strongest Topic
              </span>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {progressData?.strongestTopic || 'Fractions'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Consistent high accuracy in simplification, operations, and word problem applications.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-bold">
              92% Mastery
            </span>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Ready for advanced drills?</span>
            <button
              onClick={() => onLaunchPractice(progressData?.strongestTopic || 'Fractions', 'Mathematics')}
              className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow-md shadow-emerald-600/20"
            >
              <span>Hard Drill</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Weakest topic needing practice */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-4 h-4" />
                💪 Needs Practice
              </span>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {progressData?.weakestTopic || 'Simple Interest'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Target formula mastery: <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300 font-mono">I = (P·R·T)/100</code> and multi-step rate calculations.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-bold">
              62% Mastery
            </span>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Boost this topic now:</span>
            <button
              onClick={() => onLaunchPractice(progressData?.weakestTopic || 'Simple Interest', 'Mathematics')}
              className="text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow-md shadow-amber-500/20"
            >
              <span>Practice Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Analytics & Subject Mastery Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject Mastery Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-sky-400" />
                Academic Subject Mastery
              </h3>
              <p className="text-xs text-slate-400">Calculated across homework solutions and practice quizzes</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={progressData?.subjectProgress || []}
                margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
              >
                <XAxis
                  dataKey="subject"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${val}% Mastery`, 'Score']}
                />
                <Bar dataKey="masteryPercentage" radius={[6, 6, 0, 0]}>
                  {(progressData?.subjectProgress || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2 mb-1">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
              Skill Radar
            </h3>
            <p className="text-xs text-slate-400 mb-4">Competency map</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={progressData?.subjectProgress?.slice(0, 6) || []}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={9} />
                <Radar
                  name="Mastery"
                  dataKey="masteryPercentage"
                  stroke="#38bdf8"
                  fill="#38bdf8"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Active Study Plan Interactive Timeline */}
      {activePlan && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-sky-400" />
                <h3 className="text-lg font-bold text-white tracking-tight">{activePlan.title}</h3>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full font-semibold border border-indigo-500/30">
                  {activePlan.subject}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Target Exam Date: <strong className="text-slate-200">{activePlan.targetExamDate}</strong> • Daily Telegram Reminder at <strong className="text-sky-400">{activePlan.reminderTime || '18:00'}</strong>
              </p>
            </div>

            <button
              onClick={onLaunchStudyPlan}
              className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl border border-slate-700 transition"
            >
              + Create New Exam Plan
            </button>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {activePlan.days.map((day) => (
              <div
                key={day.dayNumber}
                className={`rounded-2xl p-4 border transition-all ${
                  day.completed
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-sky-400 uppercase font-mono">{day.dateLabel}</span>
                  <button
                    onClick={() => handleToggleTask(activePlan.id, day.dayNumber, 0)}
                    className="text-slate-400 hover:text-emerald-400 transition"
                  >
                    {day.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-500" />
                    )}
                  </button>
                </div>

                <p className="text-sm font-semibold text-slate-100 mb-2">
                  {day.topics.join(', ')}
                </p>

                <ul className="space-y-1 text-xs text-slate-400">
                  {day.tasks.map((task, idx) => (
                    <li key={idx} className="flex items-start space-x-1.5">
                      <span className="text-slate-600">•</span>
                      <span className={day.completed ? 'line-through text-slate-500' : ''}>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Practice Session History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Recent Practice Quiz Drills
          </h3>
        </div>

        {practiceHistory.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">No practice quizzes completed yet. Start one in Tutor or Practice mode!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Subject</th>
                  <th className="pb-3 font-semibold">Topic</th>
                  <th className="pb-3 font-semibold">Difficulty</th>
                  <th className="pb-3 font-semibold">Score</th>
                  <th className="pb-3 font-semibold">Accuracy</th>
                  <th className="pb-3 font-semibold text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {practiceHistory.slice(0, 6).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 font-semibold text-white">{item.subject}</td>
                    <td className="py-3 text-slate-300">{item.topic}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-300' :
                        item.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-rose-500/20 text-rose-300'
                      }`}>
                        {item.difficulty.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 font-mono">{item.correctCount} / {item.questionsCount}</td>
                    <td className="py-3 font-bold text-sky-400">{item.scorePercentage}%</td>
                    <td className="py-3 text-right text-slate-400 font-mono">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
