import type { OcrPage } from "./ocr";

// Types for structural parsing output
export interface StructuralQuestion {
  questionNumber: string;
  questionText: string;
  pageNumber: number;
  marks: number | null;
  section: string | null;
  instructions: string | null;
  options: { label: string; text: string }[] | null;
  // Images that appear within this question's boundaries (by position)
  nearbyImageIds: string[];
  // Line range in the full document (for debugging)
  startLine: number;
  endLine: number;
}

export interface ImagePosition {
  imageId: string;
  pageNumber: number;
  lineNumber: number; // Line number within the full document
}

export interface StructuralResult {
  questions: StructuralQuestion[];
  metadata: {
    totalMarks: number | null;
    possibleSubject: string | null;
    possibleGrade: string | null;
    possibleSchool: string | null;
  };
  imagePositions: ImagePosition[];
  fullDocument: string; // Combined markdown for LLM context
}

// Regex patterns for Singapore primary school exams
const QUESTION_PATTERNS = [
  // "1. ", "2. ", "10. " - most common
  /^(\d{1,2})\.\s+/m,
  // "1) ", "2) "
  /^(\d{1,2})\)\s+/m,
  // "Q1.", "Q2."
  /^Q(\d{1,2})[\.\s]+/im,
  // "1a)", "2b)", "3c)"
  /^(\d{1,2})([a-z])\)\s*/m,
  // "1(a)", "2(b)"
  /^(\d{1,2})\s*\(([a-z])\)\s*/m,
  // "1(i)", "2(ii)"
  /^(\d{1,2})\s*\(([ivx]+)\)\s*/im,
];

const MARKS_PATTERNS = [
  /\((\d+)\s*marks?\)/i, // "(2 marks)", "(1 mark)"
  /\[(\d+)\]/, // "[2]", "[3]"
  /\((\d+)\s*m\)/i, // "(2m)"
  /(\d+)\s*marks?\s*$/i, // "2 marks" at end of line
];

const SECTION_PATTERN = /^(?:section|part)\s+([a-z0-9]+)/im;

const MCQ_OPTION_PATTERNS = [
  /^([A-D])\.\s+(.+)$/gm, // "A. option text"
  /^([A-D])\)\s+(.+)$/gm, // "A) option text"
  /^\(([A-D])\)\s+(.+)$/gm, // "(A) option text"
];

const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g;

const TOTAL_MARKS_PATTERNS = [
  /total\s*(?:marks?)?\s*[:\-]?\s*(\d+)/i,
  /(\d+)\s*marks?\s*$/im,
  /\/\s*(\d+)\s*$/m, // "/100" at end
];

const SUBJECT_PATTERNS = [
  /\b(mathematics?|maths?)\b/i,
  /\b(english)\b/i,
  /\b(chinese|华文)\b/i,
  /\b(science)\b/i,
  /\b(malay|bahasa)\b/i,
  /\b(tamil)\b/i,
];

const GRADE_PATTERNS = [
  /\b(?:primary|p)\s*(\d)\b/i, // "Primary 4", "P4"
  /\b(?:grade|g)\s*(\d)\b/i, // "Grade 4", "G4"
];

/**
 * Parse OCR pages into structured data using regex patterns.
 * This extracts everything that can be reliably determined without LLM.
 */
export function parseStructure(pages: OcrPage[]): StructuralResult {
  // Build full document with page markers and track line offsets
  const pageLineOffsets: Map<number, number> = new Map();
  let currentLine = 0;
  const documentLines: string[] = [];

  for (const page of pages) {
    pageLineOffsets.set(page.pageNumber, currentLine);
    const pageHeader = `--- Page ${page.pageNumber} ---`;
    documentLines.push(pageHeader);
    currentLine++;

    const pageLines = page.markdown.split("\n");
    documentLines.push(...pageLines);
    currentLine += pageLines.length;
  }

  const fullDocument = documentLines.join("\n");

  // Extract image positions
  const imagePositions = extractImagePositions(pages, pageLineOffsets);

  // Find question boundaries
  const questionBoundaries = findQuestionBoundaries(documentLines);

  // Extract metadata from first page (usually contains header info)
  const metadata = extractMetadata(pages[0]?.markdown || "");

  // Build structured questions
  const questions = buildStructuralQuestions(
    documentLines,
    questionBoundaries,
    imagePositions,
    pages
  );

  return {
    questions,
    metadata,
    imagePositions,
    fullDocument,
  };
}

interface QuestionBoundary {
  questionNumber: string;
  startLine: number;
  pageNumber: number;
}

function findQuestionBoundaries(lines: string[]): QuestionBoundary[] {
  const boundaries: QuestionBoundary[] = [];
  let currentPage = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Track page changes
    const pageMatch = line.match(/^---\s*Page\s+(\d+)\s*---$/);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1], 10);
      continue;
    }

    // Try each question pattern
    for (const pattern of QUESTION_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        // Build question number from match groups
        let questionNumber = match[1];
        if (match[2]) {
          questionNumber += match[2]; // For "2a", "3(i)" etc
        }

        // Avoid false positives: skip if this looks like a list item or date
        if (isLikelyQuestionNumber(line, questionNumber)) {
          boundaries.push({
            questionNumber,
            startLine: i,
            pageNumber: currentPage,
          });
        }
        break;
      }
    }
  }

  return boundaries;
}

