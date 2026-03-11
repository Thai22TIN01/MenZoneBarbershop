import { useState, useEffect } from "react";
import axios from "axios";
import API_BASE from "../../config";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_REVENUE = `${API_BASE}/api/revenue`;

function formatVnd(value) {
  return `${(value ?? 0).toLocaleString("vi-VN")}đ`;
}

function getDefaultWeekData() {
  const arr = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    arr.push({
      label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
      revenue: 0,
    });
  }
  return arr;
}

export default function Revenue() {
  const [revenueToday, setRevenueToday] = useState(0);
  const [revenueMonth, setRevenueMonth] = useState(0);
  const [weekData, setWeekData] = useState(getDefaultWeekData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [todayRes, monthRes, weekRes] = await Promise.all([
        axios.get(`${API_REVENUE}/today`),
        axios.get(`${API_REVENUE}/month`),
        axios.get(`${API_REVENUE}/week-by-day`),
      ]);
      setRevenueToday(todayRes.data?.revenue ?? 0);
      setRevenueMonth(monthRes.data?.revenue ?? 0);
      setWeekData(weekRes.data?.length ? weekRes.data : getDefaultWeekData());
    } catch (err) {
      console.error("Error fetching revenue:", err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      setError(errMsg || "Không thể tải dữ liệu doanh thu.");
      setWeekData(getDefaultWeekData());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const chartData = {
    labels: (weekData || []).map((d) => d?.label ?? ""),
    datasets: [
      {
        label: "Doanh thu (VNĐ)",
        data: (weekData || []).map((d) => d?.revenue ?? 0),
        backgroundColor: "rgba(212, 164, 65, 0.7)",
        borderColor: "#d4a441",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => formatVnd(ctx.raw),
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: "#a1a1aa",
          callback: (value) => value.toLocaleString("vi-VN"),
        },
        grid: { color: "rgba(113, 113, 122, 0.3)" },
      },
      x: {
        ticks: { color: "#a1a1aa" },
        grid: { color: "rgba(113, 113, 122, 0.3)" },
      },
    },
  };

  return (
    <div className="p-6 sm:p-8">
      <h1 className="admin-tab mb-6">Thống kê doanh thu</h1>

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

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <p className="text-zinc-400 text-sm mb-1">Tổng doanh thu hôm nay</p>
          <p className="text-2xl font-bold text-[#d4a441]">
            {loading ? "..." : formatVnd(revenueToday)}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <p className="text-zinc-400 text-sm mb-1">Tổng doanh thu tháng</p>
          <p className="text-2xl font-bold text-[#d4a441]">
            {loading ? "..." : formatVnd(revenueMonth)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Doanh thu 7 ngày gần nhất</h2>
        <div className="h-[300px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-zinc-500">Đang tải...</div>
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>
      </div>
    </div>
  );
}
