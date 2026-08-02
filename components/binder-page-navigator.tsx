"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { PointerEvent, ReactNode } from "react";
import { useEffect, useRef } from "react";

type BinderPageNavigatorProps = {
  binderId: number;
  children: ReactNode;
  currentPage: number;
  maxPage: number;
  mode: "view" | "manage";
};

export function BinderPageNavigator({
  binderId,
  children,
  currentPage,
  maxPage,
  mode,
}: BinderPageNavigatorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamString = searchParams.toString();
  const start = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const suppressClickTimer = useRef<number | null>(null);

  const pageHref = (page: number) => {
    const params = new URLSearchParams(searchParamString);
    params.set("page", String(page));
    params.set("mode", mode);
    return `/binders/${binderId}?${params.toString()}`;
  };

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(1, page), maxPage);
    if (nextPage === currentPage) return;
    router.push(pageHref(nextPage));
  };

  const shouldIgnoreSwipe = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target;
    return target instanceof Element && Boolean(target.closest("[data-binder-swipe-ignore]"));
  };

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < maxPage;

  useEffect(() => {
    if (canGoPrev) router.prefetch(pageHref(currentPage - 1));
    if (canGoNext) router.prefetch(pageHref(currentPage + 1));
  }, [binderId, canGoNext, canGoPrev, currentPage, maxPage, mode, router, searchParamString]);

  useEffect(
    () => () => {
      if (suppressClickTimer.current !== null) window.clearTimeout(suppressClickTimer.current);
    },
    [],
  );

  return (
    <div
      className="relative select-none touch-pan-y"
      data-testid="binder-page-navigator"
      onClickCapture={(event) => {
        if (!suppressClick.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick.current = false;
        if (suppressClickTimer.current !== null) window.clearTimeout(suppressClickTimer.current);
      }}
      onPointerDown={(event) => {
        suppressClick.current = false;
        if (suppressClickTimer.current !== null) window.clearTimeout(suppressClickTimer.current);
        if (shouldIgnoreSwipe(event)) {
          start.current = null;
          return;
        }
        start.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerUp={(event) => {
        if (!start.current || shouldIgnoreSwipe(event)) {
          start.current = null;
          return;
        }
        const dx = event.clientX - start.current.x;
        const dy = event.clientY - start.current.y;
        start.current = null;

        if (Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) + 24) return;

        suppressClick.current = true;
        suppressClickTimer.current = window.setTimeout(() => {
          suppressClick.current = false;
        }, 400);

        if (dx < 0 && canGoNext) goToPage(currentPage + 1);
        if (dx > 0 && canGoPrev) goToPage(currentPage - 1);
      }}
      onPointerCancel={() => {
        start.current = null;
      }}
    >
      {children}
      {maxPage > 1 ? (
        <p className="pointer-events-none mt-2 text-center text-[10px] font-semibold tracking-wide text-zinc-500" aria-hidden="true">
          ← 左右にスワイプしてページ移動 →
        </p>
      ) : null}
    </div>
  );
}
