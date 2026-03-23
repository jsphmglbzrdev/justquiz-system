import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useLoading } from "../context/LoadingContext";
import Navbar from "../components/Navbar";
import supabase from "../supabase-client-config";
import DropdownQuestionType from "../components/DropdownQuestionType";
import MultipleChoice from "../components/question-types/MultipleChoice";
import Checkboxes from "../components/question-types/Checkboxes";
import DropdownTree from "../components/question-types/DropdownTree";
import ShortAnswer from "../components/question-types/ShortAnswer";
import Paragraph from "../components/question-types/Paragraph";
import SlidingToggle from "../components/SlidingToggle";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import QuiztoResponse from "../components/QuiztoResponse";
import { Trash2 } from "lucide-react";
import { notifySuccess, notifyError } from "../utils/toastService";
import RequiredToggle from "../components/toggles/RequiredToggle";
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
            className="text-gray-400 hover:text-gray-500 font-bold"
          >
            <div className="hover:bg-gray-800 p-2 transition-all rounded-full">
              <Trash2 />
            </div>
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
  const [showCorrectAnswer, setShowCorrectAnswer] = useState({});
  const [published, setPublished] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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
          setPublished(!!quizData.is_published);
        }
        const { data: questions } = await supabase
          .from("questions")
          .select("*, question_options(*)")
          .eq("quiz_id", id)
          .order("question_order", { ascending: true });
        if (questions) {
          setQuestionData(
            questions.map((q) => {
              let options = q.question_options || [];
              if (q.question_type === "dropdown") {
                // Dropdown trees are stored as a single JSON blob in question_options.option_text.
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
				// Capture question data
				const { data } = await supabase.from('questions').select('is_required').eq('quiz_id', id).single()
				console.log('This is', data);
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

  const handlePublish = async () => {
    setPublished(true);
    try {
      await supabase
        .from("quizzes")
        .update({ is_published: true })
        .eq("id", id);
      notifySuccess("Quiz published.");
    } catch (err) {
      // Silent fail if schema doesn't have is_published field.
      console.warn("Failed to update published state", err);
      notifyError("Failed to publish quiz.");
    }
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/play/${id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      notifySuccess("Quiz link copied to clipboard.");
    } catch (err) {
      console.warn("Failed to copy quiz link", err);
      notifyError("Failed to copy quiz link.");
    }
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
      is_required: question.is_required ?? false,
    });

    if (questionError) {
      console.error("Failed to upsert question", questionError, { question });
    }

    if (
      (question.question_type === "multiple_choice" ||
        question.question_type === "checkbox") &&
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
    } else if (question.question_type === "dropdown") {
      // Persist the dropdown tree as a single JSON blob in question_options.
      await supabase
        .from("question_options")
        .delete()
        .eq("question_id", question.id);

      const treeJson = JSON.stringify(question.options ?? []);
      const { error: optionsError } = await supabase
        .from("question_options")
        .insert({
          question_id: question.id,
          option_text: treeJson,
          option_order: 0,
        });

      if (optionsError) {
        console.error(
          "Failed to insert question_options (dropdown)",
          optionsError,
          {
            questionId: question.id,
            options: question.options,
          },
        );
      }
    } else {
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

  const getQuestionKey = (question, index) =>
    question.id ?? question.tempId ?? index;

  const parseCorrectAnswerValue = (question) => {
    const raw = question.correct_answer;
    if (
      question.question_type === "checkbox" ||
      question.question_type === "dropdown"
    ) {
      if (!raw) return [];
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
          if (typeof parsed === "string") return [parsed];
        } catch {
          // Fall back to using the raw string value.
        }
        return [raw];
      }
      return Array.isArray(raw) ? raw : [];
    }

    return raw ?? "";
  };

  const getDraftCorrectAnswer = (question, index) => {
    const key = getQuestionKey(question, index);
    if (key in correctAnswerDrafts) return correctAnswerDrafts[key];
    return parseCorrectAnswerValue(question);
  };

  const setDraftCorrectAnswer = (question, index, value) => {
    setCorrectAnswerDrafts((prev) => ({
      ...prev,
      [getQuestionKey(question, index)]: value,
    }));
  };

  const serializeCorrectAnswerValue = (question, value) => {
    if (
      question.question_type === "checkbox" ||
      question.question_type === "dropdown"
    ) {
      return JSON.stringify(value ?? []);
    }
    return value;
  };

  const handleRequiredToggle = async (index, value) => {
    await updateQuestion(index, { is_required: value });
  };

  const saveCorrectAnswer = async (index) => {
    const question = questionData[index];
    if (!question) return;

    const oldKey = getQuestionKey(question, index);
    const draft =
      correctAnswerDrafts[oldKey] ?? parseCorrectAnswerValue(question);
    const valueToPersist = serializeCorrectAnswerValue(question, draft);

    let updatedQuestion;
    try {
      updatedQuestion = await updateQuestion(index, {
        correct_answer: valueToPersist,
      });
      notifySuccess("Correct answer saved.");
    } catch (err) {
      console.error("Failed to save correct answer", err);
      notifyError("Failed to save correct answer.");
      return;
    }

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
      notifySuccess("Question deleted.");
    } catch (err) {
      // ignore; best effort
      console.warn("Failed to delete question", err);
      notifyError("Failed to delete question.");
    }

    // Persist the updated order for remaining questions
    await Promise.all(newData.map((q, i) => persistQuestion(q, i, i)));
  };

  const addQuestion = async () => {
    const newQ = {
      question_text: "",
      question_type: "short_answer",
      tempId: crypto.randomUUID(),
      is_required: false,
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
        is_required: newQ.is_required ?? false,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to insert new question", error);
      notifyError("Failed to add question.");
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
    newData[index].correct_answer = null;

    // Initialize some sensible defaults for newly-selected question types.
    if (
      (type === "multiple_choice" || type === "checkbox") &&
      (!newData[index].options || newData[index].options.length === 0)
    ) {
      newData[index].options = [
        { id: null, option_text: "Option 1", option_order: 0 },
        { id: null, option_text: "Option 2", option_order: 1 },
        { id: null, option_text: "Option 3", option_order: 2 },
      ];
    }

    if (
      type === "dropdown" &&
      (!newData[index].options || newData[index].options.length === 0)
    ) {
      newData[index].options = [
        {
          uiId: crypto.randomUUID(),
          option_text: "Option 1",
          children: [
            {
              uiId: crypto.randomUUID(),
              option_text: "Option 1A",
              children: [],
            },
            {
              uiId: crypto.randomUUID(),
              option_text: "Option 1B",
              children: [],
            },
          ],
        },
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
          <QuiztoResponse />

          <div className="border border-gray-700 rounded-lg mt-5 p-5 flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center md:gap-3">
              <input
                value={editingTitle}
                onChange={(e) => updateQuiz("title", e.target.value)}
                className="flex-1 text-2xl bg-gray-950 
             transition-all duration-300 ease-in-out
             outline-none text-white p-2
             focus:border-blue-800 focus:shadow-lg focus:scale-[1.02] focus:border-b"
                placeholder="Quiz Title"
              />
              <div className="flex items-center gap-2 mt-2 md:mt-0">
                <button
                  onClick={handlePublish}
                  disabled={published}
                  className="px-3 py-1 bg-blue-950 rounded text-white disabled:opacity-50"
                >
                  {published ? "Published" : "Publish"}
                </button>
                {published && (
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1 bg-blue-950 rounded text-white"
                  >
                    {copiedLink ? "Copied!" : "Copy link"}
                  </button>
                )}
              </div>
            </div>
            <input
              value={editingDescription}
              onChange={(e) => updateQuiz("description", e.target.value)}
              className="flex-1 text-xl bg-gray-950 
             transition-all duration-300 ease-in-out
             outline-none text-white p-2
             focus:border-blue-800 focus:shadow-lg focus:scale-[1.02] focus:border-b"
              placeholder="Quiz Description"
            />
          </div>

          <div className="mt-5 flex flex-col gap-4 pb-10">
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questionData.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                {questionData.map((question, index) => {
                  const questionKey = getQuestionKey(question, index);
                  const showAnswer = showCorrectAnswer[questionKey] ?? true;

                  return (
                    <SortableItem
                      key={question.id}
                      id={question.id}
                      onDelete={() => deleteQuestion(index)}
                    >
                      <div className="relative border border-gray-700 rounded-lg mt-5 p-5 pb-10 flex flex-col gap-3 bg-gray-950">
                        {/* Question Text */}
                        <input
                          value={question.question_text}
                          onChange={(e) =>
                            handleQuestionChange(index, e.target.value)
                          }
                          className="flex-1 text-xl transition-all duration-300 ease-in-out outline-none text-white p-2 bg-gray-950 focus:border-blue-800 focus:shadow-lg focus:scale-[1.02] focus:border-b"
                          placeholder="Question text"
                        />

                        {/* Question Type */}
                        <div className="flex items-center justify-between gap-2">
                          <DropdownQuestionType
                            value={question.question_type}
                            onChange={(type) =>
                              handleQuestionTypeChange(index, type)
                            }
                          />
                          {question.id && (
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-semibold ${question.is_required ? "text-red-400" : "text-gray-400"}`}
                              >
                                {question.is_required ? "Required" : "Optional"}
                              </span>
                              <RequiredToggle
                                questionId={question.id}
                                onChange={(value) =>
                                  handleRequiredToggle(index, value)
                                }
                              />
                            </div>
                          )}
                        </div>

                        {/* Correct Answer Section */}
                        <div className="mt-2">
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-400">
                              Correct answer
                            </div>
                            <button
                              onClick={() =>
                                setShowCorrectAnswer((prev) => ({
                                  ...prev,
                                  [questionKey]: !showAnswer,
                                }))
                              }
                              className="text-xs px-2 py-1 border border-gray-600 rounded hover:bg-gray-800"
                            >
                              {showAnswer ? "Hide" : "Show"}
                            </button>
                          </div>

                          {showAnswer ? (
                            <>
                              {/* Multiple Choice */}
                              {question.question_type === "multiple_choice" && (
                                <div className="flex gap-2 items-center">
                                  <select
                                    value={getDraftCorrectAnswer(
                                      question,
                                      index,
                                    )}
                                    onChange={(e) =>
                                      setDraftCorrectAnswer(
                                        question,
                                        index,
                                        e.target.value,
                                      )
                                    }
                                    className="flex-1 bg-gray-950 border border-gray-600 rounded p-2 text-white"
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
                                    className="px-3 py-1 bg-blue-950 rounded text-white"
                                  >
                                    Save
                                  </button>
                                </div>
                              )}

                              {/* Checkbox */}
                              {question.question_type === "checkbox" && (
                                <div className="flex flex-col gap-2">
                                  {(question.options || []).map(
                                    (opt, optIndex) => {
                                      const key =
                                        opt.id ?? opt.uiId ?? opt.option_text;
                                      const value = opt.option_text;
                                      const draft =
                                        getDraftCorrectAnswer(
                                          question,
                                          index,
                                        ) || [];
                                      const checked = draft.includes(key);

                                      return (
                                        <label
                                          key={opt.id ?? opt.uiId ?? optIndex}
                                          className="flex items-center gap-2"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => {
                                              const next = checked
                                                ? draft.filter((v) => v !== key)
                                                : [...draft, key];
                                              setDraftCorrectAnswer(
                                                question,
                                                index,
                                                next,
                                              );
                                            }}
                                            className="accent-blue-500"
                                          />
                                          <span className="text-white">
                                            {value || "(empty)"}
                                          </span>
                                        </label>
                                      );
                                    },
                                  )}

                                  <button
                                    onClick={() => saveCorrectAnswer(index)}
                                    className="px-3 py-1 bg-blue-950 rounded text-white w-fit"
                                  >
                                    Save
                                  </button>
                                </div>
                              )}

                              {/* Dropdown */}
                              {question.question_type === "dropdown" && (
                                <div className="text-sm text-gray-400">
                                  Dropdown questions do not have a correct
                                  answer.
                                </div>
                              )}

                              {/* Other Types */}
                              {question.question_type !== "multiple_choice" &&
                                question.question_type !== "checkbox" &&
                                question.question_type !== "dropdown" && (
                                  <div className="flex gap-2 items-center">
                                    <input
                                      value={getDraftCorrectAnswer(
                                        question,
                                        index,
                                      )}
                                      onChange={(e) =>
                                        setDraftCorrectAnswer(
                                          question,
                                          index,
                                          e.target.value,
                                        )
                                      }
                                      className="flex-1 bg-gray-950 border border-gray-600 rounded p-2 text-white"
                                      placeholder="Correct answer"
                                    />
                                    <button
                                      onClick={() => saveCorrectAnswer(index)}
                                      className="px-3 py-1 bg-blue-950 rounded text-white"
                                    >
                                      Save
                                    </button>
                                  </div>
                                )}
                            </>
                          ) : (
                            <div className="text-xs text-gray-500">
                              Correct answer hidden
                            </div>
                          )}
                        </div>

                        {/* ✅ Sliding Toggle (Bottom Right) */}
                        {/* <div className="absolute bottom-3 right-3">
                          <RequiredToggle questionId={}/>
                        </div> */}

                        {/* Question Type Renderers */}
                        {question.question_type === "multiple_choice" && (
                          <MultipleChoice
                            question={question}
                            onChange={(opts) => setQuestionOptions(index, opts)}
                            onSave={(opts) => saveQuestionOptions(index, opts)}
                          />
                        )}

                        {question.question_type === "checkbox" && (
                          <Checkboxes
                            question={question}
                            onSave={(opts) => saveQuestionOptions(index, opts)}
                          />
                        )}

                        {question.question_type === "dropdown" && (
                          <DropdownTree
                            question={question}
                            onSave={(opts) => saveQuestionOptions(index, opts)}
                          />
                        )}

                        {question.question_type === "short_answer" && (
                          <ShortAnswer />
                        )}
                        {question.question_type === "paragraph" && (
                          <Paragraph />
                        )}
                      </div>
                    </SortableItem>
                  );
                })}
              </SortableContext>
            </DndContext>

            <button
              onClick={addQuestion}
              className="bg-blue-950 p-3 rounded-lg mt-2 text-white"
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
