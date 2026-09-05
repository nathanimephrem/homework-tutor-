import React, { useState, useEffect } from 'react';
import {
  Network,
  Cpu,
  Brain,
  Camera,
  BookOpen,
  Sparkles,
  Calendar,
  FileText,
  Mic,
  BarChart3,
  CheckCircle2,
  Zap,
  Terminal,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { AgentLog, AgentType } from '../types';

export const AgentInspector: React.FC = () => {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentType | 'all'>('all');

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/agents/logs');
      const data = await res.json();
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const agentCards: {
    type: AgentType;
    title: string;
    icon: any;
    color: string;
    description: string;
    model: string;
    tools: string[];
  }[] = [
    {
      type: 'router',
      title: 'Main Router Agent',
      icon: Network,
      color: 'from-sky-500 to-blue-600',
      description: 'Parses raw user queries, classifies educational intent, detects subject/topic/grade, and delegates to specialized sub-agents.',
      model: 'gemini-3.7-flash (Structured Schema)',
      tools: ['Intent Classifier', 'Curriculum Parser'],
    },
    {
      type: 'homework',
      title: 'Homework Agent',
      icon: BookOpen,
      color: 'from-indigo-500 to-violet-600',
      description: 'Breaks down complex problems step-by-step: Given values -> Formula selection -> Arithmetic steps -> Final answer & Key takeaway.',
      model: 'gemini-3.7-flash (Pedagogical System)',
      tools: ['Math Calculator', 'Step-by-step Explainer'],
    },
    {
      type: 'vision',
      title: 'Vision / Photo Agent',
      icon: Camera,
      color: 'from-emerald-500 to-teal-600',
      description: 'Multimodal OCR & diagram recognition. Extracts handwritten or printed homework images and explains solutions.',
      model: 'gemini-3.7-flash (Multimodal Vision)',
      tools: ['High-res OCR', 'Diagram Reader', 'Geometry Parser'],
    },
    {
      type: 'tutor',
      title: 'Socratic Tutor Agent',
      icon: Brain,
      color: 'from-amber-500 to-orange-600',
      description: 'Interactive teaching loop. Explains core concept -> Provides mini example -> Prompts student with questions -> Diagnoses mistakes -> Gives hints.',
      model: 'gemini-3.7-flash (Socratic Loop)',
      tools: ['Misconception Diagnostic', 'Socratic Hint Generator'],
    },
    {
      type: 'practice',
      title: 'Practice & Quiz Agent',
      icon: Sparkles,
      color: 'from-pink-500 to-rose-600',
      description: 'Generates targeted practice problems (Easy, Medium, Hard), validates student answers, tracks accuracy, and awards XP.',
      model: 'gemini-3.7-flash (Assessment Engine)',
      tools: ['Question Bank Generator', 'Grading Engine'],
    },
    {
      type: 'study_planner',
      title: 'Study Planner Agent',
      icon: Calendar,
      color: 'from-cyan-500 to-blue-600',
      description: 'Constructs customized 7-day or exam revision roadmaps with day-by-day checklists and Telegram reminder triggers.',
      model: 'gemini-3.7-flash (Schedule Optimizer)',
      tools: ['Curriculum Timeline', 'Telegram Reminder Dispatcher'],
    },
    {
      type: 'pdf',
      title: 'PDF & Document Agent',
      icon: FileText,
      color: 'from-purple-500 to-indigo-600',
      description: 'Processes uploaded textbook chapters and worksheets. Generates structured summaries (/summarize), quizzes (/quiz), and flashcards (/flashcards).',
      model: 'gemini-3.7-flash (Long Context RAG)',
      tools: ['Document Extractor', 'Flashcard Maker', 'Quiz Builder'],
    },
    {
      type: 'voice',
      title: 'Voice Agent',
      icon: Mic,
      color: 'from-yellow-500 to-amber-600',
      description: 'Transcribes voice audio clips from students, formulates educational responses, and synthesizes natural audio explanations.',
      model: 'gemini-3.7-flash & gemini-3.1-flash-tts-preview',
      tools: ['Speech-to-Text Transcriber', 'Gemini TTS Synthesizer'],
    },
    {
      type: 'progress',
      title: 'Progress Analytics Agent',
      icon: BarChart3,
      color: 'from-emerald-500 to-cyan-600',
      description: 'Aggregates learning metrics, computes subject mastery percentages, isolates strongest/weakest topics, and tracks daily streaks.',
      model: 'Deterministic Metric Engine + Gemini Insights',
      tools: ['Statistical Calculator', 'Mastery Tracker'],
    },
  ];

  const filteredLogs = selectedAgent === 'all' ? logs : logs.filter((l) => l.agent === selectedAgent);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Multi-Agent Tutor Architecture
            </h2>
            <p className="text-xs text-slate-400">
              Coordinated specialized agents powered by Gemini models and official Telegram Bot API
            </p>
          </div>
        </div>
      </div>

      {/* 9 Specialized Agents Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            Specialized Agent Modules
          </h3>
          <span className="text-xs text-slate-400">9 Active Agents</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agentCards.map((agent) => {
            const Icon = agent.icon;
            return (
              <div
                key={agent.type}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${agent.color} flex items-center justify-center text-white shadow-md`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{agent.title}</h4>
                      <span className="text-[10px] font-mono text-slate-400">{agent.model}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    {agent.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Tools Triggered</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {agent.tools.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] border border-slate-700 font-mono"
                      >
                        ⚡ {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Agent Execution Logs Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Live Agent Execution & Tool Calls
            </h3>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar text-xs">
            {(['all', 'vision', 'tutor', 'homework', 'practice', 'pdf', 'voice', 'study_planner', 'progress'] as const).map((ag) => (
              <button
                key={ag}
                onClick={() => setSelectedAgent(ag)}
                className={`px-2.5 py-1 rounded-lg font-medium capitalize whitespace-nowrap transition ${
                  selectedAgent === ag
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {ag.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs font-mono">
            No agent calls logged yet. Send a message, photo, or command in the Telegram Simulator!
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-950 border border-slate-800/90 rounded-2xl p-3.5 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-slate-700 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold uppercase text-[10px]">
                      {log.agent}
                    </span>
                    {log.detectedSubject && (
                      <span className="text-slate-300 font-semibold">
                        {log.detectedSubject} {log.detectedTopic ? `• ${log.detectedTopic}` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px] truncate max-w-xl">
                    <span className="text-slate-500">Query:</span> "{log.userMessage}"
                  </p>
                  <p className="text-emerald-400 text-[11px]">
                    <span className="text-slate-500">Result:</span> {log.responseSummary}
                  </p>
                </div>

                <div className="flex flex-col sm:items-end space-y-1 text-slate-500 text-[10px]">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {log.toolsUsed.map((t, idx) => (
                      <span key={idx} className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
