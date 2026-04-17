import { extractSections, includesAny, normalizeForSearch, toLines } from "./resume-utils";

const KEYWORD_LIBRARY = [
  { label: "JavaScript", aliases: ["javascript", " js ", "js/ts"] },
  { label: "TypeScript", aliases: ["typescript", " ts "] },
  { label: "React", aliases: ["react"] },
  { label: "Vue", aliases: ["vue"] },
  { label: "Next.js", aliases: ["next.js", "nextjs"] },
  { label: "Node.js", aliases: ["node.js", "nodejs", "node"] },
  { label: "Python", aliases: ["python"] },
  { label: "Java", aliases: [" java ", "spring"] },
  { label: "SQL", aliases: [" sql ", "mysql", "postgresql", "sqlite", "数据库"] },
  { label: "数据分析", aliases: ["数据分析", "数据处理", "数据清洗"] },
  { label: "A/B测试", aliases: ["a/b", "ab测试", "a/b测试", "ab test"] },
  { label: "Excel", aliases: ["excel"] },
  { label: "Power BI", aliases: ["power bi", "powerbi"] },
  { label: "Tableau", aliases: ["tableau"] },
  { label: "运营", aliases: ["运营", "用户增长", "内容策划"] },
  { label: "产品思维", aliases: ["产品", "需求分析", "用户研究"] },
  { label: "新媒体", aliases: ["新媒体", "公众号", "小红书", "抖音"] },
  { label: "沟通协作", aliases: ["沟通", "协作", "团队合作", "跨部门"] },
  { label: "英文能力", aliases: ["英语", "cet-4", "cet-6", "雅思", "托福", "英文"] },
  { label: "Git", aliases: ["git", "github"] },
  { label: "HTML/CSS", aliases: ["html", "css"] },
  { label: "算法基础", aliases: ["算法", "数据结构"] }
];

const KEYWORD_ALIASES = new Map(KEYWORD_LIBRARY.map((item) => [item.label, item.aliases]));

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractJobKeywords(jobDescription) {
  const detected = KEYWORD_LIBRARY.filter((item) => includesAny(jobDescription, item.aliases)).map((item) => item.label);

  if (detected.length > 0) {
    return detected;
  }

  const englishTokens = jobDescription.match(/[A-Za-z][A-Za-z.+/-]{2,}/g) || [];
  return unique(englishTokens).slice(0, 8);
}

function extractProjectLines(sections, resumeText) {
  const preferredLines = [...sections.project, ...sections.internship];

  if (preferredLines.length > 0) {
    return preferredLines.slice(0, 3);
  }

  return toLines(resumeText).filter((line) => line.length >= 12).slice(0, 3);
}

function hasQuantifiedContent(text) {
  return /\d+%|\d+\+|\d+个|\d+次|\d+天|\d+周|\d+月|\d+人|\d+条|\d+份|\d+万/.test(text);
}

function inferTargetRole(jobDescription) {
  const firstLine = toLines(jobDescription)[0] || "";
  const matchedRole = firstLine.match(/([^\s，。,：:]{2,20}(工程师|开发|产品|运营|分析师|专员|实习生))/);
  return matchedRole?.[0] || "与目标岗位匹配的校招/实习岗位";
}

function buildProjectRewriteExamples(projectLines, keywords) {
  const majorKeyword = keywords[0] || "岗位相关能力";
  const supportKeyword = keywords[1] || "业务目标";

  if (projectLines.length === 0) {
    return [
      {
        before: "参与项目开发与测试工作",
        after: `围绕${majorKeyword}完成需求拆解、执行与复盘，补充关键动作、使用方法和结果指标，让经历更贴近 ${supportKeyword} 场景。`
      }
    ];
  }

  return projectLines.slice(0, 2).map((line) => ({
    before: line,
    after: `围绕 ${majorKeyword} 对该经历进行重写：明确你的具体职责、使用的方法或工具，并补充可量化结果，说明这段经历如何支持 ${supportKeyword}。`
  }));
}

