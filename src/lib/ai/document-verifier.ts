import { prisma } from "@/lib/prisma";
import { extractDocumentData, OcrResult } from "./document-ocr";

interface VerificationResult {
  extractedName: string | null;
  extractedNumber: string | null;
  nameMatch: boolean;
  formatValid: boolean;
  status: "VERIFIED" | "MISMATCH" | "INVALID_FORMAT" | "FAILED";
  details: string;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function nameSimilarity(a: string, b: string): number {
  const normA = a.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  const normB = b.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  if (normA === normB) return 1;
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 0;
  const dist = levenshteinDistance(normA, normB);
  return 1 - dist / maxLen;
}

function validateAadhaar(number: string): boolean {
  const digits = number.replace(/\s/g, "");
  return /^\d{12}$/.test(digits);
}

function validatePAN(number: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(number.toUpperCase());
}

function verifyExtraction(
  ocr: OcrResult,
  internName: string,
  expectedType: string
): VerificationResult {
  const nameMatchScore = ocr.name ? nameSimilarity(ocr.name, internName) : 0;
  const nameMatch = nameMatchScore >= 0.7;

  let formatValid = false;
  if (expectedType === "AADHAAR" && ocr.documentNumber) {
    formatValid = validateAadhaar(ocr.documentNumber);
  } else if (expectedType === "PAN" && ocr.documentNumber) {
    formatValid = validatePAN(ocr.documentNumber);
  }

  const details: string[] = [];
  if (!nameMatch) {
    details.push(`Name mismatch: "${ocr.name}" vs "${internName}" (similarity: ${(nameMatchScore * 100).toFixed(0)}%)`);
  }
  if (!formatValid && ocr.documentNumber) {
    details.push(`Invalid ${expectedType} format: "${ocr.documentNumber}"`);
  }
  if (!ocr.documentNumber) {
    details.push("Could not extract document number");
  }

  let status: VerificationResult["status"];
  if (nameMatch && formatValid) {
    status = "VERIFIED";
  } else if (!formatValid) {
    status = "INVALID_FORMAT";
  } else {
    status = "MISMATCH";
  }

  return {
    extractedName: ocr.name,
    extractedNumber: ocr.documentNumber,
    nameMatch,
    formatValid,
    status,
    details: details.length > 0 ? details.join("; ") : "All checks passed",
  };
}

export async function verifyDocument(
  internId: string,
  documentType: "AADHAAR" | "PAN",
  documentUrl: string
): Promise<{ verificationId: string; result: VerificationResult }> {
  const intern = await prisma.intern.findUnique({
    where: { id: internId },
    select: { name: true },
  });

  if (!intern) throw new Error("Intern not found");

  const verification = await prisma.documentVerification.create({
    data: {
      internId,
      documentType,
      documentUrl,
      status: "PROCESSING",
    },
  });

  try {
    const ocr = await extractDocumentData(documentUrl);
    const result = verifyExtraction(ocr, intern.name, documentType);

    await prisma.documentVerification.update({
      where: { id: verification.id },
      data: {
        extractedName: result.extractedName,
        extractedNumber: result.extractedNumber,
        nameMatch: result.nameMatch,
        formatValid: result.formatValid,
        status: result.status,
        reviewNote: result.details,
        verifiedAt: result.status === "VERIFIED" ? new Date() : null,
      },
    });

    return { verificationId: verification.id, result };
  } catch (e) {
    await prisma.documentVerification.update({
      where: { id: verification.id },
      data: {
        status: "FAILED",
        reviewNote: e instanceof Error ? e.message : "OCR extraction failed",
      },
    });

    return {
      verificationId: verification.id,
      result: {
        extractedName: null,
        extractedNumber: null,
        nameMatch: false,
        formatValid: false,
        status: "FAILED",
        details: e instanceof Error ? e.message : "OCR extraction failed",
      },
    };
  }
}
