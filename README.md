# PDF Exam Paper Parser

A full-stack application that parses PDF exam papers into interactive web-based exams with AI tutoring assistance.

## Features

- **PDF Upload & Parsing**: Upload exam papers in PDF format for automatic content extraction
- **OCR Processing**: Uses Mistral OCR to extract text, images, and structure from PDFs
- **Structured Exam View**: Renders questions with proper formatting, LaTeX math support, and images
- **Interactive Answers**: MCQ radio buttons, fill-in-the-blank inputs, short/long answer text areas
- **Auto-Save**: Answers persist automatically as you type (debounced) or select options
- **LLM Grading**: AI-powered answer evaluation with scores and detailed feedback
- **AI Tutor**: Ask questions about specific exam problems with context-aware AI assistance
- **Answer Reveal**: Show correct answers for self-study and review

## Key Implementation Details

### File Hashing & Deduplication

- SHA-256 hash computed client-side before upload
- Checks for existing exams with same hash (per user)
- Prevents duplicate processing and wasted API costs
- Race condition handling during upload confirmation

### Multi-Stage Processing Pipeline

Four-stage async pipeline with progress tracking (0-100%):

1. **OCR Processing (10-40%)**: Mistral OCR extracts text and images from PDF
2. **Question Extraction (40-70%)**: LLM structures questions using Zod schema validation
3. **Answer Key Detection (70-90%)**: Two-pass detection and extraction with confidence scoring
4. **Data Persistence (90-100%)**: Uploads images to R2, creates database records

### Intelligent Image Filtering

Two-tier approach to remove administrative images (logos, watermarks, score boxes):

- **Tier 1**: Position-based heuristics (corner detection, size thresholds)
- **Tier 2**: Vision LLM classification for uncertain cases
- Conservative approach: defaults to keeping images when uncertain to preserve educational content

### Answer Key Detection

- Analyzes first 3 + last 4 pages for answer key sections
- Confidence scoring (high/medium/low)
- Question number normalization handles variations (1., 1), Q1, 1a, 1(i), etc.)
- Automatic linking of answers back to questions

### Rich Question Metadata Extraction

- Multiple numbering formats supported
- Question type classification: MCQ, fill-blank, short-answer, long-answer
- Context extraction (vocabulary sentences, grammar examples)
- Image-to-question relationship tracking
- Marks extraction from various formats ((2 marks), [3], (2m))

### Answer Submission & LLM Grading

- **Auto-save**: Text answers debounce for 1 second before saving; MCQ selections save immediately
- **Grading**: LLM evaluates user answers against expected answers or correct MCQ options
- **Answer Key Validation**: Grading LLM validates answer keys against question context to detect OCR errors; grades based on actual correct answer when discrepancies are found
- **Partial Credit**: Supports partial scoring for text answers based on semantic similarity
- **Feedback**: Each graded answer includes an explanation of why it was marked correct/incorrect
- **Batch Grading**: "Grade All" option to evaluate all submitted answers at once
- **Progress Tracking**: Summary panel shows answered/graded counts and total score

### Additional Features

- LaTeX math rendering with KaTeX
- Chat history persistence per question
- Real-time progress tracking during processing
- Markdown anchors for question navigation in document view

## Tech Stack

| Category       | Technology                          |
| -------------- | ----------------------------------- |
| Framework      | Next.js 16 (App Router)             |
| UI Components  | shadcn/ui                           |
| Styling        | Tailwind CSS 4                      |
| Data Fetching  | React Query (@tanstack/react-query) |
| Validation     | Zod 4                               |
| Database       | Drizzle ORM + Turso (LibSQL)        |
| Storage        | Cloudflare R2 (S3-compatible)       |
| Authentication | better-auth                         |
| OCR            | Mistral OCR (@mistralai/mistralai)  |
| AI             | Vercel AI SDK + Groq                |

## Getting Started

### Prerequisites

- Node.js 22+
- npm

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database (Turso)
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

# Authentication (better-auth)
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# Cloudflare R2 Storage
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=

# AI Services
MISTRAL_API_KEY=
GROQ_API_KEY=
```

### Installation

```bash
npm install
npm run db:push  # Initialize database schema
npm run dev      # Start development server
```

### Commands

| Command             | Description                  |
| ------------------- | ---------------------------- |
| `npm run dev`       | Start development server     |
| `npm run build`     | Build for production         |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint`      | Run ESLint                   |
| `npm run db:push`   | Push schema to database      |
| `npm run db:studio` | Open Drizzle Studio          |

## API Endpoints

| Endpoint                  | Method     | Description                              |
| ------------------------- | ---------- | ---------------------------------------- |
| `/api/upload`             | POST       | Upload PDF (presign, checkHash, confirm) |
| `/api/exams/[id]`         | GET        | Get parsed exam with questions           |
| `/api/answers`            | GET/POST   | Get or save user answers                 |
| `/api/answers/grade`      | POST       | Grade a single answer with LLM           |
| `/api/answers/grade-exam` | POST       | Grade all submitted answers for an exam  |
| `/api/ai/ask`             | POST       | Ask AI about a specific question         |
| `/api/ai/chat-history`    | GET/DELETE | Manage chat history                      |

## Architecture

The backend follows a **Validator-Service-Controller** pattern:

```
app/api/[feature]/
  ├── route.ts        # API route handler
  ├── controller.ts   # Request/response handling
  ├── service.ts      # Business logic
  └── validator.ts    # Zod schemas & types
```

## Design Decisions

### Mistral OCR vs Vision Language Models

Used Mistral OCR instead of general-purpose VLMs because:

- Domain-specialized for document understanding
- More cost-effective than large VLMs
- Better accuracy for structured exam paper content

### Polling vs Server-Sent Events

Chose polling for processing status updates:

- Simple implementation with React Query's `refetchInterval`
- OCR processing completes in under a minute
- No complex connection management needed

### AI Model Selection

Uses Groq for AI features due to:

- Fast inference speed
- Low cost with free tier available
- Satisfactory performance for tutoring and question extraction
- Structured output support for question extraction
- Two model options: GPT-OSS 120B (strict schema) and Kimi K2 (256k context)

### Answer Key Detection

Checks both first 3 and last 4 pages of PDFs:

- Answer keys appear at different locations across exam papers
- Deduplication prevents redundant processing for short documents
