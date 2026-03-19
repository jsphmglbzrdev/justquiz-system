import React from "react";
import { Route, Routes } from "react-router-dom";
import CreateQuiz from "./pages/CreateQuiz";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout";
import QuizPlayer from "./pages/QuizPlayer";
import Trash from "./pages/Trash";

const App = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} index />
        <Route path="/quiz/:id" element={<CreateQuiz />} />
        <Route path="/play/:id" element={<QuizPlayer />} />
        <Route path="/trash" element={<Trash />} />
      </Route>
    </Routes>
  );
};

export default App;
