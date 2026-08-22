"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useApiClient, useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Field, inputClass } from "@/components/field";
import { PUNJAB_DISTRICTS } from "@/lib/punjab-districts";

const CUSTOM_OPTION = "__custom__";

interface District {
  id: string;
  name: string;
  code: string;
}

export default function DistrictsPage() {
  const api = useApiClient();
  const { user } = useAuth();
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<District[]>("/api/districts");
      setDistricts(data);
    } catch {
      setError("Could not load districts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Districts</h1>
        {user?.role === "super_admin" && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            {showForm ? "Cancel" : "New District"}
          </button>
        )}
      </div>

      {showForm && (
        <CreateDistrictForm
          existingNames={districts.map((d) => d.name)}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
        />
      )}

      {loading && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {districts.map((d) => (
                <tr key={d.id} className="bg-slate-950 hover:bg-slate-900/60">
                  <td className="px-4 py-3 font-medium text-white">{d.name}</td>
                  <td className="px-4 py-3 text-slate-300">{d.code}</td>
                </tr>
              ))}
              {districts.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                    No districts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CreateDistrictForm({
  existingNames,
  onCreated,
}: {
  existingNames: string[];
  onCreated: () => void;
}) {
  const api = useApiClient();
  const [selected, setSelected] = useState("");
  const [customName, setCustomName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const existingLower = useMemo(() => new Set(existingNames.map((n) => n.toLowerCase())), [existingNames]);
  const availableDistricts = useMemo(
    () => PUNJAB_DISTRICTS.filter((d) => !existingLower.has(d.name.toLowerCase())),
    [existingLower],
  );

  const isCustom = selected === CUSTOM_OPTION;
  const name = isCustom ? customName : selected;

  function onSelectChange(value: string) {
    setSelected(value);
    if (value !== CUSTOM_OPTION) {
      const match = PUNJAB_DISTRICTS.find((d) => d.name === value);
      setCode(match?.code ?? "");
    } else {
      setCode("");
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api("/api/districts", {
        method: "POST",
        body: { name, code },
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create district.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mb-6 space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      {error && <p className="rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <Field label="District (Punjab, Pakistan)">
          <select required value={selected} onChange={(e) => onSelectChange(e.target.value)} className={inputClass}>
            <option value="" disabled>
              Select a district…
            </option>
            {availableDistricts.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
            <option value={CUSTOM_OPTION}>Other (custom / outside Punjab)…</option>
          </select>
        </Field>

        {isCustom && (
          <Field label="Custom Name">
            <input
              required
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}

        <Field label="Code">
          <input
            required
            maxLength={10}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create District"}
      </button>
    </form>
  );
}
