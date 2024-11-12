import { useCallback, useState } from "react";
import { useLocalStorage } from "./hooks/use-local-storage";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const SettingsForm = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
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
    onOpenChange(false);
  }, [
    apiKeyInput,
    setApiKey,
    setSystemPrompt,
    systemPromptInput,
    onOpenChange,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="api-key">OpenAI API Key</Label>
            <Input
              type="password"
              id="api-key"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="system-prompt">
              System Prompt to generate alt text for the image
            </Label>
            <Textarea
              id="system-prompt"
              className="h-32"
              value={systemPromptInput}
              onChange={(e) => setSystemPromptInput(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