function buildRewriteSuggestions(sections, missingKeywords) {
  const suggestions = [
    {
      section: "项目经历",
      problem: "当前描述更像任务罗列，缺少动作、方法和结果的完整闭环",
      suggestion: "使用“做了什么 + 怎么做的 + 结果如何”的结构，每段至少补充一个结果指标"
    },
    {
      section: "技能栏",
      problem: "技能和 JD 对齐度不够直观",
      suggestion: "将与岗位直接相关的工具、语言和方法前置，并保证与正文经历有对应关系"
    }
  ];

  if (sections.education.length === 0) {
    suggestions.push({
      section: "教育经历",
      problem: "简历中未明显识别出教育模块",
      suggestion: "补充学校、专业、时间、成绩或荣誉信息，方便应届生岗位快速判断背景"
    });
  }

  if (missingKeywords.length > 0) {
    suggestions.push({
      section: "关键词覆盖",
      problem: "JD 关键字覆盖不足",
      suggestion: `在不虚构经历的前提下，优先补充这些关键词的实际使用场景：${missingKeywords.slice(0, 5).join("、")}`
    });
  }

  return suggestions;
}

function buildStrengths(sections, matchedKeywords, resumeText) {
  const strengths = [];

  if (sections.education.length > 0) {
    strengths.push("简历中包含教育经历，符合应届生筛选的基础信息要求。");
  }

  if (sections.project.length > 0 || sections.internship.length > 0) {
    strengths.push("已经具备项目或实习经历，可以进一步围绕目标岗位做针对性强化。");
  }

  if (matchedKeywords.length > 0) {
    strengths.push(`简历中已经覆盖部分岗位关键词：${matchedKeywords.slice(0, 4).join("、")}。`);
  }

  if (hasQuantifiedContent(resumeText)) {
    strengths.push("简历中已经出现部分量化表达，说明具备继续强化成果叙事的基础。");
  }

  return strengths.length > 0
    ? strengths
    : ["当前简历已经有基本信息基础，适合围绕目标岗位继续做定向优化。"];
}

function buildIssues(sections, missingKeywords, resumeText) {
  const issues = [];

  if (missingKeywords.length > 0) {
    issues.push(`岗位关键词覆盖不足，当前缺少：${missingKeywords.slice(0, 6).join("、")}。`);
  }

  if (!hasQuantifiedContent(resumeText)) {
    issues.push("成果表达偏弱，建议补充数量、比例、效率、结果等量化信息。");
  }

  if (sections.skills.length === 0) {
    issues.push("未明显识别出技能栏，ATS 和人工筛选都不容易快速抓到关键能力。");
  }

  if (sections.project.length === 0 && sections.internship.length === 0) {
    issues.push("项目或实习经历不够突出，建议将最相关的经历集中前置展示。");
  }

  return issues.length > 0
    ? issues
    : ["整体内容较完整，但还可以进一步提高与目标 JD 的贴合度。"];
}

function buildStructureDiagnosis(sections) {
  const suggestions = [
    "建议按“教育经历 - 技能栏 - 项目/实习经历 - 校园经历”的顺序组织简历，方便应届生岗位快速浏览。"
  ];

  if (sections.skills.length === 0) {
    suggestions.push("建议新增“技能”模块，并将与岗位强相关的工具或语言放在第一行。");
  }

  if (sections.project.length > 1) {
    suggestions.push("项目经历建议按与目标岗位的相关度排序，而不是按时间顺序平均铺开。");
  }

  suggestions.push("每段经历尽量控制在 2 到 4 条 bullet，避免大段文字挤压可读性。");
  return suggestions;
}

function buildInterviewTips(missingKeywords, matchedKeywords, targetRole) {
  const primary = matchedKeywords[0] || missingKeywords[0] || "岗位核心能力";

  return [
    `准备 1 到 2 个案例，说明你如何通过项目或实践证明自己具备 ${primary}。`,
    `围绕“为什么适合 ${targetRole}”准备一段 60 秒自我介绍，突出教育背景和最相关经历。`,
    "如果简历中补充了新的关键词表达，面试时要能说清楚具体场景、动作和结果。",
    "提前准备一段复盘，说明你在项目中遇到的问题、如何处理以及最终收获。"
  ];
}

