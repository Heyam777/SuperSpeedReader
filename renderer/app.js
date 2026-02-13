import { getDocument, GlobalWorkerOptions } from '../node_modules/pdfjs-dist/build/pdf.mjs';
import {
  buildAnalytics,
  buildStudyPlan,
  extractKeyPhrases,
  generateFlashcards,
  generatePrompts,
  normalizeWord,
  summarizeText,
} from './analysis.js';

GlobalWorkerOptions.workerSrc = '../node_modules/pdfjs-dist/build/pdf.worker.mjs';

const state = {
  view: 'library',
  docs: [],
  openDocs: [],
  activeDocId: null,
  summarySeed: 0,
  preferences: {
    readingLanguage: 'en',
    interfaceLanguage: 'en',
    targetWpm: 320,
    guidedCadence: 180,
    chunkSize: 3,
    tunnelWidth: 22,
    dailyMinutes: 30,
    topics: '',
    remindComprehension: true,
    cloudSync: false,
    memorySync: false,
    emotionSync: false,
    conceptSync: false,
  },
  activeModes: {
    chunk: false,
    guided: false,
    tunnel: false,
    rsvp: false,
  },
  sessions: [],
  vocabulary: [],
  training: {
    tachistoscopeLevel: 1,
    peripheralLevel: 1,
    metaGuidingLevel: 1,
  },
  liveSession: null,
  tts: {
    speaking: false,
    lastPath: null,
  },
};

const timers = {
  guided: null,
  rsvp: null,
  drill: null,
  sessionTicker: null,
};

const rsvpState = {
  queue: [],
  index: 0,
  running: false,
  currentDocId: null,
};

const drillState = {
  type: null,
  correct: 0,
  attempts: 0,
};

const refs = {
  navButtons: document.querySelectorAll('.nav-btn'),
  views: {
    library: document.getElementById('view-library'),
    training: document.getElementById('view-training'),
    progress: document.getElementById('view-progress'),
    settings: document.getElementById('view-settings'),
  },
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  readingLanguage: document.getElementById('reading-language'),
  interfaceLanguage: document.getElementById('interface-language'),
  targetWpm: document.getElementById('target-wpm'),
  targetWpmValue: document.getElementById('target-wpm-value'),
  chunkSize: document.getElementById('chunk-size'),
  chunkSizeValue: document.getElementById('chunk-size-value'),
  guidedCadence: document.getElementById('guided-cadence'),
  guidedCadenceValue: document.getElementById('guided-cadence-value'),
  tunnelWidth: document.getElementById('tunnel-width'),
  tunnelWidthValue: document.getElementById('tunnel-width-value'),
  modeChunk: document.getElementById('mode-chunk'),
  modeGuided: document.getElementById('mode-guided'),
  modeTunnel: document.getElementById('mode-tunnel'),
  modeRsvp: document.getElementById('mode-rsvp'),
  modeReset: document.getElementById('mode-reset'),
  libraryList: document.getElementById('library-list'),
  libraryCount: document.getElementById('library-count'),
  vocabList: document.getElementById('vocab-list'),
  exportVocab: document.getElementById('export-vocab'),
  insights: document.getElementById('insights'),
  tabBar: document.getElementById('tab-bar'),
  welcomePanel: document.getElementById('welcome-panel'),
  sessionPanel: document.getElementById('session-panel'),
  overviewPanel: document.getElementById('overview-panel'),
  summaryPanel: document.getElementById('summary-panel'),
  promptsPanel: document.getElementById('prompts-panel'),
  focusPanel: document.getElementById('focus-panel'),
  notesPanel: document.getElementById('notes-panel'),
  sessionStatus: document.getElementById('session-status'),
  startSession: document.getElementById('start-session'),
  endSession: document.getElementById('end-session'),
  launchRsvp: document.getElementById('launch-rsvp'),
  liveWpm: document.getElementById('live-wpm'),
  liveDuration: document.getElementById('live-duration'),
  liveDrills: document.getElementById('live-drills'),
  quiz: document.getElementById('comprehension-quiz'),
  quizQuestion: document.getElementById('quiz-question'),
  quizResponse: document.getElementById('quiz-response'),
  submitQuiz: document.getElementById('submit-quiz'),
  docTitle: document.getElementById('doc-title'),
  docSubtitle: document.getElementById('doc-subtitle'),
  pillPages: document.getElementById('pill-pages'),
  pillWords: document.getElementById('pill-words'),
  pillTime: document.getElementById('pill-time'),
  readerArticle: document.getElementById('reader-article'),
  summaryContent: document.getElementById('summary-content'),
  keyTakeaways: document.getElementById('key-takeaways'),
  promptList: document.getElementById('prompt-list'),
  flashcardList: document.getElementById('flashcard-list'),
  focusButtons: document.querySelectorAll('#focus-panel .pill-btn'),
  focusOutput: document.getElementById('focus-output'),
  exportPlan: document.getElementById('export-plan'),
  studyPlan: document.getElementById('study-plan'),
  trainingCards: document.querySelectorAll('.training-card'),
  speedStats: document.getElementById('speed-stats'),
  speedChart: document.getElementById('speed-chart'),
  comprehensionChart: document.getElementById('comprehension-chart'),
  reflectionLog: document.getElementById('reflection-log'),
  sessionTableBody: document.getElementById('session-table-body'),
  settingsForm: document.getElementById('settings-form'),
  goalMinutes: document.getElementById('goal-minutes'),
  preferredTopics: document.getElementById('preferred-topics'),
  remindComprehension: document.getElementById('remind-comprehension'),
  cloudSync: document.getElementById('cloud-sync'),
  toggleMemorySync: document.getElementById('toggle-memory-sync'),
  toggleEmotionSync: document.getElementById('toggle-emotion-sync'),
  toggleConceptSync: document.getElementById('toggle-concept-sync'),
  rsvpLayer: document.getElementById('rsvp-layer'),
  rsvpWord: document.getElementById('rsvp-word'),
  rsvpSpeed: document.getElementById('rsvp-speed'),
  rsvpSpeedValue: document.getElementById('rsvp-speed-value'),
  rsvpPlay: document.getElementById('rsvp-play'),
  rsvpRewind: document.getElementById('rsvp-rewind'),
  closeRsvp: document.getElementById('close-rsvp'),
  tunnelOverlay: document.getElementById('tunnel-overlay'),
  guidedPointer: document.getElementById('guided-pointer'),
  drillOverlay: document.getElementById('drill-overlay'),
  drillTitle: document.getElementById('drill-title'),
  drillDisplay: document.getElementById('drill-display'),
  drillStart: document.getElementById('drill-start'),
  drillStop: document.getElementById('drill-stop'),
  drillCorrect: document.getElementById('drill-correct'),
  drillAttempts: document.getElementById('drill-attempts'),
  closeDrill: document.getElementById('close-drill'),
  sessionSummary: document.getElementById('session-summary'),
  sessionSummaryBody: document.getElementById('session-summary-body'),
  closeSessionSummary: document.getElementById('close-session-summary'),
  ackSessionSummary: document.getElementById('ack-session-summary'),
  toast: document.getElementById('toast'),
  appMeta: document.getElementById('app-meta'),
  ttsVoice: document.getElementById('tts-voice'),
  ttsSource: document.getElementById('tts-source'),
  ttsPlay: document.getElementById('tts-play'),
  ttsStop: document.getElementById('tts-stop'),
  ttsPlayer: document.getElementById('tts-player'),
};

