import ThemeToggle from "@/components/Other/theme/ThemeToggle";
import { useAppSelector } from "@/store/hooks";
import { initials } from "@/lib/format";
import { Blossom } from "@/components/bloom/Blossom";

function Section({ title, text, children, delay = 0 }: { title: string; text?: string; children: React.ReactNode; delay?: number }) {
  return (
    <section className="rounded-[24px] bg-raised p-6 shadow-[0_0_0_1px_var(--line)] animate-rise-sm" style={{ animationDelay: `${delay}ms` }}>
      <h2 className="font-serif text-[21px] tracking-[-0.01em]">{title}</h2>
      {text && <p className="mt-1 text-[14.5px] text-ink-soft">{text}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function GeneralSettings() {
  const user = useAppSelector((s) => s.auth.authData);
  return (
    <div className="max-w-2xl space-y-4">
      <Section title="Account">
        {user ? (
          <div className="flex items-center gap-4">
            <span className="relative flex size-14 items-center justify-center overflow-hidden rounded-full bg-peony-wash text-[18px] font-semibold text-peony-deep">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-full object-cover" /> : initials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[16px] font-medium">{user.name}</p>
              <p className="truncate text-[14.5px] text-ink-soft">{user.email}</p>
            </div>
          </div>
        ) : (
          <p className="text-[14.5px] text-ink-soft">You're not signed in.</p>
        )}
      </Section>
      <Section title="Appearance" text="A light garden, a night garden, or whatever your device uses." delay={70}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ThemeToggle />
          <span className="flex items-center gap-2 text-[13px] text-ink-faint">
            <Blossom size={18} />
            Ctrl + M switches too
          </span>
        </div>
      </Section>
    </div>
  );
}
