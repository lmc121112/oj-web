import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSessionToken, getCurrentUser, hashPassword } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Kiểm tra trạng thái hệ thống (đã có admin chưa & user đang đăng nhập)
export async function GET() {
  const { count } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");

  const currentUser = getCurrentUser();
  return NextResponse.json({
    hasAdmin: (count ?? 0) > 0,
    user: currentUser,
  });
}

// Xử lý setup admin đầu tiên, login, logout
export async function POST(req: Request) {
  const { action, username, password } = await req.json();

  if (action === "logout") {
    const res = NextResponse.json({ success: true });
    res.cookies.delete("oj_session");
    return res;
  }

  if (!username || !password) {
    return NextResponse.json({ error: "Vui lòng nhập đầy đủ username và password" }, { status: 400 });
  }

  // Trường hợp chưa có admin -> chỉ cho phép tạo tài khoản admin đầu tiên
  if (action === "setup_admin") {
    const { count } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: "Hệ thống đã có tài khoản Admin!" }, { status: 403 });
    }

    const { data: newAdmin, error } = await supabase
      .from("users")
      .insert({
        username: username.trim(),
        password_hash: hashPassword(password),
        role: "admin",
      })
      .select("id, username, role")
      .single();

    if (error || !newAdmin) {
      return NextResponse.json({ error: "Không thể tạo tài khoản Admin" }, { status: 500 });
    }

    const token = createSessionToken(newAdmin);
    const res = NextResponse.json({ user: newAdmin });
    res.cookies.set("oj_session", token, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 7 });
    return res;
  }

  // Đăng nhập thông thường
  if (action === "login") {
    const { data: user } = await supabase
      .from("users")
      .select("id, username, role, password_hash")
      .eq("username", username.trim())
      .single();

    if (!user || user.password_hash !== hashPassword(password)) {
      return NextResponse.json({ error: "Sai tên đăng nhập hoặc mật khẩu" }, { status: 401 });
    }

    const sessionPayload = { id: user.id, username: user.username, role: user.role };
    const token = createSessionToken(sessionPayload);
    const res = NextResponse.json({ user: sessionPayload });
    res.cookies.set("oj_session", token, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 7 });
    return res;
  }

  return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
}
