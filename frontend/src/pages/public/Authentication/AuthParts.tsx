import { Blossom } from "@/components/bloom/Blossom";

export function AuthIntro({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-8">
      <Blossom size={48} motion="bloom" className="animate-sway [animation-delay:900ms]" />
      <h1 className="mt-6 font-serif text-[clamp(34px,4vw,44px)] leading-[1.05] font-normal tracking-[-0.03em] animate-rise [animation-delay:100ms]">
        {title}
      </h1>
      <p className="mt-3 text-[16.5px] leading-relaxed text-ink-soft animate-rise [animation-delay:180ms]">{text}</p>
    </div>
  );
}

export function AuthTerms() {
  return (
    <p className="mt-10 text-[13px] leading-relaxed text-ink-faint">
      By continuing you agree to GoPilot's Terms of Service and Privacy Policy. GoPilot only asks Google for the permissions you choose when you connect each app.
    </p>
  );
}
