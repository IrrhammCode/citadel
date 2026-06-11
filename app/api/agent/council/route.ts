import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createCouncilProposal,
  castCouncilVote,
  getCouncilProposals,
  getPendingProposals,
  getCouncilProposalById,
  DEFAULT_COUNCIL_MEMBERS,
} from "@/lib/agent/council";

const createProposalSchema = z.object({
  action: z.literal("create"),
  title: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().optional(),
  recipient: z.string().optional(),
  proposedBy: z.string().min(1),
  requiredVotes: z.number().min(1).max(4).optional(),
});

const castVoteSchema = z.object({
  action: z.literal("vote"),
  proposalId: z.string().min(1),
  memberId: z.string().min(1),
  vote: z.enum(["approve", "reject", "abstain"]),
  reason: z.string().min(1),
});

// ── GET — Get proposals ─────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter"); // "pending" | "all" (default)
    const proposalId = searchParams.get("id");

    // Single proposal lookup
    if (proposalId) {
      const proposal = getCouncilProposalById(proposalId);
      if (!proposal) {
        return NextResponse.json(
          { error: `Proposal not found: ${proposalId}` },
          { status: 404 }
        );
      }
      return NextResponse.json({ proposal, members: DEFAULT_COUNCIL_MEMBERS });
    }

    const proposals =
      filter === "pending" ? getPendingProposals() : getCouncilProposals();

    return NextResponse.json({
      proposals,
      members: DEFAULT_COUNCIL_MEMBERS,
      total: proposals.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get proposals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── POST — Create proposal or cast vote ─────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Create proposal
    if (body.action === "create") {
      const parsed = createProposalSchema.parse(body);
      const proposal = createCouncilProposal(parsed);
      return NextResponse.json({ success: true, proposal }, { status: 201 });
    }

    // Cast vote
    if (body.action === "vote") {
      const parsed = castVoteSchema.parse(body);
      const proposal = castCouncilVote(parsed);
      return NextResponse.json({ success: true, proposal });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "create" or "vote".' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to process request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
