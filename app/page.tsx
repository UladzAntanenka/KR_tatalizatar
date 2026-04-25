"use client";

import { useEffect, useMemo, useState } from "react";
import { candidates } from "@/data/candidates";

const MAX_SELECTED = 80;
const RESULTS_DATE = new Date("2026-05-16T23:59:59+02:00");

const FACTION_ORDER = [
  "Ваш Голас",
  "Спіс 'Еўрапейскі выбар",
  "Хватит бояться!",
  "Рух Воля",
  "Аб'яднанная Грамадзянская Платформа",
  "Наступ",
  "ЗАКОН и Правопорядок",
  "Блок беларускіх палітычных зьняволеных «Беларусы дзеяньня»",
  'Кааліцыя Латушка і Рух "За Свабоду',
];

const PROGRAM_LINKS: Record<string, string> = {
  "Ваш Голас":
    "https://rada.vision/wp-content/uploads/2026/04/Pragrama_Vash-golas-.pdf",
  "Спіс 'Еўрапейскі выбар":
    "https://rada.vision/wp-content/uploads/2026/04/Pragrama_vybarchaga_spisu_E-rapejski_vybar.pdf",
  "Хватит бояться!":
    "https://rada.vision/wp-content/uploads/2026/04/Hvatit-Boyatsya.pdf",
  "Рух Воля":
    "https://rada.vision/wp-content/uploads/2026/04/Pragrama_Volia.pdf/",
  "Аб'яднанная Грамадзянская Платформа":
    "https://rada.vision/wp-content/uploads/2026/04/Palitychnaya-pragrama-spisu-AGP-.pdf",
  Наступ: "https://rada.vision/wp-content/uploads/2026/04/Nastup.pdf",
  "ЗАКОН и Правопорядок":
    "https://rada.vision/wp-content/uploads/2026/04/Programma-ODZP-.pdf",
  "Блок беларускіх палітычных зьняволеных «Беларусы дзеяньня»":
    "https://rada.vision/wp-content/uploads/2026/04/Belarusy-dzeyannya.pdf",
  'Кааліцыя Латушка і Рух "За Свабоду':
    "https://rada.vision/wp-content/uploads/2026/04/PRAGRAMA-LRZS-.pdf",
};

type RandomMode = "balanced" | "proportional" | "risky" | "conservative";

const RANDOM_MODE_LABELS: Record<RandomMode, string> = {
  balanced: "Раўнамерна",
  proportional: "Прапарцыйна",
  risky: "Рызыкоўна",
  conservative: "Кансерватыўна",
};

