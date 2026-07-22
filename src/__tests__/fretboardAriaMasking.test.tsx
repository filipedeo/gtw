import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Fretboard from '../components/Fretboard';
import { useGuitarStore } from '../stores/guitarStore';
import { STANDARD_TUNINGS } from '../types/guitar';

// A-1 residual (accessibility): the Note Identification target is visually
// masked as "?" via the store's maskedPositions, but the canvas aria-label used
// to still enumerate the target note by name (e.g. "E on string 4, fret 2"),
// leaking the answer to screen-reader users. The aria-label must reuse the same
// masking predicate the visible renderer uses to draw "?".
describe('Fretboard aria-label masking (Note ID answer leak)', () => {
  // String index 2, fret 2 on standard 6-string tuning is D3 + 2 = E,
  // rendered as "string 4" (stringCount - string). Mirrors the reported leak.
  const target = { string: 2, fret: 2 };

  beforeEach(() => {
    useGuitarStore.setState({
      instrument: 'guitar',
      stringCount: 6,
      tuning: STANDARD_TUNINGS['standard-6'],
      highlightedPositions: [],
      secondaryHighlightedPositions: [],
      maskedPositions: [],
      rootNote: null,
      showAllNotes: false,
    });
  });

  it('masks the note name in the aria-label for a masked, unrevealed position', () => {
    useGuitarStore.setState({
      highlightedPositions: [target],
      maskedPositions: [target],
    });

    render(<Fretboard interactive={false} hideNoteNames />);
    const label = screen.getByRole('img').getAttribute('aria-label') ?? '';

    expect(label).toContain('? on string 4, fret 2');
    // The actual answer must not leak.
    expect(label).not.toContain('E on string 4, fret 2');
  });

  it('reveals the note name once the position is locally revealed', () => {
    useGuitarStore.setState({
      highlightedPositions: [target],
      maskedPositions: [target],
    });

    render(
      <Fretboard interactive={false} hideNoteNames revealedPositions={[target]} />
    );
    const label = screen.getByRole('img').getAttribute('aria-label') ?? '';

    expect(label).toContain('E on string 4, fret 2');
    expect(label).not.toContain('? on string 4, fret 2');
  });

  it('does not mask non-masked highlighted positions (other exercises)', () => {
    // No maskedPositions set: a normal scale/arpeggio highlight must still be
    // announced by name.
    useGuitarStore.setState({
      highlightedPositions: [target],
      maskedPositions: [],
    });

    render(<Fretboard interactive={false} />);
    const label = screen.getByRole('img').getAttribute('aria-label') ?? '';

    expect(label).toContain('E on string 4, fret 2');
    expect(label).not.toContain('? on string 4, fret 2');
  });
});
