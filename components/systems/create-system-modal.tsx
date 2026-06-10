"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveCustomSystem } from "@/lib/storage";
import type { AutonomousSystem } from "@/types/system";

export function CreateSystemModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("custom");
  const [customPrompt, setCustomPrompt] = useState("");

  function handleCreate() {
    if (!name || !description) return;

    const newSystem: AutonomousSystem = {
      id: crypto.randomUUID(),
      name,
      description,
      category,
      status: "idle",
      customPrompt: customPrompt.trim() || undefined,
      isCustom: true,
    };

    saveCustomSystem(newSystem);
    // Trigger custom event to re-render systems list in same window
    window.dispatchEvent(new Event("systems_updated"));
    
    setOpen(false);
    setName("");
    setDescription("");
    setCategory("custom");
    setCustomPrompt("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Custom System
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Custom Autonomous System</DialogTitle>
          <DialogDescription>
            Define a custom AI-driven treasury system with specific Venice AI compliance rules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">System Name</Label>
            <Input
              id="name"
              placeholder="e.g. Freelancer Payouts"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="What does this system do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customPrompt">Venice AI Compliance Rule (Optional)</Label>
            <textarea
              id="customPrompt"
              className="flex min-h-[80px] w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
              placeholder="e.g. Only approve if recipient address is 0x... and amount is under 50 USDC."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
            <p className="text-xs text-zinc-500">
              This rule will be injected directly into the Venice AI system prompt to enforce strict guidelines.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name || !description}>
            Create System
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
