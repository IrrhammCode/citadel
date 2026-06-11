"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Vote,
  Users,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  TrendingUp,
  Scale,
  Gavel,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Stagger, StaggerItem, MotionCard } from "@/components/motion/motion";
import { fadeUp, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  DEFAULT_COUNCIL_MEMBERS,
  getCouncilProposals,
  getPendingProposals,
  createCouncilProposal,
  castCouncilVote,
  type CouncilProposal,
  type CouncilMember,
  type CouncilVote as CouncilVoteType,
} from "@/lib/agent/council";

// ── Member icon map ──────────────────────────────────────────────
const memberIcons: Record<string, typeof Vote> = {
  "marketing-agent": TrendingUp,
  "finance-agent": Scale,
  "compliance-agent": Shield,
  "security-agent": Gavel,
};

const memberColors: Record<string, string> = {
  "marketing-agent": "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "finance-agent": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "compliance-agent": "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "security-agent": "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

// ── Status badge ─────────────────────────────────────────────────
function StatusBadge({ status }: { status: CouncilProposal["status"] }) {
  const map = {
    pending: {
      icon: Clock,
      label: "Pending",
      cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    },
    approved: {
      icon: CheckCircle2,
      label: "Approved",
      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
    rejected: {
      icon: XCircle,
      label: "Rejected",
      cls: "bg-red-500/15 text-red-400 border-red-500/30",
    },
    executed: {
      icon: CheckCircle2,
      label: "Executed",
      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
  } as const;
  const s = map[status];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        s.cls,
      )}
    >
      <Icon className="h-3 w-3" />
      {s.label}
    </span>
  );
}

// ── Vote pill ────────────────────────────────────────────────────
function VotePill({ vote }: { vote: CouncilVoteType["vote"] }) {
  const map = {
    approve: { icon: CheckCircle2, label: "Approve", cls: "text-emerald-400 bg-emerald-500/10" },
    reject: { icon: XCircle, label: "Reject", cls: "text-red-400 bg-red-500/10" },
    abstain: { icon: Clock, label: "Abstain", cls: "text-zinc-400 bg-zinc-500/10" },
  } as const;
  const v = map[vote];
  const Icon = v.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", v.cls)}>
      <Icon className="h-3 w-3" />
      {v.label}
    </span>
  );
}

// ── Council Member Card ──────────────────────────────────────────
function MemberCard({ member, index }: { member: CouncilMember; index: number }) {
  const Icon = memberIcons[member.systemId] || Users;
  const color = memberColors[member.systemId] || "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";

  return (
    <StaggerItem>
      <motion.div
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
        className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-emerald-500/20"
      >
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg border", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-100 truncate">{member.name}</p>
          <p className="text-xs text-zinc-500">Weight: {member.weight} vote</p>
        </div>
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-400">
          {index + 1}
        </div>
      </motion.div>
    </StaggerItem>
  );
}

