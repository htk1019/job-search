/**
 * Generate PDF from markdown text using browser print.
 * This properly handles Korean characters.
 */
export function downloadMarkdownAsPdf(markdownText: string, filename: string) {
  // Convert markdown to simple HTML
  let html = markdownText
    // Headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Bullet points
    .replace(/^\* (.*$)/gm, '<li>$1</li>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr/>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  // Wrap consecutive <li> tags in <ul>
  html = html.replace(/(<li>.*?<\/li>(?:<br\/>)?)+/g, (match) => {
    return '<ul>' + match.replace(/<br\/>/g, '') + '</ul>';
  });

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${filename}</title>
<style>
  @page { margin: 20mm; size: A4; }
  body {
    font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #1a1a1a;
    max-width: 170mm;
    margin: 0 auto;
  }
  h1 { font-size: 18pt; margin: 0 0 8pt 0; color: #1a1a1a; border-bottom: 2px solid #4F46E5; padding-bottom: 6pt; }
  h2 { font-size: 14pt; margin: 16pt 0 6pt 0; color: #4F46E5; }
  h3 { font-size: 12pt; margin: 12pt 0 4pt 0; color: #333; }
  p { margin: 4pt 0; }
  strong { font-weight: 700; }
  ul { margin: 4pt 0; padding-left: 20pt; }
  li { margin: 2pt 0; }
  hr { border: none; border-top: 1px solid #ddd; margin: 12pt 0; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<p>${html}</p>
</body>
</html>`;

  // Open print dialog in a new window
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    // Fallback: download as HTML
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace('.pdf', '.html');
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  printWindow.document.write(fullHtml);
  printWindow.document.close();

  // Wait for content to render, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };
}
