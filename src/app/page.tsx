"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TestResult {
  test_id: number;
  status: string;
  time_ms: number;
  input: string;
  expected_output: string;
  user_output: string;
  judge_response: string;
}

export default function HomePage() {
  // Auth & Setup States
  const [authLoading, setAuthLoading] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(true);
  const [user, setUser] = useState<{ id: number; username: string; role: string } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [authError, setAuthError] = useState("");

  // Problems & Contests
  const [contests, setContests] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const [selectedContest, setSelectedContest] = useState<string>("all");
  const [selectedProblemId, setSelectedProblemId] = useState<number | null>(null);

  // Judge States
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(
    `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(nullptr);\n    return 0;\n}`
  );
  const [submitting, setSubmitting] = useState(false);
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [expandedTest, setExpandedTest] = useState<number | null>(null);

  const checkAuthAndLoad = async () => {
    const res = await fetch("/api/auth");
    const authData = await res.json();
    setHasAdmin(authData.hasAdmin);
    setUser(authData.user);
    setAuthLoading(false);

    if (authData.hasAdmin) {
      const [{ data: cData }, { data: pData }] = await Promise.all([
        supabase.from("contests").select("*").order("id", { ascending: false }),
        supabase.from("problems").select("*").order("id"),
      ]);
      setContests(cData || []);
      setProblems(pData || []);
      if (pData && pData.length > 0) {
        setSelectedProblemId(pData[0].id);
      }
    }
  };

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  // Realtime kết quả chấm
  useEffect(() => {
    if (!currentSub?.id) return;
    const channel = supabase
      .channel(`sub-${currentSub.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "submissions", filter: `id=eq.${currentSub.id}` },
        (payload) => setCurrentSub(payload.new)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSub?.id]);

  const handleAuthSubmit = async (action: "setup_admin" | "login") => {
    setAuthError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...authForm }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthError(data.error);
      return;
    }
    setShowLoginModal(false);
    setAuthForm({ username: "", password: "" });
    await checkAuthAndLoad();
  };

  const handleLogout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setUser(null);
  };

  const handleSubmit = async () => {
    if (!selectedProblemId) return;
    setSubmitting(true);
    setExpandedTest(null);
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problem_id: selectedProblemId,
        language,
        source_code: code,
      }),
    });
    const data = await res.json();
    if (data.submission) setCurrentSub(data.submission);
    setSubmitting(false);
  };

  const getStyle = (status: string) => {
    switch (status) {
      case "AC": return { bg: "bg-green-500 hover:bg-green-600 text-white", clickable: true };
      case "WA": return { bg: "bg-red-500 hover:bg-red-600 text-white", clickable: true };
      case "RTE": return { bg: "bg-amber-500 hover:bg-amber-600 text-white", clickable: true };
      case "TLE":
      case "MLE":
      case "OLE":
      case "ILE": return { bg: "bg-gray-500 hover:bg-gray-600 text-white", clickable: true };
      default: return { bg: "bg-gray-400 text-white cursor-not-allowed", clickable: false };
    }
  };

  if (authLoading) return <div className="p-10 text-center">Đang khởi động hệ thống...</div>;

  // MÀN HÌNH KHỞI TẠO ADMIN LẦN ĐẦU NẾU CHƯA CÓ ADMIN
  if (!hasAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-md border max-w-md w-full space-y-4">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-blue-600">Thiết lập Hệ thống lần đầu</h1>
            <p className="text-sm text-gray-500">
              Hệ thống chưa có tài khoản quản trị. Hãy tạo tài khoản <b>Admin</b> đầu tiên để tiếp tục.
            </p>
          </div>
          {authError && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{authError}</p>}
          <input
            placeholder="Tên đăng nhập Admin (Username)"
            value={authForm.username}
            onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
            className="w-full border p-2.5 rounded-lg"
          />
          <input
            type="password"
            placeholder="Mật khẩu Admin (Password)"
            value={authForm.password}
            onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            className="w-full border p-2.5 rounded-lg"
          />
          <button
            onClick={() => handleAuthSubmit("setup_admin")}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
          >
            Khởi tạo Admin & Vào hệ thống
          </button>
        </div>
      </main>
    );
  }

  const filteredProblems =
    selectedContest === "all"
      ? problems
      : problems.filter((p) => String(p.contest_id) === selectedContest);

  const activeProblem = problems.find((p) => p.id === selectedProblemId);
  const testResults: TestResult[] = currentSub?.test_results || [];
  const activeDetail = testResults.find((t) => t.test_id === expandedTest);

  return (
    <div className="min-h-screen">
      {/* Thanh Header */}
      <header className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <span className="font-extrabold text-xl text-blue-600">My Online Judge</span>
          <select
            value={selectedContest}
            onChange={(e) => {
              setSelectedContest(e.target.value);
              const list = e.target.value === "all"
                ? problems
                : problems.filter((p) => String(p.contest_id) === e.target.value);
              if (list.length > 0) setSelectedProblemId(list[0].id);
            }}
            className="border rounded-lg px-3 py-1.5 text-sm bg-gray-50 font-medium"
          >
            <option value="all">Tất cả bài tập</option>
            {contests.map((c) => (
              <option key={c.id} value={c.id}>Contest: {c.title}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm font-medium">
                Xin chào, <b>{user.username}</b>
              </span>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg"
                >
                  Trang Quản Trị (Admin)
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-100"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
            >
              Đăng nhập
            </button>
          )}
        </div>
      </header>

      {/* Modal Đăng nhập */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl max-w-sm w-full space-y-4">
            <h2 className="text-lg font-bold">Đăng nhập hệ thống</h2>
            {authError && <p className="text-red-600 text-xs bg-red-50 p-2 rounded">{authError}</p>}
            <input
              placeholder="Username"
              value={authForm.username}
              onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
              className="w-full border p-2 rounded"
            />
            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              className="w-full border p-2 rounded"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowLoginModal(false)} className="px-4 py-2 border rounded text-sm">
                Hủy
              </button>
              <button
                onClick={() => handleAuthSubmit("login")}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold"
              >
                Đăng nhập
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nội dung chính */}
      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Cột trái: Danh sách bài tập */}
        <aside className="bg-white p-4 rounded-xl border shadow-sm space-y-2 h-fit">
          <h2 className="font-bold text-sm text-gray-500 uppercase px-2">Danh sách bài tập</h2>
          {filteredProblems.length === 0 ? (
            <p className="text-xs text-gray-400 px-2">Chưa có bài tập nào.</p>
          ) : (
            filteredProblems.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedProblemId(p.id); setCurrentSub(null); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                  selectedProblemId === p.id
                    ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                    : "hover:bg-gray-50"
                }`}
              >
                #{p.id}. {p.title}
              </button>
            ))
          )}
        </aside>

        {/* Cột phải: Đề bài & Trình nộp code */}
        <div className="md:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h1 className="text-2xl font-bold mb-2">
              {activeProblem ? `${activeProblem.id}. ${activeProblem.title}` : "Chọn một bài tập bên trái"}
            </h1>
            {activeProblem && (
              <div className="text-xs text-gray-500 mb-4 space-x-4">
                <span>Time Limit: {activeProblem.time_limit_ms} ms</span>
                <span>Memory Limit: {activeProblem.memory_limit_mb} MB</span>
              </div>
            )}
            <p className="whitespace-pre-line text-gray-800">{activeProblem?.description}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
            <div className="flex justify-between items-center">
              <label className="font-semibold">Chọn ngôn ngữ:</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="border rounded-lg px-3 py-1.5 bg-gray-50 font-medium"
              >
                <option value="cpp">C++ (GCC O2 C++20)</option>
                <option value="rust">Rust (rustc -O)</option>
                <option value="pypy">Python (PyPy 3.10)</option>
                <option value="csharp">C# (.NET 8)</option>
                <option value="java">Java (OpenJDK)</option>
              </select>
            </div>

            <textarea
              rows={12}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full font-mono text-sm p-4 border rounded-lg bg-gray-900 text-green-300 focus:outline-none"
              placeholder="Dán mã nguồn của bạn vào đây..."
            />

            <button
              onClick={handleSubmit}
              disabled={submitting || !activeProblem}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50"
            >
              {submitting ? "Đang gửi bài..." : "Nộp bài (Submit)"}
            </button>
          </div>

          {currentSub && (
            <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Kết quả bài nộp #{currentSub.id}</h2>
                <span className={`px-4 py-1.5 rounded font-bold text-sm ${getStyle(currentSub.status).bg}`}>
                  {currentSub.status === "G"
                    ? "G (Đang chấm...)"
                    : `${currentSub.status} (${currentSub.execution_time_ms} ms)`}
                </span>
              </div>

              {["CE", "AB", "G"].includes(currentSub.status) ? (
                currentSub.status === "CE" && currentSub.compile_log ? (
                  <pre className="p-4 bg-gray-900 text-red-400 text-xs rounded-lg overflow-x-auto">
                    {currentSub.compile_log}
                  </pre>
                ) : (
                  <p className="text-sm text-gray-500">
                    {currentSub.status === "G"
                      ? "Máy chấm GitHub Actions đang biên dịch và chạy test case..."
                      : "Quá trình chấm bị hủy (Aborted)."}
                  </p>
                )
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {testResults.map((test) => {
                      const style = getStyle(test.status);
                      const isSelected = expandedTest === test.test_id;
                      return (
                        <button
                          key={test.test_id}
                          onClick={() => style.clickable && setExpandedTest(isSelected ? null : test.test_id)}
                          className={`px-3 py-2 rounded font-mono text-sm font-semibold transition flex flex-col items-center min-w-[95px] ${
                            style.bg
                          } ${isSelected ? "ring-2 ring-offset-2 ring-blue-600" : ""}`}
                        >
                          <span>#{test.test_id} · {test.status}</span>
                          <span className="text-xs font-normal opacity-90">{test.time_ms} ms</span>
                        </button>
                      );
                    })}
                  </div>

                  {activeDetail && (
                    <div className="mt-4 p-4 border rounded-lg bg-gray-50 space-y-3 text-sm">
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="font-bold">
                          Chi tiết Test #{activeDetail.test_id} — {activeDetail.status} ({activeDetail.time_ms} ms)
                        </span>
                        <button
                          onClick={() => setExpandedTest(null)}
                          className="text-xs text-gray-500 hover:text-black underline"
                        >
                          Đóng
                        </button>
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Judge Response:</p>
                        <div className="p-2 bg-gray-200 rounded font-mono text-xs">{activeDetail.judge_response}</div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <p className="font-semibold mb-1">Input:</p>
                          <pre className="p-2 bg-white border rounded font-mono text-xs h-32 overflow-auto">
                            {activeDetail.input || "(Trống)"}
                          </pre>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">Output đúng:</p>
                          <pre className="p-2 bg-white border rounded font-mono text-xs h-32 overflow-auto">
                            {activeDetail.expected_output || "(Trống)"}
                          </pre>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">Output của code bạn:</p>
                          <pre className="p-2 bg-white border rounded font-mono text-xs h-32 overflow-auto">
                            {activeDetail.user_output || "(Không có output)"}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