const VOCAB_TRANSLATIONS = {
  en: {
    analysis: 'analiza',
    memory: 'pamięć',
    speed: 'szybkość',
    focus: 'koncentracja',
    science: 'nauka',
  },
  pl: {
    czytać: 'read',
    pamięć: 'memory',
    nauka: 'science',
    mózg: 'brain',
    szybkość: 'speed',
  },
};

init();

function init() {
  loadPreferences();
  syncPreferenceControls();
  attachEventListeners();
  loadLibrary();
  updateMiniStats();
  renderProgressView();
  renderVocabulary();
  renderIntegrationState();
  showToast('Drop a PDF or use demo drills to get started');
}

function attachEventListeners() {
  refs.navButtons.forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  refs.dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    refs.dropzone.classList.add('dragging');
  });

  refs.dropzone.addEventListener('dragleave', () => refs.dropzone.classList.remove('dragging'));

  refs.dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    refs.dropzone.classList.remove('dragging');
    const file = event.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });

  refs.fileInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  });

  refs.readingLanguage.addEventListener('change', () => {
    state.preferences.readingLanguage = refs.readingLanguage.value;
    savePreferences();
  });

  refs.interfaceLanguage.addEventListener('change', () => {
    state.preferences.interfaceLanguage = refs.interfaceLanguage.value;
    savePreferences();
  });

  refs.targetWpm.addEventListener('input', () => {
    state.preferences.targetWpm = Number(refs.targetWpm.value);
    refs.targetWpmValue.textContent = state.preferences.targetWpm;
    savePreferences();
  });

  refs.chunkSize.addEventListener('input', () => {
    state.preferences.chunkSize = Number(refs.chunkSize.value);
    refs.chunkSizeValue.textContent = state.preferences.chunkSize;
    savePreferences();
    if (state.activeModes.chunk) renderDocumentById(state.activeDocId);
  });

  refs.guidedCadence.addEventListener('input', () => {
    state.preferences.guidedCadence = Number(refs.guidedCadence.value);
    refs.guidedCadenceValue.textContent = state.preferences.guidedCadence;
    savePreferences();
    if (state.activeModes.guided) restartGuidedPointer();
  });

  refs.tunnelWidth.addEventListener('input', () => {
    state.preferences.tunnelWidth = Number(refs.tunnelWidth.value);
    refs.tunnelWidthValue.textContent = state.preferences.tunnelWidth;
    refs.tunnelOverlay.style.background = buildTunnelGradient();
    savePreferences();
  });

  refs.modeChunk.addEventListener('change', () => {
    state.activeModes.chunk = refs.modeChunk.checked;
    renderDocumentById(state.activeDocId);
  });

  refs.modeGuided.addEventListener('change', () => {
    state.activeModes.guided = refs.modeGuided.checked;
    if (state.activeModes.guided) {
      startGuidedPointer();
    } else {
      stopGuidedPointer();
    }
  });

  refs.modeTunnel.addEventListener('change', () => {
    state.activeModes.tunnel = refs.modeTunnel.checked;
    setTunnelActive(state.activeModes.tunnel);
  });

  refs.modeRsvp.addEventListener('change', () => {
    state.activeModes.rsvp = refs.modeRsvp.checked;
    if (state.activeModes.rsvp) {
      launchRsvp();
    } else {
      stopRsvp(true);
    }
  });

  refs.modeReset.addEventListener('click', () => {
    Object.keys(state.activeModes).forEach((key) => (state.activeModes[key] = false));
    refs.modeChunk.checked = false;
    refs.modeGuided.checked = false;
    refs.modeTunnel.checked = false;
    refs.modeRsvp.checked = false;
    stopGuidedPointer();
    setTunnelActive(false);
    stopRsvp(true);
    renderDocumentById(state.activeDocId);
  });

  refs.exportVocab.addEventListener('click', exportVocabulary);

  refs.startSession.addEventListener('click', startSession);
  refs.endSession.addEventListener('click', endSession);
  refs.launchRsvp.addEventListener('click', () => {
    refs.modeRsvp.checked = true;
    state.activeModes.rsvp = true;
    launchRsvp();
  });

  refs.submitQuiz.addEventListener('click', () => {
    if (!state.liveSession) return;
    const answer = refs.quizResponse.value.trim();
    recordComprehensionAnswer(answer);
  });

  refs.ttsPlay.addEventListener('click', speakCurrentText);
  refs.ttsStop.addEventListener('click', stopSpeaking);
  refs.ttsPlayer.addEventListener('ended', () => setSpeaking(false));

  refs.readerArticle.addEventListener('dblclick', captureWord);
  refs.readerArticle.addEventListener('scroll', handleReaderScroll);

  refs.focusButtons.forEach((btn) => {
    btn.addEventListener('click', () => handleFocusMode(btn.dataset.mode));
  });

  refs.exportPlan.addEventListener('click', exportStudyPlan);

  refs.trainingCards.forEach((card) => {
    const drill = card.dataset.drill;
    card.querySelector('.start-drill').addEventListener('click', () => openDrill(drill));
  });

  refs.settingsForm.addEventListener('submit', (event) => {
    event.preventDefault();
    state.preferences.dailyMinutes = Number(refs.goalMinutes.value || 30);
    state.preferences.topics = refs.preferredTopics.value;
    state.preferences.remindComprehension = refs.remindComprehension.checked;
    state.preferences.cloudSync = refs.cloudSync.checked;
    savePreferences();
    renderIntegrationState();
    showToast('Preferences saved');
  });

  refs.toggleMemorySync.addEventListener('click', () =>
    toggleIntegration('memorySync', refs.toggleMemorySync),
  );
  refs.toggleEmotionSync.addEventListener('click', () =>
    toggleIntegration('emotionSync', refs.toggleEmotionSync),
  );
  refs.toggleConceptSync.addEventListener('click', () =>
    toggleIntegration('conceptSync', refs.toggleConceptSync),
  );

  refs.rsvpSpeed.addEventListener('input', () => {
    const value = Number(refs.rsvpSpeed.value);
    refs.rsvpSpeedValue.textContent = value;
    state.preferences.targetWpm = value;
    refs.targetWpm.value = value;
    refs.targetWpmValue.textContent = value;
    savePreferences();
    if (rsvpState.running) {
      stopRsvp(false);
      launchRsvp(true);
    }
  });

  refs.rsvpPlay.addEventListener('click', () => {
    if (!rsvpState.queue.length) return;
    if (rsvpState.running) {
      rsvpState.running = false;
      refs.rsvpPlay.textContent = 'Resume';
      clearInterval(timers.rsvp);
    } else {
      rsvpState.running = true;
      refs.rsvpPlay.textContent = 'Pause';
      startRsvpLoop();
    }
  });

  refs.rsvpRewind.addEventListener('click', () => {
    if (!rsvpState.queue.length) return;
    rsvpState.index = 0;
    refs.rsvpWord.textContent = 'Ready?';
    if (rsvpState.running) {
      stopRsvp(false);
      launchRsvp(true);
    }
  });

  refs.closeRsvp.addEventListener('click', () => stopRsvp(true));

  refs.drillStart.addEventListener('click', startDrillLoop);
  refs.drillStop.addEventListener('click', stopDrill);
  refs.closeDrill.addEventListener('click', () => closeOverlay(refs.drillOverlay));

  refs.closeSessionSummary.addEventListener('click', () => closeOverlay(refs.sessionSummary));
  refs.ackSessionSummary.addEventListener('click', () => closeOverlay(refs.sessionSummary));
}

