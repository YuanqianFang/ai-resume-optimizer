"use client";

import { useEffect, useMemo, useState } from "react";

const loadingSteps = [
  "正在解析简历 PDF",
  "正在分析岗位 JD",
  "正在生成优化建议",
  "正在组织优化版简历"
];

const initialResult = null;

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function printResumeAsPdf(result) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");

  if (!printWindow) {
    throw new Error("浏览器阻止了新窗口，请允许弹窗后重试。");
  }

  const printableResume = escapeHtml(result.optimizedResume || "");
  const summaryList = [
    `<li><strong>ATS 匹配评分：</strong>${result.atsScore ?? "-"}</li>`,
    `<li><strong>评分说明：</strong>${escapeHtml(result.scoreReason || "-")}</li>`,
    `<li><strong>缺失关键词：</strong>${escapeHtml((result.missingKeywords || []).join("、") || "-")}</li>`
  ].join("");

  printWindow.document.write(`
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <title>优化版简历</title>
        <style>
          body {
            margin: 32px;
            color: #132238;
            font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
            line-height: 1.7;
          }
          h1, h2 {
            margin: 0 0 12px;
          }
          .summary {
            margin: 20px 0 28px;
            padding: 16px 18px;
            border: 1px solid #d9e0ee;
            border-radius: 12px;
            background: #f8fbff;
          }
          ul {
            margin: 0;
            padding-left: 20px;
          }
          pre {
            white-space: pre-wrap;
            word-break: break-word;
            border: 1px solid #d9e0ee;
            border-radius: 12px;
            padding: 18px;
            background: #fff;
            font-family: inherit;
          }
          @media print {
            body {
              margin: 20px;
            }
          }
        </style>
      </head>
      <body>
        <h1>优化版简历</h1>
        <div class="summary">
          <h2>分析摘要</h2>
          <ul>${summaryList}</ul>
        </div>
        <h2>完整简历内容</h2>
        <pre>${printableResume}</pre>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export default function ResumeOptimizerApp() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(initialResult);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loadingIndex, setLoadingIndex] = useState(0);

  useEffect(() => {
    if (!loading) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setLoadingIndex((current) => (current + 1) % loadingSteps.length);
    }, 1400);

    return () => window.clearInterval(timer);
  }, [loading]);

  const canSubmit = useMemo(() => {
    return Boolean(resumeFile) && jobDescription.trim().length > 0 && !loading;
  }, [resumeFile, jobDescription, loading]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setResult(null);
    setMeta(null);
    setLoadingIndex(0);

    if (!resumeFile) {
      setError("请先上传 PDF 简历。");
      return;
    }

    if (!jobDescription.trim()) {
      setError("请先粘贴岗位描述。");
      return;
    }

    const formData = new FormData();
    formData.append("resumeFile", resumeFile);
    formData.append("jobDescription", jobDescription.trim());

    setLoading(true);

    try {
      const response = await fetch("/api/optimize-resume", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || "分析失败，请稍后重试。");
      }

      setResult(payload.data);
      setMeta(payload.meta || null);
      setSuccess("分析完成，已经生成优化建议和完整简历。");

      window.setTimeout(() => {
        document.getElementById("result-section")?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 120);
    } catch (requestError) {
      setError(requestError.message || "分析失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyResume() {
    if (!result?.optimizedResume) {
      return;
    }

    try {
      await navigator.clipboard.writeText(result.optimizedResume);
      setSuccess("优化后的简历内容已复制。");
    } catch (copyError) {
      setError(copyError.message || "复制失败，请手动复制。");
    }
  }

  function handleExportPdf() {
    if (!result) {
      return;
    }

    try {
      printResumeAsPdf(result);
      setSuccess("已打开浏览器打印窗口，可选择“另存为 PDF”。");
    } catch (printError) {
      setError(printError.message || "导出失败，请稍后重试。");
    }
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <h1>AI 简历优化助手</h1>
        <p>
          上传 PDF 简历并粘贴目标岗位 JD，系统会给出 ATS 匹配评分、关键词缺失分析、项目改写建议，
          并生成一版更适合投递的完整简历内容。
        </p>
        <div className="hero-badges">
          <span className="hero-badge">面向应届生</span>
          <span className="hero-badge">支持 PDF 简历</span>
          <span className="hero-badge">无需登录即可体验</span>
          <span className="hero-badge">可导出为 PDF</span>
        </div>
      </section>

      <section className="panel-grid">
        <form className="card" onSubmit={handleSubmit}>
          <h2>开始优化</h2>
          <p className="section-caption">
            第一版以可运行和可部署为主。未配置 AI API 时，会自动使用本地兜底分析，方便先验证流程。
          </p>

          <div className="field">
            <label htmlFor="resume-upload">上传 PDF 简历</label>
            <input
              id="resume-upload"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setResumeFile(file);
              }}
            />
            <div className="field-help">
              {resumeFile
                ? `已选择文件：${resumeFile.name} (${Math.max(1, Math.round(resumeFile.size / 1024))} KB)`
                : "请上传文本型 PDF，扫描版 PDF 可能无法解析。"}
            </div>
          </div>

          <div className="field">
            <label htmlFor="job-description">岗位描述 JD</label>
            <textarea
              id="job-description"
              placeholder="请粘贴完整岗位描述，例如岗位职责、岗位要求、加分项等。"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
            />
            <div className="field-help">
              当前版本仅支持粘贴文本 JD，不支持图片和文件上传。
            </div>
          </div>

          <div className="button-row">
            <button className="button button-primary" type="submit" disabled={!canSubmit}>
              {loading ? "分析中..." : "开始优化"}
            </button>
            <button
              className="button button-secondary"
              type="button"
              disabled={loading}
              onClick={() => {
                setResumeFile(null);
                setJobDescription("");
                setResult(null);
                setMeta(null);
                setError("");
                setSuccess("");
              }}
            >
              清空重置
            </button>
          </div>
        </form>

        <aside className="card">
          <h2>使用说明</h2>
          <div className="stack">
            <div className="list-card">
              <h3>支持内容</h3>
              <ul className="list">
                <li>ATS 匹配评分</li>
                <li>关键词缺失分析</li>
                <li>结构诊断与改写建议</li>
                <li>完整优化版简历</li>
              </ul>
            </div>
            <div className="list-card">
              <h3>建议做法</h3>
              <ul className="list">
                <li>优先上传排版清晰、文字可复制的 PDF 简历。</li>
                <li>JD 尽量完整，包含职责、要求和加分项。</li>
                <li>AI 输出仅作为优化建议，投递前需要自行核对真实性。</li>
              </ul>
            </div>
            <div className="notice notice-info">
              API Key 只应放在服务端环境变量中，不能写进前端代码或仓库。
            </div>
          </div>
        </aside>
      </section>

      {(loading || error || success) && (
        <section className="card" style={{ marginTop: 20 }}>
          {loading && (
            <div className="status-box">
              <div className="status-title">{loadingSteps[loadingIndex]}</div>
              <div className="status-meta">请稍等，系统正在解析 PDF、分析 JD 并生成优化结果。</div>
            </div>
          )}
          {!loading && error && <div className="notice notice-error">{error}</div>}
          {!loading && !error && success && <div className="notice notice-success">{success}</div>}
        </section>
      )}

      <section id="result-section" className="card" style={{ marginTop: 20 }}>
        <h2>分析结果</h2>
        <p className="section-caption">
          {result
            ? "下面是本次生成的评分、问题诊断和优化版简历。"
            : "提交简历和 JD 后，结果会展示在这里。"}
        </p>

        {!result ? (
          <div className="notice notice-info">
            结果区为空。你可以先上传一份 PDF 简历并粘贴目标岗位 JD，再点击“开始优化”。
          </div>
        ) : (
          <div className="stack">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">ATS 匹配评分</div>
                <div className="stat-score">{result.atsScore}</div>
                <div className="footer-note">{result.scoreReason}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">本次生成模式</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>
                  {meta?.mode === "ai" ? "AI 模式" : "本地兜底模式"}
                </div>
                <div className="footer-note">
                  {meta?.message || "未配置 AI API 时，系统会自动使用本地规则生成演示结果。"}
                </div>
              </div>
            </div>

            <div className="list-card">
              <h3>缺失关键词</h3>
              <div className="pill-list">
                {(result.missingKeywords || []).length > 0 ? (
                  result.missingKeywords.map((item) => (
                    <span key={item} className="pill">
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="pill">未识别出明显缺失项</span>
                )}
              </div>
            </div>

            <div className="panel-grid" style={{ marginTop: 0 }}>
              <div className="stack">
                <div className="list-card">
                  <h3>优势总结</h3>
                  <ul className="list">
                    {(result.strengths || []).map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="list-card">
                  <h3>问题诊断</h3>
                  <ul className="list">
                    {(result.issues || []).map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="list-card">
                  <h3>结构诊断</h3>
                  <ul className="list">
                    {(result.structureDiagnosis || []).map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="stack">
                <div className="list-card">
                  <h3>改写建议</h3>
                  <ul className="list">
                    {(result.rewriteSuggestions || []).map((item, index) => (
                      <li key={`${item.section}-${index}`}>
                        <strong>{item.section}</strong>：{item.problem}。建议：{item.suggestion}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="list-card">
                  <h3>项目经历优化示例</h3>
                  <ul className="list">
                    {(result.projectRewriteExamples || []).map((item, index) => (
                      <li key={`${item.before}-${index}`}>
                        <strong>原始：</strong>
                        {item.before}
                        <br />
                        <strong>建议：</strong>
                        {item.after}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="list-card">
                  <h3>面试建议</h3>
                  <ul className="list">
                    {(result.interviewTips || []).map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="list-card">
              <h3>优化版完整简历</h3>
              <div className="resume-box">{result.optimizedResume}</div>
              <div className="button-row" style={{ marginTop: 16 }}>
                <button className="button button-primary" type="button" onClick={handleCopyResume}>
                  复制优化版简历
                </button>
                <button className="button button-secondary" type="button" onClick={handleExportPdf}>
                  导出 PDF
                </button>
              </div>
              <div className="footer-note">导出 PDF 会调用浏览器打印窗口，你可以选择“另存为 PDF”。</div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
