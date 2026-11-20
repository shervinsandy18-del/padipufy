export type PrivateQuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  topic: string;
};

export type PublicQuizQuestion = Pick<PrivateQuizQuestion, "question" | "options" | "topic">;
export type QuizAnswerKey = Pick<PrivateQuizQuestion, "correctAnswer" | "explanation">;

export type QuizFeedback = {
  correct: boolean;
  explanation: string;
};

export function toPublicQuizQuestions(questions: PrivateQuizQuestion[]): PublicQuizQuestion[] {
  return questions.map(({ question, options, topic }) => ({ question, options, topic }));
}

export function parseQuizAnswers(value: unknown): number[] | null {
  if (
    !Array.isArray(value) ||
    value.length < 3 ||
    value.length > 10 ||
    !value.every((answer): answer is number =>
      typeof answer === "number" &&
      Number.isInteger(answer) &&
      answer >= 0 &&
      answer <= 3
    )
  ) {
    return null;
  }
  return value;
}

export function gradeQuiz(
  questions: QuizAnswerKey[],
  answers: number[]
): { score: number; totalQuestions: number; feedback: QuizFeedback[] } {
  if (questions.length !== answers.length) {
    throw new Error("The number of answers does not match the quiz.");
  }

  const feedback = questions.map((question, index) => ({
    correct: answers[index] === question.correctAnswer,
    explanation: question.explanation
  }));
  return {
    score: feedback.filter((item) => item.correct).length,
    totalQuestions: questions.length,
    feedback
  };
}
