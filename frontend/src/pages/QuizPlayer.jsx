import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import supabase from "../supabase-client-config";
import { useToggle } from "../context/ToggleContext";
import EmailField from "../components/EmailField";
import { notifySuccess, notifyError } from "../utils/toastService";

const QuizPlayer = () => {
  const { id } = useParams();
  const { getToggle, setToggle } = useToggle();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [email, setEmail] = useState("");

  const isOn = getToggle(id);

  useEffect(() => {
    if (!id) return;

    const loadQuiz = async () => {
      setLoading(true);

      try {
        // 🔥 RESET toggle first (prevents stale values)
        setToggle(id, undefined);

        // ✅ Fetch quiz
        const { data: quizData } = await supabase
          .from("quizzes")
          .select("*")
          .eq("id", id)
          .single();

        if (!quizData || !quizData.is_published) {
          setQuiz(null);
          setQuestions([]);
          return;
        }

        setQuiz(quizData);

        // ✅ Set toggle AFTER fetch
        setToggle(id, quizData.collect_email_response ?? false);

        // ✅ Fetch questions
        const { data: questionRows } = await supabase
          .from("questions")
          .select("*, question_options(*)")
          .eq("quiz_id", id)
          .order("question_order", { ascending: true });

        if (questionRows) {
          setQuestions(
            questionRows.map((q) => {
              let options = q.question_options || [];

              if (q.question_type === "dropdown") {
                const optRow = options?.[0];
                if (optRow?.option_text) {
                  try {
                    options = JSON.parse(optRow.option_text);
                  } catch {
                    options = [];
                  }
                } else {
                  options = [];
                }
              }

              return { ...q, options };
            })
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [id, setToggle]);

  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    // 1️⃣ Validate required questions
    const requiredQuestions = questions.filter((q) => q.is_required);
    const unansweredRequired = requiredQuestions.filter(
      (q) => !answers[q.id] || answers[q.id].length === 0
    );

    if (unansweredRequired.length > 0) {
      notifyError(
        `Please answer all required questions. ${unansweredRequired.length} remaining.`
      );
      return;
    }

    // 2️⃣ Validate email if required
    if (isOn && !email) {
      notifyError("Email is required to submit this quiz.");
      return;
    }

    try {
      // 3️⃣ Create quiz_response record
      const { data: quizResponse, error: qrError } = await supabase
        .from("quiz_responses")
        .insert({
          quiz_id: id,
          email: isOn ? email : null,
          score: 0, // Will update after evaluating answers
          max_score: 0,
        })
        .select("id")
        .single();

      if (qrError || !quizResponse) {
        console.error("Failed to create quiz response", qrError);
        notifyError("Failed to submit quiz.");
        return;
      }

      const quizResponseId = quizResponse.id;
      let totalScore = 0;
      let maxScore = 0;

      // 4️⃣ Evaluate each question and create responses
      const questionResponsesData = questions.map((question) => {
        const userAnswer = answers[question.id];
        const correctAnswer = question.correct_answer;
        let isCorrect = false;
        let questionScore = 0;

        // Default: 1 point per correct answer
        const pointValue = 1;
        maxScore += pointValue;

        // Evaluate based on question type
        switch (question.question_type) {
          case "short_answer":
          case "paragraph":
            // Case-insensitive string comparison
            isCorrect =
              (userAnswer || "").toLowerCase().trim() ===
              (correctAnswer || "").toLowerCase().trim();
            break;

          case "multiple_choice":
            isCorrect = userAnswer === correctAnswer;
            break;

          case "checkbox":
          case "dropdown":
            // Parse correct answer if it's a JSON string
            let correctOptions = [];
            if (typeof correctAnswer === "string") {
              try {
                correctOptions = JSON.parse(correctAnswer);
              } catch {
                correctOptions = [correctAnswer];
              }
            } else {
              correctOptions = Array.isArray(correctAnswer)
                ? correctAnswer
                : [];
            }

            // Compare arrays
            const userOptions = Array.isArray(userAnswer) ? userAnswer : [];
            isCorrect =
              JSON.stringify([...userOptions].sort()) ===
              JSON.stringify([...correctOptions].sort());
            break;

          default:
            isCorrect = false;
        }

        if (isCorrect) {
          totalScore += pointValue;
          questionScore = pointValue;
        }

        return {
          quiz_response_id: quizResponseId,
          question_id: question.id,
          answer_text:
            question.question_type === "short_answer" ||
            question.question_type === "paragraph"
              ? userAnswer || ""
              : null,
          selected_options:
            question.question_type === "multiple_choice" ||
            question.question_type === "checkbox" ||
            question.question_type === "dropdown"
              ? Array.isArray(userAnswer)
                ? userAnswer
                : userAnswer
                ? [userAnswer]
                : []
              : null,
          is_correct: isCorrect,
          score: questionScore,
        };
      });

      // 5️⃣ Insert all question responses
      const { error: qrsError } = await supabase
        .from("question_responses")
        .insert(questionResponsesData);

      if (qrsError) {
        console.error("Failed to create question responses", qrsError);
        notifyError("Failed to save responses.");
        return;
      }

      // 6️⃣ Update quiz response with calculated score
      const { error: updateError } = await supabase
        .from("quiz_responses")
        .update({ score: totalScore, max_score: maxScore })
        .eq("id", quizResponseId);

      if (updateError) {
        console.error("Failed to update quiz score", updateError);
        notifyError("Failed to save score.");
        return;
      }

      notifySuccess(
        `Quiz submitted successfully! Score: ${totalScore}/${maxScore}`
      );

      // Optional: Reset form or navigate
      setAnswers({});
      setEmail("");
    } catch (err) {
      console.error("Unexpected error during submission", err);
      notifyError("An unexpected error occurred.");
    }
  };

  const renderDropdown = (question) => {
    const tree = question.options || [];
    const selection = answers[question.id] || [];

    const selectedRoot = tree.find(
      (opt) => opt.option_text === selection[0]
    );

    const subOptions = selectedRoot?.children || [];

    return (
      <div className="flex flex-col gap-2">
        <select
          value={selection[0] ?? ""}
          onChange={(e) => handleAnswer(question.id, [e.target.value])}
          className="bg-gray-950 border border-gray-600 rounded p-2 text-white"
        >
          <option value="">Select...</option>
          {tree.map((opt) => (
            <option key={opt.uiId || opt.option_text} value={opt.option_text}>
              {opt.option_text || "(empty)"}
            </option>
          ))}
        </select>

        {subOptions.length > 0 && (
          <select
            value={selection[1] ?? ""}
            onChange={(e) =>
              handleAnswer(question.id, [selection[0], e.target.value])
            }
            className="bg-gray-950 border border-gray-600 rounded p-2 text-white"
          >
            <option value="">Select...</option>
            {subOptions.map((opt) => (
              <option key={opt.uiId || opt.option_text} value={opt.option_text}>
                {opt.option_text || "(empty)"}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  };

  const renderedQuestions = useMemo(() => {
    return questions.map((question) => {
      const answerValue = answers[question.id];

      const renderQuestion = () => {
        switch (question.question_type) {
          case "multiple_choice":
            return (
              <div className="flex flex-col gap-2">
                {(question.options || []).map((opt, i) => {
                  const value = opt.option_text;
                  return (
                    <label key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={answerValue === value}
                        onChange={() => handleAnswer(question.id, value)}
                        className="accent-blue-500"
                      />
                      <span className="text-white">
                        {value || "(empty)"}
                      </span>
                    </label>
                  );
                })}
              </div>
            );

          case "checkbox":
            return (
              <div className="flex flex-col gap-2">
                {(question.options || []).map((opt, i) => {
                  const key = opt.id ?? opt.option_text;
                  const checked = (answerValue || []).includes(key);

                  return (
                    <label key={i} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? (answerValue || []).filter((v) => v !== key)
                            : [...(answerValue || []), key];
                          handleAnswer(question.id, next);
                        }}
                        className="accent-blue-500"
                      />
                      <span className="text-white">
                        {opt.option_text || "(empty)"}
                      </span>
                    </label>
                  );
                })}
              </div>
            );

          case "dropdown":
            return renderDropdown(question);

          case "short_answer":
            return (
              <input
                value={answerValue ?? ""}
                onChange={(e) =>
                  handleAnswer(question.id, e.target.value)
                }
                className="bg-gray-950 text-white w-full p-2 border-b border-gray-600 focus:border-b-blue-500 outline-none"
                placeholder="Answer"
              />
            );

          case "paragraph":
            return (
              <textarea
                value={answerValue ?? ""}
                onChange={(e) =>
                  handleAnswer(question.id, e.target.value)
                }
                className="bg-gray-950 text-white w-full p-2 border-b border-gray-600 focus:border-b-blue-500 outline-none"
                placeholder="Answer"
              />
            );

          default:
            return null;
        }
      };

      return (
        <div
          key={question.id}
          className="border border-gray-700 rounded-lg p-4 mb-4 bg-gray-950"
        >
          <div className="font-semibold text-white mb-2">
            {question.question_text}
          </div>
          {renderQuestion()}
        </div>
      );
    });
  }, [questions, answers]);

  if (loading) return <div className="p-5">Loading quiz…</div>;

  if (!quiz) return <div className="p-5 text-white">Quiz not available.</div>;

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto p-5">
        <div className="border border-gray-700 rounded-lg p-5 mb-6 bg-gray-950">
          <h1 className="text-2xl font-bold text-white">{quiz.title}</h1>
          <p className="text-gray-400 mt-2">{quiz.description}</p>
        </div>

        {/* ✅ FIXED CONDITIONAL RENDER */}
        <div className="mb-5">
          {isOn && <EmailField value={email} onChange={setEmail} />}
        </div>

        {renderedQuestions}

        <button
          onClick={handleSubmit}
          className="mt-4 px-4 py-2 bg-blue-950 rounded text-white"
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default QuizPlayer;