async function handleFile(file) {
  const nameLower = (file.name || '').toLowerCase();
  const isPdfType = file.type === 'application/pdf';
  const isPdfName = nameLower.includes('.pdf');
  if (!isPdfType && !isPdfName) {
    showToast('File does not look like a PDF, attempting anyway…');
  }

  try {
    showToast(`Processing ${file.name}…`);
    const extraction = await extractTextFromPdf(file);
    const analysis = buildAnalysis(extraction.text, file.name, extraction.pageCount);
    analysis.language = state.preferences.readingLanguage;
    addDocument(analysis, true);
    await persistDocument(analysis);
    showToast(`Loaded ${analysis.name}`);
  } catch (error) {
    console.error('PDF import failed', error);
    showToast(`Failed to read PDF: ${error.message ?? error}`);
  } finally {
    refs.fileInput.value = '';
  }
}

async function extractTextFromPdf(file) {
  const arrayBuffer = await fileToArrayBuffer(file);
  if (!arrayBuffer) {
    throw new Error('Unable to read file contents.');
  }
  const data =
    arrayBuffer instanceof Uint8Array
      ? arrayBuffer
      : arrayBuffer instanceof ArrayBuffer
        ? new Uint8Array(arrayBuffer)
        : new Uint8Array(arrayBuffer);
  const pdf = await getDocument({ data }).promise;
  let text = '';
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str).join(' ');
    text += `${strings}\n`;
  }
  return {
    text: text.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim(),
    pageCount: pdf.numPages,
  };
}

async function fileToArrayBuffer(file) {
  if (!file) return null;
  if (window.electronAPI?.readFile && file.path) {
    try {
      const bytes = await window.electronAPI.readFile(file.path);
      if (Array.isArray(bytes)) {
        return Uint8Array.from(bytes);
      }
    } catch (error) {
      console.warn('IPC readFile failed, falling back to browser APIs', error);
    }
  }
  if (file.arrayBuffer) {
    try {
      return await file.arrayBuffer();
    } catch (error) {
      console.warn('arrayBuffer failed, attempting FileReader', error);
    }
  }
  if (typeof FileReader !== 'undefined') {
    try {
      const readerResult = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      });
      if (readerResult) return readerResult;
    } catch (error) {
      console.warn('FileReader failed, falling back to IPC read', error);
    }
  }
  if (window.electronAPI?.readFile && file.path) {
    try {
      const array = await window.electronAPI.readFile(file.path);
      if (Array.isArray(array)) {
        return new Uint8Array(array);
      }
    } catch (error) {
      console.error('IPC readFile failed', error);
    }
  }
  return null;
}

function buildAnalysis(rawText, name, pageCount) {
  const cleanText = rawText.replace(/\s+/g, ' ').trim();
  const paragraphs = rawText
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const words = cleanText.split(/\s+/).filter(Boolean);
  const sentences = cleanText
    .split(/(?<=[.!?])\s+(?=[A-Z0-9ĄĆĘŁŃÓŚŹŻ])/)
    .filter((sentence) => sentence.length > 20);
  const wordCount = words.length;
  const readingMinutes = Math.max(1, Math.round(wordCount / 230));
  const uniqueWords = new Set(words.map(normalizeWord)).size;
  const averageSentenceLength = sentences.length
    ? Math.round(wordCount / sentences.length)
    : wordCount;
  const lexicalDensity = wordCount ? +((uniqueWords / wordCount) * 100).toFixed(1) : 0;
  const keyPoints = extractKeyPhrases(cleanText, 12);
  const summaryParagraphs = summarizeText(cleanText, 6, state.summarySeed);
  const prompts = generatePrompts(keyPoints);
  const flashcards = generateFlashcards(summaryParagraphs, keyPoints);
  const studyPlan = buildStudyPlan({
    name,
    keyPoints,
    summary: summaryParagraphs,
    sentences,
    readingMinutes,
  });
  const preview = {
    paragraphs: paragraphs.slice(0, 4),
  };
  const analytics = buildAnalytics({
    cleanText,
    keyPoints,
    sentences,
    lexicalDensity,
    averageSentenceLength,
    readingMinutes,
    wordCount,
  });
  const id = hashIdentifier(`${name}-${wordCount}-${pageCount}`);
  return {
    id,
    name,
    text: cleanText,
    pageCount,
    wordCount,
    readingMinutes,
    uniqueWordCount: uniqueWords,
    averageSentenceLength,
    lexicalDensity,
    summary: { paragraphs: summaryParagraphs },
    keyPoints,
    prompts,
    flashcards,
    preview,
    studyPlan,
    analytics,
    stats: {
      pages: pageCount,
      words: wordCount,
      readingMinutes,
      uniqueWords,
      averageSentenceLength,
      lexicalDensity,
    },
    sentences,
  };
}

function addDocument(doc, open = false) {
  const existingIndex = state.docs.findIndex((entry) => entry.id === doc.id);
  if (existingIndex >= 0) {
    state.docs[existingIndex] = doc;
  } else {
    state.docs.unshift(doc);
  }
  renderLibrary(state.docs);
  updateMiniStats();
  if (open) {
    openDocument(doc);
  }
}

function openDocument(doc) {
  const existingIndex = state.openDocs.findIndex((entry) => entry.id === doc.id);
  if (existingIndex >= 0) {
    state.openDocs[existingIndex] = doc;
  } else {
    state.openDocs.push(doc);
  }
  state.activeDocId = doc.id;
  renderTabs();
  renderDocument(doc);
}

function renderDocumentById(docId) {
  if (!docId) return;
  const doc =
    state.openDocs.find((entry) => entry.id === docId) ||
    state.docs.find((entry) => entry.id === docId);
  if (doc) renderDocument(doc);
}

