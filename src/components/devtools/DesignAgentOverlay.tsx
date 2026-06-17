"use client";

/**
 * Dev-only, draggable floating entry point for the Design Agent — modelled on
 * the Next.js dev indicator. Collapsed it's a small badge; clicking opens the
 * chat. Position persists across reloads.
 *
 * Hard gate: returns null unless running in development. The whole subtree
 * (chat panel, agent client code) is therefore dead-code-eliminated from
 * production bundles. See DESIGN-AGENT-IMPLEMENTATION.md §11.
 */
import { motion, useDragControls, useMotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ChatPanel } from "@/components/devtools/ChatPanel";

const LS_POS = "design-agent:pos";
const LS_OPEN = "design-agent:open";

export function DesignAgentOverlay() {
  if (process.env.NODE_ENV !== "development") return null;
  return <Overlay />;
}

function Overlay() {
  const [open, setOpen] = useState(false);
  const [moved, setMoved] = useState(false);
  const bounds = useRef<HTMLDivElement>(null);
  const controls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Restore open state after hydration (localStorage is client-only).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    try {
      if (localStorage.getItem(LS_OPEN) === "1") {
        timer = setTimeout(() => setOpen(true), 0);
      }
    } catch { /* ignore */ }
    return () => clearTimeout(timer);
  }, []);

  // Persist open state changes.
  useEffect(() => {
    try { localStorage.setItem(LS_OPEN, open ? "1" : "0"); } catch { /* ignore */ }
  }, [open]);

  // Restore last position.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_POS);
      if (saved) {
        const p = JSON.parse(saved) as { x: number; y: number };
        x.set(p.x);
        y.set(p.y);
      }
    } catch {
      /* ignore */
    }
  }, [x, y]);

  const persist = () => {
    try {
      localStorage.setItem(LS_POS, JSON.stringify({ x: x.get(), y: y.get() }));
    } catch {
      /* ignore */
    }
  };

  return (
    <div ref={bounds} className="pointer-events-none fixed inset-0 z-[2147483600]">
      <motion.div
        drag
        dragControls={controls}
        dragListener={false}
        dragConstraints={bounds}
        dragMomentum={false}
        dragElastic={0}
        onDragStart={() => setMoved(true)}
        onDragEnd={persist}
        style={{ x, y }}
        className="pointer-events-auto fixed bottom-6 right-6"
      >
        {open ? (
          <ChatPanel
            onClose={() => setOpen(false)}
            onDragHandlePointerDown={(e) => controls.start(e)}
          />
        ) : (
          <Button
            aria-label="Open Design Agent"
            onPointerDown={(e: React.PointerEvent) => {
              setMoved(false);
              controls.start(e);
            }}
            onClick={() => {
              if (!moved) setOpen(true);
            }}
            className="h-12 w-12 rounded-full p-0 shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <Icon name="sparkles" className="h-5 w-5" />
          </Button>
        )}
      </motion.div>
    </div>
  );
}
