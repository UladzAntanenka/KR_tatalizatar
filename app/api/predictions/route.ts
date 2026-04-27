import { NextResponse } from "next/server";
import { candidates } from "@/data/candidates";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_SELECTED = 80;
const DEADLINE = new Date("2026-05-16T23:59:59+02:00");

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";

  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = 5;

  const record = rateLimitMap.get(ip);

  if (!record || record.resetAt < now) {
    rateLimitMap.set(ip, {
      count: 1,
      resetAt: now + windowMs,
    });
    return false;
  }

  record.count += 1;
  return record.count > limit;
}

async function verifyTurnstileToken(token: string, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY is missing");
    return false;
  }

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);
  formData.append("remoteip", ip);

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();
  return Boolean(data.success);
}

function validatePredictionData({
  selectedCandidateIds,
  failedThresholdFactions,
}: {
  selectedCandidateIds: string[];
  failedThresholdFactions: string[];
}) {
  const validCandidateIds = new Set(candidates.map((candidate) => candidate.id));
  const validFactions = new Set(candidates.map((candidate) => candidate.faction));

  for (const id of selectedCandidateIds) {
    if (!validCandidateIds.has(id)) {
      return "У прагнозе ёсць неіснуючы кандыдат.";
    }
  }

  for (const faction of failedThresholdFactions) {
    if (!validFactions.has(faction)) {
      return "У прагнозе ёсць неіснуючы спіс.";
    }
  }

  const selectedCandidates = candidates.filter((candidate) =>
    selectedCandidateIds.includes(candidate.id)
  );

  const invalidSelectedFromFailedFaction = selectedCandidates.some((candidate) =>
    failedThresholdFactions.includes(candidate.faction)
  );

  if (invalidSelectedFromFailedFaction) {
    return "Нельга выбіраць кандыдатаў са спісаў, якія адзначаныя як тыя, што не пераадолеюць 3%.";
  }

  return null;
}

export async function POST(request: Request) {
  try {
    if (new Date() > DEADLINE) {
      return NextResponse.json(
        { error: "Прыём прагнозаў ужо завершаны" },
        { status: 403 }
      );
    }

    const ip = getClientIp(request);

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Занадта шмат спробаў. Паспрабуйце пазней." },
        { status: 429 }
      );
    }

    const body = await request.json();

    const nickname = String(body.nickname || "").trim();
    const selectedCandidateIds = Array.isArray(body.selectedCandidateIds)
      ? body.selectedCandidateIds.map(String)
      : [];
    const failedThresholdFactions = Array.isArray(body.failedThresholdFactions)
      ? body.failedThresholdFactions.map(String)
      : [];
    const predictedTotalVotes = Number(body.predictedTotalVotes);
    const turnstileToken = String(body.turnstileToken || "");
    const clientId = String(body.clientId || "").trim();

    if (!turnstileToken) {
      return NextResponse.json(
        { error: "Прайдзіце праверку бяспекі" },
        { status: 400 }
      );
    }

    const turnstileOk = await verifyTurnstileToken(turnstileToken, ip);

    if (!turnstileOk) {
      return NextResponse.json(
        { error: "Праверка бяспекі не пройдзена" },
        { status: 403 }
      );
    }

    if (!nickname || nickname.length < 2 || nickname.length > 40) {
      return NextResponse.json(
        { error: "Нікнэйм павінен быць ад 2 да 40 сімвалаў" },
        { status: 400 }
      );
    }

    if (!clientId || clientId.length < 20 || clientId.length > 100) {
      return NextResponse.json(
        { error: "Не атрымалася вызначыць прыладу для адпраўкі прагнозу" },
        { status: 400 }
      );
    }

    if (
      selectedCandidateIds.length !== MAX_SELECTED ||
      new Set(selectedCandidateIds).size !== MAX_SELECTED
    ) {
      return NextResponse.json(
        { error: "Трэба выбраць роўна 80 кандыдатаў" },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(predictedTotalVotes) ||
      predictedTotalVotes < 1 ||
      predictedTotalVotes > 10000000
    ) {
      return NextResponse.json(
        { error: "Увядзіце прагноз агульнай колькасці ўдзельнікаў галасавання" },
        { status: 400 }
      );
    }

    const validationError = validatePredictionData({
      selectedCandidateIds,
      failedThresholdFactions,
    });

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("predictions").insert({
      nickname,
      client_id: clientId,
      selected_candidate_ids: selectedCandidateIds,
      failed_threshold_factions: failedThresholdFactions,
      predicted_total_votes: predictedTotalVotes,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error:
              "З гэтай прылады або з такім нікнэймам прагноз ужо адпраўлены",
          },
          { status: 409 }
        );
      }

      console.error(error);

      return NextResponse.json(
        { error: "Не атрымалася захаваць прагноз" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Памылка сервера" },
      { status: 500 }
    );
  }
}