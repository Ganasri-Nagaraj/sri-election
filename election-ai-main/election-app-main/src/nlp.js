const IRREGULAR_LEMMA_MAP = {
  went: "go",
  gone: "go",
  running: "run",
  ran: "run",
  better: "good",
  best: "good",
  symbols: "symbol",
  parties: "party",
  leaves: "leaf",
  slogans: "slogan",
  candidates: "candidate",
  leaders: "leader",
  is: "be",
  are: "be",
  was: "be",
  were: "be"
};

export const tokenize = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

export const stemToken = (word) => {
  if (word.length <= 3) return word;
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
  if (word.endsWith("ed") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("ly") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
};

export const lemmatizeToken = (word) => {
  if (IRREGULAR_LEMMA_MAP[word]) return IRREGULAR_LEMMA_MAP[word];
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ves") && word.length > 4) return `${word.slice(0, -3)}f`;
  if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
  if (word.endsWith("ed") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
};

export const preprocessText = (rawText) => {
  const tokens = tokenize(rawText);
  const stems = tokens.map(stemToken);
  const lemmas = tokens.map(lemmatizeToken);
  const normalizedText = tokens.join(" ");

  return {
    tokens,
    stems,
    lemmas,
    normalizedText,
    tokenSet: new Set(tokens),
    stemSet: new Set(stems),
    lemmaSet: new Set(lemmas)
  };
};

export const includesAny = (wordSet, candidates) =>
  candidates.some((candidate) => wordSet.has(candidate));
