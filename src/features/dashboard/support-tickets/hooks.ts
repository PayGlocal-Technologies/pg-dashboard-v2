"use client";

import { toast } from "sonner";
import { useGet, usePost } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useProductContext } from "@/stores/useProductContext";
import {
  supportTicketApi,
  supportTicketConversationsApi,
  supportTicketsApi,
} from "@/features/dashboard/support-tickets/services";
import type {
  CreateTicketPayload,
  CreateTicketResponse,
  RaiseTicketInput,
  SupportTicket,
  TicketConversationEntry,
  TicketConversationsResponse,
  TicketDetailResponse,
  TicketListResponse,
} from "@/features/dashboard/support-tickets/types";

/**
 * The `{ucicId}` path segment.
 *
 * `profile.ucicId` is what the API document names, and this API is
 * business-scoped (its responses carry Freshdesk's `company_id`). But the
 * field is nullable on the profile, so it falls back to `profile.mid` rather
 * than leaving the merchant with a dead page — the two are the same value for
 * most merchants anyway.
 *
 * Note the opposite call is correct elsewhere: `useReferralWallet` must send
 * `mid` into a segment the influencer service *names* "ucicId", and passing
 * the real `ucicId` there 403s. These two are genuinely different endpoints;
 * do not "align" them.
 *
 * Gated on `isGuestUser` (`role === "ONBOARDING_USER"`, a merchant partway
 * through onboarding) at the user's instruction: those users do not raise
 * tickets through this page. `isOnboardingUser` is returned rather than folded
 * silently into `isReady` so the page can say why it is empty — a blank list
 * with no explanation reads as a bug.
 */
export function useSupportScope(): {
  ucicId: string;
  isReady: boolean;
  isOnboardingUser: boolean;
} {
  const ucicId = useApp((s) => s.profile?.ucicId);
  const mid = useApp((s) => s.profile?.mid);
  const isGuestUser = useApp((s) => s.isGuestUser);
  const resolved = (ucicId ?? mid ?? "").trim();
  return {
    ucicId: resolved,
    isReady: !!resolved && !isGuestUser,
    isOnboardingUser: isGuestUser,
  };
}

/**
 * Which Freshdesk desk the ticket routes to, from the product the merchant is
 * currently looking at.
 *
 * "HOME" is not a product, so it resolves by what the merchant actually holds:
 * a PACB-only merchant on the Home tab means MCA, not PA. Without that, every
 * ticket raised from Home would land on the PA desk. C2B and BillX are valid
 * `cfBusiness` values but nothing in this dashboard distinguishes them, so
 * they are never sent.
 */
function useCfBusiness(): string {
  const activeContext = useProductContext((s) => s.activeContext);
  const paMids = useApp((s) => s.paMids);
  const paCbMids = useApp((s) => s.paCbMids);

  const hasPa = paMids.length > 0;
  const hasMca = paCbMids.length > 0;

  // What the merchant actually holds outranks the header tab. `activeContext`
  // is a persisted UI preference, not a fact about the ticket: an MCA-only
  // merchant can sit on the Payments tab indefinitely, and routing their
  // settlement query to the PA desk because of it is simply wrong.
  if (hasMca && !hasPa) return "MCA";
  if (hasPa && !hasMca) return "PA";

  // Holds both (or neither has loaded): now the tab is the best signal there
  // is. "HOME" is not a product, so it falls to PA.
  return activeContext === "PACB" ? "MCA" : "PA";
}

/**
 * `cf_team`, but only the one value the dashboard can actually know.
 *
 * Freshdesk offers Enterprise Merchant / SMB Merchant / Partnership. Nothing
 * in the session distinguishes the first two — `midContractType` on MidConfig
 * is a contract type used for a badge abbreviation, not a segment — so those
 * are left to the server's "SMB Merchant" default.
 *
 * `isPartnerUser` does identify the third exactly, and without this every
 * partner-raised ticket lands on the desk tagged as an SMB merchant.
 */
function useCfTeam(): string | undefined {
  const isPartnerUser = useApp((s) => s.isPartnerUser);
  return isPartnerUser ? "Partnership" : undefined;
}

/**
 * A message worth showing the merchant, or the fallback.
 *
 * The JSON create/reply endpoints answer a validation failure with an **empty**
 * 400 body (Spring bean-validation rejects before the controller runs), so all
 * that reaches here is axios' own "Request failed with status code 400" —
 * never something to put in front of a merchant. The multipart variants do
 * return a real message, and that one is worth surfacing.
 */
function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { message?: string } | null)?.message;
  if (!message || /status code \d+/i.test(message)) return fallback;
  return message;
}

const TICKETS_KEY = "support-tickets";

