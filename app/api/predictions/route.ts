import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
    const selectedCandidateIds = body.selectedCandidateIds;
    const failedThresholdFactions = Array.isArray(body.failedThresholdFactions)
      ? body.failedThresholdFactions.map(String)
      : [];
    const predictedTotalVotes = Number(body.predictedTotalVotes);
    const turnstileToken = String(body.turnstileToken || "");

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

    if (
      !Array.isArray(selectedCandidateIds) ||
      selectedCandidateIds.length !== 80 ||
      new Set(selectedCandidateIds).size !== 80
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
        { error: "Увядзіце прагноз агульнай колькасці галасоў" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("predictions").insert({
      nickname,
      selected_candidate_ids: selectedCandidateIds,
      failed_threshold_factions: failedThresholdFactions,
      predicted_total_votes: predictedTotalVotes,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Такі нікнэйм ужо выкарыстаны" },
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