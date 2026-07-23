# Roadmap

A prioritized backlog of improvements, derived from a review of the current app
against common practice in dedicated guitar and music-theory learning tools.
Priorities are directional (value / effort), not commitments.

## Where the app stands today

The theory and content layer is a **strength**, not a gap. The app already ships:

- A correct theory engine with live-correct enharmonic spelling.
- 13 exercise types / ~86 exercises spanning notes, intervals, CAGED, 3NPS,
  modes, arpeggios, chord/scale relationships, voicings, progressions, walking
  bass, and jam practice.
- Ear training (chord quality, 7ths, functional scale degrees, melodic
  interval-by-ear).
- SM-2 spaced repetition with progress tracking (streaks, auto weak/strong areas).
- A weighted session planner (time-boxed: due reviews -> weak -> least-practiced).
- Auto-graded quizzes with immediate right/wrong + reveal.
- A mic-based autocorrelation tuner.
- A polished, responsive, layered-dark UI with correct desktop/tablet/phone
  breakpoints.

**Guiding principle:** stay a fretboard-first theory practice tool. Additions
must add real learning value and fit that scope. No feature bloat; no pivot to a
tab/song streaming platform.

The biggest wins are **structural** (the learning journey around the content),
plus a few **high-fit content additions** and **targeted visual-clarity fixes**.

---

## P1 - Learning journey (structural, highest leverage)

1. **Guided path / "what's next"** *(value: very high / effort: med-high)*
   The app auto-lands on the first exercise and leaves the learner to
   self-navigate a category dropdown, even though the exercise data is already
   authored in a sensible arc (notes -> CAGED -> 3NPS -> modes -> arpeggios ->
   application). Add an ordered path with light prerequisites/gating and a
   persistent "continue where you left off."

2. **Active recall for study-mode exercises** *(value: very high / effort: med)*
   About half the exercises (CAGED, 3NPS, modal, pentatonic, arpeggio, voicings,
   walking bass, jam) are "look at the labelled pattern, then self-rate." Add an
   optional objective check (e.g. hide labels, then locate/name the asked
   degree or note) so these get the same right/wrong + reveal treatment the quiz
   exercises already do well.

3. **Surface spaced repetition** *(value: high / effort: low-med)*
   SM-2 is fully built and wired but only appears as a passive "Due for Review:
   N" tile. Add a one-tap "Review due now" session. Where an objective score is
   available, prefer it over subjective self-rating for scheduling.

4. **Onboarding + placement + meaningful difficulty** *(value: med-high / effort: med)*
   There is no goal-setting or placement, and the 1-5 difficulty label is
   cosmetic (it doesn't order, gate, or adapt) and can mislead relative to the
   in-exercise key/pattern picker. A short placement + goal selection can seed
   the path and make difficulty real.

5. **Promote the session planner** *(value: med-high / effort: low)*
   It is the best deliberate-practice tool in the app but is buried in the side
   rail. Make it a primary entry point.

## P2 - High-value content additions (low effort, high scope-fit)

1. **Fretboard note-naming speed trainer** *(value: high / effort: low)*
   Timed, name<->locate, with a personal best. Cheapest big win; reuses the
   existing fretboard + quiz framework.

2. **Alternate / custom tunings** *(value: med-high / effort: low)*
   Drop D, DADGAD, Open G/D, half-step down, 7/8-string, custom. Tuning is
   already data-driven; this is mostly UI plumbing to expose it.

3. **Chord library + one-minute chord-change trainer** *(value: high / effort: med)*
   A chord-box dictionary plus a change drill. A common top beginner need; the
   app teaches voicing theory but has no reference diagrams or change drill.

## P3 - New pillars (higher effort, high value)

1. **Rhythm training module** *(value: high / effort: med)*
   Rhythm reading + tap/clap-back + dictation, metronome-graded. The single
   biggest true pedagogical hole; the metronome already exists.

2. **Ear-training expansion + integration** *(value: med-high / effort: low-med)*
   Extend the existing ear engine to scale/mode-by-ear, cadence and
   progression-by-ear, and a standalone configurable interval trainer. Integrate
   as "hear a degree -> locate it on the neck" to bridge ear <-> fretboard.

3. **"Play it" mic-feedback mode** *(value: high / effort: med / needs mic)*
   The autocorrelation pitch engine already ships but is wired only to the
   tuner. Add a monophonic play-along check so an exercise can listen to the
   user's playing. (Polyphonic chord detection from the mic is out of scope -
   unreliable in-browser.)

## P4 - Visual clarity (targeted, mostly low effort)

1. **Colorblind-safe root encoding** *(value: med / effort: low)*
   Root vs scale note is currently color-only (red vs blue) with no redundant
   ring/shape in the default Notes mode. Add a ring, outline, or shape so the
   root is unambiguous without color. (Degrees/Intervals modes already mitigate
   via the "1"/"R" label.)

2. **Zoom-to-active-region fretboard** *(value: med / effort: med)*
   Low patterns crowd the nut while much of the board sits empty. Render only
   the used fret window with larger note circles, especially on phone.

3. **Phone category navigation** *(value: med / effort: low-med)*
   Category chips fill the entire first phone viewport before any content.
   Collapse to a dropdown or horizontal scroller.

4. **Hide the inert display toggle on note-identification** *(value: low / effort: low)*
   The Notes/Int./Deg. toggle has no effect where there is no scale context;
   hide or disable it there.

5. **Contrast pass** *(value: low / effort: low)*
   Fret numbers/inlays and the phone "?" target ring are low-contrast; nudge
   contrast for legibility.

6. **Answer-feedback visualization** *(value: high / effort: med)* — SEQUENCED LAST
   On both correct and incorrect answers, show a visual representation of the
   relevant notes/structure, not just text. For circle-of-fifths: render the
   key's notes / the scale / the position on the circle. Generalize the pattern
   to other quizzes (intervals, note-ID, etc.) so every answer reveal teaches
   the underlying structure visually. Reuse the fretboard/circle render where it
   fits. NOTE (user 2026-07-23): tackle this only AFTER all in-progress tracks
   finish AND after the Track B visual overhaul lands, so it's built on the
   modernized components rather than retrofitted twice.

## Quick wins (small, scope-fitting)

- JSON progress export/import (safety net for localStorage-only data).
- Metronome tap-tempo + subdivisions.
- A reusable "challenge mode" wrapper (timer + question limit + personal best)
  across existing quizzes.
- Tempo/speed auto-ramp trainer for technique (arpeggios, sweeps, 3NPS, walking
  bass, chord changes).
- Circle of fifths / key-signature trainer + construction quizzes.

## Explicitly out of scope (for now)

- **Full song / synced-tab library** - a different product (content, licensing,
  and a tab engine). Middle-ground if ever desired: import-only Guitar Pro /
  MusicXML / ASCII tab into the existing fretboard viewer.
- **Full staff-notation reading** - needs a heavy notation library and drifts
  from the fretboard-first identity. Prefer the circle-of-fifths / key-signature
  trainer instead.