function renderTabs() {
  if (!refs.tabBar) return;
  if (!state.openDocs.length) {
    refs.tabBar.hidden = true;
    refs.tabBar.innerHTML = '';
    return;
  }
  refs.tabBar.hidden = false;
  refs.tabBar.innerHTML = '';
  state.openDocs.forEach((doc) => {
    const button = document.createElement('button');
    button.className = 'tab-button';
    if (doc.id === state.activeDocId) button.classList.add('active');
    const title = document.createElement('span');
    title.className = 'tab-title';
    title.textContent = doc.name.length > 42 ? `${doc.name.slice(0, 39)}…` : doc.name;
    const close = document.createElement('span');
    close.className = 'tab-close';
    close.textContent = '×';
    close.setAttribute('role', 'button');
    close.setAttribute('aria-label', `Close ${doc.name}`);
    close.tabIndex = 0;
    close.addEventListener('click', (event) => {
      event.stopPropagation();
      closeTab(doc.id);
    });
    close.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        closeTab(doc.id);
      }
    });
    button.appendChild(title);
    button.appendChild(close);
    button.addEventListener('click', () => {
      state.activeDocId = doc.id;
      renderTabs();
      renderDocumentById(doc.id);
    });
    refs.tabBar.appendChild(button);
  });
}

function closeTab(docId) {
  const index = state.openDocs.findIndex((entry) => entry.id === docId);
  if (index === -1) return;
  const closingActive = state.activeDocId === docId;
  state.openDocs.splice(index, 1);
  if (!state.openDocs.length) {
    state.activeDocId = null;
    renderTabs();
    updateWorkspaceVisibility();
    return;
  }
  const fallback = state.openDocs[Math.min(index, state.openDocs.length - 1)];
  state.activeDocId = closingActive ? fallback.id : state.activeDocId;
  renderTabs();
  renderDocumentById(state.activeDocId);
}

function renderDocument(doc) {
  if (!doc) {
    updateWorkspaceVisibility();
    return;
  }
  if (state.tts.speaking) {
    stopSpeaking();
  }
  state.activeDocId = doc.id;
  state.summarySeed = (state.summarySeed + 1) % 9;
  refs.docTitle.textContent = doc.name;
  const difficulty = doc.analytics?.difficulty ? `Difficulty · ${doc.analytics.difficulty}` : '';
  const thesis = doc.analytics?.thesis
    ? `Thesis · ${doc.analytics.thesis.slice(0, 120)}${doc.analytics.thesis.length > 120 ? '…' : ''}`
    : '';
  refs.docSubtitle.textContent = [difficulty, thesis].filter(Boolean).join(' | ');
  refs.pillPages.textContent = `${doc.pageCount} pages`;
  refs.pillWords.textContent = `${doc.wordCount.toLocaleString()} words`;
  refs.pillTime.textContent = `${doc.readingMinutes} min read`;
  refs.readerArticle.innerHTML = formatDocumentHtml(doc);
  refs.readerArticle.scrollTop = 0;
  renderSummary(doc.summary?.paragraphs ?? [], doc.keyPoints ?? []);
  renderPrompts(doc.prompts ?? [], doc.flashcards ?? []);
  renderInsights(doc.analytics ?? {}, doc);
  renderStudyPlan(doc.studyPlan);
  renderFocusPreview('bionic');
  updateWorkspaceVisibility(true);
  renderTabs();
  if (state.activeModes.guided) restartGuidedPointer();
  if (state.activeModes.tunnel) setTunnelActive(true);
}

function updateWorkspaceVisibility(hasDoc = false) {
  refs.welcomePanel.hidden = hasDoc;
  refs.sessionPanel.hidden = !hasDoc;
  refs.overviewPanel.hidden = !hasDoc;
  refs.summaryPanel.hidden = !hasDoc;
  refs.promptsPanel.hidden = !hasDoc;
  refs.focusPanel.hidden = !hasDoc;
  refs.notesPanel.hidden = !hasDoc;
}

function formatDocumentHtml(doc) {
  if (!doc) return '';
  const paragraphs = doc.text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs
    .map((paragraph) => {
      if (!paragraph) return '';
      if (state.activeModes.chunk) {
        return `<p>${chunkParagraph(paragraph, state.preferences.chunkSize)}</p>`;
      }
      return `<p>${escapeHtml(paragraph)}</p>`;
    })
    .join('');
}

function chunkParagraph(paragraph, chunkSize) {
  const words = paragraph.split(/\s+/);
  const parts = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunkWords = words
      .slice(i, i + chunkSize)
      .map(escapeHtml)
      .join(' ');
    parts.push(`<span class="chunk">${chunkWords}</span>`);
  }
  return parts.join(' ');
}

function renderSummary(paragraphs, keyPoints) {
  refs.summaryContent.innerHTML = '';
  paragraphs.forEach((text) => {
    const p = document.createElement('p');
    p.textContent = text;
    refs.summaryContent.appendChild(p);
  });
  refs.keyTakeaways.innerHTML = '';
  keyPoints.slice(0, 12).forEach((point) => {
    const span = document.createElement('span');
    span.textContent = point;
    refs.keyTakeaways.appendChild(span);
  });
}

function renderPrompts(prompts, flashcards) {
  refs.promptList.innerHTML = '';
  prompts.forEach((prompt) => {
    const li = document.createElement('li');
    li.textContent = prompt;
    refs.promptList.appendChild(li);
  });

  refs.flashcardList.innerHTML = '';
  flashcards.forEach((card) => {
    const li = document.createElement('li');
    const question = document.createElement('strong');
    question.textContent = card.q;
    const answer = document.createElement('div');
    answer.textContent = card.a;
    li.appendChild(question);
    li.appendChild(answer);
    refs.flashcardList.appendChild(li);
  });
}

function renderStudyPlan(plan) {
  refs.studyPlan.innerHTML = '';
  if (!plan) return;
  plan.sections.forEach((section) => {
    const wrapper = document.createElement('section');
    const heading = document.createElement('h3');
    heading.textContent = section.title;
    const list = document.createElement('ul');
    section.items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
    wrapper.appendChild(heading);
    wrapper.appendChild(list);
    refs.studyPlan.appendChild(wrapper);
  });
}

function renderInsights(analytics, doc) {
  refs.insights.innerHTML = '';
  const entries = [
    ['Difficulty', analytics.difficulty],
    ['Lexical density', analytics.lexicalDensity ? `${analytics.lexicalDensity}%` : null],
    ['Avg sentence', doc.averageSentenceLength ? `${doc.averageSentenceLength} words` : null],
    ['Unique words', doc.uniqueWordCount ? doc.uniqueWordCount.toLocaleString() : null],
    [
      'Suggested pace',
      doc.readingMinutes ? `${Math.max(1, Math.round(doc.readingMinutes / 3))} min chunks` : null,
    ],
    [
      'Wrap-up idea',
      analytics.wrapUp
        ? analytics.wrapUp.slice(0, 60) + (analytics.wrapUp.length > 60 ? '…' : '')
        : null,
    ],
  ];
  entries.forEach(([label, value]) => {
    if (!value) return;
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    refs.insights.appendChild(dt);
    refs.insights.appendChild(dd);
  });
}

