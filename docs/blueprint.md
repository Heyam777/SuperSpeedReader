# SuperSpeedReader – Product Blueprint

## Vision

Create a local-first reading cockpit that blends rapid ingestion, comprehension scaffolds, and action planning without relying on cloud AI. SuperSpeedReader should help knowledge workers digest dense PDFs quickly and walk away with clear next steps.

## Feature pillars

1. **Instant ingestion**
   - Drag-and-drop PDF intake via Electron + `pdfjs-dist`.
   - Per-page text extraction and analytics (word count, lexical density, estimated difficulty).
2. **Understanding layer**
   - Frequency-driven summariser highlighting ~10% of the original text.
   - Keyword extraction for quick tagging and library search.
   - Dynamic study itinerary with preview, deep-dive, and implementation stages.
3. **Activation layer**
   - Application prompts that translate theory into experiments.
   - Flashcard starters ready for spaced repetition.
   - Focus playground with Bionic Reading, tempo chunking, contrast mode, and peripheral drills.
   - OpenAI-powered text-to-speech for summaries, previews, selections, or truncated full documents.
4. **Technique studio**
   - RSVP overlay with ORP alignment and adaptive pauses.
   - Guided pointer, tunnel vision, tachistoscope bursts, metronome pacing, and anchoring drills.
   - Training overlays with performance feedback and drill counters.
5. **Library & persistence**
   - Offline archive stored in Electron’s `userData` directory (localStorage fallback for web builds).
   - Up to 12 recent documents surfaced with metadata, estimated reading time, and language tags.
   - Tabbed workspace so multiple PDFs stay open for contextual hopping and comparisons.
   - Vocabulary capture deck with inline translation hints for English ↔ Polish practice.
6. **Analytics & personalisation**
   - WPM, duration, drill count, and comprehension reflection tracking with weekly charts.
   - Adaptive goals (daily minutes, topics) and integration toggles for memory/emotion/concept modules.
   - Session summaries, reflections, and exportable study plans.

## UX principles

- **Glassmorphism shell** with soft gradients and blurred panels to keep attention on the document’s content.
- **Action-first UI**: every summary is paired with prompts and to-dos; no passive reading.
- **Low cognitive load**: pill clouds, tempo pacing, and tags keep key information scannable.
- **Offline trust**: explicit copy that all processing runs locally, no telemetry.
- **Multilingual ergonomics**: bilingual UI copy, language-aware chunking, quick translation hover states.
- **Personal agency**: quick mode toggles, reset buttons, and context-aware coaching to keep users in flow.

## Extension backlog

- Export flashcards (CSV/Anki) and study plans (Markdown/Notion).
- Hook into a local LLM or remote API when credentials are available for richer summaries and quizzes.
- Add annotation layer, concept graph sync, and highlight syncing when pairing with e-readers.
- Integrate OCR for scanned PDFs plus richer bilingual dictionaries.
- Layer in webcam eye-tracking to visualise fixation heatmaps and regression counts.
