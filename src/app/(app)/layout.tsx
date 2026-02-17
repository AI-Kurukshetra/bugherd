import Link from "next/link";
import { LayoutGrid, MessageSquareText, Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/auth/signout-button";
import { Separator } from "@/components/ui/separator";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const navItems = [
  { href: "/dashboard", label: "Task Board", icon: LayoutGrid },
  { href: "/dashboard", label: "Feedback", icon: MessageSquareText, disabled: true },
  { href: "/dashboard", label: "Settings", icon: Settings, disabled: true },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? null;

  return (
    <div className="min-h-dvh bg-[#eef1f5] text-zinc-900">
      <div className="grid min-h-dvh grid-cols-[260px_1fr]">
        <aside className="border-r border-zinc-200/70 bg-white">
          <div className="flex h-16 items-center gap-3 px-5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-900 text-sm font-semibold text-white">
              BH
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Bacancy</div>
              <div className="text-xs text-zinc-500">BugHerd-like board</div>
            </div>
          </div>
          <Separator />
          <nav className="px-3 py-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const content = (
                  <>
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </>
                );

                return item.disabled ? (
                  <div
                    key={item.label}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-400",
                    )}
                  >
                    {content}
                  </div>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900",
                    )}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="flex h-16 items-center justify-between border-b border-zinc-200/70 bg-white px-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Accepting new feedback
              </div>
              <span className="text-xs text-zinc-500">edit</span>
            </div>
            <div className="flex items-center gap-2">
              {email ? (
                <div className="hidden rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-600 md:block">
                  Signed in as <span className="font-medium text-zinc-800">{email}</span>
                </div>
              ) : null}
              <SignOutButton />
            </div>
          </header>
          <main className="min-w-0 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

