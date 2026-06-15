"use client";

import { useEffect, useState } from "react";
import { KeyRound, Shield, Eye, EyeOff, Save, Trash2, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiKeys, saveApiKeys, type ApiKeys } from "@/lib/storage";
import { syncToServer } from "@/lib/store-sync";
import { AppShell } from "@/components/layout/app-shell";

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKeys>({ venice: "", bai: "" });
  const [showVenice, setShowVenice] = useState(false);
  const [showBai, setShowBai] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    setKeys(getApiKeys());
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      saveApiKeys(keys);
      const result = await syncToServer();
      if (result.ok) {
        setSaveStatus("success");
      } else {
        setSaveStatus("error");
      }
    } catch (e) {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleClear = () => {
    setKeys({ venice: "", bai: "" });
  };

  return (
    <AppShell
      title="Settings"
      description="Configure your API keys and local environment settings."
    >
      <div className="space-y-6">
        <div className="vault-card overflow-hidden">
          <div className="border-b border-[--border-default] bg-zinc-900/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[--brand-glow] border border-[--border-emerald]">
                <KeyRound className="h-5 w-5 text-[--brand-primary]" />
              </div>
              <div>
                <h2 className="font-display text-lg font-medium text-white">Bring Your Own Key (BYOK)</h2>
                <p className="text-sm text-zinc-400">Manage your AI provider API keys. Keys are saved locally and synced to your server session.</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Venice AI Key */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Venice AI API Key</label>
              <div className="relative">
                <input
                  type={showVenice ? "text" : "password"}
                  value={keys.venice || ""}
                  onChange={(e) => setKeys({ ...keys, venice: e.target.value })}
                  placeholder="Leave empty to use platform default..."
                  className="w-full rounded-lg border border-[--border-default] bg-zinc-900 px-4 py-2.5 pr-10 text-sm text-white placeholder-zinc-500 focus:border-[--border-emerald] focus:outline-none focus:ring-1 focus:ring-[--border-emerald]"
                />
                <button
                  type="button"
                  onClick={() => setShowVenice(!showVenice)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showVenice ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-zinc-500">Used for Agent reasoning, image generation, and Venice CFO Audit.</p>
            </div>

            {/* B.AI Fallback Key */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">B.AI Fallback API Key</label>
              <div className="relative">
                <input
                  type={showBai ? "text" : "password"}
                  value={keys.bai || ""}
                  onChange={(e) => setKeys({ ...keys, bai: e.target.value })}
                  placeholder="Leave empty to use platform default..."
                  className="w-full rounded-lg border border-[--border-default] bg-zinc-900 px-4 py-2.5 pr-10 text-sm text-white placeholder-zinc-500 focus:border-[--border-emerald] focus:outline-none focus:ring-1 focus:ring-[--border-emerald]"
                />
                <button
                  type="button"
                  onClick={() => setShowBai(!showBai)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showBai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-zinc-500">Used as a fallback engine if Venice AI is unavailable or rate-limited.</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[--border-default] bg-zinc-900/30 px-6 py-4">
            <Button
              variant="outline"
              onClick={handleClear}
              className="text-zinc-400 hover:text-red-400"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Keys
            </Button>

            <div className="flex items-center gap-4">
              {saveStatus === "success" && (
                <span className="text-sm font-medium text-[--text-success]">Successfully synced!</span>
              )}
              {saveStatus === "error" && (
                <span className="text-sm font-medium text-red-400">Failed to sync to server.</span>
              )}
              <Button
                variant="emerald"
                onClick={handleSave}
                disabled={isSaving}
                className="min-w-[120px]"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save & Sync
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="rounded-lg border border-[--border-subtle] bg-[--canvas-elevated] p-5">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 text-zinc-400" />
            <div>
              <h3 className="font-medium text-zinc-200">Zero-Retention Security</h3>
              <p className="mt-1 text-sm text-zinc-400 leading-relaxed">
                When using Bring Your Own Key, your inference runs directly through your own accounts. 
                Platform operators cannot view your raw API requests. This ensures maximum privacy for 
                your treasury data and allows you to leverage your enterprise models and limits.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
