"use client";

import { useEffect, useMemo, useState } from "react";

const loadingSteps = [
  "正在解析简历 PDF",
  "正在分析岗位 JD",
  "正在生成优化建议",
  "正在组织优化版简历"
];

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
            color: #1d1d1f;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
            line-height: 1.7;
          }
          h1, h2 {
            margin: 0 0 12px;
          }
          .summary {
            margin: 20px 0 28px;
            padding: 16px 18px;
            border: 1px solid #d8d8dc;
            border-radius: 12px;
            background: #f5f5f7;
          }
          ul {
            margin: 0;
            padding-left: 20px;
          }
          pre {
            white-space: pre-wrap;
            word-break: break-word;
            border: 1px solid #d8d8dc;
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
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
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
      setSuccess("已打开浏览器打印窗口，你可以选择“另存为 PDF”。");
    } catch (printError) {
      setError(printError.message || "导出失败，请稍后重试。");
    }
  }

  function handleReset() {
    setResumeFile(null);
    setJobDescription("");
    setFileInputKey((current) => current + 1);
    setResult(null);
    setError("");
    setSuccess("");
  }

  return (
    <main className="page-shell">
      <header className="site-header">
        <div className="brand-lockup">
          <div className="brand-mark">Resume</div>
          <span className="brand-accent">AI</span>
        </div>
        <div className="header-note">应届生岗位定向简历优化</div>
      </header>

      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="hero-eyebrow">AI Resume Optimizer</div>
            <h1>让你的第一份简历，更接近面试机会。</h1>
            <p>
              上传 PDF 简历并粘贴岗位描述，系统会生成更贴近目标岗位的分析结果、关键词建议和完整优化版简历，
              帮你更快进入投递状态。
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#workspace">
                开始优化
              </a>
              <span className="hero-support">支持 PDF 简历上传、智能分析与 PDF 导出。</span>
            </div>
          </div>

          <div className="hero-preview">
            <div className="preview-panel">
              <div className="preview-toolbar">
                <span className="preview-dot" />
                <span className="preview-dot" />
                <span className="preview-dot" />
              </div>
              <div className="preview-label">简历优化结果预览</div>
              <div className="preview-score">82</div>
              <div className="preview-caption">ATS 匹配评分</div>
              <div className="preview-list">
                <div className="preview-item">
                  <span>关键词缺失</span>
                  <strong>SQL / 数据分析 / A/B 测试</strong>
                </div>
                <div className="preview-item">
                  <span>重点优化</span>
                  <strong>项目经历重写与量化表达</strong>
                </div>
                <div className="preview-item">
                  <span>输出形式</span>
                  <strong>分析建议 + 完整优化版简历</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="feature-strip">
          <div className="feature-item">
            <strong>ATS 匹配评分</strong>
            <span>快速识别当前简历与目标 JD 的贴合度。</span>
          </div>
          <div className="feature-item">
            <strong>关键词缺失分析</strong>
            <span>找出岗位要求中的重点词并给出补强方向。</span>
          </div>
          <div className="feature-item">
            <strong>完整简历重写</strong>
            <span>生成更适合投递的文本版本，并支持导出 PDF。</span>
          </div>
        </div>
      </section>

      <section id="workspace" className="workspace-grid">
        <form className="card form-card" onSubmit={handleSubmit}>
          <div className="section-eyebrow">Upload & Optimize</div>
          <h2>上传简历并输入目标岗位</h2>
          <p className="section-caption">准备一份文字可复制的 PDF 简历和完整 JD，即可生成针对性的优化结果。</p>

          <div className="field">
            <label htmlFor="resume-upload">PDF 简历</label>
            <input
              key={fileInputKey}
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
                : "建议上传文字可复制的 PDF，便于系统准确解析内容。"}
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
            <div className="field-help">建议尽量保留职责、要求和加分项，分析会更准确。</div>
          </div>

          <div className="button-row">
            <button className="button button-primary" type="submit" disabled={!canSubmit}>
              {loading ? "分析中..." : "开始优化"}
            </button>
            <button className="button button-secondary" type="button" disabled={loading} onClick={handleReset}>
              清空重置
            </button>
          </div>
        </form>

        <aside className="card guidance-card">
          <div className="section-eyebrow">What You Get</div>
          <h2>输出内容一览</h2>
          <div className="guidance-stack">
            <div className="guidance-item">
              <strong>智能诊断</strong>
              <span>查看 ATS 分数、缺失关键词和结构问题，快速确认修改优先级。</span>
            </div>
            <div className="guidance-item">
              <strong>定向改写</strong>
              <span>围绕项目经历、技能表达和量化成果，生成更贴近 JD 的重写建议。</span>
            </div>
            <div className="guidance-item">
              <strong>直接交付</strong>
              <span>得到一版完整优化后的简历文本，可复制、可继续编辑、可导出为 PDF。</span>
            </div>
          </div>
          <div className="detail-panel">
            <h3>使用建议</h3>
            <ul className="list">
              <li>优先上传排版清晰、内容完整的 PDF 简历。</li>
              <li>JD 越完整，生成结果越容易贴近目标岗位。</li>
              <li>投递前请核对最终内容，确保所有表述都与真实经历一致。</li>
            </ul>
          </div>
        </aside>
      </section>

      {(loading || error || success) && (
        <section className="card status-card">
          {loading && (
            <div className="status-box">
              <div className="status-title">{loadingSteps[loadingIndex]}</div>
              <div className="status-meta">系统正在解析 PDF、分析 JD 并生成优化结果，请稍等片刻。</div>
            </div>
          )}
          {!loading && error && <div className="notice notice-error">{error}</div>}
          {!loading && !error && success && <div className="notice notice-success">{success}</div>}
        </section>
      )}

      <section id="result-section" className="card results-shell">
        <div className="results-header">
          <div>
            <div className="section-eyebrow">Results</div>
            <h2>分析结果与优化版简历</h2>
          </div>
          <p className="section-caption">
            {result ? "下面是本次生成的评分、诊断建议和优化后的完整简历。" : "提交简历和 JD 后，结果会展示在这里。"}
          </p>
        </div>

        {!result ? (
          <div className="empty-state">
            <div className="empty-state-title">等待你的简历与岗位描述</div>
            <div className="empty-state-copy">上传一份 PDF 简历并粘贴目标岗位 JD 后，系统会在这里展示完整分析结果。</div>
          </div>
        ) : (
          <div className="results-stack">
            <div className="stats-grid">
              <div className="stat-card stat-card-primary">
                <div className="stat-label">ATS 匹配评分</div>
                <div className="stat-score">{result.atsScore}</div>
                <div className="footer-note">{result.scoreReason}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">优先优化方向</div>
                <div className="stat-headline">{result.issues?.[0] || "补充更清晰的项目成果表达。"}</div>
                <div className="footer-note">
                  缺失关键词 {(result.missingKeywords || []).length} 个，建议优先围绕最相关经历进行补强。
                </div>
              </div>
            </div>

            <div className="list-card keyword-card">
              <h3>缺失关键词</h3>
              <div className="pill-list">
                {(result.missingKeywords || []).length > 0 ? (
                  result.missingKeywords.map((item) => (
                    <span key={item} className="pill">
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="pill">当前未识别出明显缺失项</span>
                )}
              </div>
            </div>

            <div className="results-columns">
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
                  <div className="example-stack">
                    {(result.projectRewriteExamples || []).map((item, index) => (
                      <div key={`${item.before}-${index}`} className="example-card">
                        <div className="example-label">原始表达</div>
                        <p>{item.before}</p>
                        <div className="example-label">优化建议</div>
                        <p>{item.after}</p>
                      </div>
                    ))}
                  </div>
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

            <div className="list-card resume-card">
              <div className="resume-header">
                <div>
                  <h3>优化版完整简历</h3>
                  <div className="footer-note">你可以直接复制文本继续润色，或导出 PDF 用于后续排版。</div>
                </div>
                <div className="button-row">
                  <button className="button button-primary" type="button" onClick={handleCopyResume}>
                    复制优化版简历
                  </button>
                  <button className="button button-secondary" type="button" onClick={handleExportPdf}>
                    导出 PDF
                  </button>
                </div>
              </div>
              <div className="resume-box">{result.optimizedResume}</div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
