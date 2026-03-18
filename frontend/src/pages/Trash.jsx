import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import supabase from "../supabase-client-config";
import { useNavigate } from "react-router-dom";

const Trash = () => {
  const [trashData, setTrashData] = useState([]);
  const navigate = useNavigate();

  const emptyTrash = async () => {
    try {
      // 1. Get all deleted quizzes
      const { data: quizzes, error: quizError } = await supabase
        .from("quizzes")
        .select("id")
        .eq("is_deleted", true);

      if (quizError) {
        console.log("Error fetching quizzes:", quizError);
        return;
      }

      const quizIds = quizzes.map((q) => q.id);

      if (quizIds.length === 0) return;

      // 2. Get related questions
      const { data: questions } = await supabase
        .from("questions")
        .select("id")
        .in("quiz_id", quizIds);

      const questionIds = (questions || []).map((q) => q.id);

      // 3. Delete options first
      if (questionIds.length) {
        await supabase
          .from("question_options")
          .delete()
          .in("question_id", questionIds);
      }

      // 4. Delete questions
      await supabase.from("questions").delete().in("quiz_id", quizIds);

      // 5. Delete quizzes
      await supabase.from("quizzes").delete().in("id", quizIds);

      // 6. Update UI
      setTrashData([]);
    } catch (error) {
      console.error("Error emptying trash:", error);
    }
  };

  const handleTrash = async () => {
    const { data, error } = await supabase
      .from("quizzes")
      .select("*")
      .eq("is_deleted", true)
      .order("deleted_at", { ascending: false });

    if (error) {
      console.log("Error fetching trash data:", error);
    } else {
      setTrashData(data);
    }
  };

  useEffect(() => {
    handleTrash();
  }, []);

  return (
    <div>
      <Navbar />

      <div className="max-w-7xl mx-auto p-5">
        <div className="mt-20">
          <div className="flex items-center justify-between mb-5">
            <div className="text-2xl font-semibold ">Trash</div>
            <button
              onClick={() => emptyTrash()}
              className="rounded-md border border-gray-700 py-2 px-5"
            >
              Empty Trash
            </button>
          </div>
          {trashData.length === 0 ? (
            <p>No deleted quizzes</p>
          ) : (
            trashData.map((quiz) => (
              <div
                onClick={() => navigate(`/quiz/${quiz.id}`)}
                key={quiz.id}
                className="border p-4 mb-2 rounded border-gray-700"
              >
                <h2>{quiz.title}</h2>
                <p>{quiz.description}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Trash;
