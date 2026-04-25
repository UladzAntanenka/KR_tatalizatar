"use client";

import { useEffect, useMemo, useState } from "react";
import { candidates } from "@/data/candidates";

const MAX_SELECTED = 80;
const RESULTS_DATE = new Date("2026-05-16T23:59:59+02:00");

export default function HomePage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [failedThresholdFactions, setFailedThresholdFactions] = useState<
    string[]
  >([]);
  const [predictedTotalVotes, setPredictedTotalVotes] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const factions = useMemo(() => {
    const grouped: Record<string, typeof candidates> = {};

    for (const candidate of candidates) {
      if (!grouped[candidate.faction]) grouped[candidate.faction] = [];
      grouped[candidate.faction].push(candidate);
    }

    return grouped;
  }, []);

  const timeLeft = useMemo(() => {
    const diff = Math.max(0, RESULTS_DATE.getTime() - now.getTime());

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  }, [now]);

  const progressPercent = Math.round((selectedIds.length / MAX_SELECTED) * 100);

  const getFactionCandidates = (faction: string) => {
    return candidates
      .filter((item) => item.faction === faction)
      .sort((a, b) => a.listNumber - b.listNumber);
  };

  const getSelectedCountByFaction = (faction: string) => {
    return candidates.filter(
      (item) => item.faction === faction && selectedIds.includes(item.id)
    ).length;
  };

  const selectFactionCount = (faction: string, count: number) => {
    setError("");

    if (failedThresholdFactions.includes(faction)) {
      setError("Гэты спіс адзначаны як той, што не пераадолее парог 3%.");
      return;
    }

    const factionCandidates = getFactionCandidates(faction);
    const factionIds = factionCandidates.map((item) => item.id);

    const otherSelectedIds = selectedIds.filter(
      (id) => !factionIds.includes(id)
    );

    const newFactionIds = factionCandidates
      .slice(0, count)
      .map((item) => item.id);

    const nextSelectedIds = [...otherSelectedIds, ...newFactionIds];

    if (nextSelectedIds.length > MAX_SELECTED) {
      setError("Гэты выбар перавысіць ліміт у 80 кандыдатаў.");
      return;
    }

    setSelectedIds(nextSelectedIds);
  };

  const toggleCandidate = (candidateId: string) => {
    setError("");

    const candidate = candidates.find((item) => item.id === candidateId);
    if (!candidate) return;

    if (failedThresholdFactions.includes(candidate.faction)) {
      setError("Гэты спіс адзначаны як той, што не пераадолее парог 3%.");
      return;
    }

    const factionCandidates = getFactionCandidates(candidate.faction);

    const candidateIndex = factionCandidates.findIndex(
      (item) => item.id === candidateId
    );

    const isSelected = selectedIds.includes(candidateId);

    if (isSelected) {
      const idsToRemove = factionCandidates
        .slice(candidateIndex)
        .map((item) => item.id);

      setSelectedIds((prev) => prev.filter((id) => !idsToRemove.includes(id)));
      return;
    }

    const idsToAdd = factionCandidates
      .slice(0, candidateIndex + 1)
      .map((item) => item.id);

    const nextSelectedIds = Array.from(new Set([...selectedIds, ...idsToAdd]));

    if (nextSelectedIds.length > MAX_SELECTED) {
      setError(
        "Гэты выбар перавысіць ліміт у 80 кандыдатаў. Абярыце менш людзей у гэтым спісе."
      );
      return;
    }

    setSelectedIds(nextSelectedIds);
  };

  const toggleFailedThresholdFaction = (faction: string) => {
    setError("");

    const factionCandidates = getFactionCandidates(faction);
    const factionIds = factionCandidates.map((item) => item.id);

    const isMarked = failedThresholdFactions.includes(faction);

    if (isMarked) {
      setFailedThresholdFactions((prev) =>
        prev.filter((item) => item !== faction)
      );
      return;
    }

    setFailedThresholdFactions((prev) => [...prev, faction]);
    setSelectedIds((prev) => prev.filter((id) => !factionIds.includes(id)));
  };

  const selectRandomCandidates = () => {
    setError("");

    const availableFactions = Object.keys(factions).filter(
      (faction) => !failedThresholdFactions.includes(faction)
    );

    const selected = new Set<string>();
    let attempts = 0;

    while (selected.size < MAX_SELECTED && attempts < 10000) {
      attempts++;

      const randomFaction =
        availableFactions[Math.floor(Math.random() * availableFactions.length)];

      const factionCandidates = getFactionCandidates(randomFaction);
      const randomCandidate =
        factionCandidates[Math.floor(Math.random() * factionCandidates.length)];

      const idsToAdd = factionCandidates
        .filter((item) => item.listNumber <= randomCandidate.listNumber)
        .map((item) => item.id);

      const nextSelected = new Set([...selected, ...idsToAdd]);

      if (nextSelected.size <= MAX_SELECTED) {
        idsToAdd.forEach((id) => selected.add(id));
      }
    }

    if (selected.size !== MAX_SELECTED) {
      setError(
        "Не атрымалася выпадкова выбраць роўна 80. Паспрабуйце зняць частку абмежаванняў па спісах."
      );
      return;
    }

    setSelectedIds(Array.from(selected));
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setError("");
  };

  const handleSubmit = async () => {
    setError("");

    if (selectedIds.length !== MAX_SELECTED) {
      setError("Трэба выбраць роўна 80 кандыдатаў.");
      return;
    }

    if (!nickname.trim()) {
      setError("Увядзіце нікнэйм.");
      return;
    }

    if (!predictedTotalVotes || Number(predictedTotalVotes) <= 0) {
      setError("Увядзіце прагноз агульнай колькасці галасоў.");
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
          failedThresholdFactions,
          predictedTotalVotes: Number(predictedTotalVotes),
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

  if (submitted) {
    return (
      <main className="min-h-screen bg-white px-4 py-10 text-slate-950">
        <section className="mx-auto max-w-3xl animate-[fadeUp_0.5s_ease-out] rounded-[2rem] border border-slate-100 bg-white p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">
            Прагноз адпраўлены
          </p>

          <h1 className="mb-4 text-4xl font-black tracking-tight">
            Дзякуй, {nickname.trim()}!
          </h1>

          <p className="text-lg leading-8 text-slate-700">
            Ваш прагноз захаваны. Пасля абвяшчэння вынікаў мы апублікуем
            табліцу лідараў і статыстыку выбару па фракцыях і кандыдатах.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-950">
      <section className="relative mx-auto max-w-7xl px-4 py-8 md:py-12">
        <div className="pointer-events-none absolute -right-32 top-0 h-80 w-80 rounded-full bg-blue-100 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 top-72 h-80 w-80 rounded-full bg-amber-100 blur-3xl" />

        <section className="relative mb-8 rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-[0_20px_100px_rgba(15,23,42,0.08)] md:p-10">
          <p className="mb-4 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
            Таталізатар перад выбарамі ў Каардынацыйную раду
          </p>

          <h1 className="mb-5 max-w-5xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
            Абярыце 80 дэлегатаў і праверце сваю палітычную інтуіцыю
          </h1>

          <p className="max-w-3xl text-lg leading-8 text-slate-600">
            На сайце сабраныя 172 кандыдаты з 9 спісаў. Ваша задача —
            прадказаць, хто ўвойдзе ў склад Каардынацыйнай рады.
          </p>

          <div className="mt-7">
            <a
              href="#candidates"
              className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Перайсці да выбару
            </a>
          </div>
        </section>

        <section className="relative mb-8 rounded-[2.5rem] bg-slate-950 p-6 text-white shadow-[0_20px_80px_rgba(15,23,42,0.18)] md:p-8">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.25em] text-blue-300">
                Таймер
              </p>
              <h2 className="text-3xl font-black md:text-5xl">
                Да абвяшчэння вынікаў выбараў
              </h2>
            </div>

            <p className="max-w-xl text-slate-300">
              Пасля вынікаў мы адкрыем табліцу лідараў і статыстычны дашборд.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <WideTimerBox label="дзён" value={timeLeft.days} />
            <WideTimerBox label="гадзін" value={timeLeft.hours} />
            <WideTimerBox label="хвілін" value={timeLeft.minutes} />
            <WideTimerBox label="секунд" value={timeLeft.seconds} />
          </div>
        </section>

        <section className="relative mb-8 grid gap-4 md:grid-cols-3">
          <InfoCard
            title="Што такое Каардынацыйная рада?"
            text="Гэта прадстаўнічы орган дэмакратычных сіл Беларусі."
          />
          <InfoCard
            title="Як удзельнічаць?"
            text="Абярыце роўна 80 кандыдатаў. Унутры спісу выбар ідзе паслядоўна."
          />
          <InfoCard
            title="Як лічацца балы?"
            text="Асноўныя балы — за дэлегатаў. Дадатковыя — за прагноз спісаў, якія не пераадолеюць 3%, і агульную колькасць галасоў."
          />
        </section>

        <div className="sticky top-3 z-20 mb-6 rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-[0_15px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Абрана кандыдатаў
              </p>
              <p className="text-3xl font-black">
                {selectedIds.length} з {MAX_SELECTED}
              </p>
            </div>

            <div className="w-full md:max-w-xl">
              <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-slate-950 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectRandomCandidates}
                className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                Выпадкова
              </button>

              <button
                type="button"
                onClick={clearSelection}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold transition hover:bg-slate-50"
              >
                Скінуць
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>

        <section id="candidates" className="relative space-y-8 scroll-mt-28">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
                Спісы і кандыдаты
              </p>
              <h2 className="text-3xl font-black md:text-5xl">
                Абярыце сваіх 80
              </h2>
            </div>

            <p className="max-w-xl text-slate-600">
              Калі вы абіраеце кандыдата №12, аўтаматычна абіраюцца ўсе
              кандыдаты гэтага спісу з №1 па №12.
            </p>
          </div>

          {Object.entries(factions).map(([faction, factionCandidates]) => {
            const isFailed = failedThresholdFactions.includes(faction);
            const selectedCount = getSelectedCountByFaction(faction);

            return (
              <section
                key={faction}
                className={[
                  "rounded-[2rem] border p-5 shadow-[0_12px_50px_rgba(15,23,42,0.06)] md:p-7",
                  isFailed
                    ? "border-red-200 bg-red-50/70"
                    : "border-slate-100 bg-white",
                ].join(" ")}
              >
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h3 className="text-2xl font-black">{faction}</h3>
                    <p className="text-sm font-medium text-slate-500">
                      Кандыдатаў у спісе: {factionCandidates.length}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 md:items-end">
                    <button
                      type="button"
                      onClick={() => toggleFailedThresholdFaction(faction)}
                      className={[
                        "rounded-2xl px-4 py-2 text-sm font-black transition",
                        isFailed
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "border border-red-200 bg-white text-red-700 hover:bg-red-50",
                      ].join(" ")}
                    >
                      {isFailed
                        ? "Не пройдзе 3% ✓"
                        : "Не пераадолее 3%"}
                    </button>

                    <div className="flex items-center gap-3">
                      <label className="text-sm font-bold text-slate-600">
                        Колькі пройдзе:
                      </label>

                      <select
                        value={selectedCount}
                        disabled={isFailed}
                        onChange={(event) =>
                          selectFactionCount(
                            faction,
                            Number(event.target.value)
                          )
                        }
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold outline-none transition disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {Array.from({
                          length: factionCandidates.length + 1,
                        }).map((_, index) => (
                          <option key={index} value={index}>
                            {index}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {isFailed && (
                  <p className="mb-4 rounded-2xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-800">
                    Вы адзначылі, што гэты спіс не пераадолее 3%. Кандыдатаў з
                    яго выбраць нельга.
                  </p>
                )}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {factionCandidates.map((candidate) => {
                    const isSelected = selectedIds.includes(candidate.id);
                    const isDisabled =
                      isFailed ||
                      (!isSelected && selectedIds.length >= MAX_SELECTED);

                    return (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => toggleCandidate(candidate.id)}
                        disabled={isDisabled}
                        className={[
                          "group rounded-3xl border p-4 text-left transition duration-200",
                          isSelected
                            ? "scale-[1.015] border-blue-600 bg-blue-50 shadow-[0_12px_35px_rgba(37,99,235,0.18)] ring-2 ring-blue-600"
                            : "border-slate-200 bg-white hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_12px_35px_rgba(15,23,42,0.08)]",
                          isDisabled
                            ? "cursor-not-allowed opacity-35 hover:translate-y-0"
                            : "cursor-pointer",
                        ].join(" ")}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={[
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-black",
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600",
                            ].join(" ")}
                          >
                            {candidate.listNumber}
                          </span>

                          <div>
                            <p className="font-bold leading-6">
                              {candidate.name}
                            </p>
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
            );
          })}
        </section>

        <section className="relative mt-8 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_12px_50px_rgba(15,23,42,0.06)] md:p-8">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
            Дадатковы прагноз
          </p>

          <h2 className="mb-3 text-3xl font-black">
            Колькі ўсяго людзей прагаласуе?
          </h2>

          <p className="mb-5 max-w-3xl leading-7 text-slate-600">
            Увядзіце прагноз агульнай колькасці ўдзельнікаў галасавання.
          </p>

          <input
            type="number"
            min="1"
            value={predictedTotalVotes}
            onChange={(event) => setPredictedTotalVotes(event.target.value)}
            placeholder="Напрыклад: 12000"
            className="min-h-14 w-full max-w-md rounded-2xl border border-slate-300 px-4 text-lg font-bold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          />
        </section>

        <section className="relative mt-8 rounded-[2rem] border border-slate-100 bg-slate-950 p-6 text-white shadow-[0_20px_80px_rgba(15,23,42,0.18)] md:p-8">
          <h2 className="mb-3 text-3xl font-black">Адправіць прагноз</h2>

          <p className="mb-5 max-w-3xl leading-7 text-slate-300">
            Абярыце роўна 80 кандыдатаў, адзначце спісы, якія не пераадолеюць
            3%, увядзіце прагноз колькасці галасоў і свой нікнэйм.
          </p>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Ваш нікнэйм"
              maxLength={40}
              className="min-h-14 flex-1 rounded-2xl border border-white/10 bg-white px-4 text-slate-950 outline-none transition focus:ring-4 focus:ring-blue-500/30"
            />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedIds.length !== MAX_SELECTED || isSubmitting}
              className="min-h-14 rounded-2xl bg-blue-600 px-7 font-black text-white transition hover:-translate-y-0.5 hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
            >
              {isSubmitting ? "Адпраўляем..." : "Адправіць прагноз"}
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
              {error}
            </p>
          )}
        </section>
      </section>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}

function WideTimerBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[2rem] bg-white/10 p-5 text-center ring-1 ring-white/10">
      <p className="text-5xl font-black tabular-nums md:text-6xl">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-300">
        {label}
      </p>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_12px_50px_rgba(15,23,42,0.06)] transition hover:-translate-y-1">
      <h3 className="mb-3 text-xl font-black">{title}</h3>
      <p className="leading-7 text-slate-600">{text}</p>
    </div>
  );
}