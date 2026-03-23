import React from "react";

const EmailField = ({ value = "", onChange }) => {
  return (
    <div className="border border-gray-700 rounded-lg mt-5 p-5">
      <div>
        <div>Email Address <span className="text-red-400">*</span></div>
        <input
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder="example: johndoe@gmail.com"
          className="bg-gray-950 text-white w-full p-2

    border-b border-gray-600
    border-t-0 border-l-0 border-r-0
    rounded-none

    resize-none

    focus:outline-none
    focus:border-b-blue-500

    transition-colors duration-300 "
          type="email"
          required
        />
      </div>
    </div>
  );
};

export default EmailField;
