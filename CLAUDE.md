# PDF Exam Paper Parser

## Project Overview
Full-stack application for parsing PDF exam papers into interactive web-based exams with AI assistance.

**Core Workflow**: Upload PDF exam paper → Parse with OCR → Render structured exam → AI Q&A

## Features

### Frontend
- PDF upload interface
- Rendered exam page with:
  - Question text
  - Answer input areas (text inputs, select boxes)
  - Original images from PDF (diagrams, visual elements)
- AI chat for asking questions about specific exam questions

### Backend APIs
| Endpoint | Purpose |
|----------|---------|
| `POST /api/upload` | Upload PDF exam paper |
| `GET /api/exams/[id]` | Get parsed exam JSON |
| `POST /api/ai/ask` | Ask AI about a specific question |

### AI Integration
- Integrate **at least 2 AI models** (e.g., OpenAI + Gemini/Grok)
- Support explanations, guidance, and feedback on exam questions

### Data Persistence
- Parsed exam results must be persisted (DB or file storage)
- Exams retrievable by ID after initial parsing

## Sample Input
- P4 Math, Chinese, English exam papers from Singapore schools
- PDFs contain mixed content: text, images, tables, diagrams

## Tech Stack
- **Framework**: Next.js 16 (App Router for frontend + backend)
- **UI Components**: shadcn/ui
- **Data Fetching**: React Query (@tanstack/react-query)
- **AI/OCR**: Mistral OCR (@mistralai/mistralai), Vercel AI SDK
- **Validation**: Zod
- **Styling**: Tailwind CSS

## Architecture: Validator-Service-Controller Pattern

### Structure (Feature-based, colocated)
```
app/
  api/
    [feature]/
      route.ts        # API route - imports and calls controller
      controller.ts   # Request/response handling, calls service
      service.ts      # Business logic, external API calls
      validator.ts    # Zod schemas + inferred types (models)
components/           # shadcn/ui and custom components
hooks/                # React Query hooks
```

### Layer Responsibilities

**Validators** (`validator.ts`)
- Define Zod schemas for request/response validation
- Export inferred TypeScript types (these ARE the models)
- Example: `export const CreateUserSchema = z.object({...})`
- Example: `export type CreateUser = z.infer<typeof CreateUserSchema>`

**Services** (`service.ts`)
- Business logic only
- Interact with external APIs (Mistral OCR, databases, etc.)
- No request/response handling
- Receives validated, typed data from controller

**Controllers** (`controller.ts`)
- Parse and validate incoming requests using validators
- Call appropriate service functions
- Format and return responses
- Handle errors

**Routes** (`route.ts`)
- Thin layer that imports and calls controller functions
- Example: `export async function POST(req) { return controller.handleCreate(req) }`

## Documentation
- `design-considerations.md` - Tracks architectural and technology decisions

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Development Workflow
**Always run `npm run typecheck` after completing edits** to ensure there are no type errors.
