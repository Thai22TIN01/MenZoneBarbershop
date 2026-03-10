import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";

function formatTime(str) {
  if (!str) return "---";
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
  if (!match) return str;
  const [, y, m, d, hh, mm] = match;
  return `${hh}:${mm} ${d}/${m}/${y}`;
}

function normalizeServices(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((x) => {
            if (typeof x === "string") return x;
            if (x?.name) return x.name;
            if (x?.title) return x.title;
            return null;
          })
          .filter(Boolean);
      }
    } catch {
      // fallthrough
    }

    // Last resort: split by comma
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [String(raw)];
}

function getStatusBadge(status) {
  const normalized =
    typeof status === "string" ? status.trim().toLowerCase() : "pending";
  const statusConfig = {
    pending: {
      label: "Chờ xác nhận",
      className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    },
    confirmed: {
      label: "Đã xác nhận",
      className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    },
    completed: {
      label: "Hoàn thành",
      className: "bg-green-500/20 text-green-400 border-green-500/30",
    },
    cancelled: {
      label: "Đã hủy",
      className: "bg-red-500/20 text-red-400 border-red-500/30",
    },
    success: {
      label: "Đã thanh toán",
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
    paid: {
      label: "Đã thanh toán",
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
  };
  const config = statusConfig[normalized] || statusConfig.pending;
  return (
    <span
      className={`px-2.5 py-1 text-xs font-medium rounded-full border ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export default function MyAppointments() {
  const location = useLocation();
  const [authEmail, setAuthEmail] = useState(() => {
    const isLogin = localStorage.getItem("isLogin") === "true";
    return isLogin ? localStorage.getItem("userEmail") || "" : "";
  });
  const [email, setEmail] = useState(() => {
    const isLogin = localStorage.getItem("isLogin") === "true";
    const loggedInEmail = isLogin
      ? localStorage.getItem("userEmail") || ""
      : "";
    if (loggedInEmail) return loggedInEmail;
    return "";
  });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const emailLooksValid = useMemo(() => {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [email]);

  const fetchMine = async (targetEmail) => {
    setError("");
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:3001/appointments");
      const list = Array.isArray(res.data) ? res.data : [];
      const normalizedEmail = String(targetEmail || "")
        .trim()
        .toLowerCase();

      const mine = list
        .filter(
          (apt) =>
            String(apt.CustomerEmail || "")
              .trim()
              .toLowerCase() === normalizedEmail
        )
        .map((apt) => ({
            id: apt.Id,
            customerName: apt.CustomerName,
            customerEmail: apt.CustomerEmail,
            customerPhone: apt.CustomerPhone,
            barberName: apt.BarberName,
            services: normalizeServices(apt.Services),
            appointmentTime: apt.AppointmentTime,
            totalPrice: apt.TotalPrice,
            totalDuration: apt.TotalDuration,
          status: apt.Status ?? apt.status,
          createdAt: apt.CreatedAt,
        }))
        .sort(
          (a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")
        );

      setAppointments(mine);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Không thể tải lịch hẹn. Vui lòng thử lại."
      );
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Always bind "My Appointments" to the currently logged-in user.
    // If user logs in/out or switches account, we refresh the list accordingly.
    const syncAuth = () => {
      const isLogin = localStorage.getItem("isLogin") === "true";
      const loggedInEmail = isLogin
        ? localStorage.getItem("userEmail") || ""
        : "";

      queueMicrotask(() => {
        setAuthEmail(loggedInEmail);
        if (loggedInEmail) {
          setEmail(loggedInEmail);
          fetchMine(loggedInEmail);
        } else {
          // Not logged in: keep manual email, but clear list until user searches.
          setAppointments([]);
        }
      });
    };

    syncAuth();
    window.addEventListener("focus", syncAuth);
    return () => window.removeEventListener("focus", syncAuth);
  }, [location.key]);

  return (
    <div className="py-20 bg-black text-white">
      <div className="max-w-7xl mx-auto px-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <h2 className="text-4xl font-bold">
              Lịch Hẹn <span className="gold">Của Tôi</span>
            </h2>
            <p className="text-gray-400 mt-2">
              Nhập email đã dùng khi đặt lịch để xem đầy đủ thông tin lịch hẹn.
            </p>
          </div>

          <div className="w-full md:w-[520px]">
            <label className="block text-sm text-gray-400 mb-2">Email</label>
            <div className="flex gap-3">
              <input
                value={email}
                onChange={(e) => {
                  // Logged-in users always view their own appointments
                  if (!authEmail) setEmail(e.target.value);
                }}
                type="email"
                placeholder="Email của bạn"
                disabled={!!authEmail}
                className={`flex-1 bg-black border border-white/20 px-4 py-3 rounded-lg text-white focus:outline-none focus:border-[#d4a441] ${
                  authEmail ? "opacity-70 cursor-not-allowed" : ""
                }`}
              />
              <button
                type="button"
                disabled={(!emailLooksValid && !authEmail) || loading}
                onClick={() => fetchMine(authEmail || email)}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  (!emailLooksValid && !authEmail) || loading
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-[#d4a441] text-black hover:bg-[#c49431]"
                }`}
              >
                {loading ? "Đang tải..." : "Xem lịch hẹn"}
              </button>
            </div>
            {authEmail && (
              <div className="mt-2 text-xs text-gray-500">
                Đang đăng nhập:{" "}
                <span className="text-gray-300">{authEmail}</span>
              </div>
            )}
            {error && (
              <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {appointments.length > 0
                ? `Tìm thấy ${appointments.length} lịch hẹn`
                : "Chưa có lịch hẹn để hiển thị"}
            </div>
            {emailLooksValid && (
              <div className="text-xs text-gray-500">
                Email: <span className="text-gray-300">{email}</span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-gray-400">
              Đang tải dữ liệu...
            </div>
          ) : appointments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-300 font-medium">
                Chưa tìm thấy lịch hẹn
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Hãy kiểm tra lại email hoặc đặt lịch mới.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-6 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold text-white">
                          #{apt.id} • {apt.customerName || "Khách hàng"}
                        </h3>
                        {getStatusBadge(apt.status)}
                      </div>

                      <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
                        <div className="text-gray-400">
                          Thời gian:{" "}
                          <span className="text-gray-200 font-medium">
                            {formatTime(apt.appointmentTime)}
                          </span>
                        </div>
                        <div className="text-gray-400">
                          SĐT:{" "}
                          <span className="text-gray-200 font-medium">
                            {apt.customerPhone || "---"}
                          </span>
                        </div>
                        <div className="text-gray-400">
                          Email:{" "}
                          <span className="text-gray-200 font-medium">
                            {apt.customerEmail || "---"}
                          </span>
                        </div>
                        <div className="text-gray-400">
                          Thợ:{" "}
                          <span className="text-gray-200 font-medium">
                            {apt.barberName || "Chưa phân công"}
                          </span>
                        </div>
                        <div className="text-gray-400">
                          Tạo lúc:{" "}
                          <span className="text-gray-200 font-medium">
                            {formatTime(apt.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-sm text-gray-400 mb-2">
                          Dịch vụ
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(apt.services?.length ? apt.services : ["---"]).map(
                            (s, idx) => (
                              <span
                                key={`${apt.id}-svc-${idx}`}
                                className="px-3 py-1 text-xs rounded-full border border-white/10 bg-black/30 text-gray-200"
                              >
                                {s}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="lg:w-[260px] shrink-0 bg-black/30 border border-white/10 rounded-xl p-4">
                      <div className="flex items-center justify-between text-sm py-1">
                        <span className="text-gray-400">Tổng tiền</span>
                        <span className="text-white font-semibold">
                          {apt.totalPrice != null
                            ? Number(apt.totalPrice).toLocaleString("vi-VN")
                            : 0}
                          đ
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm py-1">
                        <span className="text-gray-400">Thời lượng</span>
                        <span className="text-white font-semibold">
                          {apt.totalDuration != null ? apt.totalDuration : 0}{" "}
                          phút
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
