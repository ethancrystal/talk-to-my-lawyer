export type SupportedDocumentFileType = "pdf" | "docx" | "txt";

export class DocumentTextExtractionError extends Error {
  constructor(
    message: string,
    public readonly reason: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "DocumentTextExtractionError";
  }
}

function normalizeBase64Payload(fileBase64: string): string {
  const trimmed = fileBase64.trim();
  const commaIndex = trimmed.indexOf(",");
  const payload =
    trimmed.startsWith("data:") && commaIndex >= 0
      ? trimmed.slice(commaIndex + 1)
      : trimmed;

  return payload.replace(/\s/g, "");
}

export function decodeDocumentBase64(fileBase64: string): Buffer {
  const payload = normalizeBase64Payload(fileBase64);
  if (!payload) {
    throw new DocumentTextExtractionError(
      "The uploaded file did not include any readable data.",
      "empty_base64"
    );
  }

  try {
    return Buffer.from(payload, "base64");
  } catch (err) {
    throw new DocumentTextExtractionError(
      "The uploaded file could not be decoded.",
      "invalid_base64",
      { cause: err }
    );
  }
}

function assertExpectedFileSignature(
  fileType: SupportedDocumentFileType,
  fileBuffer: Buffer
): void {
  if (fileBuffer.byteLength === 0) {
    throw new DocumentTextExtractionError(
      "The uploaded file is empty.",
      "empty_file"
    );
  }

  if (
    fileType === "pdf" &&
    !fileBuffer.subarray(0, 5).equals(Buffer.from("%PDF-"))
  ) {
    throw new DocumentTextExtractionError(
      "The uploaded file is not a valid PDF.",
      "invalid_pdf_signature"
    );
  }

  if (
    fileType === "docx" &&
    !fileBuffer.subarray(0, 2).equals(Buffer.from("PK"))
  ) {
    throw new DocumentTextExtractionError(
      "The uploaded file is not a valid DOCX file.",
      "invalid_docx_signature"
    );
  }
}

export async function extractDocumentText(input: {
  fileBase64: string;
  fileType: SupportedDocumentFileType;
  fileBuffer?: Buffer;
}): Promise<{ fileBuffer: Buffer; text: string }> {
  const fileBuffer = input.fileBuffer ?? decodeDocumentBase64(input.fileBase64);
  assertExpectedFileSignature(input.fileType, fileBuffer);

  try {
    if (input.fileType === "pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: fileBuffer });
      try {
        const pdfData = await parser.getText();
        return { fileBuffer, text: pdfData.text };
      } finally {
        await parser.destroy();
      }
    }

    if (input.fileType === "docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return { fileBuffer, text: result.value };
    }

    return { fileBuffer, text: fileBuffer.toString("utf-8") };
  } catch (err) {
    if (err instanceof DocumentTextExtractionError) throw err;
    throw new DocumentTextExtractionError(
      "Could not extract text from the document.",
      `${input.fileType}_parser_failed`,
      { cause: err }
    );
  }
}
