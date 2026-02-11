import { useThemeStore } from '../stores/themeStore';

const ThemeToggle: React.FC = () => {
  const { resolvedTheme, setTheme } = useThemeStore();

  // Simple toggle between light and dark (no system mode)
  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const getIcon = () => {
    return resolvedTheme === 'dark' ? '🌙' : '☀️';
  };

  const getLabel = () => {
    return resolvedTheme === 'dark' ? 'Dark' : 'Light';
  };

  const getNextTheme = () => {
    return resolvedTheme === 'dark' ? 'light' : 'dark';
  };

  return (
    <button
      onClick={toggleTheme}
      className="btn-secondary flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      title={`Theme: ${getLabel()}`}
      aria-label={`Current theme: ${getLabel()}. Click to switch to ${getNextTheme()} theme`}
      aria-live="polite"
    >
      <span aria-hidden="true">{getIcon()}</span>
      <span className="hidden sm:inline text-sm">{getLabel()}</span>
    </button>
  );
};

export default ThemeToggle;