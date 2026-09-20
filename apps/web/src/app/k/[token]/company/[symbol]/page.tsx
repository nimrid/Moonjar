'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PRESTOCKS_LIST } from '@moonjar/shared';
import { Pip } from '@/components/mascot/Pip';
import { Button } from '@/components/ui/Button';
import confetti from 'canvas-confetti';
import { 
  Rocket, 
  ArrowLeft, 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  BookOpen, 
  Lightbulb, 
  Compass,
  Smile
} from 'lucide-react';

interface CompanyContent {
  title: string;
  icon: string;
  littleStory: string;
  olderStory: string;
  funFact: string;
  weatherAnalogy: string;
  quizQuestion: string;
  quizOptions: string[];
  correctIndex: number;
  congratsText: string;
}

const COMPANY_STORIES: Record<string, CompanyContent> = {
  spacex: {
    title: 'Space Exploration Technologies (SpaceX)',
    icon: '🚀',
    littleStory: "SpaceX builds gigantic rockets that can fly into outer space and land right back on Earth on their own legs! Before SpaceX, rockets could only be used once and were thrown away in the ocean. SpaceX made them reusable, just like an airplane!",
    olderStory: "Founded with the mission to make life multiplanetary, SpaceX designed Falcon 9, Falcon Heavy, and Starship. By vertically integrating rocket engineering and recovering boosters autonomously, they reduced launch costs by over 90% and deployed the Starlink satellite internet constellation.",
    funFact: "SpaceX catches giant 23-story booster rockets in mid-air using giant robotic metal chopsticks called 'Mechazilla'!",
    weatherAnalogy: "Rocket journeys take years of testing. When tests succeed, excitement grows! When a test flight takes a rain check, prices can cool down. That's why we keep our space slices safe for the long journey.",
    quizQuestion: "What makes SpaceX rockets special compared to old rockets?",
    quizOptions: [
      "They can land backwards and be flown again!",
      "They are made out of pure solid gold.",
      "They only fly underwater."
    ],
    correctIndex: 0,
    congratsText: "High five! Reusable rockets make exploring the solar system possible!",
  },
  openai: {
    title: 'OpenAI (Artificial Intelligence)',
    icon: '🧠',
    littleStory: "OpenAI makes computer helpers like ChatGPT! Imagine a super-friendly dictionary that read millions of books and can write poems, help you code a video game, or explain why dinosaur bones turned to stone.",
    olderStory: "OpenAI is an AI research organization dedicated to ensuring that Artificial General Intelligence (AGI) benefits all of humanity. They pioneered large language models (GPT-4) and multimodal reasoning systems that transform software engineering and science.",
    funFact: "ChatGPT was trained on billions of pages of science, history, and literature from across human history!",
    weatherAnalogy: "AI is brand new and growing super fast. Some days everyone wants to build new apps, and other days people pause to test safety. Patience lets good ideas mature.",
    quizQuestion: "What is OpenAI's most famous friendly helper?",
    quizOptions: [
      "A flying microwave",
      "ChatGPT",
      "A laser skateboard"
    ],
    correctIndex: 1,
    congratsText: "Spot on! ChatGPT helps millions of people learn and create every day!",
  },
  anduril: {
    title: 'Anduril Industries',
    icon: '🛡️',
    littleStory: "Anduril builds smart guardian robots, drones, and camera towers that watch over borders and wild forests to spot danger before anyone gets hurt.",
    olderStory: "Anduril transforms defense capabilities with Lattice OS, an autonomous operating system that links radar, autonomous aerial vehicles, and robotic sentries into a real-time situational awareness grid.",
    funFact: "Anduril was named after the 'Flame of the West' sword from Lord of the Rings!",
    weatherAnalogy: "Defense contracts are long-term agreements. Steady teamwork matters more than day-to-day hype.",
    quizQuestion: "What kind of systems does Anduril make to protect people?",
    quizOptions: [
      "Autonomous camera towers and smart drones",
      "Marshmallow launchers",
      "Rollercoasters"
    ],
    correctIndex: 0,
    congratsText: "Correct! Smart sensors and software help keep firefighters and guardians safe.",
  },
  figureai: {
    title: 'Figure AI (Humanoid Robotics)',
    icon: '🤖',
    littleStory: "Figure makes robots that look and walk like friendly humans! They have two arms, two legs, and clever cameras so they can pick up heavy grocery boxes and do tough chores.",
    olderStory: "Figure is developing general-purpose autonomous humanoids (Figure 01 & 02). Powered by vision-language models, their robots are engineered for manufacturing logistics, warehouse sorting, and eventual domestic assistance.",
    funFact: "Figure robots have custom electric fingers with tactile sensors that can hold a delicate egg without cracking it!",
    weatherAnalogy: "Teaching a robot to balance on two legs is hard work! As engineers solve each challenge, the company grows stronger step by step.",
    quizQuestion: "What delicate object can Figure's robotic fingers hold safely?",
    quizOptions: [
      "An egg without cracking it",
      "A burning bowling ball",
      "A cloud from the sky"
    ],
    correctIndex: 0,
    congratsText: "Amazing! Dexterous hands allow robots to assist humans with gentle care.",
  }
};

