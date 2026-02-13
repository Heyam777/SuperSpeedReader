import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAnalytics,
  buildStudyPlan,
  extractKeyPhrases,
  generateFlashcards,
  generatePrompts,
  normalizeWord,
  summarizeText,
} from '../renderer/analysis.js';

test('normalizeWord strips punctuation and preserves apostrophes', () => {
  assert.equal(normalizeWord("Reader's,"), "reader's");
  assert.equal(normalizeWord('Focus!'), 'focus');
});

test('extractKeyPhrases ranks meaningful tokens', () => {
  const text = 'Focus boosts reading focus and memory. Focus drills improve memory and speed.';
  const phrases = extractKeyPhrases(text, 3);
  assert.equal(phrases[0], 'Focus');
  assert.ok(phrases.includes('Memory'));
});

test('summarizeText returns capped, ordered sentences', () => {
  const text =
    'Alpha systems improve knowledge retention through deliberate practice. ' +
    'Beta drills increase concentration and comprehension across sessions. ' +
    'Gamma review loops reinforce memory and reduce forgetting over time. ' +
    'Delta planning turns insights into concrete actions and experiments. ' +
    'Epsilon reflections expose weak assumptions and sharpen understanding.';

  const summary = summarizeText(text, 3, 0);
  assert.equal(summary.length, 3);

  const positions = summary.map((sentence) => text.indexOf(sentence));
  const sorted = [...positions].sort((a, b) => a - b);
  assert.deepEqual(positions, sorted);
});

test('buildStudyPlan creates three staged sections', () => {
  const plan = buildStudyPlan({
    name: 'Deep Work Patterns',
    keyPoints: ['Attention residue'],
    readingMinutes: 20,
  });

  assert.equal(plan.sections.length, 3);
  assert.equal(plan.sections[0].title, 'Warm-up (Preview)');
  assert.match(plan.sections[2].items[0], /Deep Work Patterns/);
});

test('prompt and flashcard generation use key concepts and summary fallback', () => {
  const keyPoints = ['Flow State', 'Cognitive Load'];
  const prompts = generatePrompts(keyPoints);
  const cards = generateFlashcards(['Flow states improve sustained concentration.'], keyPoints);

  assert.equal(prompts.length, 4);
  assert.match(prompts[0], /Flow State/);
  assert.equal(cards.length, 3);
  assert.match(cards[cards.length - 1].a, /Flow states improve sustained concentration/);
});

test('buildAnalytics estimates difficulty tier', () => {
  const analytics = buildAnalytics({
    keyPoints: ['Signal'],
    sentences: ['Core thesis.', 'Final wrap-up.'],
    lexicalDensity: 46,
    averageSentenceLength: 18,
    readingMinutes: 6,
    wordCount: 1400,
  });

  assert.equal(analytics.difficulty, 'Advanced');
  assert.equal(analytics.keywords.length, 1);
});
