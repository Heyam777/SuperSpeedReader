# SuperSpeedReader

SuperSpeedReader is an Electron desktop studio for rapid reading and retention. It processes PDFs locally, builds executive summaries, generates application prompts, and offers focus modes inspired by accelerated learning techniques. No network access is required for the core workflows – everything runs on your device.

## Key capabilities

- **Local-first PDF ingestion** powered by `pdfjs-dist`; pages never leave your machine.
- **Offline summarisation** using a lexical condenser with comprehension prompts and memory hooks.
- **Tabbed, multilingual workspace** so English and Polish documents stay open side-by-side with vocabulary capture.
- **Technique studio** bundling RSVP, guided pointer, tunnel vision, tachistoscope flashes, peripheral drills, and metronome pacing.
- **Application prompts & flashcards** generated from the document’s dominant ideas to speed up active recall.
- **Focus playground** with Bionic Reading, tempo chunking, contrast mode, and quick peripheral warm-ups.
- **OpenAI-powered read aloud** so summaries or document excerpts can be converted to speech on demand.
- **Robust PDF ingestion** supporting drag/drop via arrayBuffer, FileReader, or Electron IPC fallbacks.
- **Analytics dashboard** tracking WPM, session duration, drill counts, and reflection history with weekly trends.
- **Smart study itinerary** that turns any document into a 3-stage learning plan linked to the broader Super Thinking framework.
- **Persistent library** (stored under Electron’s `userData` folder or local storage fallback) so recent analyses can be reopened instantly.

## Getting started

```bash
cd SuperSpeedReader
npm install
npm run start
```

The `start` script launches the Electron shell. `npm run dev` uses `electronmon` to auto-reload the main process while you iterate.

### Quality checks

```bash
npm run lint
npm test
npm run format:check
```

Run `npm run ci` to execute all three checks in the same order as CI.

### Project structure

```
SuperSpeedReader/
├── ipc-validation.js # Shared validation for Electron IPC payloads
├── main.js          # Electron main process and library persistence
├── preload.js       # Secure bridge exposing minimal IPC surface
├── renderer/
│   ├── index.html   # Multi-view UI scaffold (library/training/progress/settings)
│   ├── styles.css   # Glassmorphism-inspired design system with overlays
│   ├── analysis.js  # Pure text-analysis and study-plan utilities
│   └── app.js       # PDF extraction, drills, analytics, personalisation logic
├── test/
│   └── analysis.test.js
├── .github/
│   └── workflows/ci.yml
├── docs/
│   └── blueprint.md # Product vision & experience notes
└── package.json
```

### Text-to-speech

Set `OPENAI_API_KEY` in your environment before launching the app to enable OpenAI’s speech synthesis:

```bash
export OPENAI_API_KEY=sk-yourkey
npm run start
```

In the session panel, pick a voice and source (summary, preview, selection, or full document segment) then hit **Read aloud**. Audio is rendered locally to your user data folder and played inline.

## Notes & next steps

- Integrate a local LLM or remote API for richer, contextual summaries and comprehension quizzes when credentials are available.
- Extend RSVP and guided pointer modes with keyboard shortcuts, eye-tracking telemetry, and adaptive pauses per punctuation.
- Export flashcards/vocabulary to Anki/CSV and push study plans into the Super Thinking memory + concept graph modules.
- Add OCR for scanned PDFs and richer translation dictionaries for broader multilingual practice.
- The persistence layer keeps the last 12 documents. Adjust `LIBRARY_FILE` handling in `main.js` if you need multi-profile support or cloud sync.

Enjoy your reading sprints! ⚡️
