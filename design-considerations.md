# Design Considerations

This document tracks key design decisions made during development.

---

## 2026-01-20: Mistral OCR vs Vision Language Models (VLMs)

**Decision**: Use Mistral OCR for document parsing instead of general-purpose VLMs.

**Reasoning**:

- **Performance**: Domain-specialized models like Mistral OCR are optimized for document understanding and consistently outperform general VLMs on OCR tasks
- **Cost**: Significantly cheaper than running large VLMs for text extraction
- **Accuracy**: Purpose-built for document parsing, resulting in better structured output for exam papers

**Trade-offs considered**:

- VLMs offer more flexibility for complex reasoning about document content
- Mistral OCR may require additional processing for non-standard document layouts

---

## 2026-01-20: Polling vs Server-Sent Events (SSE) for Status Updates

**Decision**: Use polling over SSE for exam processing status updates.

**Reasoning**:

- **Simplicity**: Polling is straightforward to implement with React Query's refetchInterval
- **Reliability**: No connection management or reconnection logic needed
- **Sufficient performance**: OCR processing completes in under a minute; polling every 3-5 seconds provides adequate UX
- **Browser compatibility**: Polling works consistently across all browsers without special handling

**Trade-offs considered**:

- SSE provides real-time updates with lower latency
- SSE uses fewer requests overall for long-running processes
- However, SSE adds complexity (connection management, reconnection, timeout handling)

---

## 2026-01-20: Groq Model Selection for Structured Outputs

**Decision**: Use `openai/gpt-oss-120b` via Groq for LLM-based question extraction.

**Reasoning**:

- **Structured Output Support**: Only certain Groq models support `json_schema` response format
- **Strict Mode**: `openai/gpt-oss-120b` and `openai/gpt-oss-120b` support strict structured outputs (100% schema compliance)
- **Speed**: Groq's inference speed is significantly faster than alternatives
- **Cost**: Competitive pricing for structured extraction tasks

**Models supporting structured outputs on Groq**:

- `openai/gpt-oss-120b` - strict mode
- `moonshotai/kimi-k2-instruct-0905` - best-effort mode, 256k context (reserved for AI Q&A)

**Models NOT supporting structured outputs**:

- `llama-3.3-70b-versatile` - causes "This model does not support response format `json_schema`" error

**Trade-offs considered**:

- Kimi K2 has larger context (256k) but only best-effort schema compliance
- Chose `gpt-oss-120b` for balance of strict compliance, speed, and cost

---

## 2026-01-20: npm vs Bun for Package Management

**Decision**: Use npm instead of Bun for package management and running scripts.

**Reasoning**:

- **Turbopack Compatibility**: Bun + Turbopack + `@libsql/client` causes module resolution failures on Windows
- **Error**: `Failed to load external module @libsql/client-*: Cannot find module` when using Bun with Next.js 16's default Turbopack bundler
- **Stability**: npm + Turbopack works correctly with all dependencies

**Workarounds tried**:

- `serverExternalPackages: ["@libsql/client"]` in next.config.ts - did not resolve the issue
- Clean reinstall with Bun - did not resolve the issue
- `next dev --webpack` flag - works but slower than Turbopack

**Trade-offs considered**:

- Bun offers faster install times and script execution
- However, Turbopack compatibility is essential for fast dev server startup
- npm provides stable, well-tested behavior with the full Next.js toolchain

---

## 2026-01-20: Answer Key Detection - Checking First and Last Pages

**Decision**: Check both the first 3 pages and last 4 pages for answer keys.

**Reasoning**:

- **Flexibility**: Answer keys can appear at either end of exam papers
- **Singapore exam papers**: Some place answer keys before the questions
- **Deduplication**: For short documents, pages are deduplicated to avoid redundant analysis

**Trade-offs considered**:

- Checking more pages increases LLM API cost slightly
- However, improved accuracy outweighs the marginal cost increase
- The deduplication logic ensures no duplicate processing

---

## 2026-01-21: Direct Client Upload with Presigned URLs

**Decision**: Implement three-step upload flow (checkHash → presign → confirm) with client-side direct upload to R2.

**Reasoning**:

- **Bandwidth efficiency**: PDFs upload directly to R2, never proxying through server
- **Cost reduction**: Eliminates server bandwidth costs and memory pressure
- **Scalability**: Server handles only metadata, not file bytes
- **Duplicate prevention**: Client-side SHA-256 hash check before upload saves bandwidth
- **Race condition handling**: Double-check hash on confirm to handle concurrent uploads

