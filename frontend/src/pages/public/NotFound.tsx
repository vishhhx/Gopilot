import { Link } from "react-router-dom";
import { Blossom } from "@/components/bloom/Blossom";
import { Garden } from "@/components/bloom/Flowers";
import { BORDER } from "@/lib/garden";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-5 overflow-hidden bg-paper px-4 text-center">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 aspect-[1000/160]" aria-hidden>
        <Garden plants={BORDER} height={160} className="h-full w-full" />
      </div>
      <Blossom size={72} active={[]} motion="sway" />
      <h1 className="font-serif text-[clamp(34px,5vw,52px)] font-normal tracking-[-0.03em] animate-rise">This path leads nowhere</h1>
      <p className="max-w-sm text-[16px] text-ink-soft animate-rise [animation-delay:100ms]">The link may be old, or the page has moved.</p>
      <div className="flex gap-2">
        <Button asChild>
          <Link to="/new">Start a task</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/landing">Go to the home page</Link>
        </Button>
      </div>
    </div>
  );
}
