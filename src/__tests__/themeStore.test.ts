import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '../stores/themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'light', resolvedTheme: 'light' });
    document.documentElement.classList.remove('dark');
  });

  it('setTheme("dark") sets theme and resolvedTheme', () => {
    useThemeStore.getState().setTheme('dark');
    const state = useThemeStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.resolvedTheme).toBe('dark');
  });

  it('setTheme("light") sets theme and resolvedTheme', () => {
    useThemeStore.getState().setTheme('dark');
    useThemeStore.getState().setTheme('light');
    const state = useThemeStore.getState();
    expect(state.theme).toBe('light');
    expect(state.resolvedTheme).toBe('light');
  });

  it('setTheme("system") resolves based on matchMedia', () => {
    // matchMedia is mocked to return { matches: false } in setup.ts,
    // so system theme should resolve to 'light'
    useThemeStore.getState().setTheme('system');
    const state = useThemeStore.getState();
    expect(state.theme).toBe('system');
    expect(state.resolvedTheme).toBe('light');
  });

  it('setTheme("dark") adds "dark" class on documentElement', () => {
    useThemeStore.getState().setTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('setTheme("light") removes "dark" class from documentElement', () => {
    document.documentElement.classList.add('dark');
    useThemeStore.getState().setTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
