"use client";

import React, { useState, useEffect } from "react";
import { Clock, Timer, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";

interface ShareCountdownBadgeProps {
  expiresAt?: number;
  serverTime?: number;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

function calculateRemaining(expiresAt: number, timeOffset: number): TimeRemaining {
  const currentNow = Date.now() + timeOffset;
  const totalMs = Math.max(0, expiresAt - currentNow);
  const totalSecs = Math.floor(totalMs / 1000);

  const days = Math.floor(totalSecs / (24 * 3600));
  const hours = Math.floor((totalSecs % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  return { days, hours, minutes, seconds, totalMs };
}

/**
 * 分享页面左下角悬浮倒计时挂件
 * 默认展开，支持展开/收缩切换，实时天/时/分/秒精确倒计时
 */
export function ShareCountdownBadge({
  expiresAt,
  serverTime,
}: ShareCountdownBadgeProps) {
  const t = useExtracted();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // 如果没有设置过期时间（永久有效），则不渲染挂件
  if (!expiresAt || expiresAt <= 0) {
    return null;
  }

  // 计算客户端本地时间与服务端时钟的偏移偏差
  const timeOffset = serverTime ? serverTime - Date.now() : 0;
  const [remaining, setRemaining] = useState<TimeRemaining>(() =>
    calculateRemaining(expiresAt, timeOffset)
  );

  useEffect(() => {
    // 立即执行一次
    const initial = calculateRemaining(expiresAt, timeOffset);
    setRemaining(initial);
    if (initial.totalMs <= 0) {
      return;
    }

    // 每秒驱动倒计时更新
    const timer = setInterval(() => {
      const next = calculateRemaining(expiresAt, timeOffset);
      setRemaining(next);
      if (next.totalMs <= 0) {
        clearInterval(timer);
        // 倒计时刚刚结束，自动刷新页面，此时服务端将返回已过期，页面变为不可访问
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, timeOffset]);

  const isExpired = remaining.totalMs <= 0;

  // 收缩形态：左下角纯小图标悬浮按钮，完全不遮挡正文与文字
  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 left-4 z-40 animate-in fade-in zoom-in-90 duration-200">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          title={t({ id: "ExpandCountdown", message: "Expand countdown" })}
          aria-label={t({ id: "ExpandCountdown", message: "Expand countdown" })}
          className={cn(
            "w-9 h-9 rounded-full border shadow-lg backdrop-blur-md flex items-center justify-center transition-all active:scale-90 cursor-pointer group",
            isExpired
              ? "bg-destructive/15 border-destructive/30 text-destructive hover:bg-destructive/25"
              : "bg-card/90 dark:bg-[#18181b]/90 border-border/80 text-foreground hover:border-primary/50 hover:shadow-primary/20 hover:scale-105"
          )}
        >
          {isExpired ? (
            <AlertCircle className="w-4 h-4 text-destructive" />
          ) : (
            <Timer className="w-4 h-4 text-amber-500 dark:text-amber-400 group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>
    );
  }

  // 展开形态：左下角常驻悬浮卡片
  return (
    <div className="fixed bottom-4 left-4 z-40 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-border/80 bg-card/95 dark:bg-[#141416]/95 backdrop-blur-md p-3.5 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
      {/* 头部：标题与收起操作 */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-border/50">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Clock
            className={cn(
              "w-3.5 h-3.5",
              isExpired ? "text-destructive" : "text-amber-500"
            )}
          />
          <span>
            {isExpired
              ? t({ id: "ShareCountdownExpired", message: "Share Expired" })
              : t({ id: "ShareCountdownTitle", message: "Expiration Countdown" })}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          title={t({ id: "CollapseCountdown", message: "Collapse" })}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* 倒计时数字网格 */}
      {isExpired ? (
        <div className="py-2 px-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-center">
          <p className="text-xs font-medium">
            {t({ id: "ShareCountdownExpired", message: "Share link has expired" })}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-muted/40 dark:bg-muted/20 border border-border/40 rounded-xl py-1.5 px-1">
            <div className="text-base font-bold font-mono tracking-tight text-foreground leading-none">
              {remaining.days}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {t({ id: "DaysLabel", message: "d" })}
            </div>
          </div>
          <div className="bg-muted/40 dark:bg-muted/20 border border-border/40 rounded-xl py-1.5 px-1">
            <div className="text-base font-bold font-mono tracking-tight text-foreground leading-none">
              {String(remaining.hours).padStart(2, "0")}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {t({ id: "HoursLabel", message: "h" })}
            </div>
          </div>
          <div className="bg-muted/40 dark:bg-muted/20 border border-border/40 rounded-xl py-1.5 px-1">
            <div className="text-base font-bold font-mono tracking-tight text-foreground leading-none">
              {String(remaining.minutes).padStart(2, "0")}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {t({ id: "MinsLabel", message: "m" })}
            </div>
          </div>
          <div className="bg-muted/40 dark:bg-muted/20 border border-border/40 rounded-xl py-1.5 px-1">
            <div className="text-base font-bold font-mono tracking-tight text-primary leading-none">
              {String(remaining.seconds).padStart(2, "0")}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {t({ id: "SecsLabel", message: "s" })}
            </div>
          </div>
        </div>
      )}

      {/* 底部微小提示 */}
      <p className="text-[10px] text-muted-foreground leading-tight mt-2.5 px-0.5">
        {t({
          id: "ShareCountdownNotice",
          message: "This share link will automatically expire when the countdown ends.",
        })}
      </p>
    </div>
  );
}
