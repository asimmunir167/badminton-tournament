export const inputClass =
  "w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-slate-300">{label}</span>
      {children}
    </label>
  );
}
