import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { env } from "@/lib/config/env";
import type { OcrImage } from "./ocr";

const groq = createGroq({
  apiKey: env.GROQ_API_KEY,
});

export interface ImageClassification {
  imageId: string;
  classification: "content" | "administrative";
  confidence: "low" | "medium" | "high";
  reason: string;
}

/**
 * Classifies an image using position-based heuristics.
 * Administrative images (score boxes, logos) tend to be:
 * - Small relative to page size
 * - Located in corners or margins
 */
export function classifyByPosition(image: OcrImage): ImageClassification {
  // Calculate relative position (0-1 scale)
  const relativeX = image.bottomRightX / image.pageWidth;
  const relativeY = image.bottomRightY / image.pageHeight;
  const relativeTopY = image.topLeftY / image.pageHeight;

  // Calculate image size relative to page
  const imageWidth = image.bottomRightX - image.topLeftX;
  const imageHeight = image.bottomRightY - image.topLeftY;
  const relativeArea =
    (imageWidth * imageHeight) / (image.pageWidth * image.pageHeight);

  // Heuristics for administrative images:
  // 1. Very small images (<1% of page) are likely logos/icons
  // 2. Small images (<3% of page) in bottom corners are likely score boxes
  // 3. Images in the top margin with small height are likely headers

  const isInBottomRight = relativeX > 0.7 && relativeY > 0.8;
  const isInBottomLeft =
    image.topLeftX / image.pageWidth < 0.3 && relativeY > 0.8;
  const isInTopArea = relativeTopY < 0.15;
  const isSmall = relativeArea < 0.03; // Less than 3% of page
  const isVerySmall = relativeArea < 0.01; // Less than 1% of page

  // Very small images are likely decorative
  if (isVerySmall) {
    return {
      imageId: image.id,
      classification: "administrative",
      confidence: "medium",
      reason: "Very small image (likely logo or icon)",
    };
  }

  // Small images in bottom corners are likely score tally boxes
  if ((isInBottomRight || isInBottomLeft) && isSmall) {
    return {
      imageId: image.id,
      classification: "administrative",
      confidence: "high",
      reason: "Small image in page corner (likely score box)",
    };
  }

  // Small images at the very top might be headers/watermarks
  if (isInTopArea && isSmall && relativeTopY < 0.05) {
    return {
      imageId: image.id,
      classification: "administrative",
      confidence: "medium",
      reason: "Small image in top margin (likely header)",
    };
  }

  // Default: treat as content
  return {
    imageId: image.id,
    classification: "content",
    confidence: "high",
    reason: "Normal position and size",
  };
}

/**
 * Classifies an image using a vision LLM (llama-4-maverick).
 * Use this for uncertain cases where position heuristics are not confident.
 */
export async function classifyWithVisionLLM(
  image: OcrImage
): Promise<ImageClassification> {
  if (!image.base64) {
    return {
      imageId: image.id,
      classification: "administrative",
      confidence: "low",
      reason: "No image data available",
    };
  }

  try {
    const { text } = await generateText({
      model: groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: `data:${image.mimeType};base64,${image.base64}`,
            },
            {
              type: "text",
              text: `Classify this image from an exam paper into one of two categories:

1. CONTENT - Images that are part of exam questions:
   - Diagrams, figures, charts, graphs
   - Illustrations for questions
   - Maps, tables with data
   - Mathematical figures or shapes
   - Pictures that students need to analyze

2. ADMINISTRATIVE - Images that are NOT part of questions:
   - Score tally boxes or marking grids
   - School logos or emblems
   - Watermarks
   - Page headers or footers
   - Decorative borders or elements
   - QR codes or barcodes

Respond with ONLY a JSON object in this exact format:
{"classification": "content" | "administrative", "confidence": "low" | "medium" | "high", "reason": "brief explanation"}`,
            },
          ],
        },
      ],
      temperature: 0.1,
      maxRetries: 2,
    });

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const validConfidences = ["low", "medium", "high"] as const;
      const confidence = validConfidences.includes(parsed.confidence)
        ? (parsed.confidence as "low" | "medium" | "high")
        : "medium";
      return {
        imageId: image.id,
        classification: parsed.classification === "content" ? "content" : "administrative",
        confidence,
        reason: parsed.reason || "Vision LLM classification",
      };
    }

    // If parsing fails, fall back to position-based
    return classifyByPosition(image);
  } catch (error) {
    console.error(`Vision LLM classification failed for ${image.id}:`, error);
    // Fall back to position-based classification on error
    return classifyByPosition(image);
  }
}
