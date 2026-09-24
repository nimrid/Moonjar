'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePreStocks } from '@/lib/usePreStocks';
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
    funFact: "SpaceX catches giant 23-story booster rockets in mid-air using robotic metal chopsticks called 'Mechazilla'!",
    weatherAnalogy: "Rocket journeys take years of testing. When tests succeed, excitement grows! When a test flight takes a rain check, prices can cool down. That's why we hold our slices with quiet patience for the long journey.",
    quizQuestion: "What makes SpaceX rockets special compared to older rockets?",
    quizOptions: [
      "They can land backwards and be flown again!",
      "They are made out of solid chocolate.",
      "They only fly underwater."
    ],
    correctIndex: 0,
    congratsText: "High five! Reusable rockets make exploring the solar system possible!",
  },
  openai: {
    title: 'OpenAI (Artificial Intelligence)',
    icon: '🧠',
    littleStory: "OpenAI makes computer helpers like ChatGPT! Imagine a friendly helper that read millions of books and can write funny stories, help you code a computer game, or explain why dinosaur bones turned to stone.",
    olderStory: "OpenAI is an AI research and deployment company dedicated to ensuring artificial general intelligence benefits all of humanity. They pioneered large-scale transformer models (GPT-4) and multimodal reasoning systems transforming research and engineering.",
    funFact: "ChatGPT was trained on billions of pages of science, history, and literature from across human history!",
    weatherAnalogy: "AI is growing very fast. Some days everyone wants to build new apps, and other days people pause to test safety. Patience lets good ideas mature into lasting tools.",
    quizQuestion: "What is OpenAI's most famous helpful assistant?",
    quizOptions: [
      "A flying microwave",
      "ChatGPT",
      "A laser skateboard"
    ],
    correctIndex: 1,
    congratsText: "Spot on! ChatGPT helps millions of people learn and create every day!",
  },
  anthropic: {
    title: 'Anthropic (Claude AI)',
    icon: '🤝',
    littleStory: "Anthropic builds an AI helper named Claude. Claude is like a thoughtful, gentle friend who answers questions and helps you write stories. The team teaches Claude to always be kind, honest, and helpful!",
    olderStory: "Anthropic is an AI safety and research public benefit corporation founded by former OpenAI researchers. They created Claude and pioneered Constitutional AI to build steerable, interpretable, and aligned frontier models.",
    funFact: "Anthropic's safety rulebook gives Claude a constitution, just like a fair playground code!",
    weatherAnalogy: "Doing things safely takes extra care and rigorous testing. Slow and steady wins the race, and keeping safety first builds trust.",
    quizQuestion: "What is the name of Anthropic's helpful, honest AI assistant?",
    quizOptions: [
      "Claude",
      "Sir Barks-a-Lot",
      "Robo-Toaster"
    ],
    correctIndex: 0,
    congratsText: "Correct! Claude is known for being thoughtful, honest, and safe!",
  },
  anduril: {
    title: 'Anduril Industries',
    icon: '🛡️',
    littleStory: "Anduril builds smart guardian robots, drones, and camera towers that watch over borders and wild forests to spot danger before anyone gets hurt.",
    olderStory: "Anduril transforms defense capabilities with Lattice OS, an autonomous operating system that links radar, autonomous aerial vehicles, and robotic sentries into a real-time situational awareness grid.",
    funFact: "Anduril was named after the 'Flame of the West' sword from Lord of the Rings!",
    weatherAnalogy: "Defense contracts are long-term agreements. Steady engineering teamwork matters much more than day-to-day news.",
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
    littleStory: "Figure makes robots that walk on two legs like humans! They have two arms, two legs, and cameras so they can pick up heavy boxes and do tough chores.",
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
  },
  kalshi: {
    title: 'Kalshi (Prediction Markets)',
    icon: '🎯',
    littleStory: "Kalshi is a clue game! People make smart guesses about the future, like tomorrow's weather or rocket launches. When lots of people share their clues, the group answer is often super smart!",
    olderStory: "Kalshi is the first federally regulated (CFTC) exchange where investors can trade event contracts on economic indicators, interest rates, weather patterns, and policy milestones, turning predictions into probabilities.",
    funFact: "The word 'Kalshi' means 'everything' in Arabic!",
    weatherAnalogy: "Predictions change whenever fresh clues arrive. It is a live scoreboard for how the world learns new facts.",
    quizQuestion: "What is Kalshi regulated to trade?",
    quizOptions: [
      "Event contracts predicting real-world outcomes",
      "Magic flying carpets",
      "Baseball trading cards only"
    ],
    correctIndex: 0,
    congratsText: "Bravo! Kalshi allows people to forecast events with real probabilities!",
  },
  polymarket: {
    title: 'Polymarket (Forecasting Markets)',
    icon: '🔮',
    littleStory: "Polymarket is a worldwide idea board where people around the globe vote on what will happen next. It helps everyone see what people think will happen before it does!",
    olderStory: "Polymarket is a decentralized prediction market platform built on public blockchain rails. Global participants trade shares on world events, providing real-time probabilistic forecasts that news outlets quote worldwide.",
    funFact: "Polymarket runs 24/7 on decentralized ledgers so the forecasting scoreboard is always open and transparent!",
    weatherAnalogy: "Probability changes like ocean waves as new news breaks. When everyone is calm, predictions settle into clear consensus.",
    quizQuestion: "Why do scientists and journalists look at prediction markets like Polymarket?",
    quizOptions: [
      "Because collective probabilities often forecast events better than single guesses",
      "Because they like looking at pretty colors",
      "Because it tells jokes"
    ],
    correctIndex: 0,
    congratsText: "Exactly! The wisdom of crowds creates accurate probabilistic forecasts!",
  },
  neuralink: {
    title: 'Neuralink (Brain Interfaces)',
    icon: '⚡',
    littleStory: "Neuralink makes tiny computer chips that help people who cannot move their hands. Just by thinking, a person can move a computer mouse or play chess like magic!",
    olderStory: "Neuralink is developing ultra-high-bandwidth brain-computer interfaces. Their fully implantable N1 device allows people with paralysis to control smartphones and computers using neural intent.",
    funFact: "The tiny wires inside the chip are thinner than a single strand of human hair!",
    weatherAnalogy: "Medical science moves through rigorous safety trials. Every patient success is a milestone that changes lives forever.",
    quizQuestion: "How do people control computers with Neuralink's brain chip?",
    quizOptions: [
      "By thinking their intentions naturally",
      "By yelling loudly",
      "By doing handstands"
    ],
    correctIndex: 0,
    congratsText: "Incredible! Neural signals are translated into digital commands to restore independence!",
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
  const { getToken } = usePreStocks();
  const tokenMeta = getToken(symbol);

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
      <div className="bg-white rounded-3xl border-3 border-ink p-4 sm:p-8 shadow-sticker space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-4 sm:pb-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-purple-100 border-2 sm:border-3 border-ink flex items-center justify-center text-2xl sm:text-3xl shadow-sticker-sm shrink-0">
              {story.icon}
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-bold text-purple-700 uppercase tracking-wider">
                Frontier Pioneer
              </div>
              <h1 className="text-xl sm:text-3xl font-display font-extrabold text-ink leading-tight">
                {story.title}
              </h1>
            </div>
          </div>

          {/* Age-adaptive Reading Level Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 border-2 border-ink w-full sm:w-auto justify-center">
            <button
              onClick={() => setLevel('little')}
              className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-display font-bold transition-all text-center ${
                level === 'little'
                  ? 'bg-amber-300 text-ink shadow-sticker-sm'
                  : 'text-slate-600 hover:text-ink'
              }`}
            >
              🌟 Explorer (8-11)
            </button>
            <button
              onClick={() => setLevel('older')}
              className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-display font-bold transition-all text-center ${
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
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-ink shadow-sticker-sm flex items-start gap-3 sm:gap-4">
          <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
            <Pip mood="happy" size={48} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-display font-black text-amber-900 uppercase tracking-wider flex items-center gap-1">
              <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" /> Pip's Fun Fact!
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
