"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { candidates } from "@/data/candidates";
import Turnstile from "react-turnstile";

const MAX_SELECTED = 80;
const RESULTS_DATE = new Date("2026-05-18T23:59:59+02:00");

const FACTION_ORDER = [
  "Ваш Голас",
  "Еўрапейскі выбар",
  "Хватит Бояться!",
  "Рух «Воля»",
  "Аб’яднаная грамадзянская платформа",
  "Наступ",
  "ЗАКОН і Правапарадак",
  "Блок беларускі палітычных зняволеных «Беларусы дзеяння»",
  "Кааліцыя Латушка і Рух «За Свабоду»",
];

const FACTION_COLORS: Record<string, string> = {
  "Ваш Голас": "#E8420A",
  "Спіс 'Еўрапейскі выбар": "#2455C3",
  "Хватит бояться!": "#7C3AED",
  "Рух Воля": "#059669",
  "Аб'яднанная Грамадзянская Платформа": "#D97706",
  Наступ: "#DC2626",
  "ЗАКОН и Правопорядок": "#0891B2",
  "Блок беларускіх палітычных зьняволеных «Беларусы дзеяньня»": "#65A30D",
  'Кааліцыя Латушка і Рух "За Свабоду': "#DB2777",
};

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

function getFactionColor(faction: string) {
  if (FACTION_COLORS[faction]) return FACTION_COLORS[faction];
  if (faction.includes("Латушка")) return "#DB2777";
  if (faction.includes("Еўрапейскі")) return "#2455C3";
  if (faction.includes("Хватит")) return "#7C3AED";
  if (faction.includes("Грамадзянская")) return "#D97706";
  if (faction.includes("ЗАКОН")) return "#0891B2";
  if (faction.includes("зьняволеных")) return "#65A30D";
  return "#888";
}

function getProgramLink(faction: string) {
  if (PROGRAM_LINKS[faction]) return PROGRAM_LINKS[faction];
  if (faction.includes("Латушка")) {
    return "https://rada.vision/wp-content/uploads/2026/04/PRAGRAMA-LRZS-.pdf";
  }
  return "#";
}

function shortFactionName(faction: string) {
  if (faction.includes("Еўрапейскі")) return "Еўравыбар";
  if (faction.includes("Хватит")) return "Хватит";
  if (faction.includes("Грамадзянская")) return "АГП";
  if (faction.includes("ЗАКОН")) return "Закон";
  if (faction.includes("зьняволеных")) return "Б.Дзеяньня";
  if (faction.includes("Латушка")) return "ЛРЗС";
  return faction;
}

