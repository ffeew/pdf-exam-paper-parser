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
