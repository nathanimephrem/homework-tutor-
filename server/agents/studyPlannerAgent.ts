import { TelegramMessage, UserProfile, StudyPlan } from '../../src/types';
import { generateAiJson } from '../gemini';
import { db } from '../db';

export async function createStudyPlan(
  userPrompt: string,
  user: UserProfile
): Promise<{ message: TelegramMessage; plan: StudyPlan }> {
  const prompt = `Create a high-impact personalized multi-day study plan based on the student's request.
Student Profile:
Grade Level: ${user.grade}
Subjects: ${user.subjects.join(', ')}
Request: "${userPrompt}"

Output strict JSON:
{
  "subject": "e.g. Mathematics / Physics / Science / etc.",
  "targetExamDate": "e.g. Next Friday / in 7 days",
  "title": "e.g. 7-Day Math Mastery Plan",
  "description": "Short 1-2 sentence motivating summary",
  "totalDays": 7,
  "reminderTime": "18:00",
  "days": [
    {
      "dayNumber": 1,
      "dateLabel": "Day 1",
      "topics": ["Fractions & Ratios"],
      "tasks": ["Review fraction simplification", "Solve 5 practice problems"],
      "completed": false
    },
    ... up to totalDays
  ]
}`;

  const fallbackPlan = {
    subject: user.subjects[0] || 'Mathematics',
    targetExamDate: 'Next 7 Days',
    title: `7-Day ${user.subjects[0] || 'Academic'} Study Plan`,
    description: 'A structured day-by-day revision roadmap focusing on high-yield exam concepts.',
    totalDays: 7,
    reminderTime: '18:00',
    days: [
      { dayNumber: 1, dateLabel: 'Day 1', topics: ['Core Foundations & Definitions'], tasks: ['Review formula sheet', 'Solve 3 practice questions'] },
      { dayNumber: 2, dateLabel: 'Day 2', topics: ['Key Problem Types & Techniques'], tasks: ['Solve 5 standard textbook problems', 'Highlight tricky steps'] },
      { dayNumber: 3, dateLabel: 'Day 3', topics: ['Application & Word Problems'], tasks: ['Practice 4 application exercises', 'Self-check mistakes'] },
      { dayNumber: 4, dateLabel: 'Day 4', topics: ['Mid-Week Concept Drill & Review'], tasks: ['Quick 15-minute speed quiz', 'Review weak areas'] },
      { dayNumber: 5, dateLabel: 'Day 5', topics: ['Advanced & Multi-Step Problems'], tasks: ['Solve 3 challenging past exam questions'] },
      { dayNumber: 6, dateLabel: 'Day 6', topics: ['Timed Practice Simulation'], tasks: ['Simulate a 30-minute practice exam'] },
      { dayNumber: 7, dateLabel: 'Day 7', topics: ['Final Polish & Formula Recap'], tasks: ['Quick summary review', 'Rest and prepare with confidence'] },
    ]
  };

  const generated = await generateAiJson<any>(
    prompt,
    "You are an expert academic tutor and study planner.",
    fallbackPlan
  );

  const planId = `plan_${Date.now()}`;
  const plan: StudyPlan = {
    id: planId,
    telegramId: user.telegramId,
    subject: generated.subject || 'Academic Revision',
    targetExamDate: generated.targetExamDate || 'Next Exam',
    title: generated.title || 'Personalized Study Plan',
    description: generated.description || 'Step-by-step roadmap to ace your upcoming test.',
    totalDays: generated.totalDays || 7,
    reminderTime: generated.reminderTime || '18:00',
    createdAt: Date.now(),
    days: (generated.days || []).map((d: any, idx: number) => ({
      dayNumber: d.dayNumber || idx + 1,
      dateLabel: d.dateLabel || `Day ${idx + 1}`,
      topics: d.topics || ['Core Topic Review'],
      tasks: d.tasks || ['Read notes', 'Solve 3 practice questions'],
      completed: false,
    })),
  };

  db.addStudyPlan(plan);

  const daysFormatted = plan.days
    .map(
      (d) =>
        `• **${d.dateLabel}:** ${d.topics.join(', ')}\n  ${d.tasks.map((t) => `└ ${t}`).join('\n  ')}`
    )
    .join('\n\n');

  const text = `📅 **${plan.title}**
🎯 Target: **${plan.targetExamDate}**
🔔 Daily Reminder: **${plan.reminderTime} (via Telegram)**

${plan.description}

---
${daysFormatted}

---
💡 *Tip: Check off daily milestones or ask me anytime to practice any of these topics!*`;

  const message: TelegramMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sender: 'bot',
    text,
    agentUsed: 'study_planner',
    subject: plan.subject,
    toolsUsed: ['Curriculum Planner', 'Exam Scheduler', 'Telegram Reminder Engine'],
    timestamp: Date.now(),
    inlineKeyboard: [
      [
        { text: '📝 Practice Day 1 Topic', callback_data: `action_practice_topic:${encodeURIComponent(plan.days[0]?.topics[0] || plan.subject)}:${encodeURIComponent(plan.subject)}` },
        { text: '📊 My Progress', callback_data: 'cmd_progress' },
      ],
      [
        { text: '🔔 Set Reminder Alarm', callback_data: `action_set_reminder:${plan.id}` },
        { text: '🏠 Main Menu', callback_data: 'cmd_start' },
      ]
    ],
  };

  return { message, plan };
}
