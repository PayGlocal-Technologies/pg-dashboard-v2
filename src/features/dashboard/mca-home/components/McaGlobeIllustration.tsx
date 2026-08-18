"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { geoCentroid, geoDistance, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties, Polygon } from "geojson";
import worldTopology from "world-atlas/countries-50m.json";
import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

/** Shown once, on a visitor's first arrival at this globe, dismissed
 * permanently (localStorage) on first drag/click, or automatically after
 * HINT_AUTO_DISMISS_MS if the visitor never interacts with it at all. */
const GLOBE_HINT_STORAGE_KEY = "mca_globe_hint_dismissed_v1";
const HINT_AUTO_DISMISS_MS = 6000;

/** Internal projection/viewBox resolution, deliberately higher than the
 * globe's displayed CSS size so coastlines (small islands, bays) keep their
 * detail instead of looking chunky when the SVG is scaled up. Every other
 * absolute size below (markers, strokes) is derived as a fraction of SIZE so
 * this only affects path precision, not the globe's visual proportions. */
const SIZE = 440;
const INITIAL_TILT_DEG = -22;
/** Max degrees the globe can be tilted (pitch) by dragging, either way. */
const MAX_TILT_DEG = 85;
/** Auto-rotation speed, expressed as "this many degrees per this many
 * milliseconds" (~18s per revolution), the animation loop scales it by each
 * frame's real elapsed time rather than a fixed per-tick amount. */
const SPIN_STEP_DEG = 0.9;
const SPIN_INTERVAL_MS = 45;
/** Country rings whose centroid is more than this many radians past the
 * visible hemisphere's edge (Math.PI / 2) are skipped entirely before the
 * expensive geoPath computation runs, generously large so no country pops in
 * or out visibly, this is purely a "don't bother computing paths we're sure
 * are fully hidden" perf shortcut, the real clipping is still done by the
 * projection/clipPath regardless. */
const CULL_MARGIN_RAD = 0.6;
/** Degrees rotated per pixel of pointer drag. */
const DRAG_SENSITIVITY = 0.35;
/** Pointer must move more than this (px) during a press for it to count as a
 * drag rather than a click, otherwise every drag-release would also toggle
 * pin the country under the pointer. */
const DRAG_CLICK_THRESHOLD_PX = 4;

const RIM_STROKE_WIDTH = SIZE * 0.0045;
const RIM_INSET = SIZE * 0.0045;
/** Gap (px) kept between the popover and the globe container's edge when
 * clamping its position so it never gets cut off. */
const POPOVER_EDGE_MARGIN_PX = 6;
/** Gap (px) between a country's anchor point and the popover when it opens
 * to that side. */
const POPOVER_ANCHOR_GAP_PX = 10;

const worldTopo = worldTopology as unknown as Topology;
const worldFeatures = (
  feature(worldTopo, worldTopo.objects.countries as GeometryCollection) as FeatureCollection<
    Geometry,
    GeoJsonProperties
  >
).features;

/** Antarctica (numeric id "010"), irrelevant to this dashboard and, being a
 * large polar landmass, the single feature most prone to orthographic
 * clipping artifacts at low simplification, dropped rather than risk it. */
const ANTARCTICA_NUMERIC_ID = "010";

interface CountryPolygon {
  id: string | undefined;
  polygon: Feature<Polygon, GeoJsonProperties>;
  /** Precomputed once at module load (not per-frame), used to cull this ring
   * out of the render before the expensive geoPath call when it's clearly on
   * the far side of the globe, see CULL_MARGIN_RAD. */
  centroid: [number, number];
}

/**
 * Every country's MultiPolygon split into its individual constituent
 * Polygon rings, each rendered as its own <path>. A country the size of
 * Australia or Canada carries dozens of separate island rings inside one
 * MultiPolygon, rendering the whole feature as a single multi-subpath <path>
 * means one bad ring near the visible-hemisphere boundary can corrupt the
 * shared SVG fill-rule for the entire feature, that's what produced the
 * huge, wrongly-shaped blob and stray band seen earlier. Isolating each
 * ring into its own path confines any single ring's clipping quirk to that
 * ring alone instead of leaking into the whole country's fill.
 */
