"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

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
  const [problem, setProblem] = useState<any>(null);
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(
    `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    long long a, b;\n    if (cin >> a >> b) cout << a + b;\n    return 0;\n}`
  );
  const [submitting, setSubmitting] = useState(false);
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [expandedTest, setExpandedTest] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("problems")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => setProblem(data));
  }, []);

  useEffect(() => {
    if (!currentSub?.id) return;

    const channel = supabase
      .channel(`sub-${currentSub.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "submissions",
          filter: `id=eq.${currentSub.id}`,
        },
        (payload) => {
          setCurrentSub(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSub?.id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setExpandedTest(null);
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problem_id: 1,
        language,
        source_code: code,
      }),
    });
    const data = await res.json();
    if (data.submission) {
      setCurrentSub(data.submission);
    }
    setSubmitting(false);
  };

  const getStyle = (status: string) => {
    switch (status) {
      case "AC":
        return { bg: "bg-green-500 hover:bg-green-600 text-white", clickable: true };
      case "WA":
        return { bg: "bg-red-500 hover:bg-red-600 text-white", clickable: true };
      case "RTE":
        return { bg: "bg-amber-500 hover:bg-amber-600 text-white", clickable: true };
      case "TLE":
      case "MLE":
      case "OLE":
      case "ILE":
        return { bg: "bg-gray-500 hover:bg-gray-600 text-white", clickable: true };
      case "CE":
      case "AB":
      case "G":
      default:
        return { bg: "bg-gray-400 text-white cursor-not-allowed", clickable: false };
    }
  };

  const testResults: TestResult[] = currentSub?.test_results || [];
  const activeDetail = testResults.find((t) => t.test_id === expandedTest);

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h1 className="text-2xl font-bold mb-2">
          {problem ? `${problem.id}. ${problem.title}` : "Đang tải đề bài..."}
        </h1>
        {problem && (
          <div className="text-xs text-gray-500 mb-4 space-x-4">
            <span>Time Limit: {problem.time_limit_ms} ms</span>
            <span>Memory Limit: {problem.memory_limit_mb} MB</span>
          </div>
        )}
        <p className="whitespace-pre-line text-gray-800">{problem?.description}</p>
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
          disabled={submitting}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50"
        >
          {submitting ? "Đang gửi bài..." : "Nộp bài (Submit)"}
        </button>
      </div>

      {currentSub && (
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">
              Kết quả bài nộp #{currentSub.id}
            </h2>
            <span
              className={`px-4 py-1.5 rounded font-bold text-sm ${
                getStyle(currentSub.status).bg
              }`}
            >
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
                  ? "Máy chấm GitHub Actions đang biên dịch và chạy test case (mất khoảng 6-10 giây)..."
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
                      onClick={() =>
                        style.clickable &&
                        setExpandedTest(isSelected ? null : test.test_id)
                      }
                      className={`px-3 py-2 rounded font-mono text-sm font-semibold transition flex flex-col items-center min-w-[95px] ${
                        style.bg
                      } ${isSelected ? "ring-2 ring-offset-2 ring-blue-600" : ""}`}
                    >
                      <span>
                        #{test.test_id} · {test.status}
                      </span>
                      <span className="text-xs font-normal opacity-90">
                        {test.time_ms} ms
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeDetail && (
                <div className="mt-4 p-4 border rounded-lg bg-gray-50 space-y-3 text-sm">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-bold">
                      Chi tiết Test #{activeDetail.test_id} — {activeDetail.status} (
                      {activeDetail.time_ms} ms)
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
                    <div className="p-2 bg-gray-200 rounded font-mono text-xs">
                      {activeDetail.judge_response}
                    </div>
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
    </main>
  );
}