function isLikelyQuestionNumber(line: string, num: string): boolean {
  // Filter out false positives
  const lineUpper = line.toUpperCase();

  // Skip if it's clearly metadata/header
  if (
    lineUpper.includes("DATE:") ||
    lineUpper.includes("NAME:") ||
    lineUpper.includes("CLASS:") ||
    lineUpper.includes("TOTAL:")
  ) {
    return false;
  }

  // Skip if it's a year (like "2024")
  if (/^20\d{2}/.test(num)) {
    return false;
  }

  // Skip if the line is very short (likely not a question)
  if (line.length < 5) {
    return false;
  }

  return true;
}

function extractImagePositions(
  pages: OcrPage[],
  pageLineOffsets: Map<number, number>
): ImagePosition[] {
  const positions: ImagePosition[] = [];

  for (const page of pages) {
    const baseLineOffset = pageLineOffsets.get(page.pageNumber) || 0;
    const lines = page.markdown.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match;
      IMAGE_PATTERN.lastIndex = 0;

      while ((match = IMAGE_PATTERN.exec(line)) !== null) {
        const imageId = match[2]; // The src part: "img-0.jpeg"
        positions.push({
          imageId,
          pageNumber: page.pageNumber,
          lineNumber: baseLineOffset + 1 + i, // +1 for page header line
        });
      }
    }
  }

  return positions;
}

function extractMetadata(firstPageMarkdown: string): StructuralResult["metadata"] {
  let totalMarks: number | null = null;
  let possibleSubject: string | null = null;
  let possibleGrade: string | null = null;
  let possibleSchool: string | null = null;

  // Extract total marks
  for (const pattern of TOTAL_MARKS_PATTERNS) {
    const match = firstPageMarkdown.match(pattern);
    if (match) {
      totalMarks = parseInt(match[1], 10);
      break;
    }
  }

  // Extract subject
  for (const pattern of SUBJECT_PATTERNS) {
    const match = firstPageMarkdown.match(pattern);
    if (match) {
      const subjectMap: Record<string, string> = {
        mathematics: "Math",
        maths: "Math",
        math: "Math",
        english: "English",
        chinese: "Chinese",
        华文: "Chinese",
        science: "Science",
        malay: "Malay",
        bahasa: "Malay",
        tamil: "Tamil",
      };
      possibleSubject = subjectMap[match[1].toLowerCase()] || match[1];
      break;
    }
  }

  // Extract grade
  for (const pattern of GRADE_PATTERNS) {
    const match = firstPageMarkdown.match(pattern);
    if (match) {
      possibleGrade = `Primary ${match[1]}`;
      break;
    }
  }

  // Try to extract school name (usually in the header)
  const schoolMatch = firstPageMarkdown.match(
    /^#*\s*([A-Z][A-Za-z\s]+(?:School|Academy|Institute))/m
  );
  if (schoolMatch) {
    possibleSchool = schoolMatch[1].trim();
  }

  return { totalMarks, possibleSubject, possibleGrade, possibleSchool };
}

function buildStructuralQuestions(
  lines: string[],
  boundaries: QuestionBoundary[],
  imagePositions: ImagePosition[],
  pages: OcrPage[]
): StructuralQuestion[] {
  const questions: StructuralQuestion[] = [];

  // Track current section
  let currentSection: string | null = null;

  for (let i = 0; i < boundaries.length; i++) {
    const boundary = boundaries[i];
    const nextBoundary = boundaries[i + 1];

    // Question text spans from this boundary to the next (or end of document)
    const endLine = nextBoundary ? nextBoundary.startLine : lines.length;
    const questionLines = lines.slice(boundary.startLine, endLine);
    const questionText = questionLines.join("\n").trim();

    // Check for section header before this question
    const sectionMatch = questionText.match(SECTION_PATTERN);
    if (sectionMatch) {
      currentSection = `Section ${sectionMatch[1].toUpperCase()}`;
    }

    // Extract marks
    const marks = extractMarks(questionText);

    // Extract MCQ options
    const options = extractMcqOptions(questionText);

    // Find images within this question's line range
    const nearbyImageIds = imagePositions
      .filter(
        (img) =>
          img.lineNumber >= boundary.startLine && img.lineNumber < endLine
      )
      .map((img) => img.imageId);

    // Clean question text (remove image markdown, marks indicators)
    const cleanedText = cleanQuestionText(questionText);

    questions.push({
      questionNumber: boundary.questionNumber,
      questionText: cleanedText,
      pageNumber: boundary.pageNumber,
      marks,
      section: currentSection,
      instructions: null, // Could be extracted with more patterns
      options,
      nearbyImageIds,
      startLine: boundary.startLine,
      endLine,
    });
  }

  return questions;
}

function extractMarks(text: string): number | null {
  for (const pattern of MARKS_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return null;
}

function extractMcqOptions(
  text: string
): { label: string; text: string }[] | null {
  const options: { label: string; text: string }[] = [];

  for (const pattern of MCQ_OPTION_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const label = match[1];
      const optionText = match[2].trim();

      // Avoid duplicates
      if (!options.some((o) => o.label === label)) {
        options.push({ label, text: optionText });
      }
    }
  }

  // Only return if we found at least 2 options (A, B minimum for MCQ)
  if (options.length >= 2) {
    // Sort by label
    options.sort((a, b) => a.label.localeCompare(b.label));
    return options;
  }

  return null;
}

function cleanQuestionText(text: string): string {
  return (
    text
      // Remove image markdown
      .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
      // Remove marks indicators
      .replace(/\(\d+\s*marks?\)/gi, "")
      .replace(/\[\d+\]/g, "")
      // Remove page markers
      .replace(/^---\s*Page\s+\d+\s*---$/gm, "")
      // Remove MCQ options (they're stored separately)
      .replace(/^[A-D][\.\)]\s+.+$/gm, "")
      .replace(/^\([A-D]\)\s+.+$/gm, "")
      // Clean up extra whitespace
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}
