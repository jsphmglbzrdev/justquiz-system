import { useEffect } from "react";
import { useToggle } from "../../context/ToggleContext";
import SlidingToggle from "../SlidingToggle";
import supabase from "../../supabase-client-config";

const RequiredToggle = ({ questionId, onChange }) => {
  const { getToggle, setToggle } = useToggle();
  const isOn = getToggle(questionId);

  useEffect(() => {
    if (!questionId) return;

    const fetchToggle = async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("is_required")
        .eq("id", questionId)
        .single();

      if (!error) {
        setToggle(questionId, data?.is_required ?? false);
      }
    };

    fetchToggle();
  }, [questionId, setToggle]);

  const handleChange = async (newValue) => {
    setToggle(questionId, newValue); // optimistic
    if (typeof onChange === "function") onChange(newValue);

    const { error } = await supabase
      .from("questions")
      .update({ is_required: newValue })
      .eq("id", questionId);

    if (error) {
      console.error(error);
      setToggle(questionId, !newValue); // rollback
      if (typeof onChange === "function") onChange(!newValue);
    }
  };

  return <SlidingToggle value={isOn} onChange={handleChange} />;
};

export default RequiredToggle;