const SECTION_LABELS = {
  education: [/教育经历/i, /教育背景/i, /education/i],
  project: [/项目经历/i, /项目经验/i, /project/i],
  internship: [/实习经历/i, /工作经历/i, /实践经历/i, /experience/i],
  skills: [/技能/i, /专业技能/i, /skill/i],
  awards: [/校园经历/i, /获奖/i, /荣誉/i, /活动经历/i]
};

function normalizeWhitespace(text) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function toLines(text) {
  return normalizeWhitespace(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeForSearch(text) {
  return normalizeWhitespace(text).toLowerCase();
}

function detectSectionName(line) {
  const entries = Object.entries(SECTION_LABELS);

  for (const [sectionName, patterns] of entries) {
    if (patterns.some((pattern) => pattern.test(line))) {
      return sectionName;
    }
  }

  return null;
}

function extractSections(text) {
  const lines = toLines(text);
  const sections = {
    education: [],
    project: [],
    internship: [],
    skills: [],
    awards: [],
    misc: []
  };

  let currentSection = "misc";

  for (const line of lines) {
    const nextSection = detectSectionName(line);

    if (nextSection) {
      currentSection = nextSection;
      continue;
    }

    sections[currentSection].push(line);
  }

  return sections;
}

function includesAny(text, aliases) {
  const normalized = ` ${normalizeForSearch(text)} `;
  return aliases.some((alias) => normalized.includes(alias.toLowerCase()));
}

export {
  extractSections,
  includesAny,
  normalizeForSearch,
  normalizeWhitespace,
  toLines
};
