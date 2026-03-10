import { useState, useEffect } from "react";
import axios from "axios";
import BarberManager from "./BarberManager";
import AppointmentManager from "./AppointmentManager";
import ServiceManager from "./ServiceManager";

const API_STATS = "http://localhost:3001/api/dashboard/stats";

export default function Admin() {
  const [tab, setTab] = useState("appointments");
  const [stats, setStats] = useState({ totalToday: 0, completedToday: 0, revenueToday: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(API_STATS);
        setStats(res.data || { totalToday: 0, completedToday: 0, revenueToday: 0 });
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const menuItems = [
    { id: "appointments", label: "Lịch hẹn", icon: "📅" },
    { id: "barbers", label: "Thợ cắt tóc", icon: "✂️" },
    { id: "services", label: "Dịch vụ", icon: "💈" },
  ];

  return (
    <div className="flex h-screen pt-20 bg-zinc-950 text-white">
      {/* SIDEBAR - fixed below header */}
      <aside className="fixed left-0 top-20 bottom-0 z-40 w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-6 border-b border-zinc-800 flex-shrink-0">
          <h2 className="text-lg font-bold text-[#d4a441]">Dashboard</h2>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                ${
                  tab === item.id
                    ? "bg-[#d4a441] text-black shadow-lg"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* CONTENT - scrollable only */}
      <main className="ml-56 flex-1 min-h-0 overflow-y-auto">
        {/* Stats cards */}
        <div className="p-6 pb-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-400 text-sm mb-1">Tổng lịch hôm nay</p>
              <p className="text-2xl font-bold text-white">
                {statsLoading ? "..." : stats.totalToday}
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-400 text-sm mb-1">Khách đã phục vụ hôm nay</p>
              <p className="text-2xl font-bold text-green-400">
                {statsLoading ? "..." : stats.completedToday}
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-400 text-sm mb-1">Doanh thu hôm nay</p>
              <p className="text-2xl font-bold text-[#d4a441]">
                {statsLoading ? "..." : `${(stats.revenueToday ?? 0).toLocaleString("vi-VN")}đ`}
              </p>
            </div>
          </div>
        </div>

        {tab === "barbers" && <BarberManager />}
        {tab === "appointments" && <AppointmentManager />}
        {tab === "services" && <ServiceManager />}
      </main>
    </div>
  );
}
