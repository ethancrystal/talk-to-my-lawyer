import { describe, expect, it } from "vitest";
import {
  DocumentTextExtractionError,
  decodeDocumentBase64,
  extractDocumentText,
} from "./documentTextExtractor";

const samplePdf = `%PDF-1.1
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 24 Tf 100 100 Td (Hello PDF text) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000241 00000 n 
0000000335 00000 n 
trailer
<< /Root 1 0 R /Size 6 >>
startxref
405
%%EOF`;

describe("documentTextExtractor", () => {
  it("accepts raw base64 text payloads", async () => {
    const fileBase64 = Buffer.from("This is readable plain text.").toString("base64");

    const result = await extractDocumentText({ fileBase64, fileType: "txt" });

    expect(result.text).toBe("This is readable plain text.");
  });

  it("accepts browser data URLs as well as raw base64", () => {
    const fileBase64 =
      "data:text/plain;base64," +
      Buffer.from("This was uploaded from FileReader.").toString("base64");

    expect(decodeDocumentBase64(fileBase64).toString("utf-8")).toBe(
      "This was uploaded from FileReader."
    );
  });

  it("extracts text from valid PDF buffers", async () => {
    const fileBase64 = Buffer.from(samplePdf).toString("base64");

    const result = await extractDocumentText({ fileBase64, fileType: "pdf" });

    expect(result.text).toContain("Hello PDF text");
  });

  it("rejects files whose contents do not match the claimed type", async () => {
    const fileBase64 = Buffer.from("not actually a pdf").toString("base64");

    await expect(
      extractDocumentText({ fileBase64, fileType: "pdf" })
    ).rejects.toMatchObject<DocumentTextExtractionError>({
      reason: "invalid_pdf_signature",
    });
  });
});
