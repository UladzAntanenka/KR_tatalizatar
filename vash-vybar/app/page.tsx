"use client";

import { useMemo, useState } from "react";
import { candidates } from "@/data/candidates";

export default function HomePage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxSelected = 80;

  const factions = useMemo(() => {
    const grouped: Record<string, typeof candidates> = {};

    for (const candidate of candidates) {
      if (!grouped[candidate.faction]) {
        grouped[candidate.faction] = [];
      }

      grouped[candidate.faction].push(candidate);
    }

    return grouped;
  }, []);

  const toggleCandidate = (candidateId: string) => {
    setError("");

    const isSelected = selectedIds.includes(candidateId);

    if (isSelected) {
      setSelectedIds((prev) => prev.filter((id) => id !== candidateId));
      return;
    }

    if (selectedIds.length >= maxSelected) {
      setError(
        "Вы ўжо абралі 80 кандыдатаў. Каб выбраць іншага, спачатку зніміце выбар з аднаго з абраных."
      );
      return;
    }

    setSelectedIds((prev) => [...prev, candidateId]);
  };

  const handleSubmit = async () => {
    setError("");

    if (selectedIds.length !== maxSelected) {
      setError("Трэба выбраць роўна 80 кандыдатаў.");
      return;
    }

    if (!nickname.trim()) {
      setError("Увядзіце нікнэйм.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nickname: nickname.trim(),
          selectedCandidateIds: selectedIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Не атрымалася адправіць прагноз.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Памылка злучэння з серверам.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercent = Math.round((selectedIds.length / maxSelected) * 100);

  if (submitted) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
        <section className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-600">
            Прагноз адпраўлены
          </p>

          <h1 className="mb-4 text-3xl font-bold">
            Дзякуй, {nickname.trim()}!
          </h1>

          <p className="text-lg text-slate-700">
            Ваш прагноз захаваны. Пасля абвяшчэння вынікаў мы апублікуем
            табліцу лідараў і статыстыку выбару па фракцыях і кандыдатах.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm md:p-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-600">
            Таталізатар перад выбарамі ў Каардынацыйную раду
          </p>

          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-6xl">
            Ваш выбар: абярыце 80 дэлегатаў
          </h1>

          <p className="max-w-3xl text-lg text-slate-700">
            Абярыце роўна 80 кандыдатаў з 9 спісаў. Пасля абвяшчэння
            афіцыйных вынікаў мы пакажам, хто дакладней за ўсіх прадказаў
            склад дэлегатаў.
          </p>
        </div>

        <div className="sticky top-0 z-20 mb-6 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-500">Абрана кандыдатаў</p>
              <p className="text-2xl font-bold">
                {selectedIds.length} з {maxSelected}
              </p>
            </div>

            <div className="w-full md:max-w-md">
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {selectedIds.length === maxSelected && (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Вы абралі 80 кандыдатаў. Каб выбраць іншага, спачатку зніміце
              выбар з аднаго з ужо абраных.
            </p>
          )}

          {error && (
            <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="space-y-8">
          {Object.entries(factions).map(([faction, factionCandidates]) => (
            <section
              key={faction}
              className="rounded-3xl bg-white p-5 shadow-sm md:p-7"
            >
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{faction}</h2>
                  <p className="text-sm text-slate-500">
                    Кандыдатаў у спісе: {factionCandidates.length}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {factionCandidates.map((candidate) => {
                  const isSelected = selectedIds.includes(candidate.id);
                  const isDisabled =
                    !isSelected && selectedIds.length >= maxSelected;

                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => toggleCandidate(candidate.id)}
                      disabled={isDisabled}
                      className={[
                        "rounded-2xl border p-4 text-left transition",
                        isSelected
                          ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600"
                          : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50",
                        isDisabled
                          ? "cursor-not-allowed opacity-40 hover:border-slate-200 hover:bg-white"
                          : "cursor-pointer",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={[
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-600",
                          ].join(" ")}
                        >
                          {candidate.listNumber}
                        </span>

                        <div>
                          <p className="font-semibold">{candidate.name}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {candidate.faction}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <h2 className="mb-3 text-2xl font-bold">Адправіць прагноз</h2>

          <p className="mb-5 text-slate-600">
            Каб адправіць прагноз, абярыце роўна 80 кандыдатаў і ўвядзіце
            нікнэйм. Адзін нікнэйм можа быць выкарыстаны толькі адзін раз.
          </p>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Ваш нікнэйм"
              maxLength={40}
              className="min-h-12 flex-1 rounded-2xl border border-slate-300 px-4 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedIds.length !== maxSelected || isSubmitting}
              className="min-h-12 rounded-2xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? "Адпраўляем..." : "Адправіць прагноз"}
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </section>
      </section>
    </main>
  );
}