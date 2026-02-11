# Guitar Theory Web App
> A comprehensive web application for guitar theory learning with fretboard visualization, ear training, and practice analytics

---

## 📋 Project Overview

This project addresses the key gap identified in guitar theory education: **no existing tool combines fretboard visualization + theory teaching + ear training + 7-string support + spaced repetition + practice analytics** in one unified platform.

### Key Differentiators
- ✅ **7-string guitar support** (major gap in current market)
- ✅ **Guitar-timbre ear training** (vs. piano-only apps)
- ✅ **Spaced repetition system** for optimal retention
- ✅ **Modal practice with characteristic note method**
- ✅ **Complete Drop 2 voicing system**
- ✅ **Real-time audio feedback** with quality guitar samples

## 🎯 Target Users

**Primary**: Intermediate guitarists (2+ years experience) seeking systematic theory knowledge
**Secondary**: Advanced beginners ready for theory concepts
**Tertiary**: 7-string players underserved by current apps

## 🏗️ Architecture

### Tech Stack
```
Frontend:     React 19 + TypeScript + Vite
State:        Zustand + Jotai
Styling:      Tailwind CSS
Audio:        Tone.js + Web Audio API
Theory:       tonal.js
Storage:      IndexedDB (Dexie.js)
Deployment:   Vercel/Cloudflare Pages
```

### Core Components
- **Fretboard Engine**: Canvas-based with 6/7-string support
- **Audio System**: Multi-timbral guitar samples, drones, metronome
- **Exercise Framework**: Adaptive difficulty with spaced repetition
- **Progress Analytics**: Detailed performance tracking and insights

## 📁 Documentation

| Document | Purpose |
|----------|---------|
| **[REQUIREMENTS.md](./REQUIREMENTS.md)** | Complete product requirements and MVP definition |
| **[TECHNICAL_SPECS.md](./TECHNICAL_SPECS.md)** | Detailed implementation specifications |
| **[EXERCISE_SPECIFICATIONS.md](./EXERCISE_SPECIFICATIONS.md)** | Exercise design and progression system |
| **[AUDIO_SYSTEM_SPEC.md](./AUDIO_SYSTEM_SPEC.md)** | Audio engine architecture and sample management |
| **[PROJECT_SETUP.md](./PROJECT_SETUP.md)** | Development environment and tooling setup |

## 🎵 Core Features

### Phase 1: Foundation (Weeks 1-4)
- [x] Interactive fretboard with 6/7-string support
- [x] Basic note identification exercises
- [x] Audio playback system with guitar samples
- [x] Progress tracking and persistence
- [x] Responsive design for mobile/desktop

### Phase 2: Core Exercises (Weeks 5-8)
- [x] Modal practice with characteristic note method
- [x] Guitar-timbre ear training exercises
- [x] Complete Drop 2 voicing system
- [x] Spaced repetition algorithm (SM-2)
- [x] Achievement and streak tracking

### Phase 3: Advanced Features (Weeks 9-12)
- [x] Harmonic analysis tools
- [x] Real-time audio input (pitch detection)
- [x] Custom exercise creation
- [x] Comprehensive analytics dashboard
- [x] PWA functionality for offline use

### Phase 4: Polish & Extension (Weeks 13-16)
- [x] Performance optimization
- [x] Advanced 7-string content
- [x] User feedback integration
- [x] A/B testing for learning effectiveness

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0.0+ 
- npm or yarn
- Modern browser with Web Audio API support

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd guitar-theory-webapp

# Run setup script
chmod +x tools/dev-setup.sh
./tools/dev-setup.sh

# Start development server
npm run dev
```

### Development Commands
```bash
npm run dev          # Development server
npm run test         # Run tests
npm run type-check   # TypeScript validation
npm run build        # Production build
npm run preview      # Preview production build
```

## 🎸 Exercise Types

### 1. Note Identification
Progressive fretboard note recognition with difficulty scaling from open strings to full 24-fret coverage.

### 2. Modal Practice
Characteristic note approach for internalizing modal sounds:
- Dorian's natural 6th
- Phrygian's flat 2nd  
- Lydian's sharp 4th
- And more...

### 3. Drop 2 Voicing System
Complete chord voicing library:
- 4 inversions × 6 qualities × 3 string sets = 72 voicings
- Voice leading exercises with minimal finger movement
- 7-string extended range voicings

### 4. Guitar-Timbre Ear Training
Interval and chord recognition using realistic guitar sounds instead of piano timbres.

### 5. Harmonic Analysis
Real-song chord progression analysis with Roman numeral identification.

## 📊 Analytics & Progress

### Spaced Repetition System
- SM-2 algorithm for optimal review scheduling
- Automatic weak area detection
- Personalized practice recommendations

### Performance Metrics
- Response time tracking (target: <1 second for note ID)
- Accuracy trends over time
- Difficulty progression monitoring
- Practice consistency (streak tracking)

### Learning Insights
- Identify specific problem areas (e.g., "Struggles with upper frets")
- Progress visualization with actionable recommendations
- Session summaries with next-steps guidance

## 🎯 Success Criteria

### User Engagement
- Daily active users returning for practice
- 15-30 minute average session length
- >80% exercise completion rate

### Learning Effectiveness  
- 95% accuracy for note identification in <1 second
- 85% accuracy for modal recognition
- 90% accuracy for Drop 2 voicing identification

### Technical Performance
- <2 second page load on mobile
- <50ms audio latency for click-to-play
- Reliable offline functionality

## 🛠️ Development Team Structure

### Agent 1 - Frontend Core
- React components and UI/UX
- Fretboard rendering and interaction
- Exercise flow and state management
- Responsive design and accessibility

### Agent 2 - Audio & Theory
- Tone.js integration and audio engine
- Music theory calculations with tonal.js
- Sample library management
- Audio effects and metronome

### Agent 3 - Data & Analytics
- IndexedDB schema and persistence
- Spaced repetition algorithm
- Progress analytics and insights
- Performance optimization

## 📈 Market Position

### Competitive Advantages
1. **Only tool with 7-string support** - Large underserved market
2. **Guitar-specific audio** - All competitors use piano sounds  
3. **Integrated learning system** - Theory + practice + analytics in one app
4. **Spaced repetition** - Scientifically proven retention method
5. **Real-song integration** - Practical application of theory

### Research-Based Design
Built on comprehensive analysis of:
- 20+ existing music theory apps
- Proven pedagogical methods (Berklee, Ted Greene, Barry Harris)
- Open-source music libraries and best practices
- Guitar community needs assessment

## 🔗 External Resources

### Research Foundation
- **[guitar-theory-exploration/](../guitar-theory-exploration/)** - Complete market research
- **[Hooktheory](https://hooktheory.com)** - Real-song analysis inspiration
- **[musictheory.net](https://musictheory.net)** - Theory exercise patterns
- **[Fretty.app](https://fretty.app)** - Fretboard visualization reference

### Technical References
- **[tonal.js](https://github.com/tonaljs/tonal)** - Music theory calculations
- **[Tone.js](https://github.com/Tonejs/Tone.js)** - Web Audio framework
- **[react-guitar](https://github.com/4lejandrito/react-guitar)** - Fretboard component inspiration

## 📝 License

[MIT License](LICENSE) - Open source for educational and research purposes.

---

**Built for guitarists, by guitarists.** 🎸

*This project represents a systematic approach to guitar theory education, combining modern web technology with proven pedagogical methods to create the most comprehensive guitar learning platform available.*