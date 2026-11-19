import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  try {
    const { problem_id, language, source_code } = await req.json();

    const { data: problem } = await supabase
      .from("problems")
      .select("time_limit_ms, memory_limit_mb")
      .eq("id", problem_id)
      .single();

    if (!problem) {
      return NextResponse.json({ error: "Không tìm thấy bài tập" }, { status: 404 });
    }

    const { data: sub, error: insertErr } = await supabase
      .from("submissions")
      .insert({
        problem_id,
        language,
        source_code,
        status: "G",
      })
      .select()
      .single();

    if (insertErr || !sub) {
      return NextResponse.json({ error: "Lỗi lưu database" }, { status: 500 });
    }

    const codeB64 = Buffer.from(source_code, "utf-8").toString("base64");
    const ghOwner = process.env.GITHUB_OWNER!;
    const ghRepo = process.env.GITHUB_JUDGE_REPO!;
    const ghToken = process.env.GITHUB_TOKEN!;

    const ghRes = await fetch(
      `https://api.github.com/repos/${ghOwner}/${ghRepo}/actions/workflows/grade.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            submission_id: String(sub.id),
            problem_id: String(problem_id),
            language,
            source_code_b64: codeB64,
            time_limit_ms: String(problem.time_limit_ms),
            memory_limit_mb: String(problem.memory_limit_mb),
          },
        }),
      }
    );

    if (!ghRes.ok) {
      await supabase.from("submissions").update({ status: "AB" }).eq("id", sub.id);
      return NextResponse.json({ error: "Không thể gọi máy chấm" }, { status: 500 });
    }

    return NextResponse.json({ submission: sub });
  } catch (err) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
