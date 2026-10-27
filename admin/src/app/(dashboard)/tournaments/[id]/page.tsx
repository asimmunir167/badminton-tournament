"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApiClient, useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { RankingsBoard } from "@/components/rankings-board";

interface Tournament {
  id: string;
  name: string;
  venue: string;
  startDate: string;
  endDate: string;
  status: string;
  format: string;
  paymentInstructions: string | null;
  paymentAccounts: PaymentAccounts | null;
}

interface WalletAccount {
  number: string;
  accountName: string;
}

interface BankAccount {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban?: string;
}

interface PaymentAccounts {
  jazzCash?: WalletAccount;
  easyPaisa?: WalletAccount;
  bank?: BankAccount;
}

const SECTIONS = [
  { href: "categories", label: "Categories" },
  { href: "teams", label: "Teams" },
  { href: "registrations", label: "Registrations" },
  { href: "matches", label: "Fixtures" },
  { href: "courts", label: "Courts" },
  { href: "referees", label: "Referees" },
  { href: "ops", label: "Ops & Export" },
];

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const api = useApiClient();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Tournament>(`/api/tournaments/${id}`)
      .then(setTournament)
      .catch(() => setError("Could not load tournament."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (error || !tournament) return <p className="text-red-400">{error ?? "Not found."}</p>;

  const canCompute = user?.role === "super_admin" || user?.role === "tournament_admin";

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">{tournament.name}</h1>
      <p className="mt-1 text-sm text-slate-400">
        {tournament.venue} · {new Date(tournament.startDate).toLocaleDateString()} –{" "}
        {new Date(tournament.endDate).toLocaleDateString()} · {tournament.format.replaceAll("_", " ")} ·{" "}
        <span className="uppercase">{tournament.status}</span>
      </p>

      <PaymentSettingsEditor
        tournamentId={id}
        instructions={tournament.paymentInstructions}
        accounts={tournament.paymentAccounts}
        canManage={canCompute}
        onSaved={(next) =>
          setTournament((t) =>
            t
              ? {
                  ...t,
                  paymentInstructions: next.paymentInstructions,
                  paymentAccounts: next.paymentAccounts,
                }
              : t,
          )
        }
      />

      <div className="mt-6 rounded-xl border border-amber-900/50 bg-amber-950/30 p-4 text-sm text-amber-100">
        <p className="font-medium">Entry fee amount is set per category</p>
        <p className="mt-1 text-amber-200/80">
          Open <span className="font-semibold">Categories</span> → pick a category → set{" "}
          <span className="font-semibold">Entry Fee (PKR)</span>. Players only see payment options when that fee is
          greater than 0.
        </p>
        <Link
          href={`/tournaments/${id}/categories`}
          className="mt-3 inline-block rounded-md bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-500"
        >
          Go to Categories →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={`/tournaments/${id}/${s.href}`}
            className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-sky-600"
          >
            <p className="text-base font-medium text-white">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-white">Rankings</h2>
        <RankingsBoard
          listUrl={`/api/tournaments/${id}/rankings`}
          computeUrl={`/api/tournaments/${id}/rankings/compute`}
          canCompute={canCompute}
        />
      </div>
    </div>
  );
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function PaymentSettingsEditor({
  tournamentId,
  instructions,
  accounts,
  canManage,
  onSaved,
}: {
  tournamentId: string;
  instructions: string | null;
  accounts: PaymentAccounts | null;
  canManage: boolean;
  onSaved: (next: { paymentInstructions: string | null; paymentAccounts: PaymentAccounts | null }) => void;
}) {
  const api = useApiClient();
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(instructions ?? "");
  const [jazzNumber, setJazzNumber] = useState(accounts?.jazzCash?.number ?? "");
  const [jazzName, setJazzName] = useState(accounts?.jazzCash?.accountName ?? "");
  const [easyNumber, setEasyNumber] = useState(accounts?.easyPaisa?.number ?? "");
  const [easyName, setEasyName] = useState(accounts?.easyPaisa?.accountName ?? "");
  const [bankName, setBankName] = useState(accounts?.bank?.bankName ?? "");
  const [accountTitle, setAccountTitle] = useState(accounts?.bank?.accountTitle ?? "");
  const [accountNumber, setAccountNumber] = useState(accounts?.bank?.accountNumber ?? "");
  const [iban, setIban] = useState(accounts?.bank?.iban ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const hasAccounts = Boolean(accounts?.jazzCash || accounts?.easyPaisa || accounts?.bank || instructions);

  function startEdit() {
    setNotes(instructions ?? "");
    setJazzNumber(accounts?.jazzCash?.number ?? "");
    setJazzName(accounts?.jazzCash?.accountName ?? "");
    setEasyNumber(accounts?.easyPaisa?.number ?? "");
    setEasyName(accounts?.easyPaisa?.accountName ?? "");
    setBankName(accounts?.bank?.bankName ?? "");
    setAccountTitle(accounts?.bank?.accountTitle ?? "");
    setAccountNumber(accounts?.bank?.accountNumber ?? "");
    setIban(accounts?.bank?.iban ?? "");
    setError(null);
    setEditing(true);
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
          const jazzCash =
            emptyToUndefined(jazzNumber) && emptyToUndefined(jazzName)
              ? { number: jazzNumber.trim(), accountName: jazzName.trim() }
              : undefined;
          const easyPaisa =
            emptyToUndefined(easyNumber) && emptyToUndefined(easyName)
              ? { number: easyNumber.trim(), accountName: easyName.trim() }
              : undefined;
          const bank =
            emptyToUndefined(bankName) && emptyToUndefined(accountTitle) && emptyToUndefined(accountNumber)
              ? {
                  bankName: bankName.trim(),
                  accountTitle: accountTitle.trim(),
                  accountNumber: accountNumber.trim(),
                  ...(emptyToUndefined(iban) ? { iban: iban.trim() } : {}),
                }
              : undefined;

          if (Boolean(emptyToUndefined(jazzNumber)) !== Boolean(emptyToUndefined(jazzName))) {
            setError("JazzCash needs both a number and an account name.");
            setSaving(false);
            return;
          }
          if (Boolean(emptyToUndefined(easyNumber)) !== Boolean(emptyToUndefined(easyName))) {
            setError("Easypaisa needs both a number and an account name.");
            setSaving(false);
            return;
          }

      const paymentAccounts = jazzCash || easyPaisa || bank ? { jazzCash, easyPaisa, bank } : null;

      const updated = await api<{
        paymentInstructions: string | null;
        paymentAccounts: PaymentAccounts | null;
      }>(`/api/tournaments/${tournamentId}`, {
        method: "PATCH",
        body: {
          paymentInstructions: notes.trim() || "",
          paymentAccounts,
        },
      });
      onSaved({
        paymentInstructions: updated.paymentInstructions,
        paymentAccounts: updated.paymentAccounts,
      });
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save payment details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-sky-800 bg-slate-900 p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">1. How players pay the entry fee</h2>
        {canManage && !editing && (
          <button
            onClick={startEdit}
            className="shrink-0 rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500"
          >
            {hasAccounts ? "Edit payment details" : "Set JazzCash / Bank details"}
          </button>
        )}
      </div>
      <p className="mb-4 text-xs text-slate-400">
        Add JazzCash, Easypaisa, and/or bank account details. Players copy these in the mobile app after you also set a
        category entry fee.
      </p>

      {!canManage && (
        <p className="mb-3 rounded-md bg-slate-950 px-3 py-2 text-xs text-amber-300">
          You need a <strong>super_admin</strong> or <strong>tournament_admin</strong> account to edit payment details.
          Current role cannot edit this section.
        </p>
      )}

      {!editing && (
        <div className="space-y-3 text-sm text-slate-300">
          {accounts?.jazzCash && (
            <p>
              <span className="text-slate-500">JazzCash:</span> {accounts.jazzCash.number} ({accounts.jazzCash.accountName})
            </p>
          )}
          {accounts?.easyPaisa && (
            <p>
              <span className="text-slate-500">Easypaisa:</span> {accounts.easyPaisa.number} (
              {accounts.easyPaisa.accountName})
            </p>
          )}
          {accounts?.bank && (
            <p>
              <span className="text-slate-500">Bank:</span> {accounts.bank.bankName} · {accounts.bank.accountTitle} ·{" "}
              {accounts.bank.accountNumber}
              {accounts.bank.iban ? ` · IBAN ${accounts.bank.iban}` : ""}
            </p>
          )}
          {instructions && <p className="whitespace-pre-wrap text-slate-400">{instructions}</p>}
          {!hasAccounts && (
            <p className="rounded-md border border-dashed border-slate-700 px-3 py-4 text-center text-slate-500">
              No payment accounts set yet.
              {canManage ? " Click the blue button above to add JazzCash or bank details." : ""}
            </p>
          )}
        </div>
      )}

      {editing && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-slate-400">
            JazzCash number
            <input
              value={jazzNumber}
              onChange={(e) => setJazzNumber(e.target.value)}
              placeholder="03001234567"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            />
          </label>
          <label className="block text-xs text-slate-400">
            JazzCash account name
            <input
              value={jazzName}
              onChange={(e) => setJazzName(e.target.value)}
              placeholder="Punjab Badminton Association"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Easypaisa number
            <input
              value={easyNumber}
              onChange={(e) => setEasyNumber(e.target.value)}
              placeholder="03001234567"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Easypaisa account name
            <input
              value={easyName}
              onChange={(e) => setEasyName(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Bank name
            <input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="HBL"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Account title
            <input
              value={accountTitle}
              onChange={(e) => setAccountTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Account number
            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            />
          </label>
          <label className="block text-xs text-slate-400">
            IBAN (optional)
            <input
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            />
          </label>
          <label className="block text-xs text-slate-400 sm:col-span-2">
            Extra notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Send fee within 24 hours. Use player name as the JazzCash reference."
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            />
          </label>
          {error && <p className="text-xs text-red-400 sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button
              disabled={saving}
              onClick={save}
              className="rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              Save
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-slate-400 hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
