import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import API_BASE from "../../config";

const API_STATS = `${API_BASE}/api/dashboard/stats`;
const API_RECENT_APPOINTMENTS = `${API_BASE}/api/dashboard/recent-appointments`;
const API_TODAY_BARBERS = `${API_BASE}/api/dashboard/today-barbers`;
const API_RECENT_SERVICES = `${API_BASE}/api/dashboard/recent-services`;

function formatServices(raw) {
  if (!raw) return "---";
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return "---";
    const names = arr.map((x) => (typeof x === "string" ? x : x?.name || x?.title || "")).filter(Boolean);
    return names.length ? names.join(", ") : "---";
  } catch {
    return "---";
  }
}

function formatTime(str) {
  if (!str) return "---";
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
  if (!m) return str;
  const [, , month, day, hh, mm] = m;
  return `${hh}:${mm} ${day}/${month}`;
}

function getStatusLabel(status) {
  const s = (status || "").toLowerCase();
  if (s === "completed") return "Hoàn thành";
  if (s === "success" || s === "confirmed") return "Đã xác nhận";
  if (s === "cancelled") return "Đã hủy";
  return "Chờ xác nhận";
}

export default function Dashboard() {
  const [stats, setStats] = useState({ totalToday: 0, completedToday: 0, revenueToday: 0 });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [todayBarbers, setTodayBarbers] = useState([]);
  const [recentServices, setRecentServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, aptRes, barbersRes, servicesRes] = await Promise.all([
        axios.get(API_STATS),
        axios.get(API_RECENT_APPOINTMENTS),
        axios.get(API_TODAY_BARBERS),
        axios.get(API_RECENT_SERVICES),
      ]);
      setStats(statsRes.data || { totalToday: 0, completedToday: 0, revenueToday: 0 });
      setRecentAppointments(aptRes.data || []);
      setTodayBarbers(barbersRes.data || []);
      setRecentServices(servicesRes.data || []);
    } catch (err) {
      console.error("Error fetching dashboard:", err);
      setError(err.response?.data?.message || err.message || "Không thể tải dữ liệu dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  return (
    <div className="p-6 sm:p-8">
      <h1 className="admin-tab mb-6">Dashboard</h1>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm flex flex-wrap items-center justify-between gap-2">
          <span>{error}</span>
          <div className="flex gap-2">
            <button onClick={fetchAll} className="px-2 py-1 bg-zinc-700 rounded hover:bg-zinc-600 text-white text-xs">
              Thử lại
            </button>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top: 3 stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <p className="text-zinc-400 text-sm mb-1">Tổng lịch hôm nay</p>
          <p className="text-2xl font-bold text-white">{loading ? "..." : stats.totalToday}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <p className="text-zinc-400 text-sm mb-1">Khách đã phục vụ hôm nay</p>
          <p className="text-2xl font-bold text-green-400">{loading ? "..." : stats.completedToday}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <p className="text-zinc-400 text-sm mb-1">Doanh thu hôm nay</p>
          <p className="text-2xl font-bold text-[#d4a441]">
            {loading ? "..." : `${(stats.revenueToday ?? 0).toLocaleString("vi-VN")}đ`}
          </p>
        </div>
      </div>

      {/* Bottom: 3 preview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Lịch hẹn gần nhất */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="font-semibold text-white">Lịch hẹn gần nhất</h2>
          </div>
          <div className="p-4 space-y-3">
            {loading ? (
              <p className="text-zinc-500 text-sm">Đang tải...</p>
            ) : recentAppointments.length === 0 ? (
              <p className="text-zinc-500 text-sm">Chưa có lịch hẹn</p>
            ) : (
              recentAppointments.slice(0, 2).map((apt, i) => (
                <div key={i} className="text-sm border-b border-zinc-800 pb-3 last:border-0 last:pb-0">
                  <p className="font-medium text-white">{apt.customerName}</p>
                  <p className="text-zinc-400 text-xs">Thợ: {apt.barberName}</p>
                  <p className="text-zinc-400 text-xs">Dịch vụ: {formatServices(apt.services)}</p>
                  <p className="text-zinc-400 text-xs">Thời gian: {formatTime(apt.appointmentTime)}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-zinc-700 text-zinc-300">
                    {getStatusLabel(apt.status)}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="p-3 border-t border-zinc-800">
            <Link
              to="/admin/appointments"
              className="block w-full text-center py-2 text-sm font-medium text-[#d4a441] hover:text-[#c49431] transition-colors"
            >
              Xem tất cả
            </Link>
          </div>
        </div>

        {/* Card 2: Thợ có lịch hôm nay */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="font-semibold text-white">Thợ có lịch hôm nay</h2>
          </div>
          <div className="p-4 space-y-3">
            {loading ? (
              <p className="text-zinc-500 text-sm">Đang tải...</p>
            ) : todayBarbers.length === 0 ? (
              <p className="text-zinc-500 text-sm">Chưa có thợ có lịch</p>
            ) : (
              todayBarbers.slice(0, 2).map((b, i) => (
                <div key={i} className="text-sm border-b border-zinc-800 pb-3 last:border-0 last:pb-0">
                  <p className="font-medium text-white">{b.barberName}</p>
                  <p className="text-zinc-400 text-xs">Số lịch hôm nay: {b.totalAppointments}</p>
                  <p className="text-zinc-400 text-xs">
                    Lịch gần nhất: {b.lastAppointment ? formatTime(b.lastAppointment) : "---"}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="p-3 border-t border-zinc-800">
            <Link
              to="/admin/barbers"
              className="block w-full text-center py-2 text-sm font-medium text-[#d4a441] hover:text-[#c49431] transition-colors"
            >
              Xem tất cả
            </Link>
          </div>
        </div>

        {/* Card 3: Dịch vụ được đặt gần đây */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="font-semibold text-white">Dịch vụ gần đây</h2>
          </div>
          <div className="p-4 space-y-3">
            {loading ? (
              <p className="text-zinc-500 text-sm">Đang tải...</p>
            ) : recentServices.length === 0 ? (
              <p className="text-zinc-500 text-sm">Chưa có dịch vụ</p>
            ) : (
              recentServices.slice(0, 2).map((s, i) => (
                <div key={i} className="text-sm border-b border-zinc-800 pb-3 last:border-0 last:pb-0">
                  <p className="font-medium text-white">{s.serviceName}</p>
                  <p className="text-zinc-400 text-xs">Giá: {(s.price ?? 0).toLocaleString("vi-VN")}đ</p>
                  <p className="text-zinc-400 text-xs">Số lần đặt gần đây: {s.recentBookCount ?? 0}</p>
                </div>
              ))
            )}
          </div>
          <div className="p-3 border-t border-zinc-800">
            <Link
              to="/admin/services"
              className="block w-full text-center py-2 text-sm font-medium text-[#d4a441] hover:text-[#c49431] transition-colors"
            >
              Xem tất cả
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
