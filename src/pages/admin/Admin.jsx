import { useState, useEffect } from "react";
import axios from "axios";
import BarberManager from "./BarberManager";
import AppointmentManager from "./AppointmentManager";
import ServiceManager from "./ServiceManager";

const API_STATS = "http://localhost:3001/api/dashboard/stats";
const API_REVENUE = "http://localhost:3001/api/revenue";

export default function Admin() {
  const [tab, setTab] = useState("appointments");
  const [stats, setStats] = useState({ totalToday: 0, completedToday: 0, revenueToday: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [revenueFilter, setRevenueFilter] = useState("day");
  const [revenue, setRevenue] = useState(0);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [topServices, setTopServices] = useState([]);
  const [topBarbers, setTopBarbers] = useState([]);
  const [weeklyRevenue, setWeeklyRevenue] = useState([]);

  const dayShortMap = {
    Monday: "T2",
    Tuesday: "T3",
    Wednesday: "T4",
    Thursday: "T5",
    Friday: "T6",
    Saturday: "T7",
    Sunday: "CN",
    "Thứ Hai": "T2",
    "Thứ Ba": "T3",
    "Thứ Tư": "T4",
    "Thứ Năm": "T5",
    "Thứ Sáu": "T6",
    "Thứ Bảy": "T7",
    "Chủ Nhật": "CN",
  };
  const dayShortByNumber = { 1: "CN", 2: "T2", 3: "T3", 4: "T4", 5: "T5", 6: "T6", 7: "T7" };

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
    const fetchTopServices = async () => {
      try {
        const res = await axios.get("http://localhost:3001/api/services/top");
        setTopServices(res.data || []);
      } catch (err) {
        console.error("Error fetching top services:", err);
        setTopServices([]);
      }
    };
    const fetchTopBarbers = async () => {
      try {
        const res = await axios.get("http://localhost:3001/api/barbers/top");
        setTopBarbers(res.data || []);
      } catch (err) {
        console.error("Error fetching top barbers:", err);
        setTopBarbers([]);
      }
    };
    const fetchWeeklyRevenue = async () => {
      try {
        const res = await axios.get("http://localhost:3001/api/revenue/week-by-day");
        setWeeklyRevenue(res.data || []);
      } catch (err) {
        console.error("Error fetching weekly revenue:", err);
        setWeeklyRevenue([]);
      }
    };
    fetchStats();
    fetchTopServices();
    fetchTopBarbers();
    fetchWeeklyRevenue();
  }, []);

  useEffect(() => {
    const fetchRevenue = async () => {
      setRevenueLoading(true);
      try {
        const endpoint = revenueFilter === "day" ? "today" : revenueFilter;
        const res = await axios.get(`${API_REVENUE}/${endpoint}`);
        setRevenue(res.data?.revenue ?? 0);
      } catch (err) {
        console.error("Error fetching revenue:", err);
        setRevenue(0);
      } finally {
        setRevenueLoading(false);
      }
    };
    fetchRevenue();
  }, [revenueFilter]);

  const menuItems = [
    { id: "appointments", label: "Lịch hẹn", icon: "📅" },
    { id: "barbers", label: "Thợ cắt tóc", icon: "✂️" },
    { id: "services", label: "Dịch vụ", icon: "💈" },
  ];

  return (
    <div className="flex h-screen pt-20 bg-zinc-950 text-white overflow-hidden">
      {/* SIDEBAR - sticky, cố định khi scroll */}
      <aside className="sticky top-20 left-0 z-40 w-48 h-[calc(100vh-5rem)] shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
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

      {/* CONTENT - scroll riêng, sidebar đứng yên */}
      <main className={`flex-1 min-h-0 min-w-0 overflow-y-auto ${tab === "services" ? "flex flex-col" : ""}`}>
        {tab === "barbers" && <BarberManager topBarbers={topBarbers} />}
        {tab === "appointments" && (
          <AppointmentManager
            revenue={revenue}
            revenueFilter={revenueFilter}
            setRevenueFilter={setRevenueFilter}
            revenueLoading={revenueLoading}
          />
        )}
        {tab === "services" && <ServiceManager topServices={topServices} className="flex-1 min-h-0" />}
      </main>
    </div>
  );
}
