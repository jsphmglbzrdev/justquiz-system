import { createContext, useContext, useState, useCallback } from "react";

const ToggleContext = createContext();

export const ToggleProvider = ({ children }) => {
  const [toggleMap, setToggleMap] = useState({});

  const setToggle = useCallback((id, value) => {
    setToggleMap((prev) => ({
      ...prev,
      [id]: value,
    }));
  }, []);

  const getToggle = useCallback((id) => {
    return toggleMap[id]; // ✅ NO default
  }, [toggleMap]);

  return (
    <ToggleContext.Provider value={{ getToggle, setToggle }}>
      {children}
    </ToggleContext.Provider>
  );
};

export const useToggle = () => useContext(ToggleContext);