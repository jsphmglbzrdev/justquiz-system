import { useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";

const QuiztoResponse = () => {
  const { id } = useParams();
  const location = useLocation();

  const labelData = [
    { label: "Question", path: `/quiz/${id}` },
    { label: "Responses", path: `/responses/quiz/${id}` },
    { label: "Settings", path: `/settings/quiz/${id}` },
  ];

  return (
    <div className="flex gap-4">
      {labelData.map((data) => {
        const isActive = location.pathname === data.path;

        return (
          <Link
            key={data.label}
            to={data.path}
            className={`transition pb-1 ${
              isActive
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-white hover:text-blue-400"
            }`}
          >
            {data.label}
          </Link>
        );
      })}
    </div>
  );
};

export default QuiztoResponse;