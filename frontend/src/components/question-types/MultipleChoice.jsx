import { useEffect, useState } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SortableOption = ({ option, index, handleChange, handleDelete, handleBlur, handleKeyDown }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: option.uiId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 mb-2 bg-gray-900 p-2 rounded">
      <span {...attributes} {...listeners} className="cursor-grab text-gray-400">⠿</span>
      <input
        className="flex-1 bg-gray-800 border-b border-gray-600 outline-none p-1 text-white"
        value={option.option_text}
        onChange={e => handleChange(index, e.target.value)}
        onBlur={e => handleBlur(index, e.target.value)}
        onKeyDown={e => handleKeyDown(e, index, e.target.value)}
      />
      <button onClick={() => handleDelete(index)} className="text-red-500 font-bold px-2">×</button>
    </div>
  );
};

const MultipleChoice = ({ question, onSave }) => {
  const [options, setOptions] = useState(() =>
    (question.options || []).map((o) => ({ ...o, uiId: o.id ?? crypto.randomUUID() })),
  );

  // Keep local options in sync with upstream question.options
  // (do not regenerate uiId every time to avoid losing focus)
  useEffect(() => {
    const incoming = question.options || [];
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
    const newOption = {
      uiId: crypto.randomUUID(),
      id: null,
      option_text: "",
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
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={options.map((o) => o.uiId)} strategy={verticalListSortingStrategy}>
          {options.map((option, index) => (
            <SortableOption
              key={option.uiId}
              option={option}
              index={index}
              handleChange={handleChange}
              handleDelete={handleDelete}
              handleBlur={saveOptionAt}
              handleKeyDown={(e, idx, value) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveOptionAt(idx, value);
                }
              }}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button onClick={handleAdd} className="mt-2 px-3 py-1 bg-green-600 rounded text-white">
        + Add Option
      </button>
    </div>
  );
};

export default MultipleChoice;