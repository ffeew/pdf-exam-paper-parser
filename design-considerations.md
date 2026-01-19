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
