import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// Re-export auth tables
export { user, session, account, verification } from "./auth-schema";
import { user } from "./auth-schema";

// Exams table
export const exams = sqliteTable(
  "exams",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    pdfKey: text("pdf_key"), // R2 storage key for the uploaded PDF
    fileHash: text("file_hash"), // SHA-256 hash for duplicate detection
    subject: text("subject"),
    grade: text("grade"),
    schoolName: text("school_name"),
    totalMarks: integer("total_marks"),
    status: text("status", {
      enum: ["pending", "processing", "completed", "failed"],
    })
      .notNull()
      .default("pending"),
    progress: integer("progress").notNull().default(0), // 0-100
    errorMessage: text("error_message"),
    rawOcrResult: text("raw_ocr_result"),
    hasAnswerKey: integer("has_answer_key", { mode: "boolean" }).default(false),
    answerKeyConfidence: text("answer_key_confidence", {
      enum: ["high", "medium", "low"],
    }),
    answerKeyPageNumbers: text("answer_key_page_numbers"), // JSON array of page numbers
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("exams_user_id_idx").on(table.userId),
    index("exams_user_hash_idx").on(table.userId, table.fileHash),
  ]
);

// Sections table (normalized from questions)
export const sections = sqliteTable("sections", {
  id: text("id").primaryKey(),
  examId: text("exam_id")
    .notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  sectionName: text("section_name").notNull(),
  instructions: text("instructions"),
  orderIndex: integer("order_index").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Questions table
export const questions = sqliteTable(
  "questions",
  {
    id: text("id").primaryKey(),
    examId: text("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    sectionId: text("section_id").references(() => sections.id, {
      onDelete: "set null",
    }),
    questionNumber: text("question_number").notNull(),
    questionText: text("question_text").notNull(),
    questionType: text("question_type", {
      enum: ["mcq", "fill_blank", "short_answer", "long_answer"],
    }).notNull(),
    marks: integer("marks"),
    context: text("context"), // Question-specific contextual content needed to answer this question
    expectedAnswer: text("expected_answer"),
    orderIndex: integer("order_index").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("questions_exam_id_idx").on(table.examId),
    index("questions_exam_number_idx").on(table.examId, table.questionNumber),
  ]
);

// Answer options table (for MCQ)
export const answerOptions = sqliteTable("answer_options", {
  id: text("id").primaryKey(),
  questionId: text("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  optionLabel: text("option_label").notNull(),
  optionText: text("option_text").notNull(),
  isCorrect: integer("is_correct", { mode: "boolean" }).default(false),
  orderIndex: integer("order_index").notNull(),
});

// Images table
export const images = sqliteTable("images", {
  id: text("id").primaryKey(),
  examId: text("exam_id")
    .notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  questionId: text("question_id").references(() => questions.id, {
    onDelete: "set null",
  }),
  imageUrl: text("image_url").notNull(),
  imageType: text("image_type"),
  altText: text("alt_text"),
  width: integer("width"),
  height: integer("height"),
  orderIndex: integer("order_index").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Chat messages table
export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    examId: text("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    questionId: text("question_id").references(() => questions.id, {
      onDelete: "set null",
    }),
    userId: text("user_id"), // References better-auth user.id
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    content: text("content").notNull(),
    aiModel: text("ai_model"),
    tokensUsed: integer("tokens_used"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("chat_messages_exam_user_idx").on(table.examId, table.userId),
    index("chat_messages_question_idx").on(table.questionId),
  ]
);

// User answers table
export const userAnswers = sqliteTable(
  "user_answers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(), // References better-auth user.id
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    examId: text("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    answerText: text("answer_text"),
    selectedOptionId: text("selected_option_id").references(
      () => answerOptions.id,
      { onDelete: "set null" }
    ),
    isCorrect: integer("is_correct", { mode: "boolean" }),
    score: integer("score"),
    maxScore: integer("max_score"), // Question's max marks for percentage calc
    feedback: text("feedback"), // LLM explanation of grade
    gradingStatus: text("grading_status", {
      enum: ["pending", "grading", "graded", "error"],
    }).default("pending"),
    gradingModel: text("grading_model"), // Which AI model graded
    gradedAt: integer("graded_at", { mode: "timestamp" }),
    submittedAt: integer("submitted_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("user_answers_user_exam_idx").on(table.userId, table.examId),
    index("user_answers_question_idx").on(table.questionId),
  ]
);

// Relations
export const examsRelations = relations(exams, ({ many }) => ({
  sections: many(sections),
  questions: many(questions),
  images: many(images),
  chatMessages: many(chatMessages),
  userAnswers: many(userAnswers),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  exam: one(exams, {
    fields: [sections.examId],
    references: [exams.id],
  }),
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  exam: one(exams, {
    fields: [questions.examId],
    references: [exams.id],
  }),
  section: one(sections, {
    fields: [questions.sectionId],
    references: [sections.id],
  }),
  answerOptions: many(answerOptions),
  images: many(images),
  chatMessages: many(chatMessages),
  userAnswers: many(userAnswers),
}));

export const answerOptionsRelations = relations(answerOptions, ({ one }) => ({
  question: one(questions, {
    fields: [answerOptions.questionId],
    references: [questions.id],
  }),
}));

export const imagesRelations = relations(images, ({ one }) => ({
  exam: one(exams, {
    fields: [images.examId],
    references: [exams.id],
  }),
  question: one(questions, {
    fields: [images.questionId],
    references: [questions.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  exam: one(exams, {
    fields: [chatMessages.examId],
    references: [exams.id],
  }),
  question: one(questions, {
    fields: [chatMessages.questionId],
    references: [questions.id],
  }),
}));

export const userAnswersRelations = relations(userAnswers, ({ one }) => ({
  exam: one(exams, {
    fields: [userAnswers.examId],
    references: [exams.id],
  }),
  question: one(questions, {
    fields: [userAnswers.questionId],
    references: [questions.id],
  }),
  selectedOption: one(answerOptions, {
    fields: [userAnswers.selectedOptionId],
    references: [answerOptions.id],
  }),
}));
