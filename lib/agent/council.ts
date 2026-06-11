// Agent Council - Voting System for Citadel
// Allows multiple agents to vote together before large transactions

export type CouncilMember = {
  systemId: string;
  name: string;
  weight: number;
};

export type CouncilVote = {
  memberId: string;
  vote: "approve" | "reject" | "abstain";
  reason: string;
  timestamp: number;
};

export type CouncilProposal = {
  id: string;
  title: string;
  description: string;
  amount?: number;
  recipient?: string;
  proposedBy: string;
  votes: CouncilVote[];
  status: "pending" | "approved" | "rejected" | "executed";
  requiredVotes: number;
  createdAt: number;
  resolvedAt?: number;
};

// Default council members
export const DEFAULT_COUNCIL_MEMBERS: CouncilMember[] = [
  { systemId: "marketing-agent", name: "Marketing Agent", weight: 1 },
  { systemId: "finance-agent", name: "Finance Agent", weight: 1 },
  { systemId: "compliance-agent", name: "Compliance Agent", weight: 1 },
  { systemId: "security-agent", name: "Security Agent", weight: 1 },
];

// In-memory store (replace with DB in production)
const proposals: Map<string, CouncilProposal> = new Map();
let proposalCounter = 0;

function generateProposalId(): string {
  proposalCounter++;
  return `proposal-${Date.now()}-${proposalCounter}`;
}

/**
 * Create a new council proposal for voting.
 * Majority voting: 3 out of 4 votes needed by default.
 */
export function createCouncilProposal(params: {
  title: string;
  description: string;
  amount?: number;
  recipient?: string;
  proposedBy: string;
  requiredVotes?: number;
}): CouncilProposal {
  const proposal: CouncilProposal = {
    id: generateProposalId(),
    title: params.title,
    description: params.description,
    amount: params.amount,
    recipient: params.recipient,
    proposedBy: params.proposedBy,
    votes: [],
    status: "pending",
    requiredVotes: params.requiredVotes ?? 3, // majority of 4
    createdAt: Date.now(),
  };

  proposals.set(proposal.id, proposal);
  return proposal;
}

/**
 * Cast a vote on a pending proposal.
 * Each member can only vote once per proposal.
 */
export function castCouncilVote(params: {
  proposalId: string;
  memberId: string;
  vote: "approve" | "reject" | "abstain";
  reason: string;
}): CouncilProposal {
  const proposal = proposals.get(params.proposalId);
  if (!proposal) {
    throw new Error(`Proposal not found: ${params.proposalId}`);
  }

  if (proposal.status !== "pending") {
    throw new Error(`Proposal is not pending: ${proposal.status}`);
  }

  const existingVote = proposal.votes.find((v) => v.memberId === params.memberId);
  if (existingVote) {
    throw new Error(`Member ${params.memberId} has already voted on this proposal`);
  }

  const vote: CouncilVote = {
    memberId: params.memberId,
    vote: params.vote,
    reason: params.reason,
    timestamp: Date.now(),
  };

  proposal.votes.push(vote);

  // Auto-resolve if enough votes collected
  resolveProposal(params.proposalId);

  return proposal;
}

/**
 * Get all proposals.
 */
export function getCouncilProposals(): CouncilProposal[] {
  return Array.from(proposals.values());
}

/**
 * Get only pending proposals.
 */
export function getPendingProposals(): CouncilProposal[] {
  return Array.from(proposals.values()).filter((p) => p.status === "pending");
}

/**
 * Resolve a proposal by checking if it has enough approve/reject votes.
 * - Approved: approve votes >= requiredVotes
 * - Rejected: reject votes > (total members - requiredVotes), or all members voted and not enough approvals
 */
export function resolveProposal(proposalId: string): CouncilProposal {
  const proposal = proposals.get(proposalId);
  if (!proposal) {
    throw new Error(`Proposal not found: ${proposalId}`);
  }

  if (proposal.status !== "pending") {
    return proposal;
  }

  const approveVotes = proposal.votes.filter((v) => v.vote === "approve").length;
  const rejectVotes = proposal.votes.filter((v) => v.vote === "reject").length;
  const totalMembers = DEFAULT_COUNCIL_MEMBERS.length;

  if (approveVotes >= proposal.requiredVotes) {
    proposal.status = "approved";
    proposal.resolvedAt = Date.now();
  } else if (rejectVotes > totalMembers - proposal.requiredVotes) {
    // Rejection threshold: if enough rejects that approval is impossible
    proposal.status = "rejected";
    proposal.resolvedAt = Date.now();
  } else if (proposal.votes.length === totalMembers && approveVotes < proposal.requiredVotes) {
    // All members voted but didn't reach approval threshold
    proposal.status = "rejected";
    proposal.resolvedAt = Date.now();
  }

  return proposal;
}

/**
 * Get a single proposal by ID.
 */
export function getCouncilProposalById(proposalId: string): CouncilProposal | undefined {
  return proposals.get(proposalId);
}
