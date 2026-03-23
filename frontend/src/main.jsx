import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { LoadingProvider } from "./context/LoadingContext.jsx";
import { ToggleProvider } from "./context/ToggleContext.jsx";
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <LoadingProvider>
        <ToggleProvider>
          <App />
        </ToggleProvider>
      </LoadingProvider>
    </BrowserRouter>
  </StrictMode>,
);
