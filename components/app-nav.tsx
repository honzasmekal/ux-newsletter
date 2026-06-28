"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Přehled" },
  { href: "/tracker", label: "Legislativa" },
  { href: "/candidates", label: "Kandidáti" },
  { href: "/sources", label: "Zdroje" },
  { href: "/recipients", label: "Příjemci" },
  { href: "/digests", label: "Digesty" },
];

export function AppNav({ email }: { email: string }) {
  const pathname = usePathname();
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-muted/20 p-4">
      <div className="mb-6 px-2">
        <div className="font-semibold">UX Recall</div>
        <div className="truncate text-xs text-muted-foreground">{email}</div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map((it) => {
          const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-foreground text-background" : "hover:bg-muted",
              )}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
      <form action={signOut}>
        <Button variant="outline" size="sm" className="w-full" type="submit">
          Odhlásit
        </Button>
      </form>
    </aside>
  );
}
