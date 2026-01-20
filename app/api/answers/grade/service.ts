import { generateText, Output } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { env } from "@/lib/config/env";
import { db } from "@/lib/db";
import { userAnswers, questions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyExamOwnership } from "@/lib/services/authorization";
import type { AIModel, GradeResult } from "./validator";
import { LLMGradeOutputSchema } from "./validator";

const groq = createGroq({
  apiKey: env.GROQ_API_KEY,
});

// Map UI model names to Groq model IDs
const MODEL_MAP: Record<AIModel, string> = {
  "gpt-oss-120b": "openai/gpt-oss-120b",
  "kimi-k2": "moonshotai/kimi-k2-instruct-0905",
};

const GRADING_SYSTEM_PROMPT = `You are an expert exam grader. Your task is to evaluate a student's answer against the provided correct answer and give fair, constructive feedback.

GRADING RULES:
1. For MCQ questions: The student is correct if they selected the marked correct option
2. For text questions: Compare semantic meaning, not exact wording
3. Award partial credit for partially correct answers when appropriate
4. For math questions: Accept equivalent forms (e.g., 1/2 = 0.5 = 50%)
5. Be lenient with minor spelling/grammar errors if the core concept is correct
6. Consider the question's mark allocation when awarding partial scores`;

interface QuestionWithOptions {
  id: string;
  questionNumber: string;
  questionText: string;
  questionType: "mcq" | "fill_blank" | "short_answer" | "long_answer";
  marks: number | null;
  expectedAnswer: string | null;
  answerOptions: Array<{
    id: string;
    optionLabel: string;
    optionText: string;
    isCorrect: boolean | null;
  }>;
}

function buildGradingPrompt(
  question: QuestionWithOptions,
  userAnswer: string,
  selectedOptionLabel: string | null
): string {
  const maxScore = question.marks ?? 1;
  let prompt = `Question Type: ${question.questionType}
Question: ${question.questionText}
Maximum Marks: ${maxScore}

`;

  if (question.questionType === "mcq") {
    const correctOption = question.answerOptions.find((o) => o.isCorrect);
    const options = question.answerOptions
      .map((o) => `${o.optionLabel}. ${o.optionText}`)
      .join("\n");

    prompt += `Options:
${options}

Correct Answer: ${correctOption ? `${correctOption.optionLabel}. ${correctOption.optionText}` : "Not specified"}
Student Selected: ${selectedOptionLabel ?? "No selection"}
`;
  } else {
    prompt += `Expected Answer: ${question.expectedAnswer ?? "Not provided - use your judgment based on the question"}
Student Answer: ${userAnswer || "(No answer provided)"}
`;
  }

  prompt += `\nGrade this answer according to the rules.`;

  return prompt;
}

export async function gradeAnswer(
  userId: string,
  examId: string,
  questionId: string,
  model: AIModel
): Promise<GradeResult> {
  // Verify user owns this exam
  await verifyExamOwnership(examId, userId);

  // Get the user's answer
  const userAnswer = await db.query.userAnswers.findFirst({
    where: and(
      eq(userAnswers.questionId, questionId),
      eq(userAnswers.userId, userId)
    ),
  });

  if (!userAnswer) {
    throw new Error("No answer submitted for this question");
  }

  if (!userAnswer.answerText && !userAnswer.selectedOptionId) {
    throw new Error("Answer is empty");
  }

  // Get question details with options
  const question = await db.query.questions.findFirst({
    where: eq(questions.id, questionId),
    with: {
      answerOptions: true,
    },
  });

  if (!question) {
    throw new Error("Question not found");
  }

  const maxScore = question.marks ?? 1;

  // Mark as grading
  await db
    .update(userAnswers)
    .set({ gradingStatus: "grading", updatedAt: new Date() })
    .where(eq(userAnswers.id, userAnswer.id));

  try {
    // Get selected option label for MCQ
    let selectedOptionLabel: string | null = null;
    if (question.questionType === "mcq" && userAnswer.selectedOptionId) {
      const selectedOption = question.answerOptions.find(
        (o) => o.id === userAnswer.selectedOptionId
      );
      selectedOptionLabel = selectedOption?.optionLabel ?? null;
    }

    // Build prompt and call LLM
    const prompt = buildGradingPrompt(
      question as QuestionWithOptions,
      userAnswer.answerText ?? "",
      selectedOptionLabel
    );

    const { output } = await generateText({
      model: groq(MODEL_MAP[model]),
      system: GRADING_SYSTEM_PROMPT,
      prompt,
      temperature: 0.1,
      maxRetries: 3,
      output: Output.object({ schema: LLMGradeOutputSchema }),
    });

    if (!output) {
      throw new Error("Failed to get grading output from LLM");
    }

    const gradeOutput = output;

    // Ensure score is within bounds
    const score = Math.max(0, Math.min(gradeOutput.score, maxScore));
    const now = new Date();

    // Update database
    await db
      .update(userAnswers)
      .set({
        isCorrect: gradeOutput.isCorrect,
        score,
        maxScore,
        feedback: gradeOutput.feedback,
        gradingStatus: "graded",
        gradingModel: model,
        gradedAt: now,
        updatedAt: now,
      })
      .where(eq(userAnswers.id, userAnswer.id));

    return {
      questionId,
      isCorrect: gradeOutput.isCorrect,
      score,
      maxScore,
      feedback: gradeOutput.feedback,
      gradingModel: model,
      gradedAt: now.toISOString(),
    };
  } catch (error) {
    // Mark as error
    await db
      .update(userAnswers)
      .set({
        gradingStatus: "error",
        feedback:
          error instanceof Error ? error.message : "Unknown grading error",
        updatedAt: new Date(),
      })
      .where(eq(userAnswers.id, userAnswer.id));

    throw error;
  }
}
