"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE_SELECTOR = "button, a, input, textarea, select, [data-interactive]";
const HOLD_MS = 300; // 按住 300ms 触发拖拽准备
const DESKTOP_ACTIVATE_PX = 4; // 触发后指针移动阈值
const INDEX_SELECTOR = ".doc-index";

interface UseDocumentDragOptions {
  enabled?: boolean;
  onReorder: (newIds: string[]) => void | Promise<void>;
  deps?: unknown[];
}

interface SlotPosition {
  index: number;
  centerX: number;
  centerY: number;
}

function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
}

function canStartFromTarget(target: HTMLElement, item: HTMLElement): boolean {
  if (target.closest(INTERACTIVE_SELECTOR)) return false;
  // 移动端或触控屏：长按卡片任意空白区域触发
  if (isCoarsePointer()) {
    return item.contains(target);
  }
  // 桌面端鼠标：长按或移动到数字角标 .doc-index 上触发
  return !!target.closest(INDEX_SELECTOR);
}

/**
 * 文档卡片拖拽重排 Hook (深度参考 tudolist 设计与算法)
 * - 桌面端：鼠标放置于数字角标按住 300ms 激活拖动
 * - 移动端：按住卡片主体 300ms 激活拖动并附带震动反馈
 * - 算法：采用中心点槽位距离映射 + Placeholder 占位无缝替换，彻底杜绝 Grid 布局塌陷
 */