// ── Proposal Card ────────────────────────────────────────────────
function ProposalCard({
  proposal,
  onVote,
}: {
  proposal: CouncilProposal;
  onVote: (proposalId: string, memberId: string, vote: "approve" | "reject" | "abstain") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showVotePanel, setShowVotePanel] = useState(false);
  const approveCount = proposal.votes.filter((v) => v.vote === "approve").length;
  const rejectCount = proposal.votes.filter((v) => v.vote === "reject").length;
  const abstainCount = proposal.votes.filter((v) => v.vote === "abstain").length;
  const totalVoted = proposal.votes.length;
  const progress = (approveCount / proposal.requiredVotes) * 100;

  const votedMembers = new Set(proposal.votes.map((v) => v.memberId));
  const unvotedMembers = DEFAULT_COUNCIL_MEMBERS.filter((m) => !votedMembers.has(m.systemId));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden transition-colors hover:border-zinc-700"
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={proposal.status} />
              {proposal.amount && (
                <span className="text-xs font-mono text-emerald-400">
                  {proposal.amount.toLocaleString()} USDC
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-zinc-100 mt-1">{proposal.title}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{proposal.description}</p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Vote progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
            <span>
              {approveCount}/{proposal.requiredVotes} approvals needed
            </span>
            <span>{totalVoted}/4 voted</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                proposal.status === "approved" || proposal.status === "executed"
                  ? "bg-emerald-500"
                  : proposal.status === "rejected"
                    ? "bg-red-500"
                    : "bg-amber-500",
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Vote summary chips */}
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> {approveCount}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-red-400">
            <XCircle className="h-3 w-3" /> {rejectCount}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
            <Clock className="h-3 w-3" /> {abstainCount}
          </span>
          {proposal.proposedBy && (
            <span className="ml-auto text-xs text-zinc-600">
              by {proposal.proposedBy}
            </span>
          )}
        </div>
      </div>

      {/* Expanded section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-zinc-800"
          >
            {/* Cast votes */}
            {proposal.votes.length > 0 && (
              <div className="p-5 space-y-2">
                <p className="text-xs font-medium text-zinc-400 mb-2">Cast Votes</p>
                {proposal.votes.map((v) => {
                  const member = DEFAULT_COUNCIL_MEMBERS.find((m) => m.systemId === v.memberId);
                  const Icon = memberIcons[v.memberId] || Users;
                  return (
                    <div key={v.memberId} className="flex items-center gap-3 rounded-lg bg-zinc-950/50 px-3 py-2">
                      <Icon className="h-4 w-4 text-zinc-500" />
                      <span className="text-xs font-medium text-zinc-300 flex-1">
                        {member?.name || v.memberId}
                      </span>
                      <VotePill vote={v.vote} />
                      <span className="text-[11px] text-zinc-600 max-w-[200px] truncate">{v.reason}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Vote actions (for pending proposals) */}
            {proposal.status === "pending" && unvotedMembers.length > 0 && (
              <div className="border-t border-zinc-800 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-zinc-400">Cast a Vote</p>
                  <button
                    onClick={() => setShowVotePanel(!showVotePanel)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    {showVotePanel ? "Hide" : "Show voting panel"}
                  </button>
                </div>
                <AnimatePresence>
                  {showVotePanel && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-2"
                    >
                      {unvotedMembers.map((member) => {
                        const Icon = memberIcons[member.systemId] || Users;
                        return (
                          <div
                            key={member.systemId}
                            className="flex items-center gap-2 rounded-lg bg-zinc-950/50 px-3 py-2"
                          >
                            <Icon className="h-4 w-4 text-zinc-500" />
                            <span className="text-xs text-zinc-400 flex-1">{member.name}</span>
                            <div className="flex gap-1.5">
                              {(["approve", "reject", "abstain"] as const).map((v) => (
                                <button
                                  key={v}
                                  onClick={() => onVote(proposal.id, member.systemId, v)}
                                  className={cn(
                                    "rounded-md px-2 py-1 text-[11px] font-medium transition-all",
                                    v === "approve" && "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
                                    v === "reject" && "bg-red-500/10 text-red-400 hover:bg-red-500/20",
                                    v === "abstain" && "bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20",
                                  )}
                                >
                                  {v === "approve" ? "✓" : v === "reject" ? "✗" : "—"}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── New Proposal Modal ───────────────────────────────────────────
function NewProposalForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; amount?: number; recipient?: string; proposedBy: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [proposedBy, setProposedBy] = useState(DEFAULT_COUNCIL_MEMBERS[0].systemId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      amount: amount ? Number(amount) : undefined,
      recipient: recipient.trim() || undefined,
      proposedBy,
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <Vote className="h-4 w-4 text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100">New Proposal</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Approve marketing budget increase"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the proposal details..."
              rows={3}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-colors resize-none"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Amount (USDC)</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                type="text"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-colors font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Recipient</label>
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-colors font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Proposed By</label>
            <select
              value={proposedBy}
              onChange={(e) => setProposedBy(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-colors"
            >
              {DEFAULT_COUNCIL_MEMBERS.map((m) => (
                <option key={m.systemId} value={m.systemId}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              Create Proposal
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function CouncilPage() {
  const [proposals, setProposals] = useState<CouncilProposal[]>([]);
  const [showNewProposal, setShowNewProposal] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadProposals = useCallback(() => {
    setProposals(getCouncilProposals());
  }, []);

  useEffect(() => {
    loadProposals();
  }, [loadProposals, refreshKey]);

  const handleCreateProposal = (data: {
    title: string;
    description: string;
    amount?: number;
    recipient?: string;
    proposedBy: string;
  }) => {
    createCouncilProposal(data);
    setRefreshKey((k) => k + 1);
  };

  const handleVote = (proposalId: string, memberId: string, vote: "approve" | "reject" | "abstain") => {
    const reasons = {
      approve: "Reviewed and approved for execution",
      reject: "Does not meet compliance requirements",
      abstain: "Insufficient data to make a decision",
    };
    try {
      castCouncilVote({ proposalId, memberId, vote, reason: reasons[vote] });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Vote failed:", err);
    }
  };

  const activeProposals = proposals.filter((p) => p.status === "pending");
  const resolvedProposals = proposals.filter((p) => p.status !== "pending");
  const displayProposals = activeTab === "active" ? activeProposals : resolvedProposals;

  // Stats
  const totalProposals = proposals.length;
  const approvedCount = proposals.filter((p) => p.status === "approved" || p.status === "executed").length;
  const rejectedCount = proposals.filter((p) => p.status === "rejected").length;

  return (
    <AppShell
      title="Agent Council"
      description="Multi-agent voting system for treasury decisions. Majority consensus required."
    >
      <div className="space-y-6">
        {/* Stats row */}
        <Stagger className="grid grid-cols-2 gap-4 sm:grid-cols-4" stagger={0.06}>
          <StaggerItem>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-zinc-500">Council Members</span>
              </div>
              <p className="text-2xl font-semibold text-zinc-100">{DEFAULT_COUNCIL_MEMBERS.length}</p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-zinc-500">Active Proposals</span>
              </div>
              <p className="text-2xl font-semibold text-zinc-100">{activeProposals.length}</p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-zinc-500">Approved</span>
              </div>
              <p className="text-2xl font-semibold text-emerald-400">{approvedCount}</p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-xs text-zinc-500">Rejected</span>
              </div>
              <p className="text-2xl font-semibold text-red-400">{rejectedCount}</p>
            </div>
          </StaggerItem>
        </Stagger>

        {/* Council Members */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-zinc-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Council Members</h2>
            <span className="ml-auto text-xs text-zinc-600">
              3/4 majority required
            </span>
          </div>
          <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" stagger={0.06}>
            {DEFAULT_COUNCIL_MEMBERS.map((member, i) => (
              <MemberCard key={member.systemId} member={member} index={i} />
            ))}
          </Stagger>
        </div>

        {/* Proposals section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab("active")}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium transition-colors",
                  activeTab === "active" ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                <Clock className="h-4 w-4" />
                Active
                {activeProposals.length > 0 && (
                  <span className="ml-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-400">
                    {activeProposals.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium transition-colors",
                  activeTab === "history" ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                <History className="h-4 w-4" />
                History
                {resolvedProposals.length > 0 && (
                  <span className="ml-1 rounded-full bg-zinc-500/15 px-1.5 py-0.5 text-[10px] text-zinc-400">
                    {resolvedProposals.length}
                  </span>
                )}
              </button>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowNewProposal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Proposal
            </motion.button>
          </div>

          {/* Proposals list */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {displayProposals.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16"
                >
                  <Vote className="h-8 w-8 text-zinc-700 mb-3" />
                  <p className="text-sm text-zinc-500">
                    {activeTab === "active" ? "No active proposals" : "No voting history yet"}
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">
                    {activeTab === "active" ? "Create a new proposal to get started" : "Resolved proposals will appear here"}
                  </p>
                </motion.div>
              ) : (
                displayProposals.map((p) => (
                  <ProposalCard key={p.id} proposal={p} onVote={handleVote} />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* New Proposal Modal */}
      <AnimatePresence>
        {showNewProposal && (
          <NewProposalForm
            onClose={() => setShowNewProposal(false)}
            onSubmit={handleCreateProposal}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}
