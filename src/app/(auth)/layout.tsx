export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center px-6 py-12">
        {children}
      </div>
    </div>
  );
}

