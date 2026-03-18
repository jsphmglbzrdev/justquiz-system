import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLoading } from "../context/LoadingContext";
import supabase from "../supabase-client-config";

// Page for the main dashboard, where users can see all their quizzes and create new ones
const MainPage = () => {
  const { setLoading } = useLoading();
  const navigate = useNavigate();
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [menuOpenFor, setMenuOpenFor] = useState(null);

  useEffect(() => {
    fetchAllQuizzes();
  }, []);

  const createNewQuiz = async () => {
    setLoading(true);

    try {
      // 1️⃣ Create the new quiz
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .insert({ title: "New Quiz" })
        .select()
        .single();

      if (quizError) {
        console.error("Error creating quiz:", quizError);
        return;
      }

      const quizId = quizData.id;

      // 2️⃣ Create a default question linked to the new quiz
      const { data: questionData, error: questionError } = await supabase
        .from("questions")
        .insert({
          quiz_id: quizId,
          question_text: "New Question",
          question_type: "Multiple choice",
          question_order: 0,
        })
        .select()
        .single();

      if (questionError) {
        console.error("Error creating default question:", questionError);
      }

      console.log("Quiz and default question created:", quizData, questionData);

      // 3️⃣ Navigate to the new quiz page
      navigate(`/quiz/${quizId}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllQuizzes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("quizzes").select("*");
    if (error) {
      console.error("Error fetching quizzes:", error);
    } else {
      setAllQuizzes(data);
      setLoading(false);
      console.log("Quizzes fetched successfully:", data);
    }
  };

  const openExistingQuiz = (quizId) => {
    setLoading(true);
    navigate(`/quiz/${quizId}`);
  };

  const deleteQuiz = async (quizId) => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from("quizzes")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", quizId);

      if (error) {
        console.error("Failed to move quiz to trash:", error);
        return;
      }

      // Remove from UI immediately
      setAllQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
      setMenuOpenFor(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-5">
      {/* Main Section */}
      <div className="mt-20">
        <div className="border border-gray-700 rounded-lg mt-5 p-5">
          <div>
            Lorem, ipsum dolor sit amet consectetur adipisicing elit.
            Voluptatibus modi aliquid, maiores architecto velit sequi minima
            eaque error laboriosam dolorem delectus, vitae voluptatum maxime.
            Eaque beatae blanditiis adipisci voluptas consequatur.
          </div>
          <button
            onClick={createNewQuiz}
            className="py-1 p-5 border border-gray-300 rounded-md mt-2 hover:bg-gray-900"
          >
            Create New Quiz
          </button>
        </div>

        {/* List of Quizzes */}
        <div>
          {allQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="border border-gray-700 rounded-lg mt-5 p-5 relative"
            >
              <div
                onClick={() => openExistingQuiz(quiz.id)}
                className="cursor-pointer"
              >
                <div className="font-semibold text-lg">{quiz.title}</div>
                <div className="text-gray-400">{quiz.description}</div>
              </div>

              {/* 3-dot menu */}
              <div className="absolute top-4 right-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenFor(menuOpenFor === quiz.id ? null : quiz.id);
                  }}
                  className="p-2 rounded-full hover:bg-gray-700"
                  aria-label="Open menu"
                >
                  <span className="text-xl">⋮</span>
                </button>
                {menuOpenFor === quiz.id && (
                  <div
                    className="absolute z-50 -right-4 mt-2 w-40 bg-black border border-gray-700 rounded shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => deleteQuiz(quiz.id)}
                      className="w-full text-left px-4 py-2 text-sm bg-gray-900 hover:bg-gray-800"
                    >
                      Delete Quiz
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MainPage;
