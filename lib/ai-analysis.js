import { buildFallbackAnalysis } from "./fallback-analysis";

const REQUIRED_FIELDS = [
  "atsScore",
  "scoreReason",
  "missingKeywords",
  "strengths",
  "issues",
  "rewriteSuggestions",
  "projectRewriteExamples",
  "structureDiagnosis",
  "interviewTips",
  "optimizedResume"
];

function extractJsonObject(text) {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("模型没有返回内容。");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("模型返回内容中未找到 JSON 对象。");
    }

    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

function validateResultShape(result) {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in result)) {
      throw new Error(`模型返回缺少字段：${field}`);
    }
  }

  return {
    atsScore: Number(result.atsScore) || 0,
    scoreReason: String(result.scoreReason || ""),
    missingKeywords: Array.isArray(result.missingKeywords) ? result.missingKeywords.map(String) : [],
    strengths: Array.isArray(result.strengths) ? result.strengths.map(String) : [],
    issues: Array.isArray(result.issues) ? result.issues.map(String) : [],
    rewriteSuggestions: Array.isArray(result.rewriteSuggestions)
      ? result.rewriteSuggestions.map((item) => ({
          section: String(item?.section || "未命名模块"),
          problem: String(item?.problem || ""),
          suggestion: String(item?.suggestion || "")
        }))
      : [],
    projectRewriteExamples: Array.isArray(result.projectRewriteExamples)
      ? result.projectRewriteExamples.map((item) => ({
          before: String(item?.before || ""),
          after: String(item?.after || "")
        }))
      : [],
    structureDiagnosis: Array.isArray(result.structureDiagnosis) ? result.structureDiagnosis.map(String) : [],
    interviewTips: Array.isArray(result.interviewTips) ? result.interviewTips.map(String) : [],
    optimizedResume: String(result.optimizedResume || "")
  };
}

async function requestAiAnalysis({ resumeText, jobDescription }) {
  const apiKey = process.env.AI_API_KEY?.trim();
  const model = process.env.AI_MODEL_NAME?.trim();
  const baseUrl = (process.env.AI_API_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");

  if (!apiKey || !model) {
    return {
      mode: "fallback",
      message: "未检测到 AI 环境变量，已使用本地兜底分析。",
      data: buildFallbackAnalysis({ resumeText, jobDescription })
    };
  }

  const systemPrompt = [
    "你是一名专注校招与应届生求职的简历优化顾问。",
    "你会同时参考简历内容与岗位描述，给出 ATS 匹配评分、关键词缺失分析、项目重写建议和完整优化版简历。",
    "不允许虚构候选人没有提供过的经历、公司、学校、成果或数字。",
    "如果某项信息无法确认，请用建议表达，不要编造。",
    "必须只返回一个合法 JSON 对象，不要输出 Markdown，不要输出代码块。"
  ].join("");

  const userPrompt = `
请基于以下内容生成结构化结果。

岗位描述 JD：
${jobDescription}

候选人简历文本：
${resumeText}

请严格返回一个 JSON 对象，并包含以下字段：
- atsScore: number
- scoreReason: string
- missingKeywords: string[]
- strengths: string[]
- issues: string[]
- rewriteSuggestions: { section: string, problem: string, suggestion: string }[]
- projectRewriteExamples: { before: string, after: string }[]
- structureDiagnosis: string[]
- interviewTips: string[]
- optimizedResume: string

要求：
1. 目标用户是应届生。
2. 输出要能直接用于网页展示。
3. optimizedResume 必须是完整简历内容，而不是摘要。
4. 不要省略任何字段。
  `.trim();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI 接口请求失败：${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("AI 接口返回格式异常，未拿到 message.content。");
  }

  const parsed = extractJsonObject(content);

  return {
    mode: "ai",
    message: "已使用 AI 模型完成分析与改写。",
    data: validateResultShape(parsed)
  };
}

export async function generateResumeAnalysis({ resumeText, jobDescription }) {
  try {
    return await requestAiAnalysis({ resumeText, jobDescription });
  } catch (error) {
    return {
      mode: "fallback",
      message: `AI 调用失败，已回退到本地兜底分析。原因：${error.message}`,
      data: buildFallbackAnalysis({ resumeText, jobDescription })
    };
  }
}