export default function CompanyStoryPage({
  params,
}: {
  params: { token: string; symbol: string };
}) {
  const { token, symbol } = params;
  const symKey = symbol.toLowerCase();
  const story = COMPANY_STORIES[symKey] || COMPANY_STORIES['spacex'];
  const tokenMeta = PRESTOCKS_LIST.find(p => p.symbol.toLowerCase() === symKey) || PRESTOCKS_LIST[0];

  const [level, setLevel] = useState<'little' | 'older'>('little');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleSelectOption = (idx: number) => {
    setSelectedOption(idx);
    setIsAnswered(true);
    const win = idx === story.correctIndex;
    setIsCorrect(win);
    if (win) {
      confetti({
        particleCount: 35,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#A084E8', '#FFE853', '#38D39F'],
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link 
          href={`/k/${token}/moon`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-ink bg-white hover:bg-slate-100 text-xs font-bold text-ink shadow-sticker-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Moon Jar
        </Link>
      </div>

      {/* Main Story Hero Card */}
      <div className="bg-white rounded-3xl border-3 border-ink p-6 sm:p-8 shadow-sticker space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 border-3 border-ink flex items-center justify-center text-3xl shadow-sticker-sm">
              {story.icon}
            </div>
            <div>
              <div className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                Frontier Pioneer
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-ink">
                {story.title}
              </h1>
            </div>
          </div>

          {/* Age-adaptive Reading Level Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border-2 border-ink">
            <button
              onClick={() => setLevel('little')}
              className={`px-3 py-1 rounded-xl text-xs font-display font-bold transition-all ${
                level === 'little'
                  ? 'bg-amber-300 text-ink shadow-sticker-sm'
                  : 'text-slate-600 hover:text-ink'
              }`}
            >
              🌟 Explorer (8-11)
            </button>
            <button
              onClick={() => setLevel('older')}
              className={`px-3 py-1 rounded-xl text-xs font-display font-bold transition-all ${
                level === 'older'
                  ? 'bg-purple-300 text-ink shadow-sticker-sm'
                  : 'text-slate-600 hover:text-ink'
              }`}
            >
              🚀 Builder (12-14)
            </button>
          </div>
        </div>

        {/* Story Text */}
        <div className="prose max-w-none">
          <p className="text-base sm:text-lg text-slate-800 leading-relaxed font-body font-medium">
            {level === 'little' ? story.littleStory : story.olderStory}
          </p>
        </div>

        {/* Pip's Fun Fact */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-ink shadow-sticker-sm flex items-start gap-4">
          <div className="w-12 h-12 flex-shrink-0">
            <Pip mood="happy" />
          </div>
          <div>
            <div className="text-xs font-display font-black text-amber-900 uppercase tracking-wider flex items-center gap-1">
              <Lightbulb className="w-4 h-4 text-amber-600" /> Pip's Fun Fact!
            </div>
            <p className="text-xs sm:text-sm text-amber-950 font-bold mt-1">
              "{story.funFact}"
            </p>
          </div>
        </div>

        {/* Calm Weather Analogy */}
        <div className="p-4 rounded-2xl bg-sky-50 border-2 border-ink shadow-sticker-sm flex items-start gap-3">
          <div className="text-2xl flex-shrink-0">🌦️</div>
          <div>
            <div className="text-xs font-display font-extrabold text-sky-900">
              Why do prices change like the weather?
            </div>
            <p className="text-xs text-sky-950 font-medium mt-1 leading-relaxed">
              {story.weatherAnalogy}
            </p>
          </div>
        </div>

        {/* Interactive Curiosity Check */}
        <div className="pt-4 border-t-2 border-slate-100 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="text-base font-display font-extrabold text-ink">
              Pip's Curiosity Check!
            </h3>
          </div>

          <p className="text-xs sm:text-sm font-bold text-slate-700">
            {story.quizQuestion}
          </p>

          <div className="space-y-2">
            {story.quizOptions.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrectOpt = idx === story.correctIndex;
              return (
                <button
                  key={opt}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full text-left p-3.5 rounded-2xl border-2 border-ink text-xs sm:text-sm font-medium transition-all ${
                    isAnswered && isCorrectOpt
                      ? 'bg-mint-200 text-emerald-950 font-bold shadow-sticker-sm'
                      : isAnswered && isSelected && !isCorrectOpt
                      ? 'bg-red-100 text-red-900 font-bold'
                      : isSelected
                      ? 'bg-purple-100 border-purple-800'
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
            <div className="p-3.5 rounded-2xl bg-mint-50 border-2 border-ink shadow-sticker-sm text-xs text-emerald-950 font-bold flex items-center gap-2 animate-in fade-in">
              <span className="text-lg">🎉</span> {story.congratsText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
