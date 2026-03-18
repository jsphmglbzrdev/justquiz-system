import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useLoading } from "../context/LoadingContext";
import Navbar from "../components/Navbar";
import supabase from "../supabase-client-config";
import DropdownQuestionType from "../components/DropdownQuestionType";
import MultipleChoice from "../components/question-types/MultipleChoice";
import ShortAnswer from "../components/question-types/ShortAnswer";
import Paragraph from "../components/question-types/Paragraph";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable item for questions
const SortableItem = ({ id, onDelete, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center justify-between mb-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-400"
        >
          ⠿ Drag
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            className="text-red-400 hover:text-red-500 font-bold"
          >
            🗑️
          </button>
        )}
      </div>
      {children}
    </div>
  );
};

const CreateQuiz = () => {
  const { setLoading } = useLoading();
  const { id } = useParams();
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [questionData, setQuestionData] = useState([]);
  const [correctAnswerDrafts, setCorrectAnswerDrafts] = useState({});

  useEffect(() => {
    const loadQuiz = async () => {
      setLoading(true);
      try {
        const { data: quizData } = await supabase
          .from("quizzes")
          .select("*")
          .eq("id", id)
          .single();
        if (quizData) {
          setEditingTitle(quizData.title || "");
          setEditingDescription(quizData.description || "");
        }
        const { data: questions } = await supabase
          .from("questions")
          .select("*, question_options(*)")
          .eq("quiz_id", id)
          .order("question_order", { ascending: true });
        if (questions) {
          setQuestionData(
            questions.map((q) => ({ ...q, options: q.question_options || [] })),
          );
        }
      } finally {
        setLoading(false);
      }
    };
    loadQuiz();
  }, [id, setLoading]);

  const updateQuiz = async (field, value) => {
    if (field === "title") setEditingTitle(value);
    if (field === "description") setEditingDescription(value);
    await supabase
      .from("quizzes")
      .update({ [field]: value })
      .eq("id", id);
  };

  const ensureQuestionSaved = async (index) => {
    const question = questionData[index];
    if (!question) return null;

    // If the question already has a DB id, just return it.
    if (question.id) return question.id;

    // Otherwise, insert a new question row and capture the generated id.
    const { data, error } = await supabase
      .from("questions")
      .insert({
        quiz_id: id,
        question_text: question.question_text,
        question_type: question.question_type,
        question_order: index,
        correct_answer: question.correct_answer ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to insert new question", error, { question });
      return null;
    }

    const newData = [...questionData];
    newData[index] = { ...newData[index], id: data.id };
    setQuestionData(newData);
    return data.id;
  };

  const persistQuestion = async (question, order, index) => {
    // Ensure the question has a DB id (needed for FK constraints in question_options).
    if (!question.id) {
      const idFromDb = await ensureQuestionSaved(index);
      if (!idFromDb) return;
      question = { ...question, id: idFromDb };
    }

    const { error: questionError } = await supabase.from("questions").upsert({
      id: question.id,
      quiz_id: id,
      question_text: question.question_text,
      question_type: question.question_type,
      question_order: order,
      correct_answer: question.correct_answer ?? null,
    });

    if (questionError) {
      console.error("Failed to upsert question", questionError, { question });
    }

    if (
      question.question_type === "multiple_choice" &&
      question.options?.length
    ) {
      // Replace all existing options for this question to keep DB in sync.
      await supabase
        .from("question_options")
        .delete()
        .eq("question_id", question.id);

      const { error: optionsError } = await supabase
        .from("question_options")
        .insert(
          question.options.map((opt, i) => ({
            question_id: question.id,
            option_text: opt.option_text,
            option_order: i,
          })),
        );

      if (optionsError) {
        console.error("Failed to insert question_options", optionsError, {
          questionId: question.id,
          options: question.options,
        });
      }
    } else if (question.question_type !== "multiple_choice") {
      const { error: deleteOptionsError } = await supabase
        .from("question_options")
        .delete()
        .eq("question_id", question.id);

      if (deleteOptionsError) {
        console.error("Failed to delete question_options", deleteOptionsError, {
          questionId: question.id,
        });
      }
    }
  };

  const updateQuestion = async (index, updated, baseData = questionData) => {
    const newData = [...baseData];
    newData[index] = { ...newData[index], ...updated };
    setQuestionData(newData);

    await persistQuestion(newData[index], index, index);
    return newData[index];
  };

  const getQuestionKey = (question, index) => question.id ?? question.tempId ?? index;

  const getDraftCorrectAnswer = (question, index) =>
    correctAnswerDrafts[getQuestionKey(question, index)] ?? question.correct_answer ?? "";

  const setDraftCorrectAnswer = (question, index, value) => {
    setCorrectAnswerDrafts((prev) => ({
      ...prev,
      [getQuestionKey(question, index)]: value,
    }));
  };

  const saveCorrectAnswer = async (index) => {
    const question = questionData[index];
    if (!question) return;

    const oldKey = getQuestionKey(question, index);
    const draft = correctAnswerDrafts[oldKey] ?? question.correct_answer ?? "";

    const updatedQuestion = await updateQuestion(index, { correct_answer: draft });
    const newKey = getQuestionKey(updatedQuestion, index);

    setCorrectAnswerDrafts((prev) => {
      const next = { ...prev };
      if (oldKey !== newKey) delete next[oldKey];
      next[newKey] = draft;
      return next;
    });
  };

  const setQuestionOptions = (index, options) => {
    const newData = [...questionData];
    newData[index] = { ...newData[index], options };
    setQuestionData(newData);
  };

  const saveQuestionOptions = async (index, options) => {
    await updateQuestion(index, { options });
  };

  const deleteQuestion = async (index) => {
    const questionToDelete = questionData[index];
    const newData = questionData
      .filter((_, i) => i !== index)
      .map((q, i) => ({ ...q, question_order: i }));
    setQuestionData(newData);
    setCorrectAnswerDrafts((prev) => {
      const next = { ...prev };
      delete next[getQuestionKey(questionToDelete, index)];
      return next;
    });

    try {
      // Remove any options first (in case there is no FK cascade)
      await supabase
        .from("question_options")
        .delete()
        .eq("question_id", questionToDelete.id);
      await supabase.from("questions").delete().eq("id", questionToDelete.id);
    } catch (err) {
      // ignore; best effort
      console.warn("Failed to delete question", err);
    }

    // Persist the updated order for remaining questions
    await Promise.all(newData.map((q, i) => persistQuestion(q, i, i)));
  };

  const addQuestion = async () => {
    const newQ = {
      question_text: "",
      question_type: "short_answer",
      tempId: crypto.randomUUID(),
    };

    // Insert into DB first so we get a proper numeric id (for FK constraints).
    const { data, error } = await supabase
      .from("questions")
      .insert({
        quiz_id: id,
        question_text: newQ.question_text,
        question_type: newQ.question_type,
        question_order: questionData.length,
        correct_answer: newQ.correct_answer ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to insert new question", error);
      return;
    }

    const questionWithId = { ...newQ, id: data.id };
    const newData = [...questionData, questionWithId];
    setQuestionData(newData);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = questionData.findIndex((q) => q.id === active.id);
    const newIndex = questionData.findIndex((q) => q.id === over.id);
    const reordered = arrayMove(questionData, oldIndex, newIndex).map(
      (q, i) => ({ ...q, question_order: i }),
    );
    setQuestionData(reordered);

    // Persist updated order in DB
    await Promise.all(reordered.map((q, i) => persistQuestion(q, i, i)));
  };

  const handleQuestionChange = (index, value) =>
    updateQuestion(index, { question_text: value });
  const handleQuestionTypeChange = async (index, type) => {
    const newData = [...questionData];
    newData[index].question_type = type;

    // When switching to multiple-choice, initialize a few default options only if none exist.
    if (
      type === "multiple_choice" &&
      (!newData[index].options || newData[index].options.length === 0)
    ) {
      newData[index].options = [
        { id: null, option_text: "Option 1", option_order: 0 },
        { id: null, option_text: "Option 2", option_order: 1 },
        { id: null, option_text: "Option 3", option_order: 2 },
      ];
    }

    setQuestionData(newData);
    await persistQuestion(newData[index], index, index);
  };

  return (
    <div>
      <Navbar />
      <div className="max-w-4xl mx-auto p-5">
        <div className="mt-20">
          <div className="border border-gray-700 rounded-lg mt-5 p-5 flex flex-col gap-3">
            <input
              value={editingTitle}
              onChange={(e) => updateQuiz("title", e.target.value)}
              className="text-2xl bg-black border-b outline-none text-white p-2"
              placeholder="Quiz Title"
            />
            <input
              value={editingDescription}
              onChange={(e) => updateQuiz("description", e.target.value)}
              className="bg-black border-b outline-none text-white p-2"
              placeholder="Quiz Description"
            />
          </div>

          <div className="mt-5 flex flex-col gap-4">
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questionData.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                {questionData.map((question, index) => (
                  <SortableItem
                    key={question.id}
                    id={question.id}
                    onDelete={() => deleteQuestion(index)}
                  >
                    <div className="border border-gray-700 rounded-lg mt-5 p-5 flex flex-col gap-3 bg-black">
                      <input
                        value={question.question_text}
                        onChange={(e) =>
                          handleQuestionChange(index, e.target.value)
                        }
                        className="border-b bg-black outline-none p-2 text-white"
                        placeholder="Question text"
                      />
                      <DropdownQuestionType
                        value={question.question_type}
                        onChange={(type) =>
                          handleQuestionTypeChange(index, type)
                        }
                      />

                      <div className="mt-2">
                        <div className="text-sm text-gray-400">
                          Correct answer
                        </div>
                        {question.question_type === "multiple_choice" ? (
                          <div className="flex gap-2 items-center">
                            <select
                              value={getDraftCorrectAnswer(question, index)}
                              onChange={(e) =>
                                setDraftCorrectAnswer(
                                  question,
                                  index,
                                  e.target.value,
                                )
                              }
                              className="flex-1 bg-black border border-gray-600 rounded p-2 text-white"
                            >
                              <option value="">(none)</option>
                              {question.options?.map((opt, optIndex) => (
                                <option
                                  key={opt.id ?? optIndex}
                                  value={opt.option_text}
                                >
                                  {opt.option_text || "(empty)"}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => saveCorrectAnswer(index)}
                              className="px-3 py-1 bg-blue-600 rounded text-white"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 items-center">
                            <input
                              value={getDraftCorrectAnswer(question, index)}
                              onChange={(e) =>
                                setDraftCorrectAnswer(
                                  question,
                                  index,
                                  e.target.value,
                                )
                              }
                              className="flex-1 bg-black border border-gray-600 rounded p-2 text-white"
                              placeholder="Correct answer"
                            />
                            <button
                              onClick={() => saveCorrectAnswer(index)}
                              className="px-3 py-1 bg-blue-600 rounded text-white"
                            >
                              Save
                            </button>
                          </div>
                        )}
                      </div>

                      {question.question_type === "multiple_choice" && (
                        <MultipleChoice
                          question={question}
                          onChange={(opts) => setQuestionOptions(index, opts)}
                          onSave={(opts) => saveQuestionOptions(index, opts)}
                        />
                      )}
                      {question.question_type === "short_answer" && (
                        <ShortAnswer />
                      )}
                      {question.question_type === "paragraph" && <Paragraph />}
                    </div>
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>

            <button
              onClick={addQuestion}
              className="bg-blue-600 p-3 rounded-lg mt-2 text-white"
            >
              + Add Question
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateQuiz;
