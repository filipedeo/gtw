import React from 'react';
import { useThemeStore } from '../stores/themeStore';
import { Button } from './ui';
import { SunIcon, MoonIcon } from './icons';

const ThemeToggle: React.FC = React.memo(() => {
  const { resolvedTheme, setTheme } = useThemeStore();

  // Simple toggle between light and dark (no system mode)
  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const isDark = resolvedTheme === 'dark';
  const label = isDark ? 'Dark' : 'Light';
  const nextTheme = isDark ? 'light' : 'dark';

  return (
    <Button
      variant="secondary"
      onClick={toggleTheme}
      title={`Theme: ${label}`}
      aria-label={`Current theme: ${label}. Click to switch to ${nextTheme} theme`}
      aria-live="polite"
    >
      {isDark ? <MoonIcon size={18} /> : <SunIcon size={18} />}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
});

ThemeToggle.displayName = 'ThemeToggle';

export default ThemeToggle;
