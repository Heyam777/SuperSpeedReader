const STOP_WORDS_SOURCE = `a,about,above,after,again,against,all,am,an,and,any,are,as,at,be,because,been,before,being,below,between,both,but,by,could,did,do,does,doing,down,during,each,few,for,from,further,had,has,have,having,he,her,here,hers,herself,him,himself,his,how,i,if,in,into,is,it,its,itself,just,me,more,most,my,myself,no,nor,not,now,of,off,on,once,only,or,other,our,ours,ourselves,out,over,own,same,she,should,so,some,such,than,that,the,their,theirs,them,themselves,then,there,these,they,this,those,through,to,too,under,until,up,very,was,we,were,what,when,where,which,while,who,whom,why,will,with,you,your,yours,yourself,yourselves,że,który,która,które,tego,tym,tam,gdzie,kiedy,jak,ale,oraz,tylko,więc,by,aby,może`;

export const STOP_WORDS = new Set(
  STOP_WORDS_SOURCE.split(',')
    .map((word) => word.trim())
    .filter(Boolean),
);

function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function normalizeWord(word) {
  return word.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '');
}

export function extractKeyPhrases(text, limit = 10) {
  const tokens = text.toLowerCase().match(/\b[\p{L}]{4,}\b/gu) ?? [];
  const counts = new Map();
  tokens.forEach((token) => {
    if (STOP_WORDS.has(normalizeWord(token))) {
      return;
    }
    counts.set(token, (counts.get(token) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => capitalise(word));
}

export function summarizeText(text, maxSentences = 5, seed = 0) {
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9ĄĆĘŁŃÓŚŹŻ])/)
    .filter((sentence) => sentence.length > 20);
  if (sentences.length <= maxSentences) {
    return sentences;
  }
  const wordFreq = new Map();
  const words = text.toLowerCase().match(/\b[\p{L}]{3,}\b/gu) ?? [];
  words.forEach((word) => {
    if (STOP_WORDS.has(normalizeWord(word))) {
      return;
    }
    wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
  });
  const scored = sentences.map((sentence, index) => {
    const weight =
      sentence
        .toLowerCase()
        .match(/\b[\p{L}]{3,}\b/gu)
        ?.reduce((total, token) => {
          if (STOP_WORDS.has(normalizeWord(token))) {
            return total;
          }
          return total + (wordFreq.get(token) ?? 0);
        }, 0) ?? 0;
    return { sentence: sentence.trim(), score: weight / (sentence.length || 1), index };
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = scored.slice(0, maxSentences + (seed % 2));
  selected.sort((a, b) => a.index - b.index);
  return selected.map((item) => item.sentence);
}

export function generatePrompts(keyPoints) {
  const prompts = [];
  const primary = keyPoints.slice(0, 4);
  primary.forEach((point) => {
    prompts.push(`Design an experiment or scenario applying "${point}" this week.`);
  });
  prompts.push('Summarise this chapter in 5 bullet points and share with a peer.');
  prompts.push('Extract one data point or quote worth memorising and justify why.');
  return prompts.slice(0, 6);
}

export function generateFlashcards(summaryParagraphs, keyPoints) {
  const cards = [];
  keyPoints.slice(0, 5).forEach((point) => {
    cards.push({
      q: `What is the significance of ${point}?`,
      a: `Explain how ${point} connects to the central thesis.`,
    });
  });
  cards.push({
    q: 'What is the primary argument or takeaway?',
    a: summaryParagraphs[0] ?? 'Recall the core idea in your own words.',
  });
  return cards;
}

export function buildStudyPlan({ name, keyPoints, readingMinutes }) {
  const warmup = `Skim the summary and highlight the strongest claim in under ${Math.max(2, Math.round(readingMinutes * 0.2))} minutes.`;
  const deepDive = `Re-read sections covering ${keyPoints[0] ?? 'the key concept'} and capture supporting evidence.`;
  const apply = `Draft a 3-sentence application or experiment using the main idea from ${name}.`;
  return {
    sections: [
      {
        title: 'Warm-up (Preview)',
        items: [warmup, 'Write two guiding questions you want answered.'],
      },
      {
        title: 'Deep comprehension',
        items: [
          deepDive,
          'Translate complex passages into your own words.',
          'Note contradictions or missing data.',
        ],
      },
      {
        title: 'Implementation',
        items: [
          apply,
          'Schedule a spaced review in 48 hours with the generated flashcards.',
          'Share one actionable takeaway with your team.',
        ],
      },
    ],
  };
}

export function buildAnalytics({
  keyPoints,
  sentences,
  lexicalDensity,
  averageSentenceLength,
  readingMinutes,
  wordCount,
}) {
  const thesisSentence = sentences[0]?.trim() ?? 'Document loaded.';
  const conclusionSentence = sentences[sentences.length - 1]?.trim() ?? '';
  const estimatedDifficulty =
    lexicalDensity > 45 || averageSentenceLength > 25
      ? 'Advanced'
      : lexicalDensity > 35
        ? 'Intermediate'
        : 'Introductory';
  return {
    thesis: thesisSentence,
    wrapUp: conclusionSentence,
    difficulty: estimatedDifficulty,
    lexicalDensity,
    averageSentenceLength,
    readingMinutes,
    keywords: keyPoints.slice(0, 5),
    wordCount,
  };
}
