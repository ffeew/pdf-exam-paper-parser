import { Mistral } from "@mistralai/mistralai";
import { env } from "@/lib/config/env";
import { getDownloadUrl } from "@/lib/storage";

const mistral = new Mistral({ apiKey: env.MISTRAL_API_KEY });

export interface OcrImage {
  id: string;
  base64: string;
  mimeType: string;
}

export interface OcrPage {
  pageNumber: number;
  markdown: string;
  images: OcrImage[];
}

export interface OcrResult {
  pages: OcrPage[];
  rawJson: string;
}

export async function processDocumentWithOcr(
  fileKey: string
): Promise<OcrResult> {
  // Get a presigned URL for Mistral to access the document
  const documentUrl = await getDownloadUrl(fileKey, 3600);

  const response = await mistral.ocr.process({
    model: "mistral-ocr-latest",
    document: {
      type: "document_url",
      documentUrl: documentUrl,
    },
    includeImageBase64: true,
  });

  const pages: OcrPage[] = (response.pages || []).map((page, index) => ({
    pageNumber: index + 1,
    markdown: page.markdown || "",
    images: (page.images || []).map((img, imgIndex) => ({
      id: `page-${index + 1}-img-${imgIndex + 1}`,
      base64: img.imageBase64 || "",
      mimeType: "image/png", // Default to PNG as Mistral OCR typically returns PNG
    })),
  }));

  return {
    pages,
    rawJson: JSON.stringify(response),
  };
}
