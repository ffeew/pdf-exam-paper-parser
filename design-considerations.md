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

## 2026-01-20: Groq for LLM Question Extraction

**Decision**: Use Groq models for LLM-based question extraction from OCR output.

**Reasoning**:
- **Speed**: Groq's inference speed is significantly faster than alternatives
- **Cost**: Competitive pricing for structured extraction tasks
- **Model quality**: `llama-3.3-70b-versatile` provides strong extraction capabilities
- **User preference**: Aligned with user's stated preference for Groq models

**Trade-offs considered**:
- OpenAI GPT-4o may provide slightly better structured output accuracy
- Gemini offers strong multimodal capabilities
- Groq's model selection is more limited but sufficient for this use case