/** Every ticket raised under the caller's business. */
export function useSupportTickets(): {
  tickets: SupportTicket[];
  isLoading: boolean;
  isError: boolean;
} {
  const { ucicId, isReady } = useSupportScope();

  // refetchOnWindowFocus overrides useGet's own `false` default, deliberately.
  // Tickets do not change because of anything the merchant does here — an
  // agent works them in Freshdesk and moves the status — so a dashboard left
  // open shows a stale status indefinitely. Coming back to the tab is exactly
  // the moment a merchant is asking "has support replied yet?".
  const { data, isPending, isError } = useGet<TicketListResponse>(
    [TICKETS_KEY, ucicId],
    supportTicketsApi(ucicId),
    { enabled: isReady, refetchOnWindowFocus: true }
  );

  return {
    tickets: data?.data?.tickets ?? [],
    isLoading: isReady && isPending,
    isError,
  };
}

/**
 * One ticket's full detail.
 *
 * Fetched even though the list already carries the ticket: the document calls
 * this "full detail" and only ever shows the list response elided, so the
 * description may live here alone. The caller falls back to its list row while
 * this is in flight, so the drawer has something to render immediately.
 */
export function useTicketDetail(ticketId: number | null): {
  ticket: SupportTicket | null;
  isLoading: boolean;
} {
  const { ucicId, isReady } = useSupportScope();
  const enabled = isReady && ticketId !== null;

  const { data, isPending } = useGet<TicketDetailResponse>(
    ["support-ticket", ucicId, ticketId],
    supportTicketApi(ucicId, ticketId ?? ""),
    { enabled, refetchOnWindowFocus: true }
  );

  return { ticket: data?.data?.ticket ?? null, isLoading: enabled && isPending };
}

/**
 * A ticket's reply thread, private agent notes removed.
 *
 * The filter is a rule from the API reference, not a preference: `private:
 * true` is an internal note between agents and must never reach the merchant.
 * It is applied here, in the hook, so no component can render an unfiltered
 * thread by forgetting to.
 */
export function useTicketConversations(ticketId: number | null): {
  conversations: TicketConversationEntry[];
  isLoading: boolean;
  isError: boolean;
} {
  const { ucicId, isReady } = useSupportScope();
  const enabled = isReady && ticketId !== null;

  // Same reasoning as the list: the replies arrive from an agent, not from
  // anything this page did.
  const { data, isPending, isError } = useGet<TicketConversationsResponse>(
    ["support-ticket-conversations", ucicId, ticketId],
    supportTicketConversationsApi(ucicId, ticketId ?? ""),
    { enabled, refetchOnWindowFocus: true }
  );

  return {
    conversations: (data?.data?.conversations ?? []).filter((entry) => !entry.private),
    isLoading: enabled && isPending,
    isError,
  };
}

/**
 * Raise a ticket.
 *
 * Sends JSON when there are no attachments and `FormData` when there are — the
 * same URL either way, with only `Content-Type` distinguishing them, which the
 * shared mutation hook sets itself once it sees a FormData body.
 *
 * `cfTeam` is never sent: Enterprise-vs-SMB is an internal segmentation the
 * merchant cannot know, so the server's own default is better than a guess
 * from here.
 */
export function useCreateTicket(): {
  createTicket: (input: RaiseTicketInput, onCreated: (ticket: SupportTicket) => void) => void;
  isCreating: boolean;
  canCreate: boolean;
} {
  const { ucicId, isReady } = useSupportScope();
  const cfBusiness = useCfBusiness();
  const cfTeam = useCfTeam();

  const { mutate, isPending } = usePost<CreateTicketResponse, CreateTicketPayload | FormData>(
    supportTicketsApi(ucicId),
    { invalidateQueries: [[TICKETS_KEY, ucicId]] }
  );

  const createTicket = (
    input: RaiseTicketInput,
    onCreated: (ticket: SupportTicket) => void
  ): void => {
    const fields: CreateTicketPayload = {
      subject: input.subject.trim(),
      description: input.description.trim(),
      cfBusiness,
      cfIssue: input.cfIssue,
      cfCategory: input.cfCategory,
      // Omitted entirely rather than sent empty when unknown, so the server
      // applies its own default instead of overwriting it with "".
      ...(cfTeam ? { cfTeam } : {}),
    };

    let body: CreateTicketPayload | FormData = fields;
    if (input.attachments.length > 0) {
      const form = new FormData();
      // Guarded: appending an absent optional field would send the literal
      // string "undefined" as its value.
      Object.entries(fields).forEach(([key, value]) => {
        if (typeof value === "string") form.append(key, value);
      });
      // Repeated `attachments` entries — the field is `file[]`.
      input.attachments.forEach((file) => form.append("attachments", file));
      body = form;
    }

    mutate(body, {
      onSuccess: (res) => {
        const ticket = res?.data?.ticket;
        toast.success(ticket?.id ? `Ticket #${ticket.id} raised` : "Ticket raised", {
          description: "You can track it under My tickets.",
        });
        if (ticket) onCreated(ticket);
      },
      onError: (error) =>
        toast.error(errorMessage(error, "Couldn't raise the ticket. Please try again.")),
    });
  };

  return { createTicket, isCreating: isPending, canCreate: isReady };
}
