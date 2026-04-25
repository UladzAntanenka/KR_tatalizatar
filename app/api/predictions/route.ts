import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const nickname = String(body.nickname || "").trim();
    const selectedCandidateIds = body.selectedCandidateIds;
    const failedThresholdFactions = Array.isArray(body.failedThresholdFactions)
      ? body.failedThresholdFactions.map(String)
      : [];
    const predictedTotalVotes = Number(body.predictedTotalVotes);

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

      return NextResponse.json(
        { error: "Не атрымалася захаваць прагноз" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Памылка сервера" },
      { status: 500 }
    );
  }
}