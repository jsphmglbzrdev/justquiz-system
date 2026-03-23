import { useEffect } from "react";
import { useToggle } from "../../context/ToggleContext";
import SlidingToggle from "../SlidingToggle";
import supabase from "../../supabase-client-config";
const QuizEmailToggle = ({ quizId }) => {
  const { getToggle, setToggle } = useToggle();
  const isOn = getToggle(quizId);

  useEffect(() => {
    if (!quizId) return;

    const fetchToggle = async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("collect_email_response")
        .eq("id", quizId)
        .single();

      if (!error) {
        setToggle(quizId, data?.collect_email_response ?? false);
      }
    };

    fetchToggle();
  }, [quizId]);

  const handleChange = async (newValue) => {
    setToggle(quizId, newValue); // optimistic

    const { error } = await supabase
      .from("quizzes")
      .update({ collect_email_response: newValue })
      .eq("id", quizId);

    if (error) {
      console.error(error);
      setToggle(quizId, !newValue); // rollback
    }
  };

  return <SlidingToggle value={isOn} onChange={handleChange} />;
};

export default QuizEmailToggle;