function buildOptimizedResume(sections, jobKeywords, missingKeywords, jobDescription) {
  const targetRole = inferTargetRole(jobDescription);
  const educationBlock = sections.education.length > 0 ? sections.education.join("\n") : "请根据原简历补充学校、专业、时间、绩点/荣誉等核心信息。";
  const skills = unique([...jobKeywords.slice(0, 6), ...sections.skills.slice(0, 4)]).filter(Boolean);
  const projectSources = [...sections.project, ...sections.internship].slice(0, 6);
  const projectBlock =
    projectSources.length > 0
      ? projectSources
          .map(
            (line) =>
              `- ${line}；建议补充使用的方法、工具与结果指标，让经历更贴近 ${jobKeywords[0] || "目标岗位"}。`
          )
          .join("\n")
      : "- 请从原简历中选择 1 到 2 段最能证明岗位匹配度的经历，按“背景 - 动作 - 结果”方式重写。";

  const awardsBlock =
    sections.awards.length > 0
      ? sections.awards.map((line) => `- ${line}`).join("\n")
      : "- 如有奖学金、竞赛、学生组织或志愿经历，建议补充能体现主动性和协作能力的内容。";

  return [
    `求职目标：${targetRole}`,
    "",
    "个人概述",
    `- 围绕 ${jobKeywords.slice(0, 3).join("、") || "目标岗位关键能力"} 进行针对性优化的应届生简历版本。`,
    `- 建议在正式投递前，确认所有表述均与个人真实经历一致，尤其是 ${missingKeywords[0] || "岗位关键词"} 相关描述。`,
    "",
    "教育经历",
    educationBlock,
    "",
    "核心技能",
    `- ${skills.join("、") || "请补充与岗位直接相关的技能关键词"}`,
    "",
    "项目/实习经历",
    projectBlock,
    "",
    "校园经历/荣誉",
    awardsBlock,
    "",
    "投递前自查",
    "- 联系方式、邮箱、姓名请按原简历核对补充。",
    "- 确认每段经历至少有一个结果指标或明确产出。",
    "- 确认技能栏中的关键词都能在面试中说明实际使用场景。"
  ].join("\n");
}

export function buildFallbackAnalysis({ resumeText, jobDescription }) {
  const sections = extractSections(resumeText);
  const jobKeywords = extractJobKeywords(jobDescription);
  const matchedKeywords = jobKeywords.filter((keyword) => includesAny(resumeText, KEYWORD_ALIASES.get(keyword) || [keyword]));
  const missingKeywords = jobKeywords.filter((keyword) => !includesAny(resumeText, KEYWORD_ALIASES.get(keyword) || [keyword]));
  const coverageRatio = jobKeywords.length > 0 ? matchedKeywords.length / jobKeywords.length : 0.45;
  const sectionBonus =
    (sections.education.length > 0 ? 8 : 0) +
    (sections.project.length > 0 || sections.internship.length > 0 ? 8 : 0) +
    (sections.skills.length > 0 ? 6 : 0);
  const quantifiedBonus = hasQuantifiedContent(resumeText) ? 6 : 0;
  const atsScore = Math.max(46, Math.min(92, Math.round(48 + coverageRatio * 28 + sectionBonus + quantifiedBonus)));
  const scoreReason =
    jobKeywords.length > 0
      ? `已识别 ${jobKeywords.length} 个岗位关键词，当前覆盖 ${matchedKeywords.length} 个；简历的完整度和量化表达也会影响评分。`
      : "未从 JD 中识别出足够多的标准关键词，因此主要依据简历结构完整度和表达质量给出估算评分。";
  const projectLines = extractProjectLines(sections, resumeText);

  return {
    atsScore,
    scoreReason,
    missingKeywords,
    strengths: buildStrengths(sections, matchedKeywords, resumeText),
    issues: buildIssues(sections, missingKeywords, resumeText),
    rewriteSuggestions: buildRewriteSuggestions(sections, missingKeywords),
    projectRewriteExamples: buildProjectRewriteExamples(projectLines, jobKeywords),
    structureDiagnosis: buildStructureDiagnosis(sections),
    interviewTips: buildInterviewTips(missingKeywords, matchedKeywords, inferTargetRole(jobDescription)),
    optimizedResume: buildOptimizedResume(sections, jobKeywords, missingKeywords, jobDescription)
  };
}
