import { useCallback, useState } from "react";
import { useLocalStorage } from "./hooks/use-local-storage";
import toast from "react-hot-toast";

export const SettingsForm = ({ onClose }: { onClose?: () => void }) => {
  const [apiKey, setApiKey] = useLocalStorage("openaiApiKey", "");
  const [systemPrompt, setSystemPrompt] = useLocalStorage(
    "systemPrompt",
    "Generate alt text from the given image"
  );

  const [apiKeyInput, setApiKeyInput] = useState(apiKey || "");
  const [systemPromptInput, setSystemPromptInput] = useState(
    systemPrompt || ""
  );

  const handleSave = useCallback(() => {
    setApiKey(apiKeyInput);
    setSystemPrompt(systemPromptInput);
    toast.success("Settings saved successfully!", {
      id: "settings-save-toast",
    });
  }, [apiKeyInput, setApiKey, setSystemPrompt, systemPromptInput]);

  return (
    <div className="min-h-screen flex flex-col space-y-8 items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="space-y-2 text-center text-muted-foreground">
        <h1 className="text-4xl font-bold text-black">Settings</h1>
      </div>
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <form className="space-y-6">
          <div>
            <label
              htmlFor="api-key"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              OpenAI API Key
            </label>
            <input
              type="password"
              id="api-key"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="system-prompt"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              System Prompt to generate alt text for the image
            </label>
            <textarea
              id="system-prompt"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32"
              value={systemPromptInput}
              onChange={(e) => setSystemPromptInput(e.target.value)}
            />
          </div>
          <div className="flex justify-between space-x-2">
            <button
              type="button"
              className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