function renderLibrary(items) {
  refs.libraryList.innerHTML = '';
  refs.libraryCount.textContent = items.length;
  if (!items.length) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'Drop a PDF to build a personal reading backlog.';
    refs.libraryList.appendChild(empty);
    return;
  }
  const template = document.getElementById('library-item-template');
  items.forEach((item) => {
    const clone = template.content.cloneNode(true);
    const btn = clone.querySelector('button');
    clone.querySelector('.library-title').textContent = item.name;
    const minutes =
      item.stats?.readingMinutes ?? Math.max(1, Math.round((item.stats?.words ?? 0) / 220));
    const updated = item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'new';
    const language = item.language
      ? item.language.toUpperCase()
      : state.preferences.readingLanguage.toUpperCase();
    clone.querySelector('.library-meta').textContent =
      `${language} · ${item.stats?.pages ?? '?'} pages · ${minutes} min · ${updated}`;
    btn.addEventListener('click', () => openDocument(item));
    refs.libraryList.appendChild(clone);
  });
}

async function persistDocument(doc) {
  if (window.electronAPI?.saveLibraryItem) {
    const payload = {
      id: doc.id,
      name: doc.name,
      summary: doc.summary,
      keyPoints: doc.keyPoints,
      prompts: doc.prompts,
      flashcards: doc.flashcards,
      preview: doc.preview,
      studyPlan: doc.studyPlan,
      text: doc.text,
      stats: doc.stats,
      analytics: doc.analytics,
      language: doc.language,
    };
    const library = await window.electronAPI.saveLibraryItem(payload);
    state.docs = library.map((entry) => ({ ...entry, text: entry.text ?? doc.text }));
    renderLibrary(state.docs);
  } else {
    const stored = JSON.parse(localStorage.getItem('superspeedreader-library') ?? '[]');
    const filtered = stored.filter((entry) => entry.id !== doc.id);
    filtered.unshift(doc);
    localStorage.setItem('superspeedreader-library', JSON.stringify(filtered.slice(0, 12)));
  }
}

async function loadLibrary() {
  try {
    let items = [];
    if (window.electronAPI?.loadLibrary) {
      items = await window.electronAPI.loadLibrary();
    } else {
      items = JSON.parse(localStorage.getItem('superspeedreader-library') ?? '[]');
    }
    state.docs = items;
    renderLibrary(state.docs);
  } catch (error) {
    console.warn('Unable to load library', error);
    renderLibrary([]);
  }
}

function switchView(view) {
  if (!state.views?.includes && !refs.views[view]) return;
  state.view = view;
  Object.entries(refs.views).forEach(([name, element]) => {
    element.hidden = name !== view;
    element.classList.toggle('current', name === view);
  });
  refs.navButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  if (view === 'progress') renderProgressView();
}

function startSession() {
  if (!state.activeDocId || state.liveSession) return;
  const doc = state.openDocs.find((entry) => entry.id === state.activeDocId);
  if (!doc) return;
  state.liveSession = {
    docId: doc.id,
    startTime: Date.now(),
    progress: 0,
    drills: 0,
    modes: { ...state.activeModes },
    language: doc.language ?? state.preferences.readingLanguage,
    comprehension: null,
  };
  refs.startSession.disabled = true;
  refs.endSession.disabled = false;
  refs.sessionStatus.textContent = 'In progress';
  refs.quiz.hidden = true;
  refs.quizResponse.value = '';
  if (timers.sessionTicker) clearInterval(timers.sessionTicker);
  timers.sessionTicker = setInterval(updateSessionMetrics, 1000);
  updateSessionMetrics();
  showToast('Session started – keep your eyes ahead!');
}

function updateSessionMetrics() {
  if (!state.liveSession) return;
  const elapsedMs = Date.now() - state.liveSession.startTime;
  const minutes = elapsedMs / 60000;
  const doc = state.openDocs.find((entry) => entry.id === state.liveSession.docId);
  const wordsRead = Math.max(
    50,
    Math.round((state.liveSession.progress || 0.05) * (doc?.wordCount ?? 0)),
  );
  const wpm = minutes > 0 ? Math.round(wordsRead / minutes) : 0;
  refs.liveWpm.textContent = `${wpm} WPM`;
  refs.liveDuration.textContent = formatDuration(elapsedMs);
  refs.liveDrills.textContent = state.liveSession.drills;
}

function handleReaderScroll() {
  if (!state.liveSession || state.liveSession.docId !== state.activeDocId) return;
  const article = refs.readerArticle;
  const max = article.scrollHeight - article.clientHeight;
  if (max <= 0) {
    state.liveSession.progress = 1;
    return;
  }
  const progress = article.scrollTop / max;
  state.liveSession.progress = Math.max(state.liveSession.progress ?? 0, progress);
}

function endSession() {
  if (!state.liveSession) return;
  const doc = state.openDocs.find((entry) => entry.id === state.liveSession.docId);
  const elapsedMs = Date.now() - state.liveSession.startTime;
  const minutes = Math.max(0.1, elapsedMs / 60000);
  const progress = state.liveSession.progress || 1;
  const wordsRead = Math.round((doc?.wordCount ?? 0) * progress);
  const wpm = Math.round(wordsRead / minutes);
  const session = {
    id: uniqueId('session'),
    docId: doc?.id,
    name: doc?.name ?? 'Untitled',
    language: doc?.language ?? state.preferences.readingLanguage,
    startedAt: state.liveSession.startTime,
    durationMs: elapsedMs,
    wordsRead,
    wpm,
    modes: { ...state.liveSession.modes },
    drills: state.liveSession.drills,
    comprehension: state.liveSession.comprehension,
  };
  state.sessions.push(session);
  refs.liveWpm.textContent = `${wpm} WPM`;
  refs.liveDuration.textContent = formatDuration(elapsedMs);
  refs.liveDrills.textContent = state.liveSession.drills;
  refs.startSession.disabled = false;
  refs.endSession.disabled = true;
  refs.sessionStatus.textContent = 'Completed';
  if (timers.sessionTicker) clearInterval(timers.sessionTicker);
  timers.sessionTicker = null;
  state.liveSession = null;
  renderProgressView();
  updateMiniStats();
  showSessionSummary(session);
  if (state.preferences.remindComprehension) scheduleComprehensionPrompt(session);
  showToast('Session saved');
}

function scheduleComprehensionPrompt(session) {
  refs.quiz.hidden = false;
  const doc =
    state.docs.find((item) => item.id === session.docId) ||
    state.openDocs.find((item) => item.id === session.docId);
  const question = generateComprehensionPrompt(doc);
  refs.quizQuestion.textContent = question;
  refs.quizResponse.value = '';
}

function recordComprehensionAnswer(answer) {
  if (!answer) {
    showToast('Add a quick reflection to capture comprehension');
    return;
  }
  const session = state.sessions[state.sessions.length - 1];
  if (!session) return;
  session.comprehension = {
    answer,
    timestamp: Date.now(),
  };
  if (state.liveSession) {
    state.liveSession.comprehension = session.comprehension;
  }
  refs.quiz.hidden = true;
  showToast('Reflection stored – great job!');
  renderProgressView();
}

