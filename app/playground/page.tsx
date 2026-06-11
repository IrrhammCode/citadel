"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Brain,
  Upload,
  Play,
  Settings,
  FileText,
  Link,
  Plus,
  Trash2,
  ChevronRight,
  Zap,
  Target,
  DollarSign,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/motion";
import { useSystems } from "@/hooks/useSystems";
import {
  addTextKnowledge,
  addRuleKnowledge,
  getKnowledgeItems,
  removeKnowledge,
  type KnowledgeItem,
} from "@/lib/agent/knowledge";
import { FileUpload } from "@/components/agent/file-upload";
import {
  thinkQuick,
  type AgentState,
} from "@/lib/agent/brain";
import { toast } from "sonner";

export default function PlaygroundPage() {
  const { systems } = useSystems();
  const [selectedSystem, setSelectedSystem] = useState<string>("");
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [newText, setNewText] = useState("");
  const [newRule, setNewRule] = useState("");
  const [scenario, setScenario] = useState("");
  const [simulationResult, setSimulationResult] = useState<{
    action: { type: string; description: string; reasoning: string; confidence: number };
    reasoning: string;
  } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Load knowledge when system changes
  useEffect(() => {
    if (selectedSystem) {
      setKnowledge(getKnowledgeItems(selectedSystem));
    }
  }, [selectedSystem]);

  // Listen for knowledge updates
  useEffect(() => {
    const handler = () => {
      if (selectedSystem) {
        setKnowledge(getKnowledgeItems(selectedSystem));
      }
    };
    window.addEventListener("knowledge_updated", handler);
    return () => window.removeEventListener("knowledge_updated", handler);
  }, [selectedSystem]);

  const selectedSystemData = systems.find((s) => s.id === selectedSystem);

  // ── Add Text Knowledge ────────────────────────────────────

  function handleAddText() {
    if (!selectedSystem || !newText.trim()) return;
    addTextKnowledge(selectedSystem, `Text Knowledge`, newText);
    setNewText("");
    toast.success("Knowledge added");
  }

  // ── Add Rule ──────────────────────────────────────────────

  function handleAddRule() {
    if (!selectedSystem || !newRule.trim()) return;
    addRuleKnowledge(selectedSystem, newRule);
    setNewRule("");
    toast.success("Rule added");
  }

  // ── Remove Knowledge ──────────────────────────────────────

  function handleRemoveKnowledge(id: string) {
    removeKnowledge(id);
    toast.success("Knowledge removed");
  }

  // ── Run Simulation ────────────────────────────────────────

  async function handleSimulate() {
    if (!selectedSystem || !scenario.trim()) return;

    setIsSimulating(true);
    setSimulationResult(null);

    try {
      const state: AgentState = {
        systemId: selectedSystem,
        systemName: selectedSystemData?.name || "",
        goal: selectedSystemData?.goal || selectedSystemData?.description || "",
        budget: {
          total: selectedSystemData?.budget || 0,
          remaining: (selectedSystemData?.budget || 0) * 0.7,
          spent: (selectedSystemData?.budget || 0) * 0.3,
        },
        kpis: (selectedSystemData?.kpiTargets || []).map((kpi) => ({
          name: kpi.name,
          target: kpi.target,
          current: kpi.target * 0.8,
          unit: kpi.unit,
          isHigherBetter: kpi.isHigherBetter,
          status: "behind" as const,
        })),
        pendingTasks: [],
        recentTransactions: [],
        knowledge: knowledge.flatMap((k) => k.extractedRules),
      };

      const result = await thinkQuick(state, scenario);
      setSimulationResult(result);
    } catch (error) {
      toast.error("Simulation failed: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsSimulating(false);
    }
  }

  return (
    <AppShell
      title="Agent Playground"
      description="Configure agents, upload knowledge, and simulate behavior."
    >
      <FadeIn>
        <Tabs defaultValue="config" className="space-y-6">
          <TabsList>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="h-4 w-4" />
              Config
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Knowledge
            </TabsTrigger>
            <TabsTrigger value="simulate" className="gap-2">
              <Play className="h-4 w-4" />
              Simulate
            </TabsTrigger>
          </TabsList>

          {/* ── Agent Selector ──────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Agent</CardTitle>
              <CardDescription>Choose an agent to configure</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {systems.map((system) => (
                  <motion.button
                    key={system.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedSystem(system.id)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      selectedSystem === system.id
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700"
                    }`}
                  >
                    <Bot className="h-5 w-5 text-zinc-400" />
                    <div>
                      <p className="font-medium text-zinc-100">{system.name}</p>
                      <p className="text-xs text-zinc-500">{system.category}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── Config Tab ──────────────────────────────────── */}
          <TabsContent value="config">
            {selectedSystemData ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {selectedSystemData.name} Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Goal</Label>
                      <p className="text-sm text-zinc-300">
                        {selectedSystemData.goal || selectedSystemData.description}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Budget</Label>
                      <p className="text-sm text-zinc-300">
                        {selectedSystemData.budget || 0} USDC
                      </p>
                    </div>
                  </div>

                  {selectedSystemData.kpiTargets && selectedSystemData.kpiTargets.length > 0 && (
                    <div className="space-y-2">
                      <Label>KPI Targets</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {selectedSystemData.kpiTargets.map((kpi, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2"
                          >
                            <span className="text-sm text-zinc-300">{kpi.name}</span>
                            <span className="text-sm font-medium text-zinc-100">
                              {kpi.target}{kpi.unit === "x" ? "x" : kpi.unit === "%" ? "%" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-zinc-500">
                  Select an agent to configure
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Knowledge Tab ───────────────────────────────── */}
          <TabsContent value="knowledge">
            {selectedSystem ? (
              <div className="space-y-4">
                {/* Add Knowledge */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Add Knowledge</CardTitle>
                    <CardDescription>
                      Upload documents, text, or rules to train your agent
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* File Upload */}
                    <div className="space-y-2">
                      <Label>Upload Documents</Label>
                      <FileUpload
                        systemId={selectedSystem}
                        onUploadComplete={() => {
                          setKnowledge(getKnowledgeItems(selectedSystem));
                        }}
                      />
                    </div>

                    {/* Text Knowledge */}
                    <div className="space-y-2">
                      <Label>Text Knowledge</Label>
                      <div className="flex gap-2">
                        <textarea
                          className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                          placeholder="Paste text, guidelines, or instructions..."
                          value={newText}
                          onChange={(e) => setNewText(e.target.value)}
                          rows={3}
                        />
                        <Button onClick={handleAddText} disabled={!newText.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Rule Knowledge */}
                    <div className="space-y-2">
                      <Label>Custom Rule</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., Never approve payments over 100 USDC"
                          value={newRule}
                          onChange={(e) => setNewRule(e.target.value)}
                        />
                        <Button onClick={handleAddRule} disabled={!newRule.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Knowledge List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Knowledge Base ({knowledge.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {knowledge.length > 0 ? (
                      <Stagger className="space-y-2" stagger={0.05}>
                        {knowledge.map((item) => (
                          <StaggerItem key={item.id}>
                            <motion.div
                              whileHover={{ x: 4 }}
                              className="flex items-start justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-3"
                            >
                              <div className="flex items-start gap-3">
                                {item.type === "document" && <FileText className="h-4 w-4 text-zinc-400 mt-0.5" />}
                                {item.type === "text" && <FileText className="h-4 w-4 text-zinc-400 mt-0.5" />}
                                {item.type === "url" && <Link className="h-4 w-4 text-zinc-400 mt-0.5" />}
                                {item.type === "rule" && <Zap className="h-4 w-4 text-emerald-400 mt-0.5" />}
                                <div>
                                  <p className="text-sm font-medium text-zinc-100">
                                    {item.title}
                                  </p>
                                  <p className="text-xs text-zinc-500 mt-1">
                                    {item.extractedRules.length} rules extracted
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveKnowledge(item.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </motion.div>
                          </StaggerItem>
                        ))}
                      </Stagger>
                    ) : (
                      <p className="text-sm text-zinc-500 text-center py-4">
                        No knowledge added yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-zinc-500">
                  Select an agent to manage knowledge
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Simulate Tab ────────────────────────────────── */}
          <TabsContent value="simulate">
            {selectedSystem ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Simulate Agent Behavior</CardTitle>
                    <CardDescription>
                      Test how your agent would respond to a scenario
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Scenario</Label>
                      <textarea
                        className="flex min-h-[100px] w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                        placeholder="Describe a scenario... e.g., 'A new vendor DesignCo applied with 4.8 rating. Should I onboard them and pay 75 USDC?'"
                        value={scenario}
                        onChange={(e) => setScenario(e.target.value)}
                      />
                    </div>

                    <Button
                      onClick={handleSimulate}
                      disabled={!scenario.trim() || isSimulating}
                      className="w-full"
                    >
                      {isSimulating ? (
                        <>
                          <Brain className="h-4 w-4 animate-pulse" />
                          Agent thinking...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Run Simulation
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Simulation Result */}
                <AnimatePresence>
                  {simulationResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Agent Decision</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Action */}
                          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="default">
                                {simulationResult.action.type}
                              </Badge>
                              <span className="text-xs text-zinc-500">
                                Confidence: {(simulationResult.action.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-sm text-zinc-100">
                              {simulationResult.action.description}
                            </p>
                            <p className="text-xs text-zinc-400 mt-2">
                              {simulationResult.action.reasoning}
                            </p>
                          </div>

                          {/* Overall Reasoning */}
                          <div className="rounded-lg bg-zinc-800/30 p-4">
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                              Overall Reasoning
                            </p>
                            <p className="text-sm text-zinc-300">
                              {simulationResult.reasoning}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-zinc-500">
                  Select an agent to simulate
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </FadeIn>
    </AppShell>
  );
}
