import Link from "next/link";

type SearchValue = string | undefined;

export function Pagination({
  basePath,
  currentPage,
  searchParams,
  totalPages,
}: {
  basePath: string;
  currentPage: number;
  searchParams: Record<string, SearchValue>;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const pages = pageNumbers(currentPage, totalPages);

  return (
    <nav aria-label="ページ移動" className="flex items-center justify-center gap-1 pt-2">
      <PageLink
        disabled={currentPage <= 1}
        href={pageHref(basePath, searchParams, currentPage - 1)}
        label="前"
      />
      {pages.map((page, index) =>
        page === null ? (
          <span className="px-1 text-sm text-zinc-600" key={`ellipsis-${index}`}>
            …
          </span>
        ) : (
          <Link
            aria-current={page === currentPage ? "page" : undefined}
            className={`flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-semibold ${
              page === currentPage
                ? "border-amber-400 bg-amber-400 text-zinc-950"
                : "border-[#30312f] bg-[#181918] text-zinc-300 hover:border-amber-400 hover:text-amber-300"
            }`}
            href={pageHref(basePath, searchParams, page)}
            key={page}
          >
            {page}
          </Link>
        ),
      )}
      <PageLink
        disabled={currentPage >= totalPages}
        href={pageHref(basePath, searchParams, currentPage + 1)}
        label="次"
      />
    </nav>
  );
}

function PageLink({ disabled, href, label }: { disabled: boolean; href: string; label: string }) {
  if (disabled) {
    return <span className="rounded-md border border-[#282928] px-3 py-2 text-sm text-zinc-700">{label}</span>;
  }

  return (
    <Link
      className="rounded-md border border-[#30312f] bg-[#181918] px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-amber-400 hover:text-amber-300"
      href={href}
    >
      {label}
    </Link>
  );
}

function pageHref(basePath: string, searchParams: Record<string, SearchValue>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "page") params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function pageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const values: Array<number | null> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  if (start > 2) values.push(null);
  for (let page = start; page <= end; page += 1) values.push(page);
  if (end < totalPages - 1) values.push(null);
  values.push(totalPages);
  return values;
}