**Trade-offs considered**:

- Requires exposing presigned URL endpoint (mitigated by auth + short expiry)
- Three API calls vs single multipart upload (complexity justified by bandwidth savings)
- Client-side hashing adds ~100ms for large files (acceptable tradeoff)
- Cannot validate file content server-side before storage (rely on content-type + later OCR validation)

---

## 2026-01-21: Validator-Service-Controller Architecture Pattern

**Decision**: Adopt three-layer architecture with colocated feature folders instead of global layers.

**Reasoning**:

- **Type safety**: Zod schemas in validators serve as both runtime validation and TypeScript models
- **Testability**: Services contain pure business logic, easily unit-testable without HTTP concerns
- **Colocation**: Feature-based organization keeps related code together (`app/api/upload/` contains all layers)
- **Thin routes**: Route handlers become trivial delegations, reducing boilerplate

**Trade-offs considered**:

- More files per feature vs fewer global files (worth it for discoverability)
- Controllers duplicate error handling patterns (acceptable, explicit > implicit)
- Zod inference for types means no separate interface files (tradeoff: less explicit, but DRY)

---

## 2026-01-21: React Query for Server State Management

**Decision**: Use React Query with optimistic updates and cache manipulation instead of global state (Redux/Zustand).

**Reasoning**:

- **Server state paradigm**: Exam data is server-owned; React Query's stale-while-revalidate fits naturally
- **Optimistic updates**: `onMutate` + `onError` rollback provides instant UI feedback for answers
- **Cache manipulation**: `setQueryData` enables surgical updates without full refetch
- **Polling support**: Built-in `refetchInterval` for processing status without WebSocket complexity

**Trade-offs considered**:

- No global client state store (acceptable: auth state in cookies, UI state in component state)
- Cache invalidation complexity for related queries (managed via `invalidateQueries`)
- Learning curve for cache manipulation patterns vs simpler fetch-on-mount

---

## 2026-01-21: Streaming vs Structured Output for AI Responses

**Decision**: Use streaming for chat (tutoring) and structured output for grading.

**Reasoning**:

- **Chat UX**: Streaming provides progressive feedback during long responses; students see "thinking"
- **Grading reliability**: `Output.object({ schema })` guarantees valid JSON for database persistence
- **Model selection**: gpt-oss-120b for strict structured outputs; kimi-k2 (256k context) for chat
- **Temperature tuning**: 0.7 for creative tutoring; 0.1 for deterministic grading

**Trade-offs considered**:

- Streaming adds complexity (status tracking, partial message handling)
- Structured output limits model choice (only some Groq models support `json_schema`)
- Could use streaming + post-processing for grading (rejected: risk of malformed JSON)

---

## 2026-01-21: Fire-and-Forget Async Processing Pattern

**Decision**: Use fire-and-forget with status polling instead of job queues (BullMQ, Inngest).

**Reasoning**:

- **Simplicity**: No Redis dependency, no worker processes to manage
- **Status tracking**: Database-persisted status enables polling from any client
- **Error handling**: `.catch()` on async call updates status to "failed" with message
- **Progress updates**: Incremental progress (10%, 40%, 70%, 90%, 100%) during multi-step OCR pipeline

**Trade-offs considered**:

- No retry logic built-in (acceptable: user can re-upload on failure)
- Long-running requests vulnerable to serverless timeouts (mitigated: Vercel Pro 60s limit sufficient for OCR)
- No job prioritization or rate limiting (not needed at current scale)

---

## 2026-01-21: better-auth vs NextAuth for Authentication

**Decision**: Use better-auth instead of NextAuth.js v5.

**Reasoning**:

- **Database-first**: Native Drizzle adapter with proper TypeScript types
- **Simpler API**: `auth.api.getSession({ headers })` vs NextAuth's callback-heavy approach
- **Email/password built-in**: First-class support without additional providers
- **Type inference**: `auth.$Infer.Session` provides exact session types

**Trade-offs considered**:

- NextAuth has larger ecosystem and more OAuth providers
- better-auth is newer with smaller community
- Migration path unclear if better-auth is abandoned (mitigated: simple schema, data portable)

---

## 2026-01-21: Question-Scoped Chat with Persistence