export function useDocumentDrag(
  containerRef: React.RefObject<HTMLDivElement | null>,
  { enabled = true, onReorder, deps = [] }: UseDocumentDragOptions
) {
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  useEffect(() => {
    const listEl = containerRef.current;
    if (!listEl || !enabled) return;

    if ((listEl as unknown as { _sortableAbort?: AbortController })._sortableAbort) {
      (listEl as unknown as { _sortableAbort: AbortController })._sortableAbort.abort();
    }
    const ac = new AbortController();
    (listEl as unknown as { _sortableAbort: AbortController })._sortableAbort = ac;
    const { signal } = ac;

    const placeholder = document.createElement("div");
    placeholder.className = "sort-placeholder";
    placeholder.setAttribute("aria-hidden", "true");

    let drag: {
      item: HTMLElement;
      ghost: HTMLElement | null;
      pointerId: number;
      startX: number;
      startY: number;
      lastX: number;
      lastY: number;
      offsetX: number;
      offsetY: number;
      itemWidth: number;
      itemHeight: number;
      active: boolean;
      holdReady: boolean;
      holdTimer: ReturnType<typeof setTimeout> | null;
      sourceIndex: number;
      targetSlotIndex: number;
      slotPositions: SlotPosition[];
    } | null = null;

    let trackAc: AbortController | null = null;
    let rafId = 0;

    function getItems(): HTMLElement[] {
      if (!listEl) return [];
      return Array.from(listEl.querySelectorAll<HTMLElement>(":scope > [data-drag-doc-id]"));
    }

    function stopTracking() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      trackAc?.abort();
      trackAc = null;
    }

    function clearHoldTimer() {
      if (!drag?.holdTimer) return;
      clearTimeout(drag.holdTimer);
      drag.holdTimer = null;
    }

    function lockScroll() {
      document.body.classList.add("drag-scroll-lock");
    }

    function unlockScroll() {
      document.body.classList.remove("drag-scroll-lock");
    }

    function snapshotSlots() {
      if (!drag) return;
      const allItems = getItems();
      drag.sourceIndex = allItems.indexOf(drag.item);
      drag.slotPositions = allItems.map((el, index) => {
        const r = el.getBoundingClientRect();
        return {
          index,
          centerX: r.left + r.width / 2,
          centerY: r.top + r.height / 2,
        };
      });
    }

    function findNearestSlotIndex(cx: number, cy: number): number {
      if (!drag) return 0;
      let best = drag.sourceIndex;
      let bestDist = Infinity;
      for (const slot of drag.slotPositions) {
        const d = Math.hypot(cx - slot.centerX, cy - slot.centerY);
        if (d < bestDist) {
          bestDist = d;
          best = slot.index;
        }
      }
      return best;
    }

    function movePlaceholderToIndex(targetIndex: number) {
      if (!drag || drag.targetSlotIndex === targetIndex) return;
      drag.targetSlotIndex = targetIndex;
      placeholder.remove();
      const visible = getItems().filter((el) => el !== drag!.item && el !== placeholder);
      if (targetIndex >= visible.length) {
        listEl!.appendChild(placeholder);
      } else {
        listEl!.insertBefore(placeholder, visible[targetIndex]);
      }
    }

    function createGhost(item: HTMLElement, rect: DOMRect): HTMLElement {
      const ghost = item.cloneNode(true) as HTMLElement;
      ghost.className = `${item.className} sort-ghost`;
      ghost.removeAttribute("data-drag-doc-id");
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      ghost.style.left = "0px";
      ghost.style.top = "0px";
      ghost.style.margin = "0px";
      ghost.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
      document.body.appendChild(ghost);
      return ghost;
    }

    function activateDrag() {
      if (!drag || drag.active) return;
      const rect = drag.item.getBoundingClientRect();
      drag.active = true;
      drag.ghost = createGhost(drag.item, rect);
      drag.offsetX = drag.lastX - rect.left;
      drag.offsetY = drag.lastY - rect.top;
      drag.itemWidth = rect.width;
      drag.itemHeight = rect.height;

      placeholder.style.height = `${rect.height}px`;
      placeholder.style.width = "100%";

      snapshotSlots();
      document.body.classList.add("is-dragging");
      drag.item.classList.add("drag-source");
      drag.targetSlotIndex = -1;
      movePlaceholderToIndex(drag.sourceIndex);
      drag.item.classList.remove("drag-hold-ready");
      lockScroll();
      try {
        drag.item.setPointerCapture(drag.pointerId);
      } catch {
        // 部分环境不支持 setPointerCapture，忽略
      }
    }

    function cancelPending() {
      if (!drag) return;
      clearHoldTimer();
      drag.item?.classList.remove("drag-hold-pending", "drag-hold-ready");
      unlockScroll();
      drag = null;
      stopTracking();
    }

    function finish(commit: boolean) {
      stopTracking();
      unlockScroll();
      if (!drag) return;
      clearHoldTimer();

      const { item, ghost, active } = drag;
      item.classList.remove("drag-hold-pending", "drag-hold-ready");
      ghost?.remove();
      document.body.classList.remove("is-dragging");
      item.classList.remove("drag-source");

      if (commit && active && listEl) {
        listEl.insertBefore(item, placeholder);
        listEl.dataset.suppressClickUntil = String(Date.now() + 350);

        // 收集新排序 IDs
        const reorderedItems = getItems();
        const newIds = reorderedItems
          .map((el) => el.getAttribute("data-drag-doc-id"))
          .filter(Boolean) as string[];

        placeholder.remove();
        drag = null;

        if (newIds.length > 0) {
          onReorderRef.current(newIds);
        }
        return;
      }

      placeholder.remove();
      drag = null;
    }

    function updateGhostPosition() {
      if (!drag?.ghost) return;
      const x = drag.lastX - drag.offsetX;
      const y = drag.lastY - drag.offsetY;
      drag.ghost.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    function processMove() {
      if (!drag) return;
      const { lastX: x, lastY: y, startX, startY, holdReady } = drag;
      if (!holdReady) return;

      if (!drag.active) {
        const needMove = isCoarsePointer() ? 0 : DESKTOP_ACTIVATE_PX;
        if (Math.hypot(x - startX, y - startY) < needMove) return;
        activateDrag();
      }

      updateGhostPosition();
      const left = drag.lastX - drag.offsetX;
      const top = drag.lastY - drag.offsetY;
      const centerX = left + drag.itemWidth / 2;
      const centerY = top + drag.itemHeight / 2;
      movePlaceholderToIndex(findNearestSlotIndex(centerX, centerY));
    }

    function onPointerMove(e: PointerEvent) {
      if (!drag || e.pointerId !== drag.pointerId) return;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;

      if (drag.active || (drag.holdReady && isCoarsePointer())) {
        e.preventDefault();
      }

      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        processMove();
      });
    }

    function onPointerUp(e: PointerEvent) {
      if (!drag || e.pointerId !== drag.pointerId) return;
      if (!drag.holdReady) {
        cancelPending();
        return;
      }
      finish(drag.active);
    }

    function startTracking() {
      stopTracking();
      trackAc = new AbortController();
      const ts = trackAc.signal;
      window.addEventListener("pointermove", onPointerMove, { signal: ts, passive: false });
      window.addEventListener("pointerup", onPointerUp, { signal: ts });
      window.addEventListener("pointercancel", onPointerUp, { signal: ts });
    }

    // 拦截拖拽完成后的点击穿透误触
    listEl.addEventListener(
      "click",
      (e) => {
        if (Date.now() < Number(listEl.dataset.suppressClickUntil || 0)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      },
      { capture: true, signal }
    );

    listEl.addEventListener(
      "pointerdown",
      (e: PointerEvent) => {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        const target = e.target as HTMLElement | null;
        if (!target) return;

        const item = target.closest<HTMLElement>("[data-drag-doc-id]");
        if (!item || item.parentElement !== listEl) return;
        if (!canStartFromTarget(target, item)) return;

        const startRect = item.getBoundingClientRect();
        drag = {
          item,
          ghost: null,
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          lastX: e.clientX,
          lastY: e.clientY,
          offsetX: 0,
          offsetY: 0,
          itemWidth: startRect.width,
          itemHeight: startRect.height,
          active: false,
          holdReady: false,
          holdTimer: null,
          sourceIndex: 0,
          targetSlotIndex: -1,
          slotPositions: [],
        };

        item.classList.add("drag-hold-pending");
        drag.holdTimer = setTimeout(() => {
          if (!drag || drag.item !== item) return;
          drag.holdReady = true;
          item.classList.remove("drag-hold-pending");
          item.classList.add("drag-hold-ready");
          lockScroll();
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(20);
          }
        }, HOLD_MS);

        startTracking();
      },
      { signal, passive: false }
    );

    return () => {
      ac.abort();
      stopTracking();
      unlockScroll();
      placeholder.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, enabled, ...deps]);
}