function showSessionSummary(session) {
  const doc =
    state.docs.find((item) => item.id === session.docId) ||
    state.openDocs.find((item) => item.id === session.docId);
  refs.sessionSummaryBody.innerHTML = `
    <div><strong>${escapeHtml(session.name)}</strong></div>
    <div>Language · ${session.language?.toUpperCase()}</div>
    <div>Speed · ${session.wpm} WPM · ${Math.round(session.wordsRead / 100) / 10}k words</div>
    <div>Duration · ${formatDuration(session.durationMs)}</div>
    <div>Modes · ${
      Object.entries(session.modes)
        .filter(([_, active]) => active)
        .map(([mode]) => mode)
        .join(', ') || 'standard'
    }</div>
    <div>Drills completed · ${session.drills}</div>
    <div>${doc?.analytics?.wrapUp ? 'Wrap-up idea · ' + escapeHtml(doc.analytics.wrapUp) : ''}</div>
  `;
  openOverlay(refs.sessionSummary);
}

function renderProgressView() {
  const sessions = state.sessions.slice(-20);
  refs.speedStats.innerHTML = '';
  if (!sessions.length) {
    refs.speedStats.innerHTML =
      '<p class="muted">No sessions yet – start reading to populate analytics.</p>';
    refs.speedChart.innerHTML = '';
    refs.comprehensionChart.innerHTML = '';
    refs.sessionTableBody.innerHTML = '';
    refs.reflectionLog.innerHTML = '';
    return;
  }

  const averageWpm = Math.round(sessions.reduce((sum, s) => sum + s.wpm, 0) / sessions.length);
  const avgDuration = Math.round(
    sessions.reduce((sum, s) => sum + s.durationMs, 0) / sessions.length / 60000,
  );
  const comprehensionCount = sessions.filter((s) => !!s.comprehension).length;
  refs.speedStats.innerHTML = `
    <div class="stat-card"><span class="metric-label">Avg WPM</span><strong>${averageWpm}</strong></div>
    <div class="stat-card"><span class="metric-label">Avg session length</span><strong>${avgDuration} min</strong></div>
    <div class="stat-card"><span class="metric-label">Completed sessions</span><strong>${sessions.length}</strong></div>
    <div class="stat-card"><span class="metric-label">Reflections logged</span><strong>${comprehensionCount}</strong></div>
  `;

  refs.speedChart.innerHTML = '';
  sessions.forEach((session, index) => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    const label = document.createElement('span');
    label.textContent = `#${index + 1}`;
    const bar = document.createElement('div');
    bar.className = 'bar';
    const inner = document.createElement('div');
    inner.style.width = `${Math.min(100, (session.wpm / (state.preferences.targetWpm || 1)) * 100)}%`;
    bar.appendChild(inner);
    row.appendChild(label);
    row.appendChild(bar);
    refs.speedChart.appendChild(row);
  });

  refs.comprehensionChart.innerHTML = '';
  sessions.forEach((session) => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    const label = document.createElement('span');
    label.textContent = new Date(session.startedAt).toLocaleDateString();
    const bar = document.createElement('div');
    bar.className = 'bar';
    const inner = document.createElement('div');
    inner.style.width = session.comprehension ? '100%' : '20%';
    inner.style.background = session.comprehension
      ? 'linear-gradient(120deg, #22c55e, #16a34a)'
      : 'linear-gradient(120deg, #f97316, #ea580c)';
    bar.appendChild(inner);
    row.appendChild(label);
    row.appendChild(bar);
    refs.comprehensionChart.appendChild(row);
  });

  refs.sessionTableBody.innerHTML = sessions
    .map((session) => {
      const date = new Date(session.startedAt).toLocaleString();
      const modes =
        Object.entries(session.modes)
          .filter(([_, active]) => active)
          .map(([mode]) => mode)
          .join(', ') || 'standard';
      const score = session.comprehension ? '✓ reflection' : '—';
      return `<tr><td>${date}</td><td>${escapeHtml(session.name)}</td><td>${escapeHtml(modes)}</td><td>${session.wpm}</td><td>${score}</td></tr>`;
    })
    .join('');

  refs.reflectionLog.innerHTML = sessions
    .filter((session) => session.comprehension)
    .slice(-5)
    .map(
      (session) =>
        `<p><strong>${new Date(session.comprehension.timestamp).toLocaleDateString()}:</strong> ${escapeHtml(session.comprehension.answer)}</p>`,
    )
    .join('');
}

function updateMiniStats() {
  const totalWords = state.sessions.reduce((sum, session) => sum + session.wordsRead, 0);
  const docLanguages = new Set(
    state.docs.map((doc) => doc.language ?? state.preferences.readingLanguage),
  );
  refs.insights.dataset.totalWords = totalWords;
  refs.appMeta.textContent = `Docs ${state.docs.length} · ${totalWords.toLocaleString()} words · ${docLanguages.size} langs`;
}

function renderVocabulary() {
  refs.vocabList.innerHTML = '';
  if (!state.vocabulary.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Double-click a word in the reader to save it.';
    refs.vocabList.appendChild(li);
    return;
  }
  state.vocabulary.slice(-40).forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'vocab-item';
    const word = document.createElement('div');
    word.innerHTML = `<strong>${escapeHtml(entry.word)}</strong> · ${escapeHtml(entry.translation)}`;
    const remove = document.createElement('button');
    remove.textContent = '✓';
    remove.title = 'Mark as learned';
    remove.addEventListener('click', () => {
      state.vocabulary = state.vocabulary.filter((item) => item !== entry);
      saveVocabulary();
      renderVocabulary();
    });
    li.appendChild(word);
    li.appendChild(remove);
    refs.vocabList.appendChild(li);
  });
}

function captureWord(_event) {
  const selection = window.getSelection();
  const text = selection?.toString().trim();
  if (!text) return;
  const word = text.split(/\s+/)[0];
  if (!word) return;
  const lower = normalizeWord(word);
  if (!lower) return;
  if (state.vocabulary.some((entry) => entry.word === lower)) {
    showToast('Already in your deck');
    return;
  }
  const translation = translateWord(lower, state.preferences.readingLanguage);
  state.vocabulary.push({ word: lower, translation, capturedAt: Date.now() });
  saveVocabulary();
  renderVocabulary();
  showToast(`Stored “${lower}” in vocabulary deck`);
}

function translateWord(word, language) {
  const dict = VOCAB_TRANSLATIONS[language] ?? {};
  return dict[word] ?? '🔍 Review later';
}

function saveVocabulary() {
  localStorage.setItem('superspeedreader-vocab', JSON.stringify(state.vocabulary));
}

function exportVocabulary() {
  if (!state.vocabulary.length) {
    showToast('Vocabulary deck is empty');
    return;
  }
  const rows = state.vocabulary.map((entry) => `${entry.word},${entry.translation}`);
  const blob = new Blob([`word,translation\n${rows.join('\n')}`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'superspeedreader-vocabulary.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported vocabulary list');
}

async function exportStudyPlan() {
  const doc = state.openDocs.find((entry) => entry.id === state.activeDocId);
  if (!doc?.studyPlan?.sections?.length) {
    showToast('Open a document with a generated study plan first');
    return;
  }

  const lines = [`# Study Plan: ${doc.name}`, ''];
  doc.studyPlan.sections.forEach((section) => {
    lines.push(`## ${section.title}`);
    section.items.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  });
  const markdown = lines.join('\n').trim() + '\n';

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(markdown);
      showToast('Study plan copied to clipboard');
      return;
    } catch (error) {
      console.warn('Clipboard write failed, exporting file instead', error);
    }
  }

  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.name.replace(/[^\w.-]+/g, '-').toLowerCase()}-study-plan.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Study plan downloaded as Markdown');
}

