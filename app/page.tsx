"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { candidates } from "@/data/candidates";
import Turnstile from "react-turnstile";

const MAX_SELECTED = 80;
const RESULTS_DATE = new Date("2026-05-18T23:59:59+02:00");

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [failedThresholdFactions, setFailedThresholdFactions] = useState<
    string[]
  >([]);
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
  const [clientId, setClientId] = useState("");
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
      if (!used.has(faction)) {
        ordered.push([faction, factions[faction]]);
      }
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
  }, [
    orderedFactionEntries,
    getSelectedCountByFaction,
    failedThresholdFactions,
  ]);

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

      setShowSummary(true);
    }, 50);
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

            <p className="body-text mb-6 text-[var(--ink-2)]">
              Ваш прагноз захаваны. Пасля абвяшчэння вынікаў 18 мая мы
              апублікуем табліцу лідараў і статыстыку выбару.
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
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">

        {/* HERO */}
        <section className="hero-card mb-8 rounded-[2.5rem] p-7 md:p-12">
          <h1 className="heading-hero mb-5">
            Збярыце свой прагноз
          </h1>

          <p className="body-text text-[var(--ink-2)]">
            Абярыце 80 дэлегатаў і зрабіце прагноз вынікаў.
          </p>

          <div className="mt-6 flex gap-3">
            <a href="#candidates" className="btn-primary">
              Пачаць ↓
            </a>

            <a
              href="https://rada.vision/"
              target="_blank"
              className="btn-ghost"
            >
              Сайт Рады ↗
            </a>
          </div>
        </section>

        {/* TIMER */}
        <section className="card mb-8 p-6">
          <h2 className="heading-lg mb-4">
            Да вынікаў засталося
          </h2>

          <div className="grid grid-cols-4 gap-3">
            <TimerTile label="дзён" value={timeLeft.days} />
            <TimerTile label="гадзін" value={timeLeft.hours} />
            <TimerTile label="хвілін" value={timeLeft.minutes} />
            <TimerTile label="секунд" value={timeLeft.seconds} />
          </div>
        </section>

        {/* LISTS */}
        <section id="candidates" className="space-y-4">
          {orderedFactionEntries.map(([faction, factionCandidates]) => {
            const isFailed = failedThresholdFactions.includes(faction);
            const selectedCount = getSelectedCountByFaction(faction);
            const isOpen = openFactions.includes(faction);

            return (
              <div key={faction} className="card p-4">

                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold">{faction}</h3>

                  <div className="flex gap-2">

                    <a
                      href={getProgramLink(faction)}
                      target="_blank"
                      className="text-xs underline"
                    >
                      Праграма
                    </a>

                    <button
                      onClick={() => toggleFailedThresholdFaction(faction)}
                      className="text-xs text-red-500"
                    >
                      {isFailed ? "≤3%" : "Не пройдзе"}
                    </button>
                  </div>
                </div>

                {isOpen && !isFailed && (
                  <div className="grid gap-2">
                    {factionCandidates.map((c) => {
                      const isSelected = selectedIds.includes(c.id);

                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleCandidate(c.id)}
                          className={`p-2 rounded border ${
                            isSelected ? "bg-black text-white" : ""
                          }`}
                        >
                          {c.listNumber}. {c.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* VOTES */}
        <section className="card mt-8 p-6">
          <h2 className="heading-lg mb-3">
            Прагноз яўкі
          </h2>

          <input
            type="number"
            value={predictedTotalVotes}
            onChange={(e) => setPredictedTotalVotes(e.target.value)}
            className="votes-input"
            placeholder="Напрыклад: 12000"
          />
        </section>

        {/* SUBMIT */}
        <section id="submit" className="submit-card mt-8 p-6">
          <h2 className="text-white text-xl mb-4">
            Адправіць прагноз
          </h2>

          <div className="flex gap-3 mb-4">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Нікнэйм"
              className="nickname-input flex-1"
            />

            <button
              onClick={openSummary}
              className="submit-btn"
            >
              Адправіць →
            </button>
          </div>

          <Turnstile
            sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
            onVerify={(token) => setTurnstileToken(token)}
          />

          {error && <p className="text-red-400 mt-3">{error}</p>}
        </section>
      </div>

      {/* AUTOFILL MODAL */}
      {showAutofillModal && (
        <AutofillModal
          selectedCount={selectedIds.length}
          missingCount={MAX_SELECTED - selectedIds.length}
          onCancel={() => setShowAutofillModal(false)}
          onAutofill={handleAutofillAndContinue}
        />
      )}

      {/* SUMMARY */}
      {showSummary && (
        <SummaryModal
          nickname={nickname}
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
function GlobalStyles() {
  return (
    <style jsx global>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');

      :root {
        --bg: #F4F1EA;
        --surface: #FEFDFB;
        --ink: #0E0C08;
        --ink-2: #5C5448;
        --ink-3: #A89F95;
        --border: #E6E0D8;
        --accent: #E8420A;
      }

      body {
        font-family: 'DM Sans', system-ui, sans-serif;
        background: var(--bg);
        color: var(--ink);
      }

      .heading-hero {
        font-family: 'Syne', sans-serif;
        font-size: 3rem;
        font-weight: 800;
      }

      .heading-lg {
        font-family: 'Syne', sans-serif;
        font-size: 1.8rem;
        font-weight: 700;
      }

      .btn-primary {
        background: black;
        color: white;
        padding: 10px 18px;
        border-radius: 10px;
        font-weight: 700;
      }

      .btn-ghost {
        border: 1px solid var(--border);
        padding: 10px 18px;
        border-radius: 10px;
      }

      .card {
        background: white;
        border: 1px solid var(--border);
        border-radius: 20px;
      }

      .submit-card {
        background: black;
        color: white;
        border-radius: 20px;
      }

      .submit-btn {
        background: #E8420A;
        color: white;
        padding: 10px 18px;
        border-radius: 10px;
        font-weight: 800;
      }

      .nickname-input {
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        padding: 10px;
        border-radius: 10px;
        color: white;
      }

      .votes-input {
        border: 1px solid var(--border);
        padding: 10px;
        border-radius: 10px;
        width: 100%;
      }
    `}</style>
  );
}
function TimerTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 text-center">
      <p className="text-4xl font-black tabular-nums">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-3)]">
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
    <div className="card p-6">
      <p className="mb-3 inline-flex rounded-xl bg-black px-3 py-1 text-xs font-black text-white">
        {number}
      </p>
      <h3 className="mb-2 text-lg font-black">{title}</h3>
      <p className="text-sm leading-6 text-[var(--ink-2)]">{text}</p>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-w-xl rounded-3xl bg-white p-6">
        <h2 className="mb-3 text-2xl font-black">
          Вы выбралі {selectedCount} з 80 дэлегатаў
        </h2>

        <p className="mb-5 text-[var(--ink-2)]">
          Каб адправіць прагноз, трэба выбраць роўна 80 кандыдатаў. Засталося
          выбраць яшчэ {missingCount}. Хочаце, каб сістэма выпадкова дабрала
          астатніх?
        </p>

        <div className="flex flex-col gap-3 md:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-[var(--border)] py-3 font-bold"
          >
            Не, я дабяру самастойна
          </button>

          <button
            type="button"
            onClick={onAutofill}
            className="flex-1 rounded-2xl bg-black py-3 font-black text-white"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6">
        <h2 className="mb-4 text-2xl font-black">Праверце прагноз</h2>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="card p-4">
            <p className="text-xs font-bold text-[var(--ink-3)]">Нікнэйм</p>
            <p className="font-black">{nickname}</p>
          </div>

          <div className="card p-4">
            <p className="text-xs font-bold text-[var(--ink-3)]">Кандыдатаў</p>
            <p className="font-black">{selectedCount}/80</p>
          </div>

          <div className="card p-4">
            <p className="text-xs font-bold text-[var(--ink-3)]">Галасоў</p>
            <p className="font-black">{predictedTotalVotes}</p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl bg-red-50 p-4 text-red-800">
          <p className="font-black">Гэта не сапраўдныя выбары!</p>
          <p className="mt-1 text-sm">
            Гэта толькі гульнявы прагноз. Сапраўднае галасаванне будзе
            праходзіць на афіцыйнай платформе Каардынацыйнай рады.
          </p>
        </div>

        <div className="mb-4 grid gap-2 md:grid-cols-2">
          {factionSummary.map((item) => (
            <div
              key={item.faction}
              className="flex justify-between rounded-xl bg-[var(--bg)] px-3 py-2 text-sm"
            >
              <span>{item.faction}</span>
              <b>{item.failed ? "≤3%" : item.selected}</b>
            </div>
          ))}
        </div>

        {failedThresholdFactions.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 font-black">Не пераадолеюць 3%:</p>
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

        <div className="flex flex-col gap-3 md:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-[var(--border)] py-3 font-bold"
          >
            Вярнуцца
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 rounded-2xl bg-black py-3 font-black text-white disabled:opacity-50"
          >
            {isSubmitting ? "Адпраўляем..." : "Разумею, адправіць"}
          </button>
        </div>
      </div>
    </div>
  );
}