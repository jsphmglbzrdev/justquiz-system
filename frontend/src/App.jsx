import React from "react";
import { Route, Routes } from "react-router-dom";
import CreateQuiz from "./pages/CreateQuiz";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout";
import QuizPlayer from "./pages/QuizPlayer";
import Trash from "./pages/Trash";
import Responses from "./pages/Responses";
import QuizSettings from "./pages/QuizSettings";
const App = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} index />
        <Route path="/quiz/:id" element={<CreateQuiz />} />
        <Route path="/play/:id" element={<QuizPlayer />} />
        <Route path="/trash" element={<Trash />} />
        <Route path="/responses/quiz/:id" element={<Responses />} />
        <Route path="/settings/quiz/:id" element={<QuizSettings />} />
      </Route>
    </Routes>
  );
};

export default App;