export default function HomePage() {
  const [clientId, setClientId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [failedThresholdFactions, setFailedThresholdFactions] = useState<string[]>([]);
  const [openFactions, setOpenFactions] = useState<string[]>([]);
  const [predictedTotalVotes, setPredictedTotalVotes] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showAutofillModal, setShowAutofillModal] = useState(false);
  const [now, setNow] = useState(new Date());
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isMobileBarExpanded, setIsMobileBarExpanded] = useState(true);
  const [justReachedMax, setJustReachedMax] = useState(false);

  const prevSelectedCount = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const storageKey = "kr_prediction_client_id";
    const existingClientId = localStorage.getItem(storageKey);
  
    if (existingClientId) {
      setClientId(existingClientId);
      return;
    }
  
    const newClientId = crypto.randomUUID();
    localStorage.setItem(storageKey, newClientId);
    setClientId(newClientId);
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
    const used = new Set<string>();
    const ordered: [string, typeof candidates][] = [];

    for (const orderName of FACTION_ORDER) {
      const exactFaction = Object.keys(factions).find(
        (faction) =>
          faction === orderName ||
          faction.includes(orderName) ||
          orderName.includes(faction) ||
          (orderName.includes("Латушка") && faction.includes("Латушка"))
      );

      if (exactFaction && !used.has(exactFaction)) {
        ordered.push([exactFaction, factions[exactFaction]]);
        used.add(exactFaction);
      }
    }

    for (const faction of Object.keys(factions)) {
      if (!used.has(faction)) ordered.push([faction, factions[faction]]);
    }

    return ordered;
  }, [factions]);

  useEffect(() => {
    setOpenFactions(orderedFactionEntries.map(([faction]) => faction));
  }, [orderedFactionEntries]);

  const selectedCountByFaction = useMemo(() => {
    const map: Record<string, number> = {};
    for (const id of selectedIds) {
      const candidate = candidates.find((c) => c.id === id);
      if (candidate) map[candidate.faction] = (map[candidate.faction] || 0) + 1;
    }
    return map;
  }, [selectedIds]);

  useEffect(() => {
    if (
      prevSelectedCount.current !== MAX_SELECTED &&
      selectedIds.length === MAX_SELECTED
    ) {
      setJustReachedMax(true);
      setTimeout(() => setJustReachedMax(false), 2500);
    }
    prevSelectedCount.current = selectedIds.length;
  }, [selectedIds.length]);

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

  const getFactionCandidates = useCallback(
    (faction: string) =>
      candidates
        .filter((item) => item.faction === faction)
        .sort((a, b) => a.listNumber - b.listNumber),
    []
  );

  const getSelectedCountByFaction = useCallback(
    (faction: string) => selectedCountByFaction[faction] || 0,
    [selectedCountByFaction]
  );

  const factionSummary = useMemo(() => {
    return orderedFactionEntries.map(([faction, factionCandidates]) => ({
      faction,
      total: factionCandidates.length,
      selected: getSelectedCountByFaction(faction),
      failed: failedThresholdFactions.includes(faction),
      color: getFactionColor(faction),
    }));
  }, [orderedFactionEntries, getSelectedCountByFaction, failedThresholdFactions]);

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
    const otherIds = selectedIds.filter((id) => !factionIds.includes(id));
    const next = [
      ...otherIds,
      ...factionCandidates.slice(0, safeCount).map((item) => item.id),
    ];

    if (next.length > MAX_SELECTED) {
      setError("Гэты выбар перавысіць ліміт у 80 кандыдатаў.");
      return;
    }

    setSelectedIds(next);
  };

  const changeFactionCount = (faction: string, delta: number) => {
    selectFactionCount(faction, getSelectedCountByFaction(faction) + delta);
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

    if (selectedIds.includes(candidateId)) {
      const remove = factionCandidates
        .slice(candidateIndex)
        .map((item) => item.id);
      setSelectedIds((prev) => prev.filter((id) => !remove.includes(id)));
    } else {
      const add = factionCandidates
        .slice(0, candidateIndex + 1)
        .map((item) => item.id);
      const next = Array.from(new Set([...selectedIds, ...add]));
      if (next.length > MAX_SELECTED) {
        setError("Гэты выбар перавысіць ліміт у 80 кандыдатаў.");
        return;
      }
      setSelectedIds(next);
    }
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
    } else {
      setFailedThresholdFactions((prev) => [...prev, faction]);
      setSelectedIds((prev) => prev.filter((id) => !factionIds.includes(id)));
      setOpenFactions((prev) => prev.filter((item) => item !== faction));
    }
  };

  const randomizeEverything = () => {
    setError("");

    const failedRandom = orderedFactionEntries
      .filter(() => Math.random() < 0.2)
      .map(([faction]) => faction);

    const available = orderedFactionEntries.filter(
      ([faction]) => !failedRandom.includes(faction)
    );

    const counts: Record<string, number> = {};
    for (const [faction] of available) counts[faction] = 0;

    let left = MAX_SELECTED;

    while (left > 0) {
      let changed = false;

      for (const [faction, factionCandidates] of available) {
        if (left <= 0) break;

        if (counts[faction] < factionCandidates.length && Math.random() > 0.25) {
          counts[faction]++;
          left--;
          changed = true;
        }
      }

      if (!changed) {
        const possible = available.filter(
          ([faction, factionCandidates]) =>
            counts[faction] < factionCandidates.length
        );

        const randomFaction =
          possible[Math.floor(Math.random() * possible.length)];

        if (!randomFaction) break;

        counts[randomFaction[0]]++;
        left--;
      }
    }

    const ids: string[] = [];

    for (const [faction] of orderedFactionEntries) {
      const count = counts[faction] || 0;
      ids.push(
        ...getFactionCandidates(faction)
          .slice(0, count)
          .map((candidate) => candidate.id)
      );
    }

    const randomVotes = Math.floor(Math.random() * (35000 - 3000 + 1)) + 3000;

    setFailedThresholdFactions(failedRandom);
    setSelectedIds(ids);
    setPredictedTotalVotes(String(randomVotes));
    setOpenFactions(
      orderedFactionEntries
        .map(([faction]) => faction)
        .filter((faction) => !failedRandom.includes(faction))
    );
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

      const toAdd = factionCandidates
        .filter((item) => item.listNumber <= randomCandidate.listNumber)
        .map((item) => item.id);

      const next = new Set([...selected, ...toAdd]);

      if (next.size <= MAX_SELECTED) {
        toAdd.forEach((id) => selected.add(id));
      }
    }

    if (selected.size !== MAX_SELECTED) {
      setError("Не атрымалася дабраць да 80. Паспрабуйце змяніць выбар.");
      return false;
    }

    if (!predictedTotalVotes) {
      const randomVotes = Math.floor(Math.random() * (35000 - 3000 + 1)) + 3000;
      setPredictedTotalVotes(String(randomVotes));
    }

    setSelectedIds(Array.from(selected));
    return true;
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setFailedThresholdFactions([]);
    setPredictedTotalVotes("");
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
      setError("Увядзіце прагноз агульнай колькасці ўдзельнікаў галасавання.");
      return false;
    }

    if (!clientId) {
      setError("Не атрымалася вызначыць прыладу. Абнавіце старонку.");
      return false;
    }

    if (!turnstileToken) {
      setError("Прайдзіце праверку бяспекі.");
      return false;
    }

    return true;
  };

  const openSummary = () => {
    setError("");

    if (selectedIds.length < MAX_SELECTED) {
      setShowAutofillModal(true);
      return;
    }

    if (!validateBeforeSubmit()) return;
    setShowSummary(true);
  };

  const handleAutofillAndContinue = () => {
    setShowAutofillModal(false);
    const ok = fillRandomTo80();
    if (!ok) return;

    setTimeout(() => {
      if (!nickname.trim()) {
        document
          .getElementById("submit")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        setError("Дабралі да 80. Цяпер увядзіце нікнэйм і праверце прагноз.");
        return;
      }

      if (!predictedTotalVotes || Number(predictedTotalVotes) <= 0) {
        setError("Дабралі да 80. Увядзіце прагноз колькасці ўдзельнікаў.");
        return;
      }

      if (!turnstileToken) {
        document
          .getElementById("submit")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        setError("Дабралі да 80. Цяпер прайдзіце праверку бяспекі.");
        return;
      }

      setShowSummary(true);
    }, 80);
  };

  const handleSubmit = async () => {
    if (!validateBeforeSubmit()) return;

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          selectedCandidateIds: selectedIds,
          failedThresholdFactions,
          predictedTotalVotes: Number(predictedTotalVotes),
          turnstileToken,
          clientId,
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

  if (submitted) {
    return (
      <main className="min-h-screen bg-[var(--bg)] px-4 py-16 text-[var(--ink)]">
        <div className="mx-auto max-w-2xl">
          <div className="card-glow animate-pop overflow-hidden rounded-3xl p-8">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-3xl text-white">
              ✓
            </div>

            <p className="label-tag mb-3">Прагноз адпраўлены</p>

            <h1 className="heading-xl mb-4">Дзякуй, {nickname.trim()}!</h1>

            <p className="mb-6 text-white/75">
              Абярыце 80 кандыдатаў, увядзіце нікнэйм, прагноз колькасці
              ўдзельнікаў і прайдзіце праверку бяспекі.
            </p>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
              <p className="mb-2 font-black text-[var(--ink)]">
                Важна пра сапраўднае галасаванне
              </p>
              <p className="body-text text-[var(--ink-2)]">
                Гэты сайт — толькі гульнявы прагноз і не з’яўляецца афіцыйнай
                платформай галасавання. Сачыце за інфармацыяй пра тое, калі і
                як прагаласаваць, на афіцыйных рэсурсах Каардынацыйнай рады.
              </p>

              <a
                href="https://rada.vision/"
                target="_blank"
                rel="noreferrer"
                className="btn-primary mt-4"
              >
                Сайт Каардынацыйнай рады ↗
              </a>
            </div>
          </div>
        </div>

        <GlobalStyles />
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--bg)] pb-40 text-[var(--ink)]">
      <div className="noise-overlay" />

      <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
        <section className="hero-card relative mb-8 overflow-hidden rounded-[2.5rem] p-7 md:p-12">
          <div className="hero-grid-bg absolute inset-0" />

          <div className="relative z-10">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="pill-badge animate-float">
                Таталізатар · Каардынацыйная рада
              </span>
              <span className="rounded-full border border-[var(--ink)]/10 bg-white/60 px-4 py-1.5 text-xs font-bold text-[var(--ink-2)] backdrop-blur">
                172 кандыдаты · 9 спісаў · 80 месцаў
              </span>
            </div>

            <h1 className="heading-hero mb-5">
              Збярыце свой
              <br />
              <em className="accent-text not-italic">прагноз</em> на выбары
            </h1>

            <p className="body-text max-w-2xl text-[var(--ink-2)] md:text-xl">
              Абярыце 80 дэлегатаў, адзначце спісы, якія, на вашу думку, не
              пераадолеюць парог 3%, і паспрабуйце адгадаць агульную колькасць
              удзельнікаў галасавання.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#candidates" className="btn-primary">
                Пачаць выбар ↓
              </a>
              <a
                href="https://rada.vision/"
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
              >
                Сайт Рады ↗
              </a>
            </div>
          </div>
        </section>

        <section className="card mb-8 p-6 md:p-8">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="label-tag mb-1.5 text-[var(--accent)]">Таймер</p>
              <h2 className="heading-lg">Да абвяшчэння вынікаў</h2>
            </div>
            <p className="body-text max-w-xs text-[var(--ink-3)]">
              18 мая 2026 — публікацыя табліцы лідараў
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <TimerTile label="дзён" value={timeLeft.days} />
            <TimerTile label="гадзін" value={timeLeft.hours} />
            <TimerTile label="хвілін" value={timeLeft.minutes} />
            <TimerTile label="секунд" value={timeLeft.seconds} />
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <InfoCard
            number="01"
            title="Абярыце спісы"
            text="Калі абіраеце кандыдата №12 — аўтаматычна абіраюцца №1–12. Так вы выбіраеце мяжу праходжання ў кожным спісе."
          />
          <InfoCard
            number="02"
            title="Адзначце парог"
            text="Калі лічыце, што спіс не набярэ больш за 3%, пазначце яго — кандыдаты з гэтага спіса не будуць выбірацца."
          />
          <InfoCard
            number="03"
            title="Адпраўце прагноз"
            text="Гэта не сапраўдныя выбары, а гульнявы прагноз вынікаў. Афіцыйнае галасаванне будзе праходзіць асобна."
          />
        </section>

        <section id="candidates" className="scroll-mt-32 space-y-4">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="label-tag mb-1.5 text-[var(--accent)]">
                Спісы і кандыдаты
              </p>
              <h2 className="heading-lg">Абярыце сваіх 80</h2>
            </div>

            <button
              type="button"
              onClick={randomizeEverything}
              className="btn-secondary"
            >
              Выбраць кандыдатаў выпадковым чынам
            </button>
          </div>

          {orderedFactionEntries.map(([faction, factionCandidates], i) => {
            const isFailed = failedThresholdFactions.includes(faction);
            const selectedCount = getSelectedCountByFaction(faction);
            const isOpen = openFactions.includes(faction);
            const factionColor = getFactionColor(faction);
            const pct = Math.round(
              (selectedCount / factionCandidates.length) * 100
            );

            return (
              <section
                key={faction}
                className={[
                  "faction-card overflow-hidden rounded-3xl border transition-all duration-300",
                  isFailed
                    ? "border-red-200/60 bg-red-50/40"
                    : "border-[var(--border)] bg-white",
                ].join(" ")}
                style={
                  {
                    animationDelay: `${i * 40}ms`,
                    "--faction-color": factionColor,
                  } as React.CSSProperties
                }
              >
                <div
                  className="faction-accent-strip"
                  style={{
                    background: isFailed
                      ? "#ef4444"
                      : `linear-gradient(to bottom, ${factionColor}, ${factionColor}88)`,
                  }}
                />

                <div className="ml-1 flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
                  <button
                    type="button"
                    onClick={() => toggleFactionOpen(faction)}
                    className="flex flex-1 items-center gap-4 text-left"
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black text-white transition"
                      style={{ background: isFailed ? "#ef4444" : factionColor }}
                    >
                      {isOpen ? "−" : "+"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="heading-sm truncate">{faction}</h3>

                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 max-w-[120px] flex-1 overflow-hidden rounded-full bg-[var(--bg)]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: isFailed ? "#ef4444" : factionColor,
                            }}
                          />
                        </div>
                        <p className="text-xs font-semibold text-[var(--ink-3)]">
                          {selectedCount}/{factionCandidates.length}
                          {isFailed ? " · не пройдзе 3%" : ""}
                        </p>
                      </div>
                    </div>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={getProgramLink(faction)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-xs font-bold text-[var(--ink-2)] transition hover:border-[var(--ink)] hover:text-[var(--ink)]"
                    >
                      Праграма ↗
                    </a>

                    <button
                      type="button"
                      onClick={() => toggleFailedThresholdFaction(faction)}
                      className={[
                        "rounded-xl px-3.5 py-2.5 text-xs font-bold transition",
                        isFailed
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : "border border-red-200 bg-white text-red-600 hover:bg-red-50",
                      ].join(" ")}
                    >
                      {isFailed ? "≤3% ✓" : "Не пройдзе 3%"}
                    </button>

                    <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-1.5">
                      <button
                        type="button"
                        disabled={isFailed || selectedCount <= 0}
                        onClick={() => changeFactionCount(faction, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-base font-black transition hover:bg-[var(--border)] disabled:cursor-not-allowed disabled:opacity-30"
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
                          selectFactionCount(faction, Number(event.target.value))
                        }
                        className="h-8 w-14 rounded-lg border border-[var(--border)] bg-white text-center text-sm font-black outline-none disabled:opacity-30"
                      />

                      <button
                        type="button"
                        disabled={
                          isFailed ||
                          selectedCount >= factionCandidates.length ||
                          selectedIds.length >= MAX_SELECTED
                        }
                        onClick={() => changeFactionCount(faction, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-30"
                        style={{ background: isFailed ? "#ccc" : factionColor }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  className={[
                    "ml-1 grid transition-all duration-500",
                    isOpen && !isFailed
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0",
                  ].join(" ")}
                >
                  <div className="overflow-hidden">
                    <div className="grid gap-2.5 border-t border-[var(--border)] p-4 sm:grid-cols-2 lg:grid-cols-3 md:p-5">
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
                              "candidate-btn group rounded-2xl border p-3.5 text-left transition-all duration-200",
                              isSelected
                                ? "border-transparent shadow-lg"
                                : "border-[var(--border)] bg-white hover:-translate-y-0.5 hover:border-[var(--ink)]/20 hover:shadow-md",
                              isDisabled
                                ? "cursor-not-allowed opacity-30 hover:translate-y-0"
                                : "cursor-pointer",
                            ].join(" ")}
                            style={
                              isSelected
                                ? {
                                    background: `linear-gradient(135deg, ${factionColor}18 0%, ${factionColor}08 100%)`,
                                    borderColor: factionColor,
                                    boxShadow: `0 8px 24px ${factionColor}22`,
                                  }
                                : {}
                            }
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black transition-all duration-200"
                                style={
                                  isSelected
                                    ? { background: factionColor, color: "white" }
                                    : {
                                        background: "var(--bg)",
                                        color: "var(--ink-2)",
                                      }
                                }
                              >
                                {candidate.listNumber}
                              </span>

                              <div>
                                <p className="text-sm font-bold leading-5">
                                  {candidate.name}
                                </p>
                                <p className="mt-0.5 text-xs text-[var(--ink-3)]">
                                  {shortFactionName(candidate.faction)}
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

        <section className="card mt-8 p-6 md:p-8">
          <p className="label-tag mb-1.5 text-[var(--accent)]">
            Дадатковы прагноз
          </p>
          <h2 className="heading-lg mb-1">Колькі ўсяго людзей прагаласуе?</h2>
          <p className="body-text mb-5 text-[var(--ink-3)]">
            Прагноз агульнай колькасці ўдзельнікаў галасавання
          </p>

          <input
            type="number"
            min="1"
            value={predictedTotalVotes}
            onChange={(event) => setPredictedTotalVotes(event.target.value)}
            placeholder="Напрыклад: 12000"
            className="votes-input"
          />
        </section>

        <section
          id="submit"
          className="submit-card relative mt-8 overflow-hidden rounded-3xl p-6 md:p-8"
        >
          <div className="submit-bg absolute inset-0" />

          <div className="relative z-10">
            <p className="label-tag mb-1.5 text-orange-300">
              Адправіць прагноз
            </p>
            <h2 className="mb-2 font-['Syne'] text-3xl font-black tracking-[-0.02em] text-white md:text-4xl">
              Гатовы адправіць?
            </h2>
            <p className="body-text mb-6 text-white/75">
              Абярыце 80 кандыдатаў, увядзіце нікнэйм, прагноз колькасці
              ўдзельнікаў і прайдзіце праверку бяспекі.
            </p>

            <div className="mb-4 flex flex-col gap-3 md:flex-row">
              <input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="Ваш нікнэйм"
                maxLength={40}
                className="nickname-input flex-1"
              />

              <button
                type="button"
                onClick={openSummary}
                disabled={isSubmitting}
                className="submit-btn"
              >
                {isSubmitting ? "Адпраўляем..." : "Праверыць і адправіць →"}
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl bg-white p-4 backdrop-blur">
              <Turnstile
                sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                onVerify={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken("")}
                onError={() => {
                  setTurnstileToken("");
                  setError("Не атрымалася загрузіць праверку бяспекі.");
                }}
              />
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-3 rounded-2xl bg-red-500/20 px-4 py-3">
                <span className="mt-0.5 text-red-300">⚠</span>
                <p className="text-sm font-semibold text-red-200">{error}</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <FloatingControlBar
        selectedCount={selectedIds.length}
        progressPercent={progressPercent}
        factionSummary={factionSummary}
        justReachedMax={justReachedMax}
        isExpanded={isMobileBarExpanded}
        onToggleExpand={() => setIsMobileBarExpanded((prev) => !prev)}
        onRandomizeAll={randomizeEverything}
        onClear={clearSelection}
        onSubmitJump={() =>
          document
            .getElementById("submit")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      />

      {showAutofillModal && (
        <AutofillModal
          selectedCount={selectedIds.length}
          missingCount={MAX_SELECTED - selectedIds.length}
          onCancel={() => setShowAutofillModal(false)}
          onAutofill={handleAutofillAndContinue}
        />
      )}

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

function FloatingControlBar({
  selectedCount,
  progressPercent,
  factionSummary,
  justReachedMax,
  isExpanded,
  onToggleExpand,
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
    color: string;
  }[];
  justReachedMax: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRandomizeAll: () => void;
  onClear: () => void;
  onSubmitJump: () => void;
}) {
  const isDone = selectedCount === MAX_SELECTED;

  return (
    <div
      className={[
        "fixed inset-x-3 bottom-3 z-40 mx-auto max-w-6xl rounded-[1.75rem] border border-[var(--border)] bg-white/95 shadow-[0_20px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300",
        justReachedMax ? "ring-4 ring-emerald-400/50" : "",
      ].join(" ")}
    >
      <div
        className={[
          "overflow-hidden transition-all duration-300",
          isExpanded ? "p-3 md:p-4" : "p-3",
        ].join(" ")}
      >
        <div className="flex items-center gap-3">
          <div
            className={[
              "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl transition-all duration-300",
              isDone
                ? justReachedMax
                  ? "animate-bounce-subtle bg-emerald-500"
                  : "bg-emerald-500"
                : "bg-[var(--ink)]",
            ].join(" ")}
          >
            <span className="text-xl font-black leading-none text-white tabular-nums">
              {selectedCount}
            </span>
            <span className="text-[9px] font-bold text-white/60">/80</span>
          </div>

          <div className="hidden flex-1 md:block">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-bold text-[var(--ink-3)]">
                {isDone
                  ? "✓ Гатова да адпраўкі"
                  : `Засталося ${MAX_SELECTED - selectedCount}`}
              </p>
              <p className="text-xs font-bold text-[var(--ink-3)]">
                {progressPercent}%
              </p>
            </div>

            <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--bg)]">
              {factionSummary
                .filter((faction) => faction.selected > 0 && !faction.failed)
                .map((faction) => (
                  <div
                    key={faction.faction}
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${(faction.selected / MAX_SELECTED) * 100}%`,
                      background: faction.color,
                    }}
                    title={`${shortFactionName(faction.faction)}: ${faction.selected}`}
                  />
                ))}
              <div className="h-full flex-1 bg-transparent" />
            </div>
          </div>

          <div className="flex-1 md:hidden">
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg)]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progressPercent}%`,
                  background: isDone
                    ? "#10b981"
                    : "linear-gradient(to right, var(--accent), var(--accent-blue))",
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onRandomizeAll}
              className="hidden rounded-xl border border-[var(--border)] px-3 py-2.5 text-xs font-bold transition hover:bg-[var(--bg)] md:block"
            >
              Выпадкова
            </button>

            <button
              type="button"
              onClick={onClear}
              className="hidden rounded-xl border border-[var(--border)] px-3 py-2.5 text-xs font-bold transition hover:bg-[var(--bg)] md:block"
            >
              Скінуць
            </button>

            <button
              type="button"
              onClick={onSubmitJump}
              className="rounded-xl bg-[var(--ink)] px-3 py-2.5 text-xs font-bold text-white transition hover:opacity-90"
            >
              Адправіць
            </button>

            <button
              type="button"
              onClick={onToggleExpand}
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-sm transition hover:bg-[var(--bg)] md:hidden"
            >
              {isExpanded ? "↓" : "↑"}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 grid grid-cols-2 gap-2 md:hidden">
            <button
              type="button"
              onClick={onRandomizeAll}
              className="rounded-xl border border-[var(--border)] py-2.5 text-xs font-bold"
            >
              Выпадкова
            </button>
            <button
              type="button"
              onClick={onClear}
              className="rounded-xl border border-[var(--border)] py-2.5 text-xs font-bold"
            >
              Скінуць
            </button>
          </div>
        )}

        {isExpanded && (
          <div className="mt-3 hidden flex-wrap gap-1.5 md:flex">
            {factionSummary.map((item) => (
              <span
                key={item.faction}
                className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                style={
                  item.failed
                    ? { background: "#fee2e2", color: "#b91c1c" }
                    : item.selected > 0
                      ? {
                          background: `${item.color}18`,
                          color: item.color,
                          border: `1px solid ${item.color}44`,
                        }
                      : {
                          background: "var(--bg)",
                          color: "var(--ink-3)",
                          border: "1px solid var(--border)",
                        }
                }
              >
                {shortFactionName(item.faction)}:{" "}
                {item.failed ? "3%−" : item.selected}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AutofillModal({
  selectedCount,
  missingCount,
  onCancel,
  onAutofill,
}: {
  selectedCount: number;
  missingCount: number;
  onCancel: () => void;
  onAutofill: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/70 p-4 backdrop-blur-sm">
      <div className="animate-pop w-full max-w-xl rounded-3xl bg-white p-6 shadow-[0_30px_120px_rgba(0,0,0,0.3)]">
        <p className="label-tag mb-1.5 text-[var(--accent)]">
          Не ўсе кандыдаты выбраныя
        </p>

        <h2 className="heading-lg mb-4">
          Вы выбралі {selectedCount} з 80 дэлегатаў
        </h2>

        <p className="body-text mb-5 text-[var(--ink-2)]">
          Каб адправіць прагноз, трэба выбраць роўна 80 кандыдатаў. Засталося
          выбраць яшчэ {missingCount}. Сістэма можа выпадковым чынам дабраць
          патрэбную колькасць з тых спісаў, якія вы не адзначылі як тыя, што не
          пераадолеюць парог 3%.
        </p>

        <div className="flex flex-col gap-3 md:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-[var(--border)] py-3.5 font-bold transition hover:bg-[var(--bg)]"
          >
            Не, я дабяру самастойна
          </button>

          <button
            type="button"
            onClick={onAutofill}
            className="flex-1 rounded-2xl bg-[var(--ink)] py-3.5 font-black text-white transition hover:opacity-90"
          >
            Так, дабраць выпадкова
          </button>
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
    color: string;
  }[];
  failedThresholdFactions: string[];
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/70 p-4 backdrop-blur-sm">
      <div className="animate-pop max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-[0_30px_120px_rgba(0,0,0,0.3)]">
        <div className="mb-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <span className="mt-0.5 text-lg text-red-500">⚠</span>
          <div>
            <p className="mb-1 font-black text-red-800">
              Гэта не сапраўдныя выбары!
            </p>
            <p className="text-sm leading-6 text-red-700">
              Сайт — не афіцыйная платформа галасавання. Гэта толькі гульнявы
              таталізатар / прагноз. Сапраўднае галасаванне будзе праходзіць на
              асобнай афіцыйнай платформе.
            </p>
          </div>
        </div>

        <p className="label-tag mb-1.5 text-[var(--accent)]">
          Праверце прагноз
        </p>
        <h2 className="heading-lg mb-5">Усё правільна?</h2>

        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <SummaryStat label="Нікнэйм" value={nickname} />
          <SummaryStat label="Кандыдатаў" value={`${selectedCount}/80`} />
          <SummaryStat
            label="Галасоў"
            value={Number(predictedTotalVotes).toLocaleString()}
          />
        </div>

        {failedThresholdFactions.length > 0 && (
          <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
            <h3 className="mb-2 text-sm font-black text-[var(--ink-2)]">
              Спісы, якія не пераадолеюць 3%
            </h3>
            <div className="flex flex-wrap gap-2">
              {failedThresholdFactions.map((faction) => (
                <span
                  key={faction}
                  className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700"
                >
                  {faction}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-5 rounded-2xl border border-[var(--border)] p-4">
          <h3 className="mb-3 text-sm font-black text-[var(--ink-2)]">
            Выбар па спісах
          </h3>

          <div className="grid gap-2 md:grid-cols-2">
            {factionSummary.map((item) => (
              <div
                key={item.faction}
                className="flex items-center justify-between rounded-xl px-3 py-2"
                style={{
                  background: item.failed
                    ? "#fef2f2"
                    : item.selected > 0
                      ? `${item.color}0f`
                      : "var(--bg)",
                }}
              >
                <span className="text-xs font-semibold text-[var(--ink-2)]">
                  {item.faction}
                </span>
                <span
                  className="text-xs font-black"
                  style={{
                    color: item.failed
                      ? "#dc2626"
                      : item.selected > 0
                        ? item.color
                        : "var(--ink-3)",
                  }}
                >
                  {item.failed ? "≤3%" : item.selected}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-[var(--border)] py-3.5 font-bold transition hover:bg-[var(--bg)]"
          >
            ← Вярнуцца
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 rounded-2xl bg-[var(--ink)] py-3.5 font-black text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Адпраўляем..." : "Разумею — адправіць →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
      <p className="label-tag mb-1 text-[var(--ink-3)]">{label}</p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}

function TimerTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="timer-tile group rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg)] p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[var(--ink)] hover:shadow-xl">
      <p className="tabular-num text-5xl font-black tracking-tight md:text-6xl">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-3)] group-hover:text-[var(--ink)]">
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
    <div className="info-card group rounded-[2rem] border border-[var(--border)] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <p className="mb-4 inline-flex rounded-xl bg-[var(--ink)] px-3 py-1.5 text-xs font-black text-white transition group-hover:bg-[var(--accent)]">
        {number}
      </p>
      <h3 className="heading-sm mb-2">{title}</h3>
      <p className="body-text text-[var(--ink-3)]">{text}</p>
    </div>
  );
}

function GlobalStyles() {
  return (
    <style jsx global>{`
      @import url("https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap");

      :root {
        --bg: #f4f1ea;
        --surface: #fefdfb;
        --ink: #0e0c08;
        --ink-2: #5c5448;
        --ink-3: #a89f95;
        --border: #e6e0d8;
        --accent: #e8420a;
        --accent-blue: #2455c3;
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        font-family: "DM Sans", system-ui, sans-serif;
        background: var(--bg);
        color: var(--ink);
      }

      .noise-overlay {
        position: fixed;
        inset: 0;
        pointer-events: none;
        opacity: 0.025;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        background-repeat: repeat;
        background-size: 200px 200px;
      }

      .heading-hero {
        font-family: "Syne", sans-serif;
        font-size: clamp(2.5rem, 7vw, 5.5rem);
        font-weight: 800;
        line-height: 0.95;
        letter-spacing: -0.03em;
        color: var(--ink);
      }

      .heading-xl {
        font-family: "Syne", sans-serif;
        font-size: clamp(1.75rem, 4vw, 2.75rem);
        font-weight: 800;
        letter-spacing: -0.025em;
        color: var(--ink);
      }

      .heading-lg {
        font-family: "Syne", sans-serif;
        font-size: clamp(1.5rem, 3vw, 2.25rem);
        font-weight: 700;
        letter-spacing: -0.02em;
        color: var(--ink);
      }

      .heading-sm {
        font-family: "Syne", sans-serif;
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: -0.01em;
        color: var(--ink);
      }

      .body-text {
        font-size: 1rem;
        line-height: 1.7;
        color: inherit;
      }

      .label-tag {
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--ink-3);
      }

      .accent-text {
        color: var(--accent);
      }

      .tabular-num {
        font-family: "Syne", sans-serif;
        font-variant-numeric: tabular-nums;
      }

      .hero-card,
      .card,
      .card-glow {
        background: white;
        border: 1px solid var(--border);
        box-shadow: 0 8px 40px rgba(14, 12, 8, 0.06);
      }

      .hero-card {
        box-shadow: 0 32px 120px rgba(14, 12, 8, 0.1);
      }

      .hero-grid-bg {
        background-image:
          linear-gradient(var(--border) 1px, transparent 1px),
          linear-gradient(90deg, var(--border) 1px, transparent 1px);
        background-size: 40px 40px;
        opacity: 0.4;
      }

      .faction-card {
        position: relative;
        animation: fadeUp 0.45s ease-out both;
      }

      .faction-accent-strip {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
      }

      .submit-card {
        background: var(--ink);
        border: 1px solid rgba(255, 255, 255, 0.06);
        box-shadow: 0 24px 100px rgba(14, 12, 8, 0.28);
      }

      .submit-bg {
        background:
          radial-gradient(
            circle at 20% 50%,
            rgba(232, 66, 10, 0.18) 0%,
            transparent 50%
          ),
          radial-gradient(
            circle at 80% 20%,
            rgba(36, 85, 195, 0.15) 0%,
            transparent 50%
          );
      }

      .pill-badge {
        display: inline-flex;
        align-items: center;
        background: rgba(232, 66, 10, 0.08);
        color: var(--accent);
        border: 1px solid rgba(232, 66, 10, 0.2);
        border-radius: 9999px;
        padding: 0.375rem 1rem;
        font-size: 0.75rem;
        font-weight: 700;
      }

      .btn-primary,
      .btn-secondary,
      .btn-ghost,
      .btn-accent {
        display: inline-flex;
        align-items: center;
        border-radius: 0.875rem;
        padding: 0.875rem 1.25rem;
        font-weight: 700;
        font-size: 0.9rem;
        transition: all 0.2s;
        text-decoration: none;
      }

      .btn-primary {
        background: var(--ink);
        color: white;
      }

      .btn-secondary,
      .btn-ghost {
        background: white;
        color: var(--ink);
        border: 1px solid var(--border);
      }

      .btn-accent {
        background: var(--accent-blue);
        color: white;
      }

      .btn-primary:hover,
      .btn-secondary:hover,
      .btn-ghost:hover,
      .btn-accent:hover {
        transform: translateY(-2px);
        opacity: 0.9;
      }

      .votes-input,
      .nickname-input {
        min-height: 3.5rem;
        border-radius: 1rem;
        padding: 0 1rem;
        font-size: 1rem;
        font-weight: 700;
        outline: none;
      }

      .votes-input {
        width: 100%;
        max-width: 28rem;
        border: 2px solid var(--border);
        background: white;
        color: var(--ink);
      }

      .nickname-input {
        border: 2px solid rgba(255, 255, 255, 0.18);
        background: white;
        color: var(--ink);
      }

      .submit-btn {
        min-height: 3.5rem;
        border-radius: 1rem;
        background: var(--accent);
        color: white;
        padding: 0 1.75rem;
        font-weight: 800;
        font-family: "Syne", sans-serif;
        transition: all 0.2s;
        white-space: nowrap;
      }

      .submit-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        opacity: 0.92;
      }

      .submit-btn:disabled {
        background: rgba(255, 255, 255, 0.18);
        color: rgba(255, 255, 255, 0.5);
        cursor: not-allowed;
      }

      @keyframes fadeUp {
        from {
          opacity: 0;
          transform: translateY(16px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes pop {
        from {
          opacity: 0;
          transform: scale(0.94) translateY(10px);
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
          transform: translateY(-5px);
        }
      }

      @keyframes bounce-subtle {
        0%,
        100% {
          transform: scale(1);
        }
        30% {
          transform: scale(1.12);
        }
        60% {
          transform: scale(0.97);
        }
      }

      .animate-pop {
        animation: pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      }

      .animate-float {
        animation: float 3.5s ease-in-out infinite;
      }

      .animate-bounce-subtle {
        animation: bounce-subtle 0.5s ease both;
      }
    `}</style>
  );
}