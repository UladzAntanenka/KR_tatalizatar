import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_SELECTED = 80;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const nickname = String(body.nickname || "").trim();
    const selectedCandidateIds = body.selectedCandidateIds;
    const failedThresholdFactions = Array.isArray(body.failedThresholdFactions)
      ? body.failedThresholdFactions.map(String)
      : [];

    if (!nickname || nickname.length < 2 || nickname.length > 40) {
      return NextResponse.json(
        { error: "Нікнэйм павінен быць ад 2 да 40 сімвалаў" },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(selectedCandidateIds) ||
      selectedCandidateIds.length !== MAX_SELECTED ||
      new Set(selectedCandidateIds).size !== MAX_SELECTED
    ) {
      return NextResponse.json(
        { error: "Трэба выбраць роўна 80 кандыдатаў" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("predictions").insert({
      nickname,
      selected_candidate_ids: selectedCandidateIds,
      failed_threshold_factions: failedThresholdFactions,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Такі нікнэйм ужо выкарыстаны" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Не атрымалася захаваць прагноз" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Памылка сервера" }, { status: 500 });
  }
}