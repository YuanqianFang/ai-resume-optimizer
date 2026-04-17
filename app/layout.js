import "./globals.css";

export const metadata = {
  title: "AI 简历优化助手",
  description: "上传 PDF 简历和岗位 JD，快速获得优化建议和完整简历版本。"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
