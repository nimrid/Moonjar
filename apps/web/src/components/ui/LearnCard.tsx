'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, ArrowRight } from 'lucide-react';
import { Button } from './Button';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LearnLesson {
  id: string;
  title: string;
  icon: string;
  summary: string;
  fullStory: string;
  quiz: QuizQuestion;
}

interface LearnCardProps {
  lesson: LearnLesson;
  onComplete?: (id: string) => void;
  completed?: boolean;
}

export const LearnCard: React.FC<LearnCardProps> = ({ lesson, onComplete, completed = false }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSelect = (idx: number) => {
    if (isSubmitted) return;
    setSelectedOption(idx);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;
    setIsSubmitted(true);
    if (selectedOption === lesson.quiz.correctIndex && onComplete) {
      onComplete(lesson.id);
    }
  };

  const handleReset = () => {
    setSelectedOption(null);
    setIsSubmitted(false);
  };

  const isCorrect = selectedOption === lesson.quiz.correctIndex;

  return (
    <div className="bg-white rounded-3xl border-3 border-ink shadow-sticker overflow-hidden transition-all">
      {/* Header */}
      <div className="p-4 bg-amber-50 border-b-2 border-ink flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{lesson.icon}</span>
          <h3 className="font-display font-bold text-lg text-ink">{lesson.title}</h3>
        </div>
        {completed && (
          <span className="flex items-center gap-1 bg-leaf-light text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full border border-leaf">
            <CheckCircle2 className="w-3.5 h-3.5" /> Solved!
          </span>
        )}
      </div>

      <div className="p-5">
        {!isFlipped ? (
          <div>
            <p className="text-sm font-body text-slate-700 leading-relaxed mb-4">
              {lesson.summary}
            </p>
            <p className="text-sm font-body text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4">
              {lesson.fullStory}
            </p>
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={() => setIsFlipped(true)}
            >
              Take Quiz Challenge 🎯
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-purple-700">
              <HelpCircle className="w-4 h-4" /> Quick Quiz
            </div>
            <p className="font-display font-bold text-base text-ink mb-4">
              {lesson.quiz.question}
            </p>

            <div className="space-y-2 mb-4">
              {lesson.quiz.options.map((opt, idx) => {
                let btnStyle = 'bg-white border-2 border-slate-300 text-slate-800 hover:border-ink';
                if (selectedOption === idx) {
                  btnStyle = 'bg-purple-100 border-2 border-grape text-purple-950 font-bold';
                }
                if (isSubmitted) {
                  if (idx === lesson.quiz.correctIndex) {
                    btnStyle = 'bg-green-100 border-2 border-leaf text-green-900 font-bold';
                  } else if (selectedOption === idx) {
                    btnStyle = 'bg-red-100 border-2 border-rose text-red-900 line-through';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelect(idx)}
                    className={`w-full text-left p-3 rounded-xl text-sm transition-all ${btnStyle}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {isSubmitted && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-medium border-2 ${
                  isCorrect ? 'bg-green-50 border-green-300 text-green-900' : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                {isCorrect ? '🎉 Great job! ' : '💡 Let’s learn: '}
                {lesson.quiz.explanation}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setIsFlipped(false);
                  handleReset();
                }}
              >
                Back to Story
              </Button>
              {!isSubmitted ? (
                <Button
                  variant="grape"
                  size="sm"
                  className="flex-1"
                  disabled={selectedOption === null}
                  onClick={handleSubmit}
                >
                  Submit Answer
                </Button>
              ) : (
                <Button
                  variant="leaf"
                  size="sm"
                  className="flex-1"
                  onClick={() => setIsFlipped(false)}
                >
                  Done
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
