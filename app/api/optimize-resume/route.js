import pdf from "pdf-parse";
import { generateResumeAnalysis } from "../../../lib/ai-analysis";
import { normalizeWhitespace } from "../../../lib/resume-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(code, message, status) {
  return Response.json(
    {
      success: false,
      error: {
        code,
        message
      }
    },
    { status }
  );
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const resumeFile = formData.get("resumeFile");
    const jobDescription = String(formData.get("jobDescription") || "").trim();

    if (!resumeFile || typeof resumeFile === "string") {
      return jsonError("INVALID_FILE", "请上传 PDF 简历文件。", 400);
    }

    if (!resumeFile.name?.toLowerCase().endsWith(".pdf")) {
      return jsonError("INVALID_FILE_TYPE", "当前仅支持 PDF 文件。", 400);
    }

    if (!jobDescription) {
      return jsonError("EMPTY_JOB_DESCRIPTION", "岗位描述不能为空。", 400);
    }

    if (resumeFile.size > 10 * 1024 * 1024) {
      return jsonError("FILE_TOO_LARGE", "PDF 文件不能超过 10MB。", 400);
    }

    const buffer = Buffer.from(await resumeFile.arrayBuffer());
    const parsed = await pdf(buffer);
    const resumeText = normalizeWhitespace(parsed.text || "");

    if (!resumeText || resumeText.length < 80) {
      return jsonError("PDF_PARSE_FAILED", "简历解析失败，请上传文本型 PDF 文件。", 400);
    }

    const analysis = await generateResumeAnalysis({
      resumeText,
      jobDescription
    });

    return Response.json({
      success: true,
      data: analysis.data,
      meta: {
        mode: analysis.mode,
        message: analysis.message
      }
    });
  } catch (error) {
    return jsonError("INTERNAL_ERROR", error.message || "服务异常，请稍后重试。", 500);
  }
}
