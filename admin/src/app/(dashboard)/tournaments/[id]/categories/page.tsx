"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApiClient, useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Field, inputClass } from "@/components/field";

interface Category {
  id: string;
  name: string;
  type: string;
  gender: string;
  ageGroup: string | null;
}

export default function CategoriesPage() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const api = useApiClient();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const canManage = user?.role === "super_admin" || user?.role === "tournament_admin";

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<Category[]>(`/api/tournaments/${tournamentId}/categories`);
      setCategories(data);
    } catch {
      setError("Could not load categories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Categories</h1>
        {canManage && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            {showForm ? "Cancel" : "New Category"}
          </button>
        )}
      </div>

      {showForm && (
        <CreateCategoryForm
          tournamentId={tournamentId}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
        />
      )}

      {loading && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/tournaments/${tournamentId}/categories/${c.id}`}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-sky-600"
            >
              <p className="font-medium text-white">{c.name}</p>
              <p className="mt-1 text-xs text-slate-400">
                {c.type} · {c.gender}
                {c.ageGroup ? ` · ${c.ageGroup}` : ""}
              </p>
            </Link>
          ))}
          {categories.length === 0 && <p className="text-slate-500">No categories yet.</p>}
        </div>
      )}
    </div>
  );
}

function CreateCategoryForm({ tournamentId, onCreated }: { tournamentId: string; onCreated: () => void }) {
  const api = useApiClient();
  const [form, setForm] = useState({ name: "", type: "SINGLES", gender: "MEN", ageGroup: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api(`/api/tournaments/${tournamentId}/categories`, {
        method: "POST",
        body: { ...form, ageGroup: form.ageGroup || undefined },
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create category.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mb-6 space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      {error && <p className="rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Name">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Type">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
            <option value="SINGLES">Singles</option>
            <option value="DOUBLES">Doubles</option>
          </select>
        </Field>
        <Field label="Gender">
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={inputClass}>
            <option value="MEN">Men</option>
            <option value="WOMEN">Women</option>
            <option value="MIXED">Mixed</option>
          </select>
        </Field>
        <Field label="Age Group (optional)">
          <input
            value={form.ageGroup}
            onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}
            placeholder="e.g. Under 19"
            className={inputClass}
          />
        </Field>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create Category"}
      </button>
    </form>
  );
}
