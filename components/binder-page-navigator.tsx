"use client";

import { useRouter } from "next/navigation";
import type { PointerEvent, ReactNode } from "react";
import { useRef } from "react";

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
  const start = useRef<{ x: number; y: number } | null>(null);

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(1, page), maxPage);
    if (nextPage === currentPage) return;
    const params = new URLSearchParams({
      page: String(nextPage),
      mode,
    });
    router.push(`/binders/${binderId}?${params.toString()}`);
  };

  const shouldIgnoreSwipe = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target;
    return target instanceof Element && Boolean(target.closest("[data-binder-swipe-ignore]"));
  };

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < maxPage;

  return (
    <div
      className="relative select-none touch-pan-y"
      data-testid="binder-page-navigator"
      onPointerDown={(event) => {
        if (shouldIgnoreSwipe(event)) {
          start.current = null;
          return;
        }
        start.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        if (!start.current || shouldIgnoreSwipe(event)) {
          start.current = null;
          return;
        }
        const dx = event.clientX - start.current.x;
        const dy = event.clientY - start.current.y;
        start.current = null;

        if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) + 18) return;
        if (dx < 0 && canGoNext) goToPage(currentPage + 1);
        if (dx > 0 && canGoPrev) goToPage(currentPage - 1);
      }}
      onPointerCancel={() => {
        start.current = null;
      }}
    >
      {children}
      <button
        aria-label="前のページ"
        className="absolute inset-y-0 left-0 z-10 flex w-1/4 items-center justify-start rounded-l-lg bg-gradient-to-r from-black/35 to-transparent px-2 text-3xl font-bold text-white/70 opacity-0 transition hover:opacity-100 disabled:pointer-events-none disabled:opacity-0"
        disabled={!canGoPrev}
        onClick={() => goToPage(currentPage - 1)}
        type="button"
      >
        ‹
      </button>
      <button
        aria-label="次のページ"
        className="absolute inset-y-0 right-0 z-10 flex w-1/4 items-center justify-end rounded-r-lg bg-gradient-to-l from-black/35 to-transparent px-2 text-3xl font-bold text-white/70 opacity-0 transition hover:opacity-100 disabled:pointer-events-none disabled:opacity-0"
        disabled={!canGoNext}
        onClick={() => goToPage(currentPage + 1)}
        type="button"
      >
        ›
      </button>
    </div>
  );
}
