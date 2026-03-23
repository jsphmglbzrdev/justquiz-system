const SlidingToggle = ({ value = false, onChange }) => {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`
        relative w-10 h-5 flex items-center rounded-full
        transition-colors duration-300
        ${value ? "bg-blue-500" : "bg-gray-600"}
      `}
    >
      <span
        className={`
          absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full
          transition-transform duration-300 ease-in-out
          ${value ? "translate-x-5" : "translate-x-0"}
        `}
      />
    </button>
  );
};

export default SlidingToggle;