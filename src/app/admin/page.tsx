"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminDashboard() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"problems" | "testcases" | "contests" | "users">("problems");
  const [users, setUsers] = useState<any[]>([]);
  const [contests, setContests] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  // Form States
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "user" });
  const [contestForm, setContestForm] = useState({ id: null, title: "", description: "", start_time: "", end_time: "" });
  const [probForm, setProbForm] = useState({
    id: null,
    title: "",
    description: "",
    time_limit_ms: 1000,
    memory_limit_mb: 256,
    contest_id: "",
  });
  const [testForm, setTestForm] = useState({ problem_id: "", test_index: 1, input_data: "", output_data: "" });
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    const res = await fetch("/api/admin");
    if (!res.ok) {
      setAuthorized(false);
      return;
    }
    const data = await res.json();
    setAuthorized(true);
    setUsers(data.users);
    setContests(data.contests);
    setProblems(data.problems);
    if (data.problems.length > 0 && !testForm.problem_id) {
      setTestForm((prev) => ({ ...prev, problem_id: String(data.problems[0].id) }));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const callAdminApi = async (payload: any, successText: string) => {
    setMsg("");
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(`❌ ${data.error}`);
      return false;
    }
    setMsg(`✅ ${successText}`);
    await loadData();
    return true;
  };

  if (authorized === null) return <div className="p-10 text-center">Đang kiểm tra quyền Admin...</div>;
  if (authorized === false) {
    return (
      <div className="p-10 text-center space-y-4">
        <p className="text-red-600 font-bold text-lg">Bạn chưa đăng nhập hoặc không có quyền Admin!</p>
        <Link href="/" className="text-blue-600 underline">Quay lại trang chủ để đăng nhập</Link>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Bảng điều khiển Admin</h1>
          <p className="text-xs text-gray-500">Quản lý Contests, Đề bài, Testcases & Tài khoản</p>
        </div>
        <Link href="/" className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-black">
          ← Về trang chấm bài
        </Link>
      </div>

      {msg && <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 font-medium text-sm">{msg}</div>}

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {[
          { key: "problems", label: "1. Đề bài (Problems)" },
          { key: "testcases", label: "2. Testcases (GitHub)" },
          { key: "contests", label: "3. Kỳ thi (Contests)" },
          { key: "users", label: "4. Tài khoản (Users)" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key as any); setMsg(""); }}
            className={`px-4 py-2 rounded-lg font-semibold text-sm ${
              tab === t.key ? "bg-blue-600 text-white" : "bg-white border hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: ĐỀ BÀI */}
      {tab === "problems" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border space-y-3">
            <h2 className="font-bold text-lg">{probForm.id ? `Sửa bài #${probForm.id}` : "Thêm đề bài mới"}</h2>
            <input
              placeholder="Tên bài (VD: Tổng hai số)"
              value={probForm.title}
              onChange={(e) => setProbForm({ ...probForm, title: e.target.value })}
              className="w-full border p-2 rounded"
            />
            <textarea
              rows={6}
              placeholder="Nội dung đề bài, Input, Output, Ví dụ..."
              value={probForm.description}
              onChange={(e) => setProbForm({ ...probForm, description: e.target.value })}
              className="w-full border p-2 rounded text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Time Limit (ms)</label>
                <input
                  type="number"
                  value={probForm.time_limit_ms}
                  onChange={(e) => setProbForm({ ...probForm, time_limit_ms: Number(e.target.value) })}
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Memory Limit (MB)</label>
                <input
                  type="number"
                  value={probForm.memory_limit_mb}
                  onChange={(e) => setProbForm({ ...probForm, memory_limit_mb: Number(e.target.value) })}
                  className="w-full border p-2 rounded"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Thuộc Contest (Tùy chọn)</label>
              <select
                value={probForm.contest_id}
                onChange={(e) => setProbForm({ ...probForm, contest_id: e.target.value })}
                className="w-full border p-2 rounded bg-white"
              >
                <option value="">-- Luyện tập tự do (Không thuộc Contest) --</option>
                {contests.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const ok = await callAdminApi({ type: "save_problem", ...probForm }, "Đã lưu đề bài!");
                  if (ok) setProbForm({ id: null, title: "", description: "", time_limit_ms: 1000, memory_limit_mb: 256, contest_id: "" });
                }}
                className="px-4 py-2 bg-green-600 text-white rounded font-semibold text-sm"
              >
                Lưu đề bài
              </button>
              {probForm.id && (
                <button
                  onClick={() => setProbForm({ id: null, title: "", description: "", time_limit_ms: 1000, memory_limit_mb: 256, contest_id: "" })}
                  className="px-4 py-2 bg-gray-200 rounded text-sm"
                >
                  Hủy sửa
                </button>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border space-y-3">
            <h2 className="font-bold text-lg">Danh sách đề bài hiện có</h2>
            {problems.map((p) => (
              <div key={p.id} className="p-3 border rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-bold">#{p.id} - {p.title}</p>
                  <p className="text-xs text-gray-500">{p.time_limit_ms}ms | {p.memory_limit_mb}MB</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setProbForm({ ...p, contest_id: p.contest_id || "" })}
                    className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded text-xs font-semibold"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => confirm(`Xóa bài #${p.id}?`) && callAdminApi({ type: "delete_problem", id: p.id }, "Đã xóa bài!")}
                    className="px-2.5 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: UPLOAD TESTCASES TRỰC TIẾP LÊN GITHUB */}
      {tab === "testcases" && (
        <div className="bg-white p-6 rounded-xl border space-y-4 max-w-3xl">
          <h2 className="font-bold text-lg">Thêm / Ghi đè Testcase trực tiếp lên GitHub Worker</h2>
          <p className="text-xs text-gray-500">
            Hệ thống sẽ tự động tạo file <code>tests/[problem_id]/[test_index].in</code> và <code>.out</code> trên repo private của bạn.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold">Chọn bài tập</label>
              <select
                value={testForm.problem_id}
                onChange={(e) => setTestForm({ ...testForm, problem_id: e.target.value })}
                className="w-full border p-2 rounded bg-white"
              >
                {problems.map((p) => (
                  <option key={p.id} value={p.id}>#{p.id} - {p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold">Số thứ tự Test (1, 2, 3...)</label>
              <input
                type="number"
                min={1}
                value={testForm.test_index}
                onChange={(e) => setTestForm({ ...testForm, test_index: Number(e.target.value) })}
                className="w-full border p-2 rounded"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold">Dữ liệu Input (.in)</label>
              <textarea
                rows={6}
                value={testForm.input_data}
                onChange={(e) => setTestForm({ ...testForm, input_data: e.target.value })}
                className="w-full border p-2 rounded font-mono text-xs"
                placeholder="Nhập dữ liệu đầu vào..."
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Đáp án chuẩn Output (.out)</label>
              <textarea
                rows={6}
                value={testForm.output_data}
                onChange={(e) => setTestForm({ ...testForm, output_data: e.target.value })}
                className="w-full border p-2 rounded font-mono text-xs"
                placeholder="Nhập kết quả đúng..."
              />
            </div>
          </div>
          <button
            disabled={uploading}
            onClick={async () => {
              setUploading(true);
              const ok = await callAdminApi(
                { type: "upload_testcase", ...testForm },
                `Đã đẩy Test #${testForm.test_index} của bài #${testForm.problem_id} lên GitHub!`
              );
              if (ok) setTestForm((prev) => ({ ...prev, test_index: prev.test_index + 1, input_data: "", output_data: "" }));
              setUploading(false);
            }}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50"
          >
            {uploading ? "Đang đẩy lên GitHub..." : "Lưu Testcase lên Máy chấm"}
          </button>
        </div>
      )}

      {/* TAB 3: CONTESTS */}
      {tab === "contests" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border space-y-3">
            <h2 className="font-bold text-lg">{contestForm.id ? "Sửa Contest" : "Tạo Contest mới"}</h2>
            <input
              placeholder="Tên kỳ thi (VD: Weekly Contest #1)"
              value={contestForm.title}
              onChange={(e) => setContestForm({ ...contestForm, title: e.target.value })}
              className="w-full border p-2 rounded"
            />
            <textarea
              rows={3}
              placeholder="Mô tả / Thể lệ kỳ thi..."
              value={contestForm.description}
              onChange={(e) => setContestForm({ ...contestForm, description: e.target.value })}
              className="w-full border p-2 rounded text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Thời gian bắt đầu</label>
                <input
                  type="datetime-local"
                  value={contestForm.start_time}
                  onChange={(e) => setContestForm({ ...contestForm, start_time: e.target.value })}
                  className="w-full border p-2 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Thời gian kết thúc</label>
                <input
                  type="datetime-local"
                  value={contestForm.end_time}
                  onChange={(e) => setContestForm({ ...contestForm, end_time: e.target.value })}
                  className="w-full border p-2 rounded text-xs"
                />
              </div>
            </div>
            <button
              onClick={async () => {
                const ok = await callAdminApi({ type: "save_contest", ...contestForm }, "Đã lưu Contest!");
                if (ok) setContestForm({ id: null, title: "", description: "", start_time: "", end_time: "" });
              }}
              className="px-4 py-2 bg-green-600 text-white rounded font-semibold text-sm"
            >
              Lưu Contest
            </button>
          </div>

          <div className="bg-white p-5 rounded-xl border space-y-3">
            <h2 className="font-bold text-lg">Danh sách Contests</h2>
            {contests.map((c) => (
              <div key={c.id} className="p-3 border rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-bold">{c.title}</p>
                  <p className="text-xs text-gray-500">{c.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setContestForm({
                      id: c.id,
                      title: c.title,
                      description: c.description || "",
                      start_time: c.start_time ? c.start_time.slice(0, 16) : "",
                      end_time: c.end_time ? c.end_time.slice(0, 16) : "",
                    })}
                    className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded text-xs font-semibold"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => confirm("Xóa Contest này?") && callAdminApi({ type: "delete_contest", id: c.id }, "Đã xóa Contest!")}
                    className="px-2.5 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TÀI KHOẢN */}
      {tab === "users" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border space-y-3">
            <h2 className="font-bold text-lg">Cấp tài khoản mới</h2>
            <input
              placeholder="Username"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              className="w-full border p-2 rounded"
            />
            <input
              type="password"
              placeholder="Mật khẩu"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="w-full border p-2 rounded"
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="w-full border p-2 rounded bg-white"
            >
              <option value="user">Thí sinh (User)</option>
              <option value="admin">Quản trị viên (Admin)</option>
            </select>
            <button
              onClick={async () => {
                const ok = await callAdminApi({ type: "create_user", ...newUser }, "Đã tạo tài khoản!");
                if (ok) setNewUser({ username: "", password: "", role: "user" });
              }}
              className="px-4 py-2 bg-green-600 text-white rounded font-semibold text-sm"
            >
              Tạo tài khoản
            </button>
          </div>

          <div className="bg-white p-5 rounded-xl border space-y-3">
            <h2 className="font-bold text-lg">Danh sách tài khoản ({users.length})</h2>
            {users.map((u) => (
              <div key={u.id} className="p-3 border rounded-lg flex justify-between items-center">
                <div>
                  <span className="font-bold">{u.username}</span>{" "}
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700"}`}>
                    {u.role.toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={() => confirm(`Xóa tài khoản ${u.username}?`) && callAdminApi({ type: "delete_user", id: u.id }, "Đã xóa tài khoản!")}
                  className="px-2.5 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold"
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
