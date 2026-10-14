import { converter } from "./x2t";

/**
 * 将 PDF 二进制数据利用内置 WebAssembly x2t 引擎解析并转换为可编辑的 DOCX 二进制数据
 * @param pdfData PDF 文件的 ArrayBuffer 或 Uint8Array
 * @returns 转换生成的 DOCX Uint8Array 数据
 */
export async function convertPdfToDocx(
  pdfData: ArrayBuffer | Uint8Array
): Promise<Uint8Array> {
  const buffer =
    pdfData instanceof Uint8Array
      ? pdfData.buffer.slice(
          pdfData.byteOffset,
          pdfData.byteOffset + pdfData.byteLength
        )
      : pdfData;

  const result = await converter.convert({
    data: buffer as ArrayBuffer,
    fileFrom: "document.pdf",
    fileTo: "document.docx",
  });

  if (!result.output || result.output.length === 0) {
    throw new Error("PDF 转换为 Word 失败：引擎未生成有效的输出数据");
  }

  return result.output;
}
