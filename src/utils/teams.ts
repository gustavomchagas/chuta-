// Times da Série A do Brasileirão 2026 (em ordem alfabética)
export const SERIE_A_2026 = [
  "Athletico-PR",
  "Atlético-MG",
  "Bahia",
  "Botafogo",
  "Bragantino",
  "Chapecoense",
  "Corinthians",
  "Coritiba",
  "Cruzeiro",
  "Flamengo",
  "Fluminense",
  "Grêmio",
  "Internacional",
  "Mirassol",
  "Palmeiras",
  "Remo",
  "Santos",
  "São Paulo",
  "Vasco da Gama",
  "Vitória",
] as const;

export type SerieATeam = (typeof SERIE_A_2026)[number];

// Mapeamento de apelidos/abreviações dos times do Brasileirão
export const TEAM_ALIASES: Record<string, string[]> = {
  // === SÉRIE A 2026 ===
  "Athletico-PR": [
    "athletico",
    "athletico-pr",
    "cap",
    "furacão",
    "furacao",
    "atletico-pr",
    "athletico paranaense",
  ],
  "Atlético-MG": [
    "atlético-mg",
    "atletico-mg",
    "atlético",
    "atletico",
    "galo",
    "cam",
    "atlético mineiro",
    "atletico mineiro",
  ],
  Bahia: ["bahia", "bah", "tricolor baiano", "tricolor de aço", "esquadrão"],
  Botafogo: ["botafogo", "bota", "fogo", "fogão", "fogao", "glorioso", "bfr"],
  Bragantino: [
    "bragantino",
    "braga",
    "red bull",
    "rb bragantino",
    "massa bruta",
    "red bull bragantino",
  ],
  Chapecoense: ["chapecoense", "chape", "verdão do oeste", "índio condá"],
  Corinthians: [
    "corinthians",
    "corintians",
    "cortinas",
    "timão",
    "timao",
    "sccp",
    "coringao",
  ],
  Coritiba: ["coritiba", "cori", "coxa", "coxa-branca", "alviverde paranaense"],
  Cruzeiro: ["cruzeiro", "cru", "raposa", "celeste", "cabuloso"],
  Flamengo: [
    "flamengo",
    "fla",
    "mengão",
    "mengao",
    "mengo",
    "urubu",
    "mengudo",
  ],
  Fluminense: [
    "fluminense",
    "flu",
    "fluzão",
    "fluzao",
    "tricolor carioca",
    "nense",
  ],
  Grêmio: ["grêmio", "gremio", "imortal", "tricolor gaúcho", "tricolor gaucho"],
  Internacional: [
    "internacional",
    "inter",
    "colorado",
    "inter de porto alegre",
    "inter rs",
  ],
  Mirassol: ["mirassol", "mira", "leão amarelo", "leao amarelo"],
  Palmeiras: [
    "palmeiras",
    "palm",
    "palme",
    "verdão",
    "verdao",
    "porco",
    "alviverde",
  ],
  Remo: ["remo", "leão azul", "leao azul", "azulão da amazônia"],
  Santos: ["santos", "sfc", "peixe", "alvinegro praiano", "santástico"],
  "São Paulo": [
    "são paulo",
    "sao paulo",
    "spfc",
    "sp",
    "tricolor paulista",
    "soberano",
  ],
  "Vasco da Gama": [
    "vasco",
    "vascão",
    "vascao",
    "gigante da colina",
    "cruzmaltino",
    "vasco da gama",
  ],
  Vitória: [
    "vitória",
    "vitoria",
    "vit",
    "leão da barra",
    "rubro-negro baiano",
    "ec vitória",
  ],

  // === OUTROS TIMES (para referência) ===
  Fortaleza: ["fortaleza", "for", "leão", "leao", "tricolor do pici"],
  Ceará: ["ceará", "ceara", "vozão", "vozao", "csc"],
  Sport: ["sport", "spo", "leão da ilha", "rubro-negro pernambucano"],
  Juventude: ["juventude", "juv", "ju", "papo"],
  Cuiabá: ["cuiabá", "cuiaba", "cui", "dourado"],
  Goiás: ["goiás", "goias", "goi", "esmeraldino", "verdão goiano"],
  "América-MG": ["américa-mg", "america-mg", "américa", "america", "coelho"],
  Criciúma: ["criciúma", "criciuma", "cri", "tigre"],
  Avaí: ["avaí", "avai", "leão da ilha azul"],
  "Ponte Preta": ["ponte preta", "ponte", "macaca"],
  Guarani: ["guarani", "bugre"],
  Novorizontino: ["novorizontino", "novo", "tigre do vale"],
  "Botafogo-SP": ["botafogo-sp", "bota-sp", "tricolor de ribeirão"],
  CRB: ["crb", "galo da praia"],
  CSA: ["csa", "azulão"],
  Náutico: ["náutico", "nautico", "timbu"],
  Paysandu: ["paysandu", "papão", "papao"],
};

/**
 * Encontra o nome oficial do time a partir de um texto
 */
export function findTeamName(text: string): string | null {
  const normalizedText = text.toLowerCase().trim();

  for (const [officialName, aliases] of Object.entries(TEAM_ALIASES)) {
    if (
      aliases.some(
        (alias) =>
          normalizedText.includes(alias) || alias.includes(normalizedText),
      )
    ) {
      return officialName;
    }
  }

  return null;
}

/**
 * Calcula similaridade entre duas strings (para fuzzy matching)
 */
export function similarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Levenshtein simplificado
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1;

  const costs: number[] = [];
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (shorter[i - 1] !== longer[j - 1]) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[longer.length] = lastValue;
  }

  return (longer.length - costs[longer.length]) / longer.length;
}

/**
 * Tenta encontrar o time mais similar
 */
export function findClosestTeam(text: string): string | null {
  const normalizedText = text.toLowerCase().trim();
  let bestMatch: string | null = null;
  let bestScore = 0.6; // Threshold mínimo de 60%

  for (const [officialName, aliases] of Object.entries(TEAM_ALIASES)) {
    for (const alias of aliases) {
      const score = similarity(normalizedText, alias);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = officialName;
      }
    }
  }

  return bestMatch;
}
