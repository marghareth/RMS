// FILE: src/components/shared/LoadingSpinner.tsx
export default function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 border-2 border-(--brand-tint-strong) border-t-(--brand-line) rounded-full animate-spin" />
      <p className="text-sm text-gray-400 dark:text-[#525252]">{text}</p>
    </div>
  );
}