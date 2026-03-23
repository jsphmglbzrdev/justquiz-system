import { useEffect, useState } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SortableOption = ({ option, index, handleChange, handleDelete, handleBlur }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: option.uiId });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 mb-2 bg-gray-900 p-2 rounded"
    >
      <span {...attributes} {...listeners} className="cursor-grab text-gray-400">
        ⠿
      </span>
      <input
        className="flex-1 bg-gray-800 border-b border-gray-600 outline-none p-1 text-white"
        value={option.option_text}
        onChange={(e) => handleChange(index, e.target.value)}
        onBlur={(e) => handleBlur(index, e.target.value)}
      />
      <button onClick={() => handleDelete(index)} className="text-red-500 font-bold px-2">
        ×
      </button>
    </div>
  );
};

const Checkboxes = ({ question, onSave }) => {
  const [options, setOptions] = useState(() =>
    (question.options || []).map((o) => ({ ...o, uiId: o.id ?? crypto.randomUUID() })),
  );

  useEffect(() => {
    const incoming = question.options || [];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptions((prev) => {
      const prevById = new Map(prev.filter((o) => o.id != null).map((o) => [o.id, o]));
      const prevByOrder = new Map(prev.map((o) => [o.option_order, o]));
      return incoming.map((o) => {
        const existingById = o.id != null ? prevById.get(o.id) : null;
        const existingByOrder = prevByOrder.get(o.option_order);
        const base = existingById || existingByOrder;
        if (base) {
          return { ...base, ...o };
        }
        return { ...o, uiId: crypto.randomUUID() };
      });
    });
  }, [question.options]);

  const saveOptionAt = (index, value) => {
    const newOptions = [...options];
    newOptions[index].option_text = value;
    setOptions(newOptions);
    onSave?.(newOptions);
  };

  const handleChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index].option_text = value;
    setOptions(newOptions);
  };

  const handleAdd = () => {
    const existingNumbers = options
      .map((opt) => {
        const match = /Option\s*(\d+)/i.exec(opt.option_text);
        return match ? Number(match[1]) : null;
      })
      .filter((num) => Number.isFinite(num));
    const nextNum = existingNumbers.length ? Math.max(...existingNumbers) + 1 : options.length + 1;

    const newOption = {
      uiId: crypto.randomUUID(),
      id: null,
      option_text: `Option ${nextNum}`,
      option_order: options.length,
    };
    const newOptions = [...options, newOption];
    setOptions(newOptions);
    onSave?.(newOptions);
  };

  const handleDelete = (index) => {
    const newOptions = options
      .filter((_, i) => i !== index)
      .map((opt, i) => ({ ...opt, option_order: i }));
    setOptions(newOptions);
    onSave?.(newOptions);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = options.findIndex((o) => o.uiId === active.id);
    const newIndex = options.findIndex((o) => o.uiId === over.id);
    const newOptions = arrayMove(options, oldIndex, newIndex).map((opt, i) => ({
      ...opt,
      option_order: i,
    }));
    setOptions(newOptions);
    onSave?.(newOptions);
  };

  return (
    <div className="mt-2">
      <div className="text-sm text-gray-400 mb-2">Answer options (checkboxes)</div>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={options.map((o) => o.uiId)}
          strategy={verticalListSortingStrategy}
        >
          {options.map((option, index) => (
            <SortableOption
              key={option.uiId}
              option={option}
              index={index}
              handleChange={handleChange}
              handleDelete={handleDelete}
              handleBlur={saveOptionAt}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button onClick={handleAdd} className="mt-2 px-3 py-1 bg-blue-950 rounded text-white">
        + Add Option
      </button>
    </div>
  );
};

export default Checkboxes;