**Decision**: Scope AI chat conversations to individual questions rather than exam-wide chat.

**Reasoning**:

- **Context relevance**: System prompt includes specific question text, marks, options
- **History isolation**: Switching questions doesn't pollute context with unrelated discussion
- **Database design**: `chat_messages.questionId` enables per-question history retrieval
- **Race condition handling**: `useRef` tracks expected question to prevent stale data loading

**Trade-offs considered**:

- Users cannot reference previous questions in conversation (acceptable: focused tutoring)
- More database rows for active users (indexed by `questionId`, query performance maintained)
- Complex state management for question switching (managed via `loadedForQuestion` ref)

---

## 2026-01-21: Debounced Answer Auto-Save Pattern

**Decision**: Debounce text answer saves by 1 second; MCQ saves immediately.

**Reasoning**:

- **Reduced API calls**: Text typing doesn't trigger save per keystroke
- **Immediate MCQ feedback**: Radio selection is intentional, save immediately
- **Local optimism**: UI updates instantly, server sync happens in background
- **Grading reset**: Changing answer resets `gradingStatus` to "pending"

**Trade-offs considered**:

- 1 second delay means potential data loss on tab close (acceptable risk)
- Could use `beforeunload` flush (rejected: complexity, unreliable on mobile)
- Explicit "Save" button alternative (rejected: friction for 50+ question exams)

---

## 2026-01-21: Base64 Stripping for OCR Storage Optimization

**Decision**: Strip `imageBase64` fields from raw OCR JSON before database storage.

**Reasoning**:

- **Storage efficiency**: Base64 images already uploaded to R2; redundant in database
- **Query performance**: Smaller `rawOcrResult` field improves read times
- **Debugging retained**: Markdown content and image metadata preserved for troubleshooting
- **Recursive stripping**: Handles nested image objects in Mistral's response structure

**Trade-offs considered**:

- Cannot regenerate images from database alone (R2 is source of truth)
- Adds processing step during save (negligible cost vs storage savings)
- Raw OCR not fully "raw" (acceptable: documented in function name)

---

## 2026-01-21: User Ownership Verification for Authorization

**Decision**: Verify exam ownership via database query on every request instead of caching permissions.

**Reasoning**:

- **Row-level security**: Every data operation verifies `userId` matches exam owner
- **Defense in depth**: Authorization checked at controller, service, and database (FK constraints) layers
- **No stale permissions**: Database query ensures real-time access status
- **Composite indices**: `(userId, fileHash)` and `(userId, examId)` make lookups O(1)

**Trade-offs considered**:

- Database query on every request adds 1-2ms latency (acceptable with indices)
- Could cache permissions in session (rejected: cache invalidation complexity)
- Role-based access control overkill for single-user exam ownership model

---

## 2026-01-21: Presigned URL Security Model

**Decision**: Use time-limited presigned URLs with fixed 1-hour expiration for R2 access.

**Reasoning**:

- **AWS standard**: Cryptographically signed URLs trusted industry-wide
- **Content-type constraints**: Upload URLs include `ContentType` preventing file type bypass
- **UUID file keys**: `{folder}/{uuid}.{ext}` format prevents directory traversal and enumeration
- **Credential isolation**: R2 access keys never exposed to client; only signed URLs shared

**Trade-offs considered**:

- Fixed 1-hour TTL vs user-configurable expiration (chose predictability)
- Could use shorter expiration for downloads (1 hour acceptable for exam review sessions)
- Single R2 credential set vs per-user temporary credentials (chose operational simplicity)

---

## 2026-01-21: Zod Schema Validation at API Boundaries

**Decision**: Enforce strict Zod validation at API entry points; trust validated data in services.

**Reasoning**:

- **Fail-fast**: Invalid requests rejected immediately with structured error responses
- **Type inference**: `z.infer<typeof Schema>` provides exact TypeScript types from schemas
- **Literal constraints**: `z.literal("application/pdf")` prevents content-type bypass attacks
- **Boundary enforcement**: Validation happens once at API entry, not repeated in services

**Trade-offs considered**:

- Single validation point vs redundant service validation (chose DRY, trust boundaries)
- Strict literals vs wildcard patterns (chose security over flexibility)
- Zod over Valibot (Zod has better ecosystem, Valibot is smaller bundle)
- 50MB file size limit may reject legitimate large exams (acceptable: rare edge case)
