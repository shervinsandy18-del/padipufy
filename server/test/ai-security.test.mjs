import assert from "node:assert/strict";
import test from "node:test";
import {
  gradeQuiz,
  parseQuizAnswers,
  toPublicQuizQuestions
} from "../dist/services/quiz.js";
import {
  AiQuotaError,
  runReservedAiOperation
} from "../dist/services/aiQuotaOperation.js";

const privateQuestions = [
  {
    question: "Which type stores whole numbers?",
    options: ["integer", "string", "boolean", "array"],
    correctAnswer: 0,
    explanation: "Integer values represent whole numbers.",
    topic: "Types"
  },
  {
    question: "Which value represents true or false?",
    options: ["integer", "string", "boolean", "array"],
    correctAnswer: 2,
    explanation: "Boolean values represent true or false.",
    topic: "Types"
  },
  {
    question: "Which structure stores ordered values?",
    options: ["integer", "string", "boolean", "array"],
    correctAnswer: 3,
    explanation: "Arrays store ordered collections of values.",
    topic: "Collections"
  }
];

test("public quiz questions never include answers or explanations", () => {
  const questions = toPublicQuizQuestions(privateQuestions);

  assert.equal(questions.length, privateQuestions.length);
  for (const question of questions) {
    assert.equal("correctAnswer" in question, false);
    assert.equal("explanation" in question, false);
  }
});

test("quiz answers are range-checked and graded by the server helper", () => {
  assert.deepEqual(parseQuizAnswers([0, 2, 3]), [0, 2, 3]);
  assert.equal(parseQuizAnswers([0, 4, 3]), null);
  assert.equal(parseQuizAnswers(["0", 2, 3]), null);
  assert.equal(parseQuizAnswers([0, 2]), null);

  assert.deepEqual(gradeQuiz(privateQuestions, [0, 1, 3]), {
    score: 2,
    totalQuestions: 3,
    feedback: [
      { correct: true, explanation: "Integer values represent whole numbers." },
      { correct: false, explanation: "Boolean values represent true or false." },
      { correct: true, explanation: "Arrays store ordered collections of values." }
    ]
  });
});

test("failed AI generation releases its reservation without consuming quota", async () => {
  let consumed = false;
  let released = false;

  await assert.rejects(
    runReservedAiOperation(
      async () => { throw new Error("provider failed"); },
      async () => { consumed = true; return true; },
      async () => { released = true; }
    ),
    /provider failed/
  );
  assert.equal(consumed, false);
  assert.equal(released, true);
});

test("successful AI generation consumes its reservation", async () => {
  let consumed = false;
  let released = false;

  const result = await runReservedAiOperation(
    async () => "generated",
    async () => { consumed = true; return true; },
    async () => { released = true; }
  );

  assert.equal(result, "generated");
  assert.equal(consumed, true);
  assert.equal(released, false);
});

test("expired reservations fail instead of returning an uncounted answer", async () => {
  let released = false;

  await assert.rejects(
    runReservedAiOperation(
      async () => "generated",
      async () => false,
      async () => { released = true; }
    ),
    (error) => error instanceof AiQuotaError && error.statusCode === 503
  );
  assert.equal(released, true);
});
