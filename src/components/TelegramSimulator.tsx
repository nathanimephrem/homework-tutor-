import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Camera,
  Paperclip,
  Mic,
  Square,
  Sparkles,
  Volume2,
  Trash2,
  RefreshCw,
  FileText,
  Play,
  Pause,
  Bot,
  User,
  CheckCheck,
  Flame,
  HelpCircle,
  BookOpen,
  Image as ImageIcon,
  GraduationCap
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { TelegramMessage, UserProfile } from '../types';

interface TelegramSimulatorProps {
  user: UserProfile | null;
  onRefreshUser: () => void;
}

export const TelegramSimulator: React.FC<TelegramSimulatorProps> = ({
  user,
  onRefreshUser,
}) => {
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [activeAudioPlaying, setActiveAudioPlaying] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const currentUserId = user?.telegramId || 'student_789';

  // Fetch message history on mount
  useEffect(() => {
    fetchMessages();
  }, [currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/users/${currentUserId}/messages`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (e) {
      console.error('Error loading message history:', e);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text && !showAttachMenu) return;

    setInputText('');
    setIsTyping(true);

    // Optimistic user message if from text input
    if (text) {
      const optimisticMsg: TelegramMessage = {
        id: `temp_${Date.now()}`,
        sender: 'user',
        text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);
    }

    try {
      const res = await fetch('/api/simulator/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: currentUserId,
          text,
        }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        await fetchMessages();
        onRefreshUser();
      }
    } catch (error) {
      console.error('Send error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleButtonClick = async (callbackData?: string) => {
    if (!callbackData) return;
    setIsTyping(true);

    try {
      const res = await fetch('/api/simulator/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: currentUserId,
          text: callbackData,
          callbackData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchMessages();
        onRefreshUser();
      }
    } catch (e) {
      console.error('Callback error:', e);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'document') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsTyping(true);
    setShowAttachMenu(false);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('telegramId', currentUserId);
    formData.append('fileType', type);
    formData.append('text', type === 'photo' ? 'Please solve and explain this homework photo step-by-step.' : '/summarize');

    try {
      const res = await fetch('/api/simulator/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        await fetchMessages();
        onRefreshUser();
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setIsTyping(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Preset sample homework photo solver
  const handlePresetPhoto = async (sampleType: 'interest' | 'forces' | 'geometry') => {
    setShowAttachMenu(false);
    setIsTyping(true);

    let promptText = '';
    if (sampleType === 'interest') {
      promptText = 'Find the simple interest on 3,500 birr for 4 years at 5% per year.';
    } else if (sampleType === 'forces') {
      promptText = 'A 15 kg crate is pushed across a floor with a net force of 45 N. Calculate the acceleration of the crate using Newton\'s second law.';
    } else {
      promptText = 'In right triangle ABC, angle C = 90°, AB = 13 cm, and BC = 5 cm. Find the length of AC and the area of the triangle.';
    }

    // Generate simulated homework canvas image
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 300);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('HOMEWORK ASSIGNMENT', 30, 45);
      ctx.font = '16px serif';
      ctx.fillStyle = '#1e293b';
      
      const words = promptText.split(' ');
      let line = '';
      let y = 90;
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        if (ctx.measureText(testLine).width > 520) {
          ctx.fillText(line, 30, y);
          line = words[i] + ' ';
          y += 28;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 30, y);
      ctx.fillStyle = '#64748b';
      ctx.font = 'italic 14px sans-serif';
      ctx.fillText('Student Worksheet • Grade 10', 30, 270);
    }
    const base64 = canvas.toDataURL('image/jpeg');

    try {
      const res = await fetch('/api/simulator/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: currentUserId,
          text: promptText,
          hasImage: true,
          imageBase64: base64,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchMessages();
        onRefreshUser();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  // Preset sample PDF document
  const handlePresetPdf = async () => {
    setShowAttachMenu(false);
    setIsTyping(true);

    const sampleDocContent = `CHAPTER 4: SIMPLE INTEREST & FINANCIAL MATHEMATICS
1. Definition: Simple interest is money earned or paid on an initial investment (principal) over time at a constant percentage rate.
Formula: I = (P * R * T) / 100
Where:
- I = Simple Interest amount
- P = Principal (starting amount in dollars, birr, or euros)
- R = Annual Interest Rate in percent (%)
- T = Time in years (if given in months, divide by 12)
Total Amount Accumulated: A = P + I

2. Worked Examples:
Example A: Find the simple interest on 3,500 birr for 4 years at 5% per annum.
Calculation:
I = (3,500 * 5 * 4) / 100
I = (70,000) / 100 = 700 birr.
Total Amount A = 3,500 + 700 = 4,200 birr.

3. Key Exam Mistakes:
- Forgetting to convert time in months to years (e.g. 6 months = 0.5 years).
- Confusing Simple Interest (linear growth) with Compound Interest (exponential growth).`;

    try {
      const res = await fetch('/api/simulator/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: currentUserId,
          text: '/summarize',
          hasDocument: true,
          docContent: sampleDocContent,
          fileName: 'Chapter_4_Simple_Interest.pdf',
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchMessages();
        onRefreshUser();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          setIsTyping(true);
          try {
            const res = await fetch('/api/simulator/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                telegramId: currentUserId,
                hasAudio: true,
                audioBase64: base64Audio,
              }),
            });
            const data = await res.json();
            if (data.success) {
              await fetchMessages();
              onRefreshUser();
            }
          } catch (err) {
            console.error('Voice send error:', err);
          } finally {
            setIsTyping(false);
          }
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone permission denied or not available:', err);
      // Send simulated voice prompt
      handleSendMessage('Explain how to find the area of a circle with radius 7 cm.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordIntervalRef.current);
    }
  };

  // Voice synthesis player for bot message
  const playVoiceResponse = async (msgId: string, text: string) => {
    if (activeAudioPlaying === msgId) {
      audioElementRef.current?.pause();
      setActiveAudioPlaying(null);
      return;
    }

    setTtsLoadingId(msgId);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (data.audioBase64) {
        const audioSrc = `data:audio/mp3;base64,${data.audioBase64}`;
        if (audioElementRef.current) {
          audioElementRef.current.src = audioSrc;
          audioElementRef.current.play();
          setActiveAudioPlaying(msgId);
          audioElementRef.current.onended = () => setActiveAudioPlaying(null);
        }
      } else {
        // Web Speech synthesis fallback
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#`[\]()]/g, '').slice(0, 350));
          utterance.rate = 1.0;
          utterance.onend = () => setActiveAudioPlaying(null);
          window.speechSynthesis.speak(utterance);
          setActiveAudioPlaying(msgId);
        }
      }
    } catch (e) {
      console.warn('TTS playback error:', e);
    } finally {
      setTtsLoadingId(null);
    }
  };

  const handleResetConversation = async () => {
    if (window.confirm('Reset conversation history and active mode?')) {
      await fetch(`/api/users/${currentUserId}/reset`, { method: 'POST' });
      await handleSendMessage('/start');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto bg-slate-950 border-x border-slate-800 shadow-2xl relative">
      <audio ref={audioElementRef} className="hidden" />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.txt"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'photo')}
      />

      {/* Sleek Command Toolbar & Real-Time Status Bar */}
      <div className="bg-slate-900/80 backdrop-blur border-b border-slate-800/80 px-3.5 py-2 flex items-center justify-between gap-2 z-20">
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider pl-0.5 pr-1 whitespace-nowrap">
            Shortcuts:
          </span>
          <button
            onClick={() => handleSendMessage('/start')}
            className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700/80 transition font-mono text-xs"
          >
            /start
          </button>
          <button
            onClick={() => handleSendMessage('cmd_scan')}
            className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-sky-300 px-2.5 py-1 rounded-lg border border-slate-700/80 transition text-xs flex items-center gap-1"
          >
            <span>📸</span> Scan
          </button>
          <button
            onClick={() => handleSendMessage('/tutor')}
            className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-indigo-300 px-2.5 py-1 rounded-lg border border-slate-700/80 transition text-xs flex items-center gap-1"
          >
            <span>🧑‍🏫</span> Socratic Tutor
          </button>
          <button
            onClick={() => handleSendMessage('/practice')}
            className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-emerald-300 px-2.5 py-1 rounded-lg border border-slate-700/80 transition text-xs flex items-center gap-1"
          >
            <span>📝</span> Practice Quiz
          </button>
          <button
            onClick={() => handleSendMessage('I have an upcoming exam next Friday. Create a comprehensive 7-day study plan.')}
            className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-rose-300 px-2.5 py-1 rounded-lg border border-slate-700/80 transition text-xs flex items-center gap-1"
          >
            <span>📅</span> 7-Day Plan
          </button>
          <button
            onClick={() => handleSendMessage('/progress')}
            className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-amber-300 px-2.5 py-1 rounded-lg border border-slate-700/80 transition text-xs flex items-center gap-1"
          >
            <span>📊</span> Progress
          </button>
          <button
            onClick={() => handleSendMessage('/subjects')}
            className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-purple-300 px-2.5 py-1 rounded-lg border border-slate-700/80 transition text-xs flex items-center gap-1"
          >
            <span>📚</span> Subjects
          </button>
          <button
            onClick={() => handleSendMessage('/help')}
            className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700/80 transition text-xs font-mono"
          >
            /help
          </button>
        </div>

        {/* Live Status & Quick Actions */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {isTyping ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/25 animate-pulse whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>typing...</span>
            </span>
          ) : (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/25 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Online • Socratic</span>
            </span>
          )}

          <button
            id="btn-reset-chat"
            onClick={handleResetConversation}
            title="Reset Chat Session"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg border border-transparent hover:border-slate-700 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Telegram Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-950/60 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}
            >
              <div
                className={`rounded-2xl px-4 py-3 max-w-[92%] sm:max-w-[80%] shadow-lg transition-all ${
                  isUser
                    ? 'bg-sky-600 text-white rounded-br-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none'
                }`}
              >
                {/* Bot agent badge & tools invoked tag */}
                {!isUser && (msg.agentUsed || (msg.toolsUsed && msg.toolsUsed.length > 0)) && (
                  <div className="flex items-center flex-wrap gap-1.5 mb-2.5 pb-2 border-b border-slate-800 text-[11px]">
                    {msg.agentUsed && (
                      <span className="font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wider text-[10px]">
                        {msg.agentUsed === 'vision' ? '📸 Vision Agent' :
                         msg.agentUsed === 'tutor' ? '🧑🏫 Socratic Tutor' :
                         msg.agentUsed === 'practice' ? '📝 Practice Agent' :
                         msg.agentUsed === 'study_planner' ? '📅 Study Planner' :
                         msg.agentUsed === 'pdf' ? '📄 PDF Agent' :
                         msg.agentUsed === 'voice' ? '🎤 Voice Agent' :
                         msg.agentUsed === 'progress' ? '📊 Progress Agent' :
                         '📚 Homework Agent'}
                      </span>
                    )}
                    {msg.toolsUsed?.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] border border-slate-700/60"
                      >
                        ⚡ {t}
                      </span>
                    ))}
                    {/* TTS Speaker Listen Button */}
                    <button
                      onClick={() => playVoiceResponse(msg.id, msg.text)}
                      className={`ml-auto flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium transition ${
                        activeAudioPlaying === msg.id
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>{ttsLoadingId === msg.id ? 'Loading...' : activeAudioPlaying === msg.id ? 'Playing' : 'Listen'}</span>
                    </button>
                  </div>
                )}

                {/* Media preview tag if any */}
                {msg.mediaType === 'photo' && (
                  <div className="mb-2 p-2 bg-slate-800/80 rounded-lg flex items-center space-x-2 border border-slate-700">
                    <ImageIcon className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-mono text-slate-300">Homework Photo Attached</span>
                  </div>
                )}
                {msg.mediaType === 'voice' && (
                  <div className="mb-2 p-2 bg-slate-800/80 rounded-lg flex items-center space-x-2 border border-slate-700">
                    <Mic className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-mono text-slate-300">Voice Note Transcribed</span>
                  </div>
                )}
                {msg.mediaType === 'document' && (
                  <div className="mb-2 p-2 bg-slate-800/80 rounded-lg flex items-center space-x-2 border border-slate-700">
                    <FileText className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-mono text-slate-300">{msg.fileName || 'document.pdf'}</span>
                  </div>
                )}

                {/* Markdown text content */}
                <div className="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed break-words">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>

                {/* Inline Keyboard Buttons */}
                {msg.inlineKeyboard && msg.inlineKeyboard.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-1.5">
                    {msg.inlineKeyboard.map((row, rIdx) => (
                      <div key={rIdx} className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {row.map((btn, bIdx) => (
                          <button
                            key={bIdx}
                            onClick={() => handleButtonClick(btn.callback_data)}
                            className="w-full text-left sm:text-center text-xs font-semibold px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-sky-600/90 text-slate-200 hover:text-white border border-slate-700/80 hover:border-sky-500 transition-all duration-150 shadow-sm flex items-center justify-center gap-1.5 active:scale-[0.98]"
                          >
                            <span>{btn.text}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Message timestamp */}
                <div className={`mt-1 text-[10px] flex items-center justify-end space-x-1 ${isUser ? 'text-sky-200' : 'text-slate-500'}`}>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isUser && <CheckCheck className="w-3 h-3 text-sky-200" />}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-none px-4 py-3 shadow-md flex items-center space-x-2">
              <span className="text-xs text-sky-400 font-medium">🧠 Thinking & preparing step-by-step guidance</span>
              <div className="flex space-x-1">
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attach Popup Menu */}
      {showAttachMenu && (
        <div className="absolute bottom-20 left-4 right-4 sm:right-auto sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-30 animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              Upload or Test Multimodal Inputs
            </h4>
            <button
              onClick={() => setShowAttachMenu(false)}
              className="text-slate-400 hover:text-white text-xs font-bold px-1.5"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Custom file upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition text-left"
            >
              <Camera className="w-4 h-4 text-sky-400" />
              <div>
                <p className="font-semibold text-slate-100">Upload Photo</p>
                <p className="text-[10px] text-slate-400">From device/camera</p>
              </div>
            </button>

            {/* Preset simple interest photo */}
            <button
              onClick={() => handlePresetPhoto('interest')}
              className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition text-left"
            >
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="font-semibold text-slate-100">Math Homework</p>
                <p className="text-[10px] text-slate-400">Simple Interest scan</p>
              </div>
            </button>

            {/* Preset physics force photo */}
            <button
              onClick={() => handlePresetPhoto('forces')}
              className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition text-left"
            >
              <ImageIcon className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="font-semibold text-slate-100">Physics Problem</p>
                <p className="text-[10px] text-slate-400">Newton Forces scan</p>
              </div>
            </button>

            {/* Preset PDF Chapter */}
            <button
              onClick={handlePresetPdf}
              className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition text-left"
            >
              <FileText className="w-4 h-4 text-rose-400" />
              <div>
                <p className="font-semibold text-slate-100">PDF Chapter</p>
                <p className="text-[10px] text-slate-400">Summarize & Quiz</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Chat Input Bar */}
      <div className="bg-slate-900 border-t border-slate-800 p-3 sm:p-4">
        {isRecording ? (
          <div className="flex items-center justify-between bg-rose-500/10 border border-rose-500/30 rounded-2xl px-4 py-2.5">
            <div className="flex items-center space-x-3">
              <span className="w-3 h-3 bg-rose-500 rounded-full animate-ping" />
              <span className="text-sm font-semibold text-rose-300 font-mono">
                Recording Voice Note ({recordSeconds}s)
              </span>
            </div>
            <button
              onClick={stopRecording}
              className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow transition"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Send Voice</span>
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            {/* Attach button */}
            <button
              type="button"
              onClick={() => setShowAttachMenu((prev) => !prev)}
              className="p-2.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-xl transition border border-transparent hover:border-slate-700"
              title="Attach Homework Photo or Document"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Camera quick scan */}
            <button
              type="button"
              onClick={() => handlePresetPhoto('interest')}
              className="p-2.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition border border-transparent hover:border-slate-700 hidden sm:block"
              title="Scan Homework Photo"
            >
              <Camera className="w-5 h-5" />
            </button>

            {/* Input field */}
            <input
              id="input-telegram-message"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask homework question, concept, or type a command..."
              className="flex-1 bg-slate-950 text-slate-100 placeholder-slate-500 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
            />

            {/* Mic voice record button */}
            <button
              type="button"
              onClick={startRecording}
              className="p-2.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition border border-transparent hover:border-slate-700"
              title="Record Voice Note"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Send button */}
            <button
              id="btn-send-message"
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="p-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white rounded-xl shadow-md shadow-sky-600/20 transition flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
