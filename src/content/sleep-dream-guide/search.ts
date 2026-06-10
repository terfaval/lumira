import cardsJson from "./cards.json";

export type SleepDreamGuideCard = (typeof cardsJson)[number];

type IndexedValue = {
  text: string;
  tokens: string[];
};

type IndexedCard = {
  card: SleepDreamGuideCard;
  combined: IndexedValue;
  title: IndexedValue[];
  summary: IndexedValue[];
  primaryTags: IndexedValue[];
  secondaryTags: IndexedValue[];
  searchAliases: IndexedValue[];
  symptomPhrases: IndexedValue[];
  everydayPhrases: IndexedValue[];
  hiddenSearchTerms: IndexedValue[];
};

const cards = cardsJson as SleepDreamGuideCard[];

const indexedCards = cards.map((card) => {
  const title = indexValues(card.title);
  const summary = indexValues(card.summary);
  const primaryTags = indexValues(card.displayTags.primary);
  const secondaryTags = indexValues(card.displayTags.secondary);
  const searchAliases = indexValues(card.searchAliases);
  const symptomPhrases = indexValues(card.symptomPhrases);
  const everydayPhrases = indexValues(card.everydayPhrases);
  const hiddenSearchTerms = indexValues(card.hiddenSearchTerms);

  return {
    card,
    combined: createCombinedValue([
      title,
      summary,
      primaryTags,
      secondaryTags,
      searchAliases,
      symptomPhrases,
      everydayPhrases,
      hiddenSearchTerms,
    ]),
    title,
    summary,
    primaryTags,
    secondaryTags,
    searchAliases,
    symptomPhrases,
    everydayPhrases,
    hiddenSearchTerms,
  } satisfies IndexedCard;
});

const cardBySlug = new Map(cards.map((card) => [card.slug, card] as const));

const displayTags = {
  primary: sortLabels(unique(cards.map((card) => card.displayTags.primary))),
  secondary: sortLabels(unique(cards.flatMap((card) => card.displayTags.secondary))),
};

export function getSleepDreamGuideCards(): SleepDreamGuideCard[] {
  return [...cards];
}

export function getSleepDreamGuideCardBySlug(slug: string): SleepDreamGuideCard | undefined {
  return cardBySlug.get(slug);
}

export function getSleepDreamGuideDisplayTags(): { primary: string[]; secondary: string[] } {
  return {
    primary: [...displayTags.primary],
    secondary: [...displayTags.secondary],
  };
}

export function searchSleepDreamGuideCards(query: string): SleepDreamGuideCard[] {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return getSleepDreamGuideCards();
  }

  const queryTokens = tokenizeNormalizedText(normalizedQuery);

  return indexedCards
    .map((indexedCard) => ({
      card: indexedCard.card,
      score: scoreIndexedCard(indexedCard, normalizedQuery, queryTokens),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.card.slug.localeCompare(right.card.slug, "hu");
    })
    .map((entry) => entry.card);
}

function scoreIndexedCard(indexedCard: IndexedCard, query: string, queryTokens: string[]): number {
  return (
    scoreFieldGroup(indexedCard.title, query, queryTokens, 18) +
    scoreFieldGroup(indexedCard.searchAliases, query, queryTokens, 14) +
    scoreFieldGroup(indexedCard.symptomPhrases, query, queryTokens, 14) +
    scoreFieldGroup(indexedCard.everydayPhrases, query, queryTokens, 12) +
    scoreFieldGroup(indexedCard.hiddenSearchTerms, query, queryTokens, 8) +
    scoreFieldGroup(indexedCard.summary, query, queryTokens, 6) +
    scoreFieldGroup(indexedCard.primaryTags, query, queryTokens, 5) +
    scoreFieldGroup(indexedCard.secondaryTags, query, queryTokens, 5) +
    scoreCombinedField(indexedCard.combined, query, queryTokens, 4)
  );
}

function scoreFieldGroup(values: IndexedValue[], query: string, queryTokens: string[], weight: number): number {
  return values.reduce((best, value) => Math.max(best, scoreValue(value, query, queryTokens, weight)), 0);
}

function scoreCombinedField(value: IndexedValue, query: string, queryTokens: string[], weight: number): number {
  return scoreValue(value, query, queryTokens, weight);
}

function scoreValue(value: IndexedValue, query: string, queryTokens: string[], weight: number): number {
  if (!value.text) {
    return 0;
  }

  const tokenScores = queryTokens.map((queryToken) => bestTokenMatch(queryToken, value.tokens));
  const matchedTokens = tokenScores.filter((score) => score > 0).length;

  if (matchedTokens === 0 && !value.text.includes(query)) {
    return 0;
  }

  let score = 0;

  if (value.text === query) {
    score += weight * 8;
  } else if (value.text.startsWith(query)) {
    score += weight * 6;
  } else if (value.text.includes(query)) {
    score += weight * 4;
  }

  if (queryTokens.length > 1 && matchedTokens === queryTokens.length) {
    score += weight * 3;
  }

  score += Math.round(tokenScores.reduce((sum, current) => sum + current, 0) * weight);

  return score;
}

function bestTokenMatch(queryToken: string, fieldTokens: string[]): number {
  let best = 0;

  for (const fieldToken of fieldTokens) {
    if (fieldToken === queryToken) {
      return 1;
    }

    if (queryToken.length < 3 || fieldToken.length < 3) {
      continue;
    }

    if (fieldToken.includes(queryToken) || queryToken.includes(fieldToken)) {
      best = Math.max(best, 0.85);
      continue;
    }

    const prefixLength = commonPrefixLength(queryToken, fieldToken);
    const shortestLength = Math.min(queryToken.length, fieldToken.length);

    if (prefixLength >= shortestLength - 1 && shortestLength >= 4) {
      best = Math.max(best, 0.8);
      continue;
    }

    if (prefixLength >= 4) {
      best = Math.max(best, 0.7);
    }
  }

  return best;
}

function commonPrefixLength(left: string, right: string): number {
  const limit = Math.min(left.length, right.length);
  let index = 0;

  while (index < limit && left[index] === right[index]) {
    index += 1;
  }

  return index;
}

function createCombinedValue(groups: IndexedValue[][]): IndexedValue {
  const combinedText = unique(groups.flat().map((value) => value.text).filter(Boolean)).join(" ");

  return {
    text: combinedText,
    tokens: tokenizeNormalizedText(combinedText),
  };
}

function indexValues(value: string | string[]): IndexedValue[] {
  const values = Array.isArray(value) ? value : [value];

  return values
    .map((entry) => normalizeSearchText(entry))
    .filter(Boolean)
    .map((text) => ({
      text,
      tokens: tokenizeNormalizedText(text),
    }));
}

function tokenizeNormalizedText(value: string): string[] {
  if (!value) {
    return [];
  }

  return value.split(" ").filter((token) => token.length > 2);
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function sortLabels(values: string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right, "hu"));
}
