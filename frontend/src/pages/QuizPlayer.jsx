import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import supabase from "../supabase-client-config";

const QuizPlayer = () => {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    const loadQuiz = async () => {
      setLoading(true);
      try {
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
            }),
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [id]);

  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    console.log("Submitted answers", answers);
    alert("Answers submitted (not saved). See console for details.");
  };

  const renderDropdown = (question) => {
    const tree = question.options || [];
    const selection = answers[question.id] || [];

    const rootOptions = tree;
    const selectedRoot = rootOptions.find((opt) => opt.option_text === selection[0]);
    const subOptions = selectedRoot?.children || [];

    return (
      <div className="flex flex-col gap-2">
        <select
          value={selection[0] ?? ""}
          onChange={(e) => handleAnswer(question.id, [e.target.value])}
          className="bg-black border border-gray-600 rounded p-2 text-white"
        >
          <option value="">Select...</option>
          {rootOptions.map((opt) => (
            <option key={opt.uiId || opt.option_text} value={opt.option_text}>
              {opt.option_text || "(empty)"}
            </option>
          ))}
        </select>
        {subOptions.length > 0 && (
          <select
            value={selection[1] ?? ""}
            onChange={(e) => handleAnswer(question.id, [selection[0], e.target.value])}
            className="bg-black border border-gray-600 rounded p-2 text-white"
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
                {(question.options || []).map((opt, optIndex) => {
                  const value = opt.option_text;
                  return (
                    <label
                      key={opt.id ?? optIndex}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        checked={answerValue === value}
                        onChange={() => handleAnswer(question.id, value)}
                        className="accent-blue-500"
                      />
                      <span className="text-white">{value || "(empty)"}</span>
                    </label>
                  );
                })}
              </div>
            );
          case "checkbox":
            return (
              <div className="flex flex-col gap-2">
                {(question.options || []).map((opt, optIndex) => {
                  const key = opt.id ?? opt.uiId ?? opt.option_text;
                  const value = opt.option_text;
                  const checked = (answerValue || []).includes(key);
                  return (
                    <label
                      key={opt.id ?? optIndex}
                      className="flex items-center gap-2"
                    >
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
                      <span className="text-white">{value || "(empty)"}</span>
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
                onChange={(e) => handleAnswer(question.id, e.target.value)}
                className="bg-black border border-gray-600 rounded p-2 text-white w-full"
                placeholder="Answer"
              />
            );
          case "paragraph":
            return (
              <textarea
                value={answerValue ?? ""}
                onChange={(e) => handleAnswer(question.id, e.target.value)}
                className="bg-black border border-gray-600 rounded p-2 text-white w-full"
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
          className="border border-gray-700 rounded-lg p-4 mb-4 bg-black"
        >
          <div className="font-semibold text-white mb-2">
            {question.question_text}
          </div>
          {renderQuestion()}
        </div>
      );
    });
  }, [questions, answers]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto p-5">Loading quiz…</div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto p-5">
          <div className="text-white">Quiz not found or not published.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto p-5">
        <div className="border border-gray-700 rounded-lg p-5 mb-6 bg-black">
          <h1 className="text-2xl font-bold text-white">{quiz.title}</h1>
          <p className="text-gray-400 mt-2">{quiz.description}</p>
        </div>

        {renderedQuestions}

        <button
          onClick={handleSubmit}
          className="mt-4 px-4 py-2 bg-blue-600 rounded text-white"
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default QuizPlayer;
