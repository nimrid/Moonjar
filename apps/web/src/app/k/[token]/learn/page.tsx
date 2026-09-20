'use client';

import React, { useState, useEffect } from 'react';
import { getStoredVault, saveVault, VaultState } from '@/lib/store';
import { Pip } from '@/components/mascot/Pip';
import { Button } from '@/components/ui/Button';
import confetti from 'canvas-confetti';
import { 
  BookOpen, 
  Sparkles, 
  Award, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight,
  ShieldCheck,
  Star
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  badgeEmoji: string;
  badgeName: string;
  story: string;
  quizQuestion: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const LESSONS: Lesson[] = [
  {
    id: 'what-is-money',
    title: 'What is Money Anyway?',
    subtitle: 'From shiny seashells to digital coins',
    badgeEmoji: '🪙',
    badgeName: 'Gold Coin Badge',
    story: "Thousands of years ago, people traded cows, grain, and colorful seashells to buy bread and tools! But trading cows was heavy and clumsy. So humans invented money—first shiny gold coins, then paper bills, and now digital dollars on the internet like USDC that move at the speed of light!",
    quizQuestion: "Why did people invent money instead of trading heavy cows?",
    options: [
      "Because cows are too heavy to carry to the grocery store!",
      "Because cows refused to be traded.",
      "Because money tastes better than grain."
    ],
    correctIndex: 0,
    explanation: "Exactly! Money is an agreement that makes trading fair and easy for everyone.",
  },
  {
    id: 'two-jars',
    title: 'The Tale of Two Jars',
    subtitle: 'Why Moonjar separates safety from adventure',
    badgeEmoji: '🍯',
    badgeName: 'Dual Jar Master',
    story: "If you keep all your cookies in one basket, a clumsy bear might eat them all at once! That's why Moonjar gives you two jars: the Save Jar keeps most of your treasure safe in digital dollars, while the Moon Jar holds exciting little slices of frontier companies like rockets and robots.",
    quizQuestion: "What is the job of your Save Jar?",
    options: [
      "To keep your coins protected and rock-steady!",
      "To buy video game skins automatically.",
      "To hide secrets from your parents."
    ],
    correctIndex: 0,
    explanation: "Spot on! The Save Jar is your fortress of safety.",
  },
  {
    id: 'what-is-company',
    title: 'What is a Company?',
    subtitle: 'A team building something helpful for the world',
    badgeEmoji: '🏢',
    badgeName: 'Pioneer Builder',
    story: "A company isn't just a building—it is a team of brilliant scientists, engineers, designers, and dreamers who gather together to solve hard problems, like building electric cars or inventing medicine to cure sickness.",
    quizQuestion: "What is at the heart of every great company?",
    options: [
      "A team of people working together to solve problems!",
      "A magical dragon sitting on gold.",
      "A computer that never turns off."
    ],
    correctIndex: 0,
    explanation: "Right! Companies succeed when their teams build things that help humans.",
  },
  {
    id: 'prices-weather',
    title: 'Why Prices Change Like Weather',
    subtitle: 'Sunny days and rainy days in markets',
    badgeEmoji: '🌦️',
    badgeName: 'Weather Watcher',
    story: "Have you ever noticed that umbrellas cost more when it rains, and hot cocoa costs more in the snow? That is supply and demand! When lots of people want to own a piece of a company, the price can climb. When people feel cautious, the price can dip. We never panic because we are long-term savers!",
    quizQuestion: "What should you do when company prices dip for a day?",
    options: [
      "Stay calm! Long-term journeys take years, not days.",
      "Cry and throw your tablet in the pool.",
      "Sell all your toys."
    ],
    correctIndex: 0,
    explanation: "High five! Calm patience is the secret superpower of great savers.",
  },
  {
    id: 'magic-patience',
    title: 'The Magic of Patience',
    subtitle: 'How compound growth multiplies your seeds',
    badgeEmoji: '🌳',
    badgeName: 'Patient Oak',
    story: "If you plant an acorn today, you won't get shade tomorrow. But if you water it year after year, it grows into an oak tree with thousands of new acorns! In finance, leaving your money untouched allows it to earn small bonuses that earn even more bonuses.",
    quizQuestion: "What happens when you leave your savings alone for years?",
    options: [
      "They compound and grow like a mighty oak!",
      "They disappear into thin air.",
      "They turn into chocolate pudding."
    ],
    correctIndex: 0,
    explanation: "Yes! Compound interest is often called the eighth wonder of the world.",
  },
  {
    id: 'graduation',
    title: 'The Great Graduation Day',
    subtitle: 'What happens on your 18th birthday',
    badgeEmoji: '🎓',
    badgeName: 'Future Graduate',
    story: "Until you turn 18, your guardian holds the keys to keep you safe from mistakes. But on your 18th birthday, the smart contract unlocks! Moonjar transfers full ownership of all your USDC and company shares to your very own crypto wallet.",
    quizQuestion: "What unlocks on your 18th birthday?",
    options: [
      "Full ownership of your jars transferred to your wallet!",
      "Free ice cream for life.",
      "A spaceship from NASA."
    ],
    correctIndex: 0,
    explanation: "You got it! You graduate with financial wisdom and a real investment portfolio.",
  },
];

export default function LearnPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [vault, setVault] = useState<VaultState | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    setVault(getStoredVault());
  }, []);

  const completedList = vault?.completedLessons || ['what-is-money', 'two-jars'];

  const handleOpenLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    setSelectedOption(null);
    setIsAnswered(false);
    setIsCorrect(false);
  };

  const handleAnswer = (idx: number) => {
    if (!activeLesson || !vault) return;
    setSelectedOption(idx);
    setIsAnswered(true);
    const win = idx === activeLesson.correctIndex;
    setIsCorrect(win);

    if (win) {
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFE853', '#38D39F', '#A084E8'],
      });

      if (!completedList.includes(activeLesson.id)) {
        const updatedCompleted = [...completedList, activeLesson.id];
        const updatedVault = {
          ...vault,
          completedLessons: updatedCompleted,
        };
        setVault(updatedVault);
        saveVault(updatedVault);
      }
    }
  };

  if (!vault) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-4xl animate-bounce">📚</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border-3 border-ink p-6 shadow-sticker flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-200 border-2 border-ink text-xs font-display font-extrabold text-amber-950 shadow-sticker-sm">
            <BookOpen className="w-3.5 h-3.5" /> Pip's Money Academy
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-ink">
            Become a Master of Money
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 font-medium max-w-lg">
            Complete quick 1-minute interactive puzzles to unlock shiny sticker badges for your album!
          </p>
        </div>

        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
          <Pip mood="happy" />
        </div>
      </div>

      {/* Sticker Album Bar */}
      <div className="bg-white rounded-3xl border-3 border-ink p-6 shadow-sticker space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-display font-extrabold text-ink">
              Your Sticker Badge Album
            </h2>
          </div>
          <span className="text-xs font-display font-bold text-amber-700 bg-amber-100 px-3 py-0.5 rounded-full border border-amber-300">
            {completedList.length} of {LESSONS.length} Collected!
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {LESSONS.map((l) => {
            const isUnlocked = completedList.includes(l.id);
            return (
              <div 
                key={l.id}
                className={`p-3 rounded-2xl border-2 border-ink text-center flex flex-col items-center justify-center transition-all ${
                  isUnlocked 
                    ? 'bg-amber-50 shadow-sticker-sm' 
                    : 'bg-slate-100 opacity-40 grayscale'
                }`}
              >
                <div className="text-3xl mb-1">{l.badgeEmoji}</div>
                <div className="text-[10px] font-display font-bold text-ink leading-tight">
                  {l.badgeName}
                </div>
                <div className="text-[9px] text-slate-500 font-medium mt-0.5">
                  {isUnlocked ? 'Unlocked ✨' : 'Locked'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lessons List Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-display font-extrabold text-ink">
          Choose a Lesson
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LESSONS.map((lesson, idx) => {
            const isDone = completedList.includes(lesson.id);
            return (
              <div
                key={lesson.id}
                onClick={() => handleOpenLesson(lesson)}
                className="p-5 rounded-3xl border-3 border-ink bg-white hover:bg-amber-50/50 cursor-pointer transition-all hover:-translate-y-1 shadow-sticker flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-display font-black text-slate-400">
                      LESSON 0{idx + 1}
                    </span>
                    {isDone ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-mint-200 border border-ink text-[10px] font-bold text-emerald-900 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Completed
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-[10px] font-bold text-purple-900">
                        +1 Sticker
                      </span>
                    )}
                  </div>

                  <h3 className="font-display font-extrabold text-base text-ink">
                    {lesson.title}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {lesson.subtitle}
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t-2 border-slate-100 flex items-center justify-between">
                  <span className="text-2xl">{lesson.badgeEmoji}</span>
                  <span className="text-xs font-display font-bold text-purple-700 flex items-center gap-1">
                    Start Story <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lesson Interactive Modal */}
      {activeLesson && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-3 border-ink p-6 max-w-lg w-full shadow-sticker space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{activeLesson.badgeEmoji}</span>
                <div>
                  <h3 className="font-display font-extrabold text-ink text-lg">
                    {activeLesson.title}
                  </h3>
                  <div className="text-xs text-slate-500 font-medium">
                    {activeLesson.subtitle}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setActiveLesson(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Story Text */}
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-ink text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
              {activeLesson.story}
            </div>

            {/* Quiz Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-display font-extrabold text-purple-800 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-purple-600" /> Pip's Quick Puzzle
              </div>
              <p className="text-xs sm:text-sm font-bold text-ink">
                {activeLesson.quizQuestion}
              </p>

              <div className="space-y-2">
                {activeLesson.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrectOpt = idx === activeLesson.correctIndex;
                  return (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(idx)}
                      className={`w-full text-left p-3.5 rounded-2xl border-2 border-ink text-xs sm:text-sm font-medium transition-all ${
                        isAnswered && isCorrectOpt
                          ? 'bg-mint-200 text-emerald-950 font-bold shadow-sticker-sm'
                          : isAnswered && isSelected && !isCorrectOpt
                          ? 'bg-red-100 text-red-900 font-bold'
                          : isSelected
                          ? 'bg-purple-100'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{opt}</span>
                        {isAnswered && isCorrectOpt && <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {isAnswered && isCorrect && (
                <div className="p-3.5 rounded-2xl bg-mint-50 border-2 border-ink text-xs text-emerald-950 font-bold flex items-center gap-2 animate-in fade-in">
                  <span className="text-xl">🎉</span>
                  <div>
                    <div>{activeLesson.explanation}</div>
                    <div className="text-[11px] text-emerald-700 font-black mt-0.5">
                      + Badge Added to your Album!
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button 
              variant="primary" 
              className="w-full"
              onClick={() => setActiveLesson(null)}
            >
              Close Lesson
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