function launchRsvp(resume = false) {
  const doc = state.openDocs.find((entry) => entry.id === state.activeDocId);
  if (!doc) {
    showToast('Open a document first');
    refs.modeRsvp.checked = false;
    state.activeModes.rsvp = false;
    return;
  }
  if (!resume) {
    rsvpState.queue = doc.text.split(/\s+/);
    rsvpState.index = 0;
    rsvpState.currentDocId = doc.id;
  }
  refs.rsvpSpeed.value = state.preferences.targetWpm;
  refs.rsvpSpeedValue.textContent = state.preferences.targetWpm;
  refs.rsvpWord.textContent = 'Ready?';
  refs.rsvpPlay.textContent = 'Start';
  rsvpState.running = false;
  openOverlay(refs.rsvpLayer);
}

function startRsvpLoop() {
  clearInterval(timers.rsvp);
  timers.rsvp = setInterval(() => {
    if (!rsvpState.running) return;
    if (rsvpState.index >= rsvpState.queue.length) {
      stopRsvp(false);
      refs.rsvpWord.textContent = 'Done!';
      return;
    }
    const word = rsvpState.queue[rsvpState.index];
    refs.rsvpWord.textContent = word;
    rsvpState.index += 1;
  }, 60000 / state.preferences.targetWpm);
}

function stopRsvp(closeOverlayToo) {
  rsvpState.running = false;
  clearInterval(timers.rsvp);
  refs.rsvpPlay.textContent = 'Start';
  if (closeOverlayToo) {
    state.activeModes.rsvp = false;
    refs.modeRsvp.checked = false;
    closeOverlay(refs.rsvpLayer);
  }
}

function startGuidedPointer() {
  if (timers.guided) return;
  refs.guidedPointer.classList.remove('hidden');
  const lineNodes = Array.from(refs.readerArticle.querySelectorAll('p'));
  if (!lineNodes.length) return;
  let index = 0;
  const tick = () => {
    if (!state.activeModes.guided) return;
    const line = lineNodes[index % lineNodes.length];
    const rect = line.getBoundingClientRect();
    refs.guidedPointer.style.top = `${rect.top + window.scrollY}px`;
    refs.guidedPointer.style.left = `${rect.left + window.scrollX}px`;
    refs.guidedPointer.style.width = `${rect.width}px`;
    refs.guidedPointer.style.height = `${rect.height}px`;
    index += 1;
  };
  tick();
  timers.guided = setInterval(tick, 60000 / Math.max(state.preferences.guidedCadence, 60));
}

function restartGuidedPointer() {
  stopGuidedPointer();
  if (state.activeModes.guided) startGuidedPointer();
}

function stopGuidedPointer() {
  clearInterval(timers.guided);
  timers.guided = null;
  refs.guidedPointer.classList.add('hidden');
}

function setTunnelActive(active) {
  if (active) {
    refs.tunnelOverlay.style.background = buildTunnelGradient();
    openOverlay(refs.tunnelOverlay, false);
  } else {
    closeOverlay(refs.tunnelOverlay);
  }
}

function buildTunnelGradient() {
  const width = state.preferences.tunnelWidth;
  return `radial-gradient(circle ${width}rem at 50% 50%, rgba(255,255,255,0), rgba(15,23,42,0.75) 70%)`;
}

function openDrill(type) {
  drillState.type = type;
  drillState.correct = 0;
  drillState.attempts = 0;
  refs.drillCorrect.textContent = '0';
  refs.drillAttempts.textContent = '0';
  refs.drillDisplay.textContent = 'Press start to begin';
  refs.drillStop.disabled = true;
  refs.drillStart.disabled = false;
  refs.drillTitle.textContent = drillName(type);
  openOverlay(refs.drillOverlay);
}

function drillName(type) {
  switch (type) {
    case 'tachistoscope':
      return 'Tachistoscope flash';
    case 'peripheral':
      return 'Peripheral expansion';
    case 'meta-guiding':
      return 'Meta-guiding coach';
    case 'sound-pacer':
      return 'Metronome pacing';
    case 'visual-sweep':
      return 'Visual sweep';
    case 'anchoring':
      return 'Fixation anchoring';
    default:
      return 'Drill';
  }
}

function startDrillLoop() {
  refs.drillStart.disabled = true;
  refs.drillStop.disabled = false;
  drillState.correct = 0;
  drillState.attempts = 0;
  refs.drillCorrect.textContent = '0';
  refs.drillAttempts.textContent = '0';
  tickDrill();
  timers.drill = setInterval(tickDrill, 1200);
}

function tickDrill() {
  const wordPool =
    drillState.type === 'peripheral'
      ? state.vocabulary.map((entry) => entry.word)
      : rsvpState.queue.length
        ? rsvpState.queue
        : (state.openDocs[0]?.text.split(/\s+/) ?? ['focus', 'memory', 'speed']);
  const word = wordPool[Math.floor(Math.random() * wordPool.length)] || 'focus';
  if (drillState.type === 'sound-pacer') {
    playMetronome();
  }
  refs.drillDisplay.textContent = word;
  drillState.attempts += 1;
  refs.drillAttempts.textContent = drillState.attempts;
  if (state.liveSession) {
    state.liveSession.drills += 1;
    refs.liveDrills.textContent = state.liveSession.drills;
  }
}

function playMetronome() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.value = 0.1;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (_error) {
    // ignore
  }
}

function stopDrill() {
  refs.drillStart.disabled = false;
  refs.drillStop.disabled = true;
  clearInterval(timers.drill);
  timers.drill = null;
  refs.drillDisplay.textContent = 'Paused';
}

function handleFocusMode(mode) {
  switch (mode) {
    case 'bionic':
      renderFocusPreview('bionic');
      break;
    case 'chunk':
      renderFocusPreview('chunk');
      break;
    case 'contrast':
      renderFocusPreview('contrast');
      break;
    case 'peripheral':
      openDrill('peripheral');
      break;
    default:
      renderFocusPreview('bionic');
  }
}

function renderFocusPreview(mode) {
  const doc = state.openDocs.find((entry) => entry.id === state.activeDocId);
  const sample =
    doc?.text.split(/\s+/).slice(0, 180).join(' ') ?? 'Load a document to activate focus modes.';
  switch (mode) {
    case 'bionic':
      refs.focusOutput.innerHTML = `<p class="bionic">${bionicMarkup(sample)}</p>`;
      break;
    case 'chunk':
      refs.focusOutput.textContent = '';
      {
        const span = document.createElement('p');
        span.className = 'chunked';
        span.innerHTML = chunkParagraph(sample, state.preferences.chunkSize);
        refs.focusOutput.appendChild(span);
      }
      break;
    case 'contrast':
      refs.focusOutput.innerHTML = `<div style="background:#0f172a;color:#f8fafc;padding:18px;border-radius:14px;">${escapeHtml(sample)}</div>`;
      break;
    default:
      refs.focusOutput.textContent = sample;
  }
}

