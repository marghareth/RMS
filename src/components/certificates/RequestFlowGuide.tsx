// FILE: src/components/certificates/RequestFlowGuide.tsx
//
// The "What happens after you save" panel on Request Certificate (Nov 2026).
// Spells out the status flow (Pending → Processing → Released) right
// where staff choose between Submit request and Process now, so the two
// buttons aren't a guess. The fuller explanation is in the page's
// "How to use" guide (src/lib/documentTutorials.ts).
"use client";

interface Props {
  /** How many requests are PENDING right now. null while still loading. */
  waiting: number | null;
}

const STEPS = [
  { name: "Pending", text: "Waiting its turn in the Document Queue." },
  { name: "Processing", text: "Staff are preparing and printing it." },
  { name: "Released", text: "Handed to the applicant. Set from the Document Queue." },
];

export default function RequestFlowGuide({ waiting }: Props) {
  const queueEmpty = waiting === 0;

  return (
    <div data-tour="page-certificates-new-flow" className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
      <p className="text-[14px] font-semibold text-[#1F2937] dark:text-white">What happens after you save</p>

      <ol className="mt-4 grid gap-4 sm:grid-cols-3 sm:gap-0">
        {STEPS.map((s, i) => (
          <li key={s.name} className="relative sm:pr-5">
            {i < STEPS.length - 1 && (
              <span aria-hidden className="absolute left-7 right-2 top-2.75 hidden h-px bg-[#E5E7EB] dark:bg-[#333333] sm:block" />
            )}
            <div className="relative flex items-center gap-2">
              <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full border border-[#D1D5DB] bg-white text-[11px] font-semibold tabular-nums text-[#374151] dark:border-[#404040] dark:bg-[#171717] dark:text-[#D4D4D4]">
                {i + 1}
              </span>
            </div>
            <p className="mt-2 text-[13px] font-semibold text-[#1F2937] dark:text-white">{s.name}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[#6B7280] dark:text-[#A3A3A3]">{s.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-4 border-t border-[#F0F1F3] pt-3.5 text-[12.5px] leading-relaxed text-[#374151] dark:border-[#262626] dark:text-[#D4D4D4]">
        {waiting === null ? (
          <p className="text-[#6B7280] dark:text-[#A3A3A3]">Checking the queue…</p>
        ) : queueEmpty ? (
          <p>
            <span className="font-semibold">No one is waiting in the queue.</span> You can{" "}
            <span className="font-semibold">Process now</span> to skip Pending and print it right away, or{" "}
            <span className="font-semibold">Submit request</span> to file it in the queue as usual.
          </p>
        ) : (
          <p>
            <span className="font-semibold">
              {waiting} {waiting === 1 ? "request is" : "requests are"} waiting in the queue.
            </span>{" "}
            New requests go in line behind them as Pending. Process now comes back once the queue is empty.
          </p>
        )}
      </div>
    </div>
  );
}