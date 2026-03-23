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

const Responses = () => {

  const { id } = useParams();
 

  return (
    <div>
      <Navbar />

      <div className="max-w-4xl mx-auto p-5">
        <div className="mt-20">
          <QuiztoResponse />

        </div>
      </div>
    </div>
  );
};

export default Responses;
