import React from 'react';
import { useThemeStore } from '../stores/themeStore';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme, resolvedTheme } = useThemeStore();

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (theme === 'system') {
      return '💻';
    }
    return resolvedTheme === 'dark' ? '🌙' : '☀️';
  };

  const getLabel = () => {
    if (theme === 'system') {
      return 'System';
    }
    return theme === 'dark' ? 'Dark' : 'Light';
  };

  return (
    <button
      onClick={cycleTheme}
      className="btn-secondary flex items-center gap-2"
      title={`Theme: ${getLabel()}`}
    >
      <span>{getIcon()}</span>
      <span className="hidden sm:inline text-sm">{getLabel()}</span>
    </button>
  );
};

export default ThemeToggle;