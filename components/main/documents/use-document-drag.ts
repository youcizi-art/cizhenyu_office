"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE_SELECTOR = "button, a, input, textarea, select, [data-interactive]";
const HOLD_MS = 250; // 长按 0.25s 触发拖拽
const MAX_SHAKE_PX = 12; // 0.25s 期间允许的最大手抖像素

interface UseDocumentDragOptions {
  enabled?: boolean;
  onReorder: (newIds: string[]) => void | Promise<void>;
}

/**
 * 文档卡片响应式网格拖拽排序 Hook
 * 基于 DOM 占位替换与 elementFromPoint 实时穿透碰撞检测
 * 完美适配 CSS Grid 多列网格，零计算误差，平滑丝滑
 */
export function useDocumentDrag(
  containerRef: React.RefObject<HTMLDivElement | null>,
  { enabled = true, onReorder }: UseDocumentDragOptions
) {
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  useEffect(() => {
    const listEl = containerRef.current;
    if (!listEl || !enabled) return;

    const ac = new AbortController();
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
      active: boolean;
      holdReady: boolean;
      holdTimer: ReturnType<typeof setTimeout> | null;
    } | null = null;

    let trackAc: AbortController | null = null;
    let rafId = 0;

    function stopTracking() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      trackAc?.abort();
      trackAc = null;
    }

    function clearHoldTimer() {
      if (drag?.holdTimer) {
        clearTimeout(drag.holdTimer);
        drag.holdTimer = null;
      }
    }

    function cancelDrag() {
      if (!drag) return;
      clearHoldTimer();
      drag.item?.classList.remove("drag-hold-pending", "drag-hold-ready");
      if (drag.active) {
        drag.ghost?.remove();
        drag.item.style.display = "";
        placeholder.remove();
        document.body.classList.remove("drag-scroll-lock");
      }
      drag = null;
      stopTracking();
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

      // 1. 创建固定在视口的跟随 ghost 镜像卡片
      drag.ghost = createGhost(drag.item, rect);
      drag.offsetX = drag.lastX - rect.left;
      drag.offsetY = drag.lastY - rect.top;

      // 2. 将 placeholder 设置为与原卡片相同尺寸，插入原卡片所在位置
      placeholder.style.width = "100%";
      placeholder.style.height = `${rect.height}px`;
      listEl!.insertBefore(placeholder, drag.item);

      // 3. 隐藏原卡片（保持网格元素总数不变，不挤乱多列 Grid）
      drag.item.style.display = "none";
      drag.item.classList.remove("drag-hold-ready");
      document.body.classList.add("drag-scroll-lock");
    }

    function updateGhostPosition() {
      if (!drag?.ghost) return;
      const x = drag.lastX - drag.offsetX;
      const y = drag.lastY - drag.offsetY;
      drag.ghost.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    function updatePlaceholderSlot(clientX: number, clientY: number) {
      if (!drag || !drag.active) return;

      // 利用 elementFromPoint 实时穿透检测当前光标落点下的目标卡片
      const elAtPoint = document.elementFromPoint(clientX, clientY);
      if (!elAtPoint) return;

      const targetCard = elAtPoint.closest<HTMLElement>("[data-drag-doc-id]");
      if (!targetCard || targetCard.parentElement !== listEl || targetCard === drag.item) {
        return;
      }

      const rect = targetCard.getBoundingClientRect();
      const isAfter = clientX > rect.left + rect.width / 2;

      if (isAfter) {
        if (targetCard.nextSibling !== placeholder) {
          listEl!.insertBefore(placeholder, targetCard.nextSibling);
        }
      } else {
        if (placeholder.nextSibling !== targetCard) {
          listEl!.insertBefore(placeholder, targetCard);
        }
      }
    }

    function processPointerMove() {
      if (!drag) return;

      // 若处于长按准备完毕状态，且尚未激活拖拽，立即激活
      if (drag.holdReady && !drag.active) {
        activateDrag();
      }

      if (drag.active) {
        updateGhostPosition();
        updatePlaceholderSlot(drag.lastX, drag.lastY);
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (!drag || e.pointerId !== drag.pointerId) return;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;

      // 0.25s 之前若指针移动超过手抖阈值，判定为常规页面滚动，取消长按判定
      if (!drag.holdReady && !drag.active) {
        if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > MAX_SHAKE_PX) {
          cancelDrag();
          return;
        }
      }

      if (drag.active || drag.holdReady) {
        e.preventDefault();
      }

      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        processPointerMove();
      });
    }

    function onPointerUp(e: PointerEvent) {
      if (!drag || e.pointerId !== drag.pointerId) return;
      stopTracking();
      clearHoldTimer();
      document.body.classList.remove("drag-scroll-lock");

      const { item, ghost, active } = drag;
      item.classList.remove("drag-hold-pending", "drag-hold-ready");
      ghost?.remove();

      if (active) {
        // 阻止拖动结束后的卡片点击事件
        listEl!.dataset.suppressClickUntil = String(Date.now() + 450);

        // 扫描网格，根据占位符 placeholder 的最终位置计算全新的文档顺序
        const children = Array.from(listEl!.children);
        const finalIds: string[] = [];

        children.forEach((child) => {
          if (child === placeholder) {
            const myId = item.getAttribute("data-drag-doc-id");
            if (myId) finalIds.push(myId);
          } else if (child.hasAttribute("data-drag-doc-id") && child !== item) {
            const id = child.getAttribute("data-drag-doc-id");
            if (id) finalIds.push(id);
          }
        });

        // 恢复原卡片显示并移除占位符
        item.style.display = "";
        placeholder.remove();
        drag = null;

        // 提交全新排序给 React 父组件更新
        if (finalIds.length > 0) {
          onReorderRef.current?.(finalIds);
        }
        return;
      }

      cancelDrag();
    }

    function startTracking() {
      stopTracking();
      trackAc = new AbortController();
      const ts = trackAc.signal;
      window.addEventListener("pointermove", onPointerMove, { signal: ts, passive: false });
      window.addEventListener("pointerup", onPointerUp, { signal: ts });
      window.addEventListener("pointercancel", onPointerUp, { signal: ts });
    }

    // 捕获阶段拦截误触点击
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
        // 仅处理鼠标左键或触控
        if (e.button !== 0 && e.pointerType === "mouse") return;
        const target = e.target as HTMLElement | null;
        if (!target) return;

        // 屏蔽交互组件（如菜单按钮、标签按钮等）
        if (target.closest(INTERACTIVE_SELECTOR)) return;

        const item = target.closest<HTMLElement>("[data-drag-doc-id]");
        if (!item || item.parentElement !== listEl) return;

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
          active: false,
          holdReady: false,
          holdTimer: null,
        };

        item.classList.add("drag-hold-pending");
        drag.holdTimer = setTimeout(() => {
          if (!drag || drag.item !== item) return;
          drag.holdReady = true;
          item.classList.remove("drag-hold-pending");
          item.classList.add("drag-hold-ready");
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(25);
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
  }, [containerRef, enabled]);
}

function unlockScroll() {
  document.body.classList.remove("drag-scroll-lock");
}
