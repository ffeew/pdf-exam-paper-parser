import { generateText, Output } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import { env } from "@/lib/config/env";
import type { OcrImage } from "./ocr";

const groq = createGroq({
  apiKey: env.GROQ_API_KEY,
});

const ClassificationSchema = z.object({
  classification: z
    .enum(["content", "administrative"])
    .describe("Whether the image is exam content or administrative"),
  confidence: z
    .enum(["low", "medium", "high"])
    .describe("Confidence level of the classification"),
  reason: z.string().describe("Brief explanation for the classification"),
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
  // 2. Small images (<5% of page) in bottom corners are likely score boxes
  // 3. Images in the top margin with small height are likely headers

  const isInBottomRight = relativeX > 0.7 && relativeY > 0.8;
  const isInBottomLeft =
    image.topLeftX / image.pageWidth < 0.3 && relativeY > 0.8;
  const isInTopArea = relativeTopY < 0.15;
  const isSmall = relativeArea < 0.05; // Less than 5% of page
  const isVerySmall = relativeArea < 0.01; // Less than 1% of page

  // Very small images are likely decorative
  if (isVerySmall) {
    return {
      imageId: image.id,
      classification: "administrative",
      confidence: "high",
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
 * Extracts surrounding text context for an image from the page markdown.
 * Returns ~200 chars before and after the image reference.
 */
export function extractSurroundingContext(
  markdown: string,
  imageId: string,
  contextChars: number = 200
): string | null {
  // Find the image reference in the markdown
  const imagePattern = new RegExp(`!?\\[[^\\]]*\\]\\(${imageId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`);
  const match = markdown.match(imagePattern);

  if (!match || match.index === undefined) {
    return null;
  }

  const start = Math.max(0, match.index - contextChars);
  const end = Math.min(markdown.length, match.index + match[0].length + contextChars);

  let context = markdown.slice(start, end);

  // Add ellipsis if truncated
  if (start > 0) context = "..." + context;
  if (end < markdown.length) context = context + "...";

  return context;
}

/**
 * Classifies an image using a vision LLM (llama-4-maverick).
 * Use this for uncertain cases where position heuristics are not confident.
 */
export async function classifyWithVisionLLM(
  image: OcrImage,
  surroundingContext?: string | null
): Promise<ImageClassification> {
  if (!image.base64) {
    return {
      imageId: image.id,
      classification: "administrative",
      confidence: "low",
      reason: "No image data available",
    };
  }

  const contextSection = surroundingContext
    ? `\n\nSURROUNDING TEXT CONTEXT (where this image appears in the document):\n${surroundingContext}`
    : "";

  try {
    const { output } = await generateText({
      model: groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
      system: `You are an image classifier for Singapore school exam papers. Your task is to determine whether an image is educational content that students need for answering questions, or administrative/decorative elements that should be filtered out.

Be conservative: when in doubt, classify as "content" to avoid removing important educational material.`,
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
              text: `Classify this image.

CONTENT - Images students need for questions:
- Diagrams, figures, charts, graphs
- Illustrations referenced by questions
- Reading passages, notices, flyers
- Mathematical figures or shapes
- Pictures to analyze

ADMINISTRATIVE - Non-educational images:
- Score tally boxes or marking grids
- School logos or emblems
- Watermarks, headers, footers
- Decorative borders
- QR codes or barcodes

This is the context where the image appears in the document:
${contextSection}
`,
            },
          ],
        },
      ],
      output: Output.object({ schema: ClassificationSchema }),
      temperature: 0.1,
      maxRetries: 2,
    });

    if (output) {
      return {
        imageId: image.id,
        classification: output.classification,
        confidence: output.confidence,
        reason: output.reason,
      };
    }

    // If output is null, fall back to position-based
    return classifyByPosition(image);
  } catch (error) {
    console.error(`Vision LLM classification failed for ${image.id}:`, error);
    // Fall back to position-based classification on error
    return classifyByPosition(image);
  }
}
