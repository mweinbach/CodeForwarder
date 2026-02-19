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

interface QwenEmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string) => void;
}

export default function QwenEmailDialog({
  isOpen,
  onClose,
  onSubmit,
}: QwenEmailDialogProps) {
  const [email, setEmail] = useState("");

  const handleSubmit = () => {
    onSubmit(email);
    setEmail("");
  };

  const handleClose = () => {
    setEmail("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Qwen Account Email</DialogTitle>
          <DialogDescription>
            Enter your Qwen account email address
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && email.trim() !== "") handleSubmit();
            }}
            autoComplete="email"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={email.trim() === ""}
            onClick={handleSubmit}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
