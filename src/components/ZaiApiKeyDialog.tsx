import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface ZaiApiKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (apiKey: string) => void;
}

export default function ZaiApiKeyDialog({
  isOpen,
  onClose,
  onSubmit,
}: ZaiApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState("");

  const handleSubmit = () => {
    onSubmit(apiKey);
    setApiKey("");
  };

  const handleClose = () => {
    setApiKey("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Z.AI API Key</DialogTitle>
          <DialogDescription>
            Enter your Z.AI API key from{" "}
            <a
              href="https://z.ai/manage-apikey/apikey-list"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-medium"
            >
              z.ai
            </a>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            type="password"
            placeholder="Paste your API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && apiKey.trim() !== "") handleSubmit();
            }}
            autoComplete="off"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={apiKey.trim() === ""}
            onClick={handleSubmit}
          >
            Add Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
