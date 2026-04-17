# AI 简历优化助手

一个基于 Next.js 的最小可运行 Web MVP。

## 功能

- 上传 PDF 简历
- 粘贴岗位 JD
- 服务端解析 PDF 文本
- 调用兼容 OpenAI 格式的 AI 接口生成结果
- 未配置 AI API 时，自动使用本地规则引擎兜底，保证流程可运行
- 输出 ATS 匹配评分、关键词缺失、优化建议、项目改写示例、面试建议和优化版完整简历
- 支持复制优化结果
- 支持通过浏览器打印导出 PDF

## 本地启动

1. 安装依赖

```bash
npm install
```

2. 可选：配置 AI 环境变量

```bash
cp .env.example .env.local
```

3. 启动开发环境

```bash
npm run dev
```

4. 打开 [http://localhost:3000](http://localhost:3000)

## 环境变量

- `AI_API_BASE_URL`: 兼容 OpenAI 的接口地址
- `AI_API_KEY`: 服务端 API Key
- `AI_MODEL_NAME`: 模型名称

如果不配置以上变量，系统会走本地兜底分析模式，方便先验证页面与流程。

## 部署

推荐部署到 Vercel：

1. 导入仓库
2. 在项目环境变量中配置 `AI_API_BASE_URL`、`AI_API_KEY`、`AI_MODEL_NAME`
3. 点击部署

## 当前限制

- 当前仅支持文本型 PDF
- 当前不支持扫描版 PDF
- PDF 导出使用浏览器打印能力，便于兼容中文内容

