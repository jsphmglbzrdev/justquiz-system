import React from "react";
import { useNavigate, Link } from "react-router-dom";

const Navbar = () => {
	
  return (
    <div
      className="fixed top-0 flex py-2 px-8 items-center justify-between w-full bg-gray-400 rounded-md bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 
"
    >
      <div className="text-2xl font-semibold">JustQuiz</div>
      <div className="flex gap-5">
        <div>Account</div>
        <div>Settings</div>
				<Link to="/trash">Trash</Link>
      </div>
    </div>
  );
};

export default Navbar;
