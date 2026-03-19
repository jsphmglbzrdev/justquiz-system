import { useEffect, useRef, useState } from "react";

const QUESTION_TYPES = [
  { label: "Multiple Choice", value: "multiple_choice" },
  { label: "Checkboxes", value: "checkbox" },
  { label: "Dropdown (tree)", value: "dropdown" },
  { label: "Short Answer", value: "short_answer" },
  { label: "Paragraph", value: "paragraph" },
];

const DropdownQuestionType = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selected = QUESTION_TYPES.find((q) => q.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (open && wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative w-60" ref={wrapperRef}>
      {/* Selected */}
      <div
        onClick={() => setOpen(!open)}
        className="cursor-pointer bg-black border border-gray-500 px-4 py-2 rounded-md flex justify-between items-center hover:border-white transition"
      >
        <span>{selected?.label || "Select type"}</span>
        <span className="text-sm">▼</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 w-full bg-black border border-gray-600 rounded-md mt-2 z-50 shadow-lg">
          {QUESTION_TYPES.map((type) => (
            <div
              key={type.value}
              onClick={() => {
                onChange(type.value);
                setOpen(false);
              }}
              className="px-4 py-2 hover:bg-gray-800 cursor-pointer transition"
            >
              {type.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownQuestionType;