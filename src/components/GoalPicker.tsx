import React from 'react';
import { useProgressStore, type SkillLevel } from '../stores/progressStore';

// First-run level chooser (roadmap P1#4). Sets the difficulty floor the guided
// path starts from. Non-null goal never re-shows; "Skip" picks beginner.
const LEVELS: { level: SkillLevel; label: string; desc: string }[] = [
  { level: 'beginner', label: 'Beginner', desc: 'New to theory — start from the basics' },
  { level: 'intermediate', label: 'Intermediate', desc: 'Know your notes — build fluency' },
  { level: 'advanced', label: 'Advanced', desc: 'Comfortable — jump to harder material' },
];

const GoalPicker: React.FC = () => {
  const { goal, setGoal } = useProgressStore();
  if (goal !== null) return null;

  return (
    <div className="card" role="region" aria-label="Choose your starting level">
      <span className="eyebrow block mb-1">Welcome</span>
      <h2 className="text-lg font-bold text-fg-strong mb-1">Where are you starting?</h2>
      <p className="text-sm text-fg-muted mb-4">
        Sets where your learning path begins — you can still practise anything, anytime.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {LEVELS.map(({ level, label, desc }) => (
          <button
            key={level}
            onClick={() => setGoal(level)}
            className="text-left p-3 rounded-[var(--rad-md)] bg-surface-sunken hover:bg-surface-hover border border-line transition-colors phone-touch"
          >
            <span className="block font-semibold text-fg-strong">{label}</span>
            <span className="block text-xs text-fg-muted mt-0.5">{desc}</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => setGoal('beginner')}
        className="mt-3 text-xs text-fg-muted hover:text-fg underline"
      >
        Skip
      </button>
    </div>
  );
};

export default GoalPicker;