const countryPolygons: CountryPolygon[] = worldFeatures
  .filter((f) => String(f.id) !== ANTARCTICA_NUMERIC_ID)
  .flatMap((f): CountryPolygon[] => {
    const id = f.id != null ? String(f.id) : undefined;
    const geom = f.geometry;
    if (geom.type === "Polygon") {
      const polygon: Feature<Polygon, GeoJsonProperties> = {
        type: "Feature",
        geometry: geom,
        properties: f.properties,
      };
      return [{ id, polygon, centroid: geoCentroid(polygon) }];
    }
    if (geom.type === "MultiPolygon") {
      return geom.coordinates.map((coordinates) => {
        const polygon: Feature<Polygon, GeoJsonProperties> = {
          type: "Feature",
          geometry: { type: "Polygon", coordinates },
          properties: f.properties,
        };
        return { id, polygon, centroid: geoCentroid(polygon) };
      });
    }
    return [];
  });

export interface GlobeHighlight {
  /** ISO 3166-1 alpha-2. */
  countryCode: string;
  color: string;
  countryName: string;
  flag: string;
  amountLabel: string;
  invoiceCountLabel: string;
  sharePct: number;
  rank: number;
}

/** ISO 3166-1 alpha-2 -> the numeric id world-atlas's topojson keys countries by. */
const ALPHA2_TO_NUMERIC_ID: Record<string, string> = {
  US: "840",
  GB: "826",
  SG: "702",
  DE: "276",
  AE: "784",
  AU: "036",
};

const featureByNumericId = new Map(worldFeatures.map((f) => [String(f.id), f]));

interface McaGlobeIllustrationProps {
  highlights?: GlobeHighlight[];
}

/** Real country geometry (world-atlas / topojson), rendered as a flat,
 * illustration-style orthographic-projection globe (not a geographically
 * inaccurate decorative doodle, and not a photoreal shaded sphere either).
 * Auto-rotates continuously, and can be dragged with a pointer to spin it in
 * any direction (both yaw and pitch), auto-rotation pauses while hovering,
 * dragging, or pinned, and resumes once none of those apply. Hovering a
 * highlighted country previews its details card, clicking instead pins it
 * open, clicking the pinned country again, a different country, or anywhere
 * else on the globe un-pins it. The popover's own measured size is used to
 * clamp/flip its position so it always stays within the globe's box instead
 * of running off the edge.
 *
 * The rotation itself is driven entirely outside React: `lambdaRef`/`phiRef`
 * are mutated every animation frame (or every pointermove while dragging),
 * and each country ring's <path> `d` attribute is written directly via a DOM
 * ref, bypassing React's render/reconciliation for the ~500 ring elements
 * that would otherwise need to be diffed 60 times a second. `lambda`/`phi`
 * React state exist only as an occasional snapshot, taken at the moment a
 * hover/click/drag-end happens, so the (comparatively rare) popover
 * positioning math has an accurate rotation to read. Recomputing/diffing
 * hundreds of large path strings through React on every frame is what made
 * the rotation stutter even after switching to requestAnimationFrame with a
 * culled render list, this removes React from that hot path entirely. */
