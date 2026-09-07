import { create } from "zustand";
import { runEchoPipeline } from "@/features/dashboard/echo/mockPipeline";
import type { AgentStep, EchoMessage } from "@/features/dashboard/echo/types";

interface EchoChatState {
  messages: EchoMessage[];
  busy: boolean;
  sendMessage: (text: string) => Promise<void>;
  /** Re-runs the pipeline for the same text and replaces the given
   *  assistant message's content — the message-actions row's "regenerate",
   *  which answers again in place rather than appending a new pair. */
  regenerate: (userText: string, assistantMessageId: string) => Promise<void>;
  reset: () => void;
}

/**
 * One conversation, shared by the side panel and the full page — a zustand
 * store rather than component state, specifically so "expand" (panel → full
 * page) continues the same conversation instead of starting a fresh one just
 * because the surface changed. See `mockPipeline.ts` for why every reply
 * here is canned rather than real.
 */
export const useEchoChat = create<EchoChatState>((set, get) => ({
  messages: [],
  busy: false,

  sendMessage: async (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().busy) return;

    const userMessage: EchoMessage = { id: `u-${Date.now()}`, role: "user", text: trimmed };
    const assistantId = `a-${Date.now()}`;
    const assistantMessage: EchoMessage = {
      id: assistantId,
      role: "assistant",
      text: "",
      steps: [],
    };

    set((s) => ({ messages: [...s.messages, userMessage, assistantMessage], busy: true }));

    const setAssistantSteps = (steps: AgentStep[]) => {
      set((s) => ({
        messages: s.messages.map((m) => (m.id === assistantId ? { ...m, steps } : m)),
      }));
    };

    const { reply, results, closingLine, followUps } = await runEchoPipeline(
      trimmed,
      setAssistantSteps
    );

    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === assistantId
          ? { ...m, text: reply, results, closingLine, followUps, steps: undefined, complete: true }
          : m
      ),
      busy: false,
    }));
  },

  regenerate: async (userText, assistantMessageId) => {
    if (get().busy) return;

    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === assistantMessageId
          ? { ...m, text: "", results: undefined, closingLine: undefined, followUps: undefined, steps: [], complete: false }
          : m
      ),
      busy: true,
    }));

    const setAssistantSteps = (steps: AgentStep[]) => {
      set((s) => ({
        messages: s.messages.map((m) => (m.id === assistantMessageId ? { ...m, steps } : m)),
      }));
    };

    const { reply, results, closingLine, followUps } = await runEchoPipeline(
      userText,
      setAssistantSteps
    );

    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === assistantMessageId
          ? { ...m, text: reply, results, closingLine, followUps, steps: undefined, complete: true }
          : m
      ),
      busy: false,
    }));
  },

  reset: () => set({ messages: [], busy: false }),
}));
