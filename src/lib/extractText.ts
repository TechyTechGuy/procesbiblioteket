import mammoth from "mammoth";

export async function extractFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return (result.value ?? "").trim();
}

export async function extractFromPdf(file: File): Promise<string> {
  // Dynamic import so pdfjs is only loaded when needed
  const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");
  // Use a CDN worker to avoid bundler config; matches installed version
  const version = pdfjs.version;
  pdfjs.GlobalWorkerOptions.workerSrc =
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ");
    parts.push(text);
  }
  return parts.join("\n\n").trim();
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractFromPdf(file);
  }
  if (name.endsWith(".docx")) {
    return extractFromDocx(file);
  }
  throw new Error("Filtypen understøttes ikke (kun .pdf og .docx)");
}