export default function HomePage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [failedThresholdFactions, setFailedThresholdFactions] = useState<
    string[]
  >([]);
  const [openFactions, setOpenFactions] = useState<string[]>([]);
  const [randomMode, setRandomMode] = useState<RandomMode>("balanced");
  const [predictedTotalVotes, setPredictedTotalVotes] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [now, setNow] = useState(new Date());
  const [shareCopied, setShareCopied] = useState(false);

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

  const orderedFactionEntries = useMemo(() => {
    return FACTION_ORDER.filter((faction) => factions[faction]).map(
      (faction) => [faction, factions[faction]] as const
    );
  }, [factions]);

  useEffect(() => {
    setOpenFactions(FACTION_ORDER.filter((faction) => factions[faction]));
  }, [factions]);

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

  const factionSummary = useMemo(() => {
    return orderedFactionEntries.map(([faction, factionCandidates]) => ({
      faction,
      total: factionCandidates.length,
      selected: getSelectedCountByFaction(faction),
      failed: failedThresholdFactions.includes(faction),
    }));
  }, [orderedFactionEntries, selectedIds, failedThresholdFactions]);

  const toggleFactionOpen = (faction: string) => {
    setOpenFactions((prev) =>
      prev.includes(faction)
        ? prev.filter((item) => item !== faction)
        : [...prev, faction]
    );
  };

  const selectFactionCount = (faction: string, count: number) => {
    setError("");

    if (failedThresholdFactions.includes(faction)) {
      setError("Гэты спіс адзначаны як той, што не пераадолее парог 3%.");
      return;
    }

    const factionCandidates = getFactionCandidates(faction);
    const safeCount = Math.max(0, Math.min(count, factionCandidates.length));
    const factionIds = factionCandidates.map((item) => item.id);

    const otherSelectedIds = selectedIds.filter(
      (id) => !factionIds.includes(id)
    );

    const newFactionIds = factionCandidates
      .slice(0, safeCount)
      .map((item) => item.id);

    const nextSelectedIds = [...otherSelectedIds, ...newFactionIds];

    if (nextSelectedIds.length > MAX_SELECTED) {
      setError("Гэты выбар перавысіць ліміт у 80 кандыдатаў.");
      return;
    }

    setSelectedIds(nextSelectedIds);
  };

  const changeFactionCount = (faction: string, delta: number) => {
    const current = getSelectedCountByFaction(faction);
    selectFactionCount(faction, current + delta);
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
      setError("Гэты выбар перавысіць ліміт у 80 кандыдатаў.");
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
      setOpenFactions((prev) =>
        prev.includes(faction) ? prev : [...prev, faction]
      );
      return;
    }

    setFailedThresholdFactions((prev) => [...prev, faction]);
    setSelectedIds((prev) => prev.filter((id) => !factionIds.includes(id)));
    setOpenFactions((prev) => prev.filter((item) => item !== faction));
  };

  const buildRandomCounts = () => {
    const available = orderedFactionEntries.filter(
      ([faction]) => !failedThresholdFactions.includes(faction)
    );

    const counts: Record<string, number> = {};
    for (const [faction] of available) counts[faction] = 0;

    if (randomMode === "balanced") {
      let left = MAX_SELECTED;
      while (left > 0) {
        let changed = false;
        for (const [faction, factionCandidates] of available) {
          if (left <= 0) break;
          if (counts[faction] < factionCandidates.length) {
            counts[faction]++;
            left--;
            changed = true;
          }
        }
        if (!changed) break;
      }
    }

    if (randomMode === "proportional") {
      const totalCandidates = available.reduce(
        (sum, [, factionCandidates]) => sum + factionCandidates.length,
        0
      );

      let assigned = 0;
      for (const [faction, factionCandidates] of available) {
        const count = Math.min(
          factionCandidates.length,
          Math.floor((factionCandidates.length / totalCandidates) * MAX_SELECTED)
        );
        counts[faction] = count;
        assigned += count;
      }

      while (assigned < MAX_SELECTED) {
        const possible = available.filter(
          ([faction, factionCandidates]) =>
            counts[faction] < factionCandidates.length
        );
        const random = possible[Math.floor(Math.random() * possible.length)];
        if (!random) break;
        counts[random[0]]++;
        assigned++;
      }
    }

    if (randomMode === "risky") {
      let left = MAX_SELECTED;
      const shuffled = [...available].sort(() => Math.random() - 0.5);
      for (const [faction, factionCandidates] of shuffled) {
        if (left <= 0) break;
        const max = Math.min(factionCandidates.length, left);
        const min = Math.min(max, Math.max(0, Math.floor(max * 0.45)));
        const count = Math.floor(Math.random() * (max - min + 1)) + min;
        counts[faction] = count;
        left -= count;
      }
    }

    if (randomMode === "conservative") {
      const largeFactions = [...available].sort(
        (a, b) => b[1].length - a[1].length
      );

      let left = MAX_SELECTED;
      for (const [faction, factionCandidates] of largeFactions) {
        if (left <= 0) break;
        const count = Math.min(factionCandidates.length, Math.ceil(left * 0.38));
        counts[faction] = count;
        left -= count;
      }
    }

    return counts;
  };

  const applyCounts = (counts: Record<string, number>) => {
    const ids: string[] = [];
    for (const [faction] of orderedFactionEntries) {
      const count = counts[faction] || 0;
      ids.push(...getFactionCandidates(faction).slice(0, count).map((c) => c.id));
    }

    if (ids.length !== MAX_SELECTED) {
      setError("Не атрымалася сабраць роўна 80. Паспрабуйце іншы рэжым.");
      return;
    }

    setSelectedIds(ids);
  };

  const randomizeAll = () => {
    setError("");
    applyCounts(buildRandomCounts());
  };

  const fillRandomTo80 = () => {
    setError("");

    const selected = new Set(selectedIds);
    const availableFactions = Object.keys(factions).filter(
      (faction) => !failedThresholdFactions.includes(faction)
    );

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
      setError("Не атрымалася дабраць да 80. Паспрабуйце змяніць выбар.");
      return;
    }

    setSelectedIds(Array.from(selected));
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setError("");
  };

  const validateBeforeSubmit = () => {
    setError("");

    if (selectedIds.length !== MAX_SELECTED) {
      setError("Трэба выбраць роўна 80 кандыдатаў.");
      return false;
    }

    if (!nickname.trim()) {
      setError("Увядзіце нікнэйм.");
      return false;
    }

    if (!predictedTotalVotes || Number(predictedTotalVotes) <= 0) {
      setError("Увядзіце прагноз агульнай колькасці галасоў.");
      return false;
    }

    return true;
  };

  const openSummary = () => {
    if (!validateBeforeSubmit()) return;
    setShowSummary(true);
  };

  const handleSubmit = async () => {
    if (!validateBeforeSubmit()) return;

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
        setShowSummary(false);
        return;
      }

      setSubmitted(true);
      setShowSummary(false);
    } catch {
      setError("Памылка злучэння з серверам.");
      setShowSummary(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareText = `Я зрабіў прагноз на выбары ў Каардынацыйную раду.

Мой нік: ${nickname.trim()}
Абраў 80 дэлегатаў і паспрабаваў адгадаць вынікі.

Далучайся і зрабі свой прагноз!`;

  const copyShareText = async () => {
    await navigator.clipboard.writeText(shareText);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1800);
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#fbfaf7] px-4 py-10 text-slate-950">
        <section className="mx-auto max-w-3xl animate-[pop_0.55s_ease-out] rounded-[2.25rem] border border-emerald-100 bg-white p-8 shadow-[0_30px_120px_rgba(15,23,42,0.12)]">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-3xl">
            ✓
          </div>

          <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-emerald-600">
            Прагноз адпраўлены
          </p>

          <h1 className="mb-4 text-4xl font-black tracking-tight">
            Дзякуй, {nickname.trim()}!
          </h1>

          <p className="mb-6 text-lg leading-8 text-slate-700">
            Ваш прагноз захаваны. Пасля абвяшчэння вынікаў мы апублікуем
            табліцу лідараў і статыстыку выбару.
          </p>

          <div className="rounded-[2rem] border border-slate-200 bg-[#fbfaf7] p-5">
            <p className="mb-2 text-sm font-black uppercase tracking-[0.2em] text-blue-600">
              Падзяліцца
            </p>

            <p className="mb-4 whitespace-pre-line leading-7 text-slate-700">
              {shareText}
            </p>

            <button
              type="button"
              onClick={copyShareText}
              className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white transition hover:bg-slate-800"
            >
              {shareCopied ? "Скапіявана ✓" : "Скапіяваць тэкст для Telegram"}
            </button>
          </div>
        </section>

        <GlobalStyles />
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfaf7] pb-36 text-slate-950">
      <section className="relative mx-auto max-w-7xl px-4 py-8 md:py-12">
        <Hero />

        <section className="relative mb-8 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.08)] md:p-8">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-sm font-black uppercase tracking-[0.25em] text-blue-600">
                Таймер
              </p>
              <h2 className="text-3xl font-black md:text-5xl">
                Да абвяшчэння вынікаў
              </h2>
            </div>
            <p className="max-w-xl text-slate-600">
              Пасля вынікаў тут з’явіцца табліца лідараў і дашборд.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <TimerTile label="дзён" value={timeLeft.days} />
            <TimerTile label="гадзін" value={timeLeft.hours} />
            <TimerTile label="хвілін" value={timeLeft.minutes} />
            <TimerTile label="секунд" value={timeLeft.seconds} />
          </div>
        </section>

        <section className="relative mb-8 grid gap-4 md:grid-cols-3">
          <InfoCard
            number="01"
            title="Абярыце спісы"
            text="Калі абіраеце №12, аўтаматычна абіраюцца №1–12."
          />
          <InfoCard
            number="02"
            title="Адзначце парог"
            text="Калі лічыце, што спіс не набярэ больш за 3%, адзначце гэта ўнутры карткі."
          />
          <InfoCard
            number="03"
            title="Адпраўце прагноз"
            text="Гэта не сапраўдныя выбары, а гульнявы прагноз вынікаў."
          />
        </section>

        <section id="candidates" className="relative space-y-5 scroll-mt-28">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">
                Спісы і кандыдаты
              </p>
              <h2 className="text-3xl font-black md:text-5xl">
                Абярыце сваіх 80
              </h2>
            </div>

            <div className="flex flex-col gap-3 md:items-end">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(RANDOM_MODE_LABELS) as RandomMode[]).map(
                  (mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setRandomMode(mode)}
                      className={[
                        "rounded-2xl px-3 py-2 text-sm font-black transition",
                        randomMode === mode
                          ? "bg-slate-950 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {RANDOM_MODE_LABELS[mode]}
                    </button>
                  )
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={fillRandomTo80}
                  className="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  Дабраць да 80
                </button>

                <button
                  type="button"
                  onClick={randomizeAll}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-black transition hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  Рандом па рэжыме
                </button>
              </div>
            </div>
          </div>

          {orderedFactionEntries.map(([faction, factionCandidates], i) => {
            const isFailed = failedThresholdFactions.includes(faction);
            const selectedCount = getSelectedCountByFaction(faction);
            const isOpen = openFactions.includes(faction);

            return (
              <section
                key={faction}
                className={[
                  "animate-[fadeUp_0.45s_ease-out] overflow-hidden rounded-[2rem] border shadow-[0_14px_55px_rgba(15,23,42,0.07)] transition-all duration-300",
                  isFailed
                    ? "border-red-200 bg-red-50/80"
                    : "border-white bg-white/90",
                ].join(" ")}
                style={{ animationDelay: `${i * 35}ms` }}
              >
                <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
                  <button
                    type="button"
                    onClick={() => toggleFactionOpen(faction)}
                    className="flex flex-1 items-center gap-4 text-left"
                  >
                    <div
                      className={[
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black transition",
                        isFailed
                          ? "bg-red-600 text-white"
                          : "bg-slate-950 text-white",
                      ].join(" ")}
                    >
                      {isOpen ? "−" : "+"}
                    </div>

                    <div>
                      <h3 className="text-xl font-black md:text-2xl">
                        {faction}
                      </h3>
                      <p className="text-sm font-bold text-slate-500">
                        {selectedCount} выбрана · {factionCandidates.length} у
                        спісе
                        {isFailed ? " · прагноз: не пройдзе 3%" : ""}
                      </p>
                    </div>
                  </button>

                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={PROGRAM_LINKS[faction]}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50"
                    >
                      Праграма ↗
                    </a>

                    <button
                      type="button"
                      onClick={() => toggleFailedThresholdFaction(faction)}
                      className={[
                        "rounded-2xl px-4 py-3 text-sm font-black transition hover:-translate-y-0.5",
                        isFailed
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "border border-red-200 bg-white text-red-700 hover:bg-red-50",
                      ].join(" ")}
                    >
                      {isFailed ? "Не пройдзе 3% ✓" : "Не пераадолее 3%"}
                    </button>

                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2">
                      <button
                        type="button"
                        disabled={isFailed || selectedCount <= 0}
                        onClick={() => changeFactionCount(faction, -1)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xl font-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        −
                      </button>

                      <input
                        type="number"
                        min={0}
                        max={factionCandidates.length}
                        value={selectedCount}
                        disabled={isFailed}
                        onChange={(event) =>
                          selectFactionCount(
                            faction,
                            Number(event.target.value)
                          )
                        }
                        className="h-9 w-16 rounded-xl border border-slate-200 text-center font-black outline-none disabled:opacity-40"
                      />

                      <button
                        type="button"
                        disabled={
                          isFailed ||
                          selectedCount >= factionCandidates.length ||
                          selectedIds.length >= MAX_SELECTED
                        }
                        onClick={() => changeFactionCount(faction, 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-xl font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  className={[
                    "grid transition-all duration-500",
                    isOpen && !isFailed
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0",
                  ].join(" ")}
                >
                  <div className="overflow-hidden">
                    <div className="grid gap-3 border-t border-slate-100 p-5 sm:grid-cols-2 lg:grid-cols-3 md:p-6">
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
                                    : "bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700",
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
                  </div>
                </div>
              </section>
            );
          })}
        </section>

        <section className="relative mt-8 rounded-[2rem] border border-white bg-white/90 p-6 shadow-[0_14px_55px_rgba(15,23,42,0.07)] md:p-8">
          <p className="mb-2 text-sm font-black uppercase tracking-[0.2em] text-blue-600">
            Дадатковы прагноз
          </p>

          <h2 className="mb-3 text-3xl font-black">
            Колькі ўсяго людзей прагаласуе?
          </h2>

          <input
            type="number"
            min="1"
            value={predictedTotalVotes}
            onChange={(event) => setPredictedTotalVotes(event.target.value)}
            placeholder="Напрыклад: 12000"
            className="min-h-14 w-full max-w-md rounded-2xl border border-slate-300 bg-white px-4 text-lg font-black outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          />
        </section>

        <section
          id="submit"
          className="relative mt-8 overflow-hidden rounded-[2.5rem] border border-slate-900 bg-slate-950 p-6 text-white shadow-[0_24px_100px_rgba(15,23,42,0.24)] md:p-8"
        >
          <h2 className="mb-3 text-3xl font-black">Адправіць прагноз</h2>

          <p className="mb-5 max-w-3xl leading-7 text-slate-300">
            Абярыце роўна 80 кандыдатаў, увядзіце агульную колькасць галасоў і
            свой нікнэйм.
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
              onClick={openSummary}
              disabled={selectedIds.length !== MAX_SELECTED || isSubmitting}
              className="min-h-14 rounded-2xl bg-blue-600 px-7 font-black text-white transition hover:-translate-y-0.5 hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
            >
              {isSubmitting ? "Адпраўляем..." : "Праверыць і адправіць"}
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
              {error}
            </p>
          )}
        </section>
      </section>

      <FloatingControlBar
        selectedCount={selectedIds.length}
        progressPercent={progressPercent}
        factionSummary={factionSummary}
        onFillRandom={fillRandomTo80}
        onRandomizeAll={randomizeAll}
        onClear={clearSelection}
        onSubmitJump={() => {
          document.getElementById("submit")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }}
      />

      {showSummary && (
        <SummaryModal
          nickname={nickname.trim()}
          selectedCount={selectedIds.length}
          predictedTotalVotes={predictedTotalVotes}
          factionSummary={factionSummary}
          failedThresholdFactions={failedThresholdFactions}
          isSubmitting={isSubmitting}
          onCancel={() => setShowSummary(false)}
          onConfirm={handleSubmit}
        />
      )}

      <GlobalStyles />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative mb-8 overflow-hidden rounded-[2.75rem] border border-white bg-white/80 p-6 shadow-[0_30px_140px_rgba(15,23,42,0.12)] backdrop-blur md:p-10">
      <div className="absolute right-6 top-6 hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 md:block">
        172 кандыдаты · 9 спісаў · 80 месцаў
      </div>

      <p className="mb-4 inline-flex animate-[float_3s_ease-in-out_infinite] rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 ring-1 ring-blue-100">
        Таталізатар перад выбарамі ў Каардынацыйную раду
      </p>

      <h1 className="mb-5 max-w-5xl text-4xl font-black leading-[0.95] tracking-tight md:text-7xl">
        Збярыце свой прагноз на выбары
      </h1>

      <p className="max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
        Абярыце 80 дэлегатаў, адзначце спісы, якія не пераадолеюць парог 3%, і
        паспрабуйце адгадаць агульную колькасць галасоў.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href="#candidates"
          className="rounded-2xl bg-slate-950 px-6 py-4 font-black text-white transition hover:-translate-y-1 hover:bg-slate-800 hover:shadow-xl"
        >
          Пачаць выбар
        </a>

        <a
          href="https://rada.vision/"
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl border border-slate-200 bg-white px-6 py-4 font-black text-slate-900 transition hover:-translate-y-1 hover:border-blue-300 hover:bg-blue-50 hover:shadow-xl"
        >
          Сайт Каардынацыйнай рады ↗
        </a>
      </div>
    </section>
  );
}

function FloatingControlBar({
  selectedCount,
  progressPercent,
  factionSummary,
  onFillRandom,
  onRandomizeAll,
  onClear,
  onSubmitJump,
}: {
  selectedCount: number;
  progressPercent: number;
  factionSummary: {
    faction: string;
    selected: number;
    total: number;
    failed: boolean;
  }[];
  onFillRandom: () => void;
  onRandomizeAll: () => void;
  onClear: () => void;
  onSubmitJump: () => void;
}) {
  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-6xl rounded-[2rem] border border-slate-950 bg-white/90 p-3 shadow-[0_18px_80px_rgba(15,23,42,0.25)] backdrop-blur-xl md:p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-950 bg-white text-xl font-black text-slate-950">
              {selectedCount}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500">
                Абрана з {MAX_SELECTED}
              </p>
              <p className="font-black">
                {MAX_SELECTED - selectedCount > 0
                  ? `Засталося ${MAX_SELECTED - selectedCount}`
                  : "Гатова да адпраўкі"}
              </p>
            </div>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 md:max-w-sm">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-fuchsia-500 to-slate-950 transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-4 gap-2 md:flex">
            <button
              type="button"
              onClick={onFillRandom}
              className="rounded-2xl bg-blue-600 px-3 py-3 text-xs font-black text-white transition hover:bg-blue-700 md:text-sm"
            >
              Дабраць
            </button>

            <button
              type="button"
              onClick={onRandomizeAll}
              className="rounded-2xl border border-slate-200 px-3 py-3 text-xs font-black transition hover:bg-slate-50 md:text-sm"
            >
              Рандом
            </button>

            <button
              type="button"
              onClick={onClear}
              className="rounded-2xl border border-slate-200 px-3 py-3 text-xs font-black transition hover:bg-slate-50 md:text-sm"
            >
              Скінуць
            </button>

            <button
              type="button"
              onClick={onSubmitJump}
              disabled={selectedCount !== MAX_SELECTED}
              className="rounded-2xl bg-slate-950 px-3 py-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 md:text-sm"
            >
              Адправіць
            </button>
          </div>
        </div>

        <div className="hidden gap-2 overflow-x-auto pb-1 md:flex">
          {factionSummary.map((item) => (
            <span
              key={item.faction}
              className={[
                "shrink-0 rounded-full border px-3 py-1 text-xs font-black",
                item.failed
                  ? "border-red-200 bg-red-50 text-red-700"
                  : item.selected > 0
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-slate-50 text-slate-500",
              ].join(" ")}
            >
              {shortFactionName(item.faction)}:{" "}
              {item.failed ? "3%−" : item.selected}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryModal({
  nickname,
  selectedCount,
  predictedTotalVotes,
  factionSummary,
  failedThresholdFactions,
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  nickname: string;
  selectedCount: number;
  predictedTotalVotes: string;
  factionSummary: {
    faction: string;
    selected: number;
    total: number;
    failed: boolean;
  }[];
  failedThresholdFactions: string[];
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl animate-[pop_0.25s_ease-out] overflow-y-auto rounded-[2rem] bg-white p-6 shadow-[0_30px_120px_rgba(15,23,42,0.35)]">
        <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-blue-600">
          Праверце прагноз
        </p>

        <h2 className="mb-4 text-3xl font-black">Summary перад адпраўкай</h2>

        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <SummaryStat label="Нікнэйм" value={nickname} />
          <SummaryStat label="Кандыдатаў" value={`${selectedCount}/80`} />
          <SummaryStat label="Галасоў" value={predictedTotalVotes} />
        </div>

        <div className="mb-5 rounded-[1.5rem] border border-slate-200 p-4">
          <h3 className="mb-3 font-black">Выбар па спісах</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {factionSummary.map((item) => (
              <div
                key={item.faction}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2"
              >
                <span className="text-sm font-bold">{item.faction}</span>
                <span className="text-sm font-black">
                  {item.failed ? "не пройдзе 3%" : item.selected}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-5 rounded-[1.5rem] border border-red-100 bg-red-50 p-4">
          <h3 className="mb-2 font-black text-red-800">
            Гэта не сапраўдныя выбары
          </h3>
          <p className="leading-7 text-red-800">
            Гэты сайт — не афіцыйная платформа галасавання і не замяняе ўдзел у
            выбарах. Гэта толькі гульнявы таталізатар / прагноз на вынікі.
            Сапраўднае галасаванне будзе праходзіць на асобнай афіцыйнай
            платформе.
          </p>
        </div>

        {failedThresholdFactions.length > 0 && (
          <div className="mb-5 rounded-[1.5rem] border border-slate-200 p-4">
            <h3 className="mb-2 font-black">Спісы, якія не пераадолеюць 3%</h3>
            <div className="flex flex-wrap gap-2">
              {failedThresholdFactions.map((faction) => (
                <span
                  key={faction}
                  className="rounded-full bg-red-50 px-3 py-1 text-sm font-black text-red-700"
                >
                  {faction}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 md:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 flex-1 rounded-2xl border border-slate-200 font-black transition hover:bg-slate-50"
          >
            Вярнуцца
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="min-h-12 flex-1 rounded-2xl bg-blue-600 font-black text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? "Адпраўляем..." : "Разумею, адправіць"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
      <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}

function TimerTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="group rounded-[2rem] border border-slate-200 bg-[#fbfaf7] p-5 text-center transition hover:-translate-y-1 hover:border-slate-950 hover:shadow-xl">
      <p className="text-5xl font-black tabular-nums tracking-tight md:text-6xl">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-2 text-sm font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-950">
        {label}
      </p>
    </div>
  );
}

function InfoCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="group rounded-[2rem] border border-white bg-white/85 p-6 shadow-[0_14px_55px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:bg-white hover:shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
      <p className="mb-4 inline-flex rounded-2xl bg-slate-950 px-3 py-2 text-sm font-black text-white transition group-hover:bg-blue-600">
        {number}
      </p>
      <h3 className="mb-3 text-xl font-black">{title}</h3>
      <p className="leading-7 text-slate-600">{text}</p>
    </div>
  );
}

function shortFactionName(faction: string) {
  if (faction.includes("Еўрапейскі")) return "Еўравыбар";
  if (faction.includes("Хватит")) return "Хватит";
  if (faction.includes("Грамадзянская")) return "АГП";
  if (faction.includes("ЗАКОН")) return "Закон";
  if (faction.includes("зьняволеных")) return "Беларусы дзеяньня";
  if (faction.includes("Латушка")) return "ЛРЗС";
  return faction;
}

function GlobalStyles() {
  return (
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

      @keyframes pop {
        from {
          opacity: 0;
          transform: scale(0.96) translateY(14px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      @keyframes float {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-6px);
        }
      }
    `}</style>
  );
}