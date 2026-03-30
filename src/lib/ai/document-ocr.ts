import { openai } from "@/lib/openai";

export interface OcrResult {
  name: string | null;
  documentNumber: string | null;
  dob: string | null;
  documentType: "AADHAAR" | "PAN" | "UNKNOWN";
  rawText: string;
}

const OCR_PROMPT = `You are a document OCR specialist. Analyze the uploaded Indian government ID document image and extract:

1. Full name as printed on the document
2. Document number (Aadhaar: 12 digits, PAN: 10 alphanumeric)
3. Date of birth if visible
4. Document type (AADHAAR or PAN)

Return ONLY valid JSON with this exact structure:
{"name": "string or null", "documentNumber": "string or null", "dob": "DD/MM/YYYY or null", "documentType": "AADHAAR|PAN|UNKNOWN", "rawText": "all visible text"}

If you cannot read the document clearly, still attempt extraction and note issues in rawText.`;

export async function extractDocumentData(imageUrl: string): Promise<OcrResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 500,
      messages: [
        { role: "system", content: OCR_PROMPT },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
            { type: "text", text: "Extract all information from this ID document." },
          ],
        },
      ],
    });

    const content = res.choices[0]?.message?.content?.trim();
    if (!content) {
      return { name: null, documentNumber: null, dob: null, documentType: "UNKNOWN", rawText: "No response from OCR" };
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { name: null, documentNumber: null, dob: null, documentType: "UNKNOWN", rawText: content };
    }

    const parsed = JSON.parse(jsonMatch[0]) as OcrResult;
    return {
      name: parsed.name || null,
      documentNumber: parsed.documentNumber || null,
      dob: parsed.dob || null,
      documentType: ["AADHAAR", "PAN"].includes(parsed.documentType) ? parsed.documentType : "UNKNOWN",
      rawText: parsed.rawText || "",
    };
  } catch (e) {
    console.error("Document OCR failed:", e);
    throw new Error("OCR extraction failed");
  }
}
