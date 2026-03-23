import { useEffect, useState } from "react";

const generateRoot = () => ({
  uiId: crypto.randomUUID(),
  option_text: "",
  children: [],
});

const generateChild = () => ({
  uiId: crypto.randomUUID(),
  option_text: "",
});

const DropdownTree = ({ question, onSave }) => {
  const [tree, setTree] = useState(() => {
    const opts = question.options || [];
    return Array.isArray(opts) ? opts : [];
  });

  useEffect(() => {
    const opts = question.options || [];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTree(Array.isArray(opts) ? opts : []);
  }, [question.options]);

  const persist = (nextTree) => {
    setTree(nextTree);
    onSave?.(nextTree);
  };

  const updateRoot = (rootIndex, value) => {
    const next = [...tree];
    next[rootIndex] = { ...next[rootIndex], option_text: value };
    persist(next);
  };

  const updateChild = (rootIndex, childIndex, value) => {
    const next = [...tree];
    const root = next[rootIndex];
    const children = root.children || [];
    children[childIndex] = { ...children[childIndex], option_text: value };
    next[rootIndex] = { ...root, children };
    persist(next);
  };

  const deleteRoot = (rootIndex) => {
    const next = [...tree];
    next.splice(rootIndex, 1);
    persist(next);
  };

  const deleteChild = (rootIndex, childIndex) => {
    const next = [...tree];
    const root = next[rootIndex];
    const children = [...(root.children || [])];
    children.splice(childIndex, 1);
    next[rootIndex] = { ...root, children };
    persist(next);
  };

  const addRoot = () => {
    const next = [...tree, generateRoot()];
    persist(next);
  };

  const addChild = (rootIndex) => {
    const next = [...tree];
    const root = next[rootIndex];
    const children = [...(root.children || []), generateChild()];
    next[rootIndex] = { ...root, children };
    persist(next);
  };

  return (
    <div className="mt-2">
      <div className="text-sm text-gray-400 mb-2">Dropdown options (two levels)</div>
      {tree.map((root, rootIndex) => (
        <div key={root.uiId} className="mb-4 border border-gray-700 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <input
              value={root.option_text}
              onChange={(e) => updateRoot(rootIndex, e.target.value)}
              placeholder="Top-level option"
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
            />
            <button
              onClick={() => deleteRoot(rootIndex)}
              className="px-2 py-1 bg-red-600 rounded text-white"
            >
              Remove
            </button>
          </div>

          <div className="space-y-2">
            {(root.children || []).map((child, childIndex) => (
              <div key={child.uiId} className="flex items-center gap-2">
                <input
                  value={child.option_text}
                  onChange={(e) => updateChild(rootIndex, childIndex, e.target.value)}
                  placeholder="Sub-option"
                  className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
                />
                <button
                  onClick={() => deleteChild(rootIndex, childIndex)}
                  className="px-2 py-1 bg-red-600 rounded text-white"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => addChild(rootIndex)}
              className="px-3 py-1 bg-blue-950 rounded text-white"
            >
              + Add Sub-option
            </button>
          </div>
        </div>
      ))}

      <button onClick={addRoot} className="mt-2 px-3 py-1 bg-blue-950 rounded text-white">
        + Add Top-level option
      </button>
    </div>
  );
};

export default DropdownTree;