export function McaGlobeIllustration({ highlights = [] }: McaGlobeIllustrationProps) {
  const [lambda, setLambda] = useState(0);
  const [phi, setPhi] = useState(INITIAL_TILT_DEG);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [pinnedCode, setPinnedCode] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Deliberately starts `false` and flips on from a timer rather than a lazy
  // useState initializer (this component renders on the server first, where
  // localStorage doesn't exist) or a synchronous setState in the effect body
  // (which the CLAUDE.md hooks rule disallows, an extra render right after
  // mount), a zero-delay timeout is the nested-callback escape hatch that
  // rule calls out as fine.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (window.localStorage.getItem(GLOBE_HINT_STORAGE_KEY)) return;
      setShowHint(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showHint) return;
    const timer = window.setTimeout(dismissHint, HINT_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [showHint]);

  function dismissHint() {
    setShowHint(false);
    window.localStorage.setItem(GLOBE_HINT_STORAGE_KEY, "1");
  }

  // Authoritative, continuously-updated rotation. Mutated every animation
  // frame (auto-spin) or every pointermove (drag) without going through
  // React state, so neither path triggers a re-render. `lambda`/`phi` state
  // above are just snapshots, synced at hover/pin/drag-end so the popover
  // positioning math (further down) has something current to read at the
  // moments it's actually needed.
  const lambdaRef = useRef(0);
  const phiRef = useRef(INITIAL_TILT_DEG);

  // Refs (not state) for the drag bookkeeping below: they're read/written on
  // every pointermove and must not themselves trigger a re-render.
  const isDraggingRef = useRef(false);
  const pressActiveRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const dragDistanceRef = useRef(0);
  const suppressNextClickRef = useRef(false);
  // Mirror `pinnedCode`/`hoveredCode` for the animation loop below to read
  // synchronously, it fires on its own schedule and must see the latest
  // value immediately. Written from an effect (not inline during render) per
  // the no-ref-writes-during-render rule.
  const pinnedCodeRef = useRef<string | null>(null);
  const hoveredCodeRef = useRef<string | null>(null);
  useEffect(() => {
    pinnedCodeRef.current = pinnedCode;
  }, [pinnedCode]);
  useEffect(() => {
    hoveredCodeRef.current = hoveredCode;
  }, [hoveredCode]);

  const projection = useMemo(
    () => geoOrthographic().scale(SIZE / 2.1).translate([SIZE / 2, SIZE / 2]).clipAngle(90),
    []
  );
  const pathGenerator = useMemo(() => geoPath(projection), [projection]);
  // A fixed-scale orthographic sphere's silhouette is always the same
  // circle regardless of rotation, computed once instead of every frame.
  const outline = useMemo(() => pathGenerator({ type: "Sphere" }), [pathGenerator]);

  const highlightByCode = useMemo(() => new Map(highlights.map((h) => [h.countryCode, h])), [highlights]);
  const codeByNumericId = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of highlights) {
      const numericId = ALPHA2_TO_NUMERIC_ID[h.countryCode];
      if (numericId) map.set(numericId, h.countryCode);
    }
    return map;
  }, [highlights]);

  // Snapshots the current rotation into React state, called at the moments a
  // popover is about to become relevant (hover/pin start, drag end) so the
  // markers/popover-positioning math below has an accurate rotation to read
  // without needing to run on every animation frame.
  const syncRotationState = useCallback(() => {
    setLambda(lambdaRef.current);
    setPhi(phiRef.current);
  }, []);

  const handleHoverStart = useCallback(
    (code: string) => {
      syncRotationState();
      setHoveredCode(code);
    },
    [syncRotationState]
  );
  const handleHoverEnd = useCallback(() => setHoveredCode(null), []);
  const togglePinned = useCallback(
    (code: string) => {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        return;
      }
      syncRotationState();
      setPinnedCode((prev) => (prev === code ? null : code));
    },
    [syncRotationState]
  );

  // Refs to each country ring's actual <path> DOM node, the animation loop
  // below mutates these directly every frame.
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);

  // Builds the <path> elements once (only recomputed when the highlighted
  // countries/colors actually change, never on rotation), each path's
  // initial `d` uses whatever rotation is current at that moment, the
  // animation loop takes over every frame after mount.
  const countryPaths = useMemo(() => {
    projection.rotate([-lambdaRef.current, phiRef.current]);
    const viewCenterNow: [number, number] = [lambdaRef.current, -phiRef.current];
    return countryPolygons.map((cp, i) => {
      const code = cp.id != null ? codeByNumericId.get(cp.id) : undefined;
      const highlightColor = code ? highlightByCode.get(code)?.color : undefined;
      const culled = geoDistance(cp.centroid, viewCenterNow) > Math.PI / 2 + CULL_MARGIN_RAD;
      const d = culled ? "" : (pathGenerator(cp.polygon) ?? "");
      return (
        <path
          key={i}
          ref={(el) => {
            pathRefs.current[i] = el;
          }}
          d={d}
          // No per-country stroke: at this scale, outlining every one of the
          // 241 features (Canada and Russia alone carry dozens of Arctic
          // island rings) reads as scattered streaks rather than borders, a
          // flat, borderless wash of color is what actually looks clean.
          fill={highlightColor ?? "#b9c8e2"}
          stroke="none"
          className={code ? "cursor-pointer" : undefined}
          onMouseEnter={code ? () => handleHoverStart(code) : undefined}
          onMouseLeave={code ? handleHoverEnd : undefined}
          onClick={
            code
              ? (e) => {
                  e.stopPropagation();
                  togglePinned(code);
                }
              : undefined
          }
        />
      );
    });
  }, [highlightByCode, codeByNumericId, pathGenerator, projection, handleHoverStart, handleHoverEnd, togglePinned]);

  // The actual rotation loop: advances lambdaRef during auto-spin, applies
  // whatever lambdaRef/phiRef currently are (from auto-spin OR a drag
  // in-flight) to the projection, and writes each visible ring's `d`
  // straight to its DOM node. No React state, no reconciliation, this is
  // what keeps it smooth at the display's real refresh rate.
  useEffect(() => {
    const degPerMs = SPIN_STEP_DEG / SPIN_INTERVAL_MS;
    let frameId = 0;
    let lastTimestamp: number | null = null;

    function applyRotation() {
      projection.rotate([-lambdaRef.current, phiRef.current]);
      const viewCenterNow: [number, number] = [lambdaRef.current, -phiRef.current];
      for (let i = 0; i < countryPolygons.length; i++) {
        const el = pathRefs.current[i];
        if (!el) continue;
        const cp = countryPolygons[i];
        if (geoDistance(cp.centroid, viewCenterNow) > Math.PI / 2 + CULL_MARGIN_RAD) {
          if (el.getAttribute("d")) el.setAttribute("d", "");
          continue;
        }
        el.setAttribute("d", pathGenerator(cp.polygon) ?? "");
      }
    }

    function tick(timestamp: number) {
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const elapsedMs = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      // Stopped (not just paused) while dragging, hovering, or pinned, a
      // spinning globe under an open/being-examined details card, or one
      // that keeps sliding out from under a drag, reads as broken.
      const autoSpinning =
        !prefersReducedMotion && !isDraggingRef.current && !hoveredCodeRef.current && !pinnedCodeRef.current;
      if (autoSpinning) {
        lambdaRef.current = (lambdaRef.current + degPerMs * elapsedMs) % 360;
      }
      if (autoSpinning || isDraggingRef.current) {
        applyRotation();
      }
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [pathGenerator, projection, prefersReducedMotion]);

  // The true [lon, lat] point currently centered in view (from the React
  // snapshot, not the live ref), used below to work out whether a given
  // highlight's centroid is on the visible hemisphere for popover purposes.
  const viewCenter: [number, number] = [lambda, -phi];

  const markers = highlights
    .map((h) => {
      const numericId = ALPHA2_TO_NUMERIC_ID[h.countryCode];
      const targetFeature = numericId ? featureByNumericId.get(numericId) : undefined;
      if (!targetFeature) return null;
      const centroid = geoCentroid(targetFeature);
      if (geoDistance(centroid, viewCenter) > Math.PI / 2 - 0.05) return null;
      // Relies on `projection`'s current internal rotation, which is only
      // ever mutated by the animation loop above (auto-spin/drag) or the
      // one-time snapshot in the countryPaths memo, never here, both leave
      // it exactly matching lambda/phi state by the time this runs.
      const point = projection(centroid);
      if (!point) return null;
      return { code: h.countryCode, color: h.color, x: point[0], y: point[1] };
    })
    .filter((m): m is { code: string; color: string; x: number; y: number } => m !== null);

  const activeCode = hoveredCode ?? pinnedCode;
  const activeHighlight = activeCode ? highlightByCode.get(activeCode) : null;
  const activeMarker = activeCode ? markers.find((m) => m.code === activeCode) : null;

  // Flip the popover to whichever side of its anchor point keeps it inside
  // the globe's own box, a fixed corner would run off the card on countries
  // near the opposite edge. Percentage-based fallback used only for the very
  // first paint, before the layout effect below can measure real pixel sizes.
  const anchorLeftPct = activeMarker ? (activeMarker.x / SIZE) * 100 : 50;
  const anchorTopPct = activeMarker ? (activeMarker.y / SIZE) * 100 : 50;
  const flipXFallback = anchorLeftPct > 55;
  const flipYFallback = anchorTopPct > 55;

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ left: number; top: number } | null>(null);

  const activeMarkerX = activeMarker?.x;
  const activeMarkerY = activeMarker?.y;

  // Clamps/flips the popover using its own measured size against the
  // container's, so it can never get cut off at an edge regardless of which
  // country is active or how the container itself is sized. Runs
  // synchronously before paint (useLayoutEffect, not useEffect) so there's no
  // visible jump from the percentage-based fallback position to this one.
  // Depends on the marker's primitive x/y, not the `activeMarker` object
  // itself (that's a fresh object every render since `markers` is rebuilt
  // each render). Depending on the object would re-run this effect forever:
  // it calls setState every time, which is a new object every time too, so
  // the dependency would never settle and React's re-render limit would trip.
  useLayoutEffect(() => {
    if (activeMarkerX === undefined || activeMarkerY === undefined || !containerRef.current || !popoverRef.current) {
      setPopoverPos(null);
      return;
    }
    const container = containerRef.current.getBoundingClientRect();
    const popover = popoverRef.current.getBoundingClientRect();
    const anchorX = (activeMarkerX / SIZE) * container.width;
    const anchorY = (activeMarkerY / SIZE) * container.height;

    let left = anchorX + POPOVER_ANCHOR_GAP_PX;
    if (left + popover.width > container.width) {
      left = anchorX - POPOVER_ANCHOR_GAP_PX - popover.width;
    }
    left = Math.max(
      POPOVER_EDGE_MARGIN_PX,
      Math.min(left, container.width - popover.width - POPOVER_EDGE_MARGIN_PX)
    );

    let top = anchorY + POPOVER_ANCHOR_GAP_PX;
    if (top + popover.height > container.height) {
      top = anchorY - POPOVER_ANCHOR_GAP_PX - popover.height;
    }
    top = Math.max(
      POPOVER_EDGE_MARGIN_PX,
      Math.min(top, container.height - popover.height - POPOVER_EDGE_MARGIN_PX)
    );

    setPopoverPos((prev) => (prev && prev.left === left && prev.top === top ? prev : { left, top }));
  }, [activeMarkerX, activeMarkerY]);

  function handleBackgroundClick() {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    setPinnedCode(null);
  }

  function handlePointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (showHint) dismissHint();
    pressActiveRef.current = true;
    dragDistanceRef.current = 0;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    // Deliberately NOT capturing the pointer here. Per the Pointer Events
    // spec, setPointerCapture() redirects the eventual `click` (and its
    // mouse-event mirror) to this <svg> instead of whichever country <path>
    // is actually under the cursor, which silently broke click-to-pin: every
    // "click" landed on the svg's own background handler (which un-pins)
    // instead of the path's handler (which pins). Capture is only taken once
    // real dragging is confirmed, in handlePointerMove below, so a plain
    // click never captures at all and reaches the path underneath normally.
  }

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!pressActiveRef.current || !lastPointerRef.current) return;
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    dragDistanceRef.current += Math.hypot(dx, dy);

    if (!isDraggingRef.current) {
      if (dragDistanceRef.current <= DRAG_CLICK_THRESHOLD_PX) return;
      isDraggingRef.current = true;
      setIsDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    // Dragging right/down should feel like grabbing the sphere's surface and
    // pulling it that way, hence subtracting the delta from both axes.
    // Written straight to the refs (not React state), the animation loop's
    // next frame picks these up and redraws, this is what lets many
    // pointermove events (which can fire faster than the display refreshes)
    // collapse into one redraw per frame instead of one React re-render each.
    lambdaRef.current = (lambdaRef.current - dx * DRAG_SENSITIVITY + 360) % 360;
    phiRef.current = Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, phiRef.current - dy * DRAG_SENSITIVITY));
  }

  function endDrag(e: ReactPointerEvent<SVGSVGElement>) {
    pressActiveRef.current = false;
    if (isDraggingRef.current) {
      suppressNextClickRef.current = true;
      syncRotationState();
    }
    isDraggingRef.current = false;
    setIsDragging(false);
    lastPointerRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={cn("h-full w-full touch-none select-none", isDragging ? "cursor-grabbing" : "cursor-grab")}
        style={{ filter: "drop-shadow(0 6px 14px rgba(15, 23, 42, 0.10))" }}
        role="img"
        aria-label="Draggable globe highlighting countries invoices originate from"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        onClick={handleBackgroundClick}
      >
        {/* Flat, illustration-style shading only: a single ocean fill and a
         * crisp rim stroke, no gradients, no limb-darkening vignette, that
         * photoreal sphere shading is exactly what read as "too realistic". */}
        <defs>
          <clipPath id="mca-globe-clip">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - RIM_INSET} />
          </clipPath>
        </defs>

        {outline && <path d={outline} fill="#e4ecf9" />}

        <g clipPath="url(#mca-globe-clip)">{countryPaths}</g>

        {outline && <path d={outline} fill="none" stroke="#c3d0e8" strokeWidth={RIM_STROKE_WIDTH} />}
      </svg>

      <AnimatePresence>
        {showHint && !activeHighlight && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2"
          >
            <div className="pointer-events-auto flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card/95 py-1.5 pl-3 pr-1.5 text-[11px] font-medium text-foreground shadow-md">
              <Icon name="info" className="h-3 w-3 shrink-0 text-primary" aria-hidden />
              <span>Drag to spin, click a country for details</span>
              <Button
                type="button"
                variant="ghost"
                aria-label="Dismiss hint"
                className="h-auto min-h-0 w-auto shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissHint();
                }}
              >
                <Icon name="x" className="h-2.5 w-2.5" aria-hidden />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeHighlight && activeMarker && (
        <div
          ref={popoverRef}
          className={cn(
            "absolute z-10 w-56",
            !popoverPos && flipXFallback && "-translate-x-full",
            !popoverPos && flipYFallback && "-translate-y-full"
          )}
          style={
            popoverPos
              ? { left: popoverPos.left, top: popoverPos.top }
              : {
                  left: `${anchorLeftPct}%`,
                  top: `${anchorTopPct}%`,
                  marginLeft: flipXFallback ? -POPOVER_ANCHOR_GAP_PX : POPOVER_ANCHOR_GAP_PX,
                  marginTop: flipYFallback ? -POPOVER_ANCHOR_GAP_PX : POPOVER_ANCHOR_GAP_PX,
                }
          }
        >
          <Card className="gap-2.5 p-4 shadow-lg">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: activeHighlight.color }}
                aria-hidden
              />
              <span aria-hidden>{activeHighlight.flag}</span>
              <span className="text-sm font-semibold text-foreground">{activeHighlight.countryName}</span>
            </div>
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Total invoiced</span>
                <span className="font-semibold text-foreground">{activeHighlight.amountLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Invoice volume</span>
                <span className="font-semibold text-foreground">{activeHighlight.invoiceCountLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Share</span>
                <span className="font-semibold text-foreground">{activeHighlight.sharePct}%</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Rank</span>
                <span className="font-semibold text-foreground">#{activeHighlight.rank} market</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