async function speakCurrentText() {
  const doc = state.openDocs.find((entry) => entry.id === state.activeDocId);
  if (!doc) {
    showToast('Open a document first to use text-to-speech.');
    return;
  }
  if (!window.electronAPI?.speakText) {
    showToast('Text-to-speech requires the desktop build with OPENAI_API_KEY configured.');
    return;
  }

  const source = refs.ttsSource.value;
  const voice = refs.ttsVoice.value || 'alloy';
  const language = doc.language || state.preferences.readingLanguage || 'en';
  const text = gatherSpeechText(doc, source);

  if (!text) {
    showToast('Nothing to read for the current selection.');
    return;
  }

  try {
    setSpeaking(true, { phase: 'synth' });
    const { filePath } = await window.electronAPI.speakText({
      text,
      voice,
      language,
      format: 'mp3',
    });
    state.tts.lastPath = filePath;
    await playAudio(filePath);
  } catch (error) {
    console.error('TTS error', error);
    showToast('Text-to-speech failed. Check your network and OPENAI_API_KEY.');
    setSpeaking(false);
  }
}

function gatherSpeechText(doc, source) {
  switch (source) {
    case 'summary':
      return doc.summary?.paragraphs?.join(' ')?.slice(0, 4000) ?? '';
    case 'preview':
      return doc.preview?.paragraphs?.join(' ')?.slice(0, 4000) ?? '';
    case 'selection': {
      const selection = window.getSelection()?.toString().trim();
      return selection ? selection.slice(0, 4000) : '';
    }
    case 'full':
      return doc.text?.slice(0, 4000) ?? '';
    default:
      return '';
  }
}

async function playAudio(filePath) {
  if (!filePath) {
    throw new Error('Missing audio file path.');
  }
  const audio = refs.ttsPlayer;
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;

  let src = filePath;
  if (!filePath.startsWith('file://')) {
    if (window.platform === 'win32') {
      src = `file:///${filePath.replace(/\\/g, '/')}`;
    } else {
      src = `file://${filePath}`;
    }
  }

  audio.src = src;
  audio.hidden = false;
  setSpeaking(true, { phase: 'play', keepAudio: true });

  try {
    await audio.play();
  } catch (error) {
    console.error('Audio playback error', error);
    showToast('Unable to play generated audio.');
    setSpeaking(false);
  }
}

function stopSpeaking() {
  const audio = refs.ttsPlayer;
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
  setSpeaking(false);
}

function setSpeaking(isSpeaking, options = {}) {
  state.tts.speaking = isSpeaking;
  const phase = options.phase || (isSpeaking ? 'play' : 'idle');
  refs.ttsPlay.disabled = isSpeaking;
  refs.ttsStop.disabled = !isSpeaking;
  refs.ttsPlay.textContent = isSpeaking
    ? phase === 'synth'
      ? 'Synthesising…'
      : 'Playing…'
    : 'Read aloud';
  if (!isSpeaking && !options.keepAudio) {
    refs.ttsPlayer.hidden = true;
    refs.ttsPlayer.src = '';
  }
}

function bionicMarkup(text) {
  return text
    .split(/\s+/)
    .map((word) => {
      const clean = word.replace(/[^\p{L}\p{N}-]/gu, '');
      const punctuation = word.slice(clean.length);
      if (!clean) return escapeHtml(word);
      const midpoint = Math.min(clean.length, Math.max(1, Math.ceil(clean.length * 0.45)));
      const head = escapeHtml(clean.slice(0, midpoint));
      const tail = escapeHtml(clean.slice(midpoint));
      return `<strong>${head}</strong>${tail}${escapeHtml(punctuation)} `;
    })
    .join('');
}

function generateComprehensionPrompt(doc) {
  if (!doc) return 'Summarise what stood out to you.';
  if (doc.keyPoints?.length) {
    return `Explain in your own words how "${doc.keyPoints[0]}" supports the document's thesis.`;
  }
  return 'What was the central argument of the passage you just read?';
}

function renderIntegrationState() {
  refs.goalMinutes.value = state.preferences.dailyMinutes;
  refs.preferredTopics.value = state.preferences.topics;
  refs.remindComprehension.checked = state.preferences.remindComprehension;
  refs.cloudSync.checked = state.preferences.cloudSync;
  toggleIntegrationButton(refs.toggleMemorySync, state.preferences.memorySync);
  toggleIntegrationButton(refs.toggleEmotionSync, state.preferences.emotionSync);
  toggleIntegrationButton(refs.toggleConceptSync, state.preferences.conceptSync);
}

function toggleIntegration(key, button) {
  state.preferences[key] = !state.preferences[key];
  toggleIntegrationButton(button, state.preferences[key]);
  savePreferences();
  const label = key.replace('Sync', '');
  showToast(`${label} sync ${state.preferences[key] ? 'enabled' : 'disabled'}`);
}

function toggleIntegrationButton(button, enabled) {
  button.textContent = enabled ? 'Disable' : 'Enable';
  button.classList.toggle('active', enabled);
}

function loadPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem('superspeedreader-preferences') ?? '{}');
    Object.assign(state.preferences, stored);
    const vocab = JSON.parse(localStorage.getItem('superspeedreader-vocab') ?? '[]');
    state.vocabulary = vocab;
  } catch (error) {
    console.warn('Unable to load preferences', error);
  }
}

function savePreferences() {
  localStorage.setItem('superspeedreader-preferences', JSON.stringify(state.preferences));
}

function syncPreferenceControls() {
  refs.readingLanguage.value = state.preferences.readingLanguage;
  refs.interfaceLanguage.value = state.preferences.interfaceLanguage;
  refs.targetWpm.value = state.preferences.targetWpm;
  refs.targetWpmValue.textContent = state.preferences.targetWpm;
  refs.chunkSize.value = state.preferences.chunkSize;
  refs.chunkSizeValue.textContent = state.preferences.chunkSize;
  refs.guidedCadence.value = state.preferences.guidedCadence;
  refs.guidedCadenceValue.textContent = state.preferences.guidedCadence;
  refs.tunnelWidth.value = state.preferences.tunnelWidth;
  refs.tunnelWidthValue.textContent = state.preferences.tunnelWidth;
}

function openOverlay(element, withAnimation = true) {
  if (!element) return;
  if (withAnimation) {
    element.classList.remove('hidden');
    requestAnimationFrame(() => element.classList.add('visible'));
  } else {
    element.classList.remove('hidden');
    element.classList.add('visible');
  }
}

function closeOverlay(element) {
  if (!element || element.classList.contains('hidden')) return;
  element.classList.remove('visible');
  setTimeout(() => element.classList.add('hidden'), 180);
}

function showToast(message) {
  if (!refs.toast) return;
  refs.toast.textContent = message;
  refs.toast.classList.add('show');
  setTimeout(() => refs.toast.classList.remove('show'), 3200);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hashIdentifier(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `doc-${Math.abs(hash)}`;
}

function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function uniqueId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
