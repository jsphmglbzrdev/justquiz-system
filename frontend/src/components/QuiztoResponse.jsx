
import {useState} from "react";
import { Link } from "react-router-dom";

const QuiztoResponse = () => {
	const [isActive, setIsActive] = useState(false)

	const links = {label : "Questions", label : "Responses"}
  return (
    <div>
      <div>
        <div className="flex gap-5">
          {links.map((label, index) => (
						<div key={index}>{label}</div>
					))}
        </div>
      </div>
    </div>
  );
};

export default QuiztoResponse;
