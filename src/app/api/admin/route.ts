import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser, hashPassword } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Hàm đẩy file testcase lên repo private oj-judge-worker qua GitHub Contents API
async function pushFileToGitHub(path: string, content: string, message: string) {
  const owner = process.env.GITHUB_OWNER!;
  const repo = process.env.GITHUB_JUDGE_REPO!;
  const token = process.env.GITHUB_TOKEN!;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  // Kiểm tra xem file đã tồn tại chưa để lấy sha (nếu ghi đè)
  let sha: string | undefined;
  const checkRes = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (checkRes.ok) {
    const existing = await checkRes.json();
    sha = existing.sha;
  }

  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf-8").toString("base64"),
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`GitHub API Error: ${errText}`);
  }
}

export async function GET() {
  const user = getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }

  const [{ data: users }, { data: contests }, { data: problems }] = await Promise.all([
    supabase.from("users").select("id, username, role, created_at").order("id"),
    supabase.from("contests").select("*").order("id", { ascending: false }),
    supabase.from("problems").select("*").order("id"),
  ]);

  return NextResponse.json({ users: users || [], contests: contests || [], problems: problems || [] });
}

export async function POST(req: Request) {
  const user = getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { type } = body;

    // --- 1. QUẢN LÝ TÀI KHOẢN ---
    if (type === "create_user") {
      const { error } = await supabase.from("users").insert({
        username: body.username.trim(),
        password_hash: hashPassword(body.password),
        role: body.role || "user",
      });
      if (error) return NextResponse.json({ error: "Username đã tồn tại hoặc lỗi dữ liệu" }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (type === "delete_user") {
      if (body.id === user.id) {
        return NextResponse.json({ error: "Không thể tự xóa tài khoản đang đăng nhập!" }, { status: 400 });
      }
      await supabase.from("users").delete().eq("id", body.id);
      return NextResponse.json({ success: true });
    }

    // --- 2. QUẢN LÝ CONTESTS ---
    if (type === "save_contest") {
      const payload = {
        title: body.title,
        description: body.description || "",
        start_time: body.start_time || null,
        end_time: body.end_time || null,
        is_public: body.is_public ?? true,
      };
      if (body.id) {
        await supabase.from("contests").update(payload).eq("id", body.id);
      } else {
        await supabase.from("contests").insert(payload);
      }
      return NextResponse.json({ success: true });
    }

    if (type === "delete_contest") {
      await supabase.from("contests").delete().eq("id", body.id);
      return NextResponse.json({ success: true });
    }

    // --- 3. QUẢN LÝ ĐỀ BÀI ---
    if (type === "save_problem") {
      const payload = {
        title: body.title,
        description: body.description,
        time_limit_ms: Number(body.time_limit_ms) || 1000,
        memory_limit_mb: Number(body.memory_limit_mb) || 256,
        contest_id: body.contest_id ? Number(body.contest_id) : null,
      };
      if (body.id) {
        await supabase.from("problems").update(payload).eq("id", body.id);
      } else {
        await supabase.from("problems").insert(payload);
      }
      return NextResponse.json({ success: true });
    }

    if (type === "delete_problem") {
      await supabase.from("problems").delete().eq("id", body.id);
      return NextResponse.json({ success: true });
    }

    // --- 4. ĐẨY TESTCASE LÊN GITHUB WORKER ---
    if (type === "upload_testcase") {
      const { problem_id, test_index, input_data, output_data } = body;
      await pushFileToGitHub(
        `tests/${problem_id}/${test_index}.in`,
        input_data,
        `Update test ${test_index}.in for problem ${problem_id}`
      );
      await pushFileToGitHub(
        `tests/${problem_id}/${test_index}.out`,
        output_data,
        `Update test ${test_index}.out for problem ${problem_id}`
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
