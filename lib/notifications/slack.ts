import "server-only";

import type { ApprovalRequest } from "@/lib/agent/autonomy";
import type { StoredPermission } from "@/types/permission";

function dashboardUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/dashboard`;
}

async function postSlack(payload: Record<string, unknown>): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`[slack] webhook returned ${res.status}: ${await res.text()}`);
    }
  } catch (error) {
    console.warn("[slack] notification failed:", error);
  }
}

function amountLine(request: ApprovalRequest): string {
  if (request.amount == null) return "—";
  return `${request.amount} USDC${request.recipient ? ` → \`${request.recipient}\`` : ""}`;
}

export async function notifySlackApprovalPending(
  request: ApprovalRequest,
  systemName?: string,
): Promise<void> {
  const label = systemName ?? request.systemId;
  await postSlack({
    text: `Pending CFO approval: ${label} — ${request.description}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "🔔 Pending CFO Approval", emoji: true },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Agent:*\n${label}` },
          { type: "mrkdwn", text: `*Type:*\n${request.type}` },
          { type: "mrkdwn", text: `*Amount:*\n${amountLine(request)}` },
          {
            type: "mrkdwn",
            text: `*Confidence:*\n${Math.round(request.confidence * 100)}%`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Description:*\n${request.description}\n\n*Reasoning:*\n${request.reasoning}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Open Dashboard", emoji: true },
            url: dashboardUrl(),
            style: "primary",
          },
        ],
      },
    ],
  });
}

export async function notifySlackApprovalResolved(
  request: ApprovalRequest,
  systemName: string | undefined,
  event: "approved" | "rejected" | "executed",
  extra?: { txHash?: string; signer?: string },
): Promise<void> {
  const label = systemName ?? request.systemId;
  const icons = { approved: "✅", rejected: "❌", executed: "⛓️" };
  const titles = {
    approved: "CFO Approved",
    rejected: "CFO Rejected",
    executed: "Spend Executed On-Chain",
  };

  const fields = [
    { type: "mrkdwn", text: `*Agent:*\n${label}` },
    { type: "mrkdwn", text: `*Amount:*\n${amountLine(request)}` },
  ];
  if (extra?.signer) {
    fields.push({ type: "mrkdwn", text: `*Signer:*\n\`${extra.signer}\`` });
  }
  if (extra?.txHash) {
    fields.push({ type: "mrkdwn", text: `*Tx:*\n\`${extra.txHash}\`` });
  }

  await postSlack({
    text: `${titles[event]}: ${label} — ${request.description}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `${icons[event]} ${titles[event]}`, emoji: true },
      },
      { type: "section", fields },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*${request.description}*` },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View Dashboard", emoji: true },
            url: dashboardUrl(),
          },
        ],
      },
    ],
  });
}

export async function notifySlackPermissionExpiring(permission: StoredPermission): Promise<void> {
  const expiresAt = new Date(permission.expiry * 1000).toISOString();
  await postSlack({
    text: `Permission expiring soon: ${permission.systemName}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "⏰ Permission Expiring Soon", emoji: true },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Agent:*\n${permission.systemName}` },
          { type: "mrkdwn", text: `*Daily limit:*\n${permission.maxDailySpend} USDC` },
          { type: "mrkdwn", text: `*Expires:*\n${expiresAt}` },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Renew / Revoke", emoji: true },
            url: dashboardUrl(),
            style: "primary",
          },
        ],
      },
    ],
  });
}
