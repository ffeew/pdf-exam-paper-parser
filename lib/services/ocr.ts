import { Mistral } from "@mistralai/mistralai";
import { env } from "@/lib/config/env";
import { getDownloadUrl } from "@/lib/storage";

const mistral = new Mistral({ apiKey: env.MISTRAL_API_KEY });

export interface OcrImage {
  id: string;
  base64: string;
  mimeType: string;
  pageNumber: number;
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
    images: (page.images || []).map((img) => {
      // Mistral returns base64 with data URL prefix: "data:image/jpeg;base64,..."
      // Strip the prefix to get just the base64 data
      let base64Data = img.imageBase64 || "";
      const dataUrlMatch = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      let mimeType = "image/jpeg";

      if (dataUrlMatch) {
        mimeType = dataUrlMatch[1];
        base64Data = dataUrlMatch[2];
      }

      return {
        // Use Mistral's actual image ID (e.g., "img-0.jpeg")
        id: img.id || `page-${index + 1}-img-unknown`,
        base64: base64Data,
        mimeType,
        pageNumber: index + 1,
      };
    }),
  }));

  return {
    pages,
    rawJson: JSON.stringify(response),
  };
}
