import { useState, useEffect } from "react";
import axios from "axios";

export default function AppointmentManager({
  revenue = 0,
  revenueFilter = "day",
  setRevenueFilter = () => {},
  revenueLoading = false,
}) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    const fn = async () => {
      await fetchAppointments();
    };
    fn();

    // Polling để đồng bộ trạng thái với SQL Server (10-15s)
    const intervalId = setInterval(() => {
      fetchAppointments();
    }, 15000);

    return () => clearInterval(intervalId);
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);

      const res = await axios.get("http://localhost:3001/appointments");

      const formatted = res.data.map((item) => ({
        id: item.Id,
        customerName: item.CustomerName,
        customerPhone: item.CustomerPhone,
        barberName: item.BarberName ?? item.barberName ?? "Chưa chọn",
        services: item.Services,
        totalPrice: item.TotalPrice,
        time: item.AppointmentTime,
        // Chuẩn hóa status từ backend (SQL Server) sang status dùng trong frontend
        status: (() => {
          const raw = (item.Status || "").toString().trim().toLowerCase();
          if (raw === "success" || raw === "confirmed") return "confirmed";
          if (raw === "cancel" || raw === "cancelled") return "cancelled";
          if (raw === "completed") return "completed";
          if (raw === "pending") return "pending";
          return "pending";
        })(),
      }));

      setAppointments(formatted);
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (str) => {
    if (!str) return "---";
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
    if (!match) return str;
    const [, y, m, d, hh, mm] = match;
    return `${hh}:${mm} ${d}/${m}/${y}`;
  };

  const formatServices = (raw) => {
    if (!raw) return "---";
    try {
      const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!Array.isArray(arr)) return "---";
      const names = arr.map((x) => (typeof x === "string" ? x : x?.name || x?.title || "")).filter(Boolean);
      return names.length ? names.join(", ") : "---";
    } catch {
      return "---";
    }
  };

  const handleStatusChange = async (id, newStatus, appointment) => {
    // Get confirmation message based on action with customer name and time
    let confirmMessage = "";
    const customerName = appointment?.customerName || "khách hàng";
    const appointmentTime = appointment?.time 
      ? formatTime(appointment.time) 
      : "";

    // Build personalized confirmation messages as requested
    if (newStatus === "confirmed") {
      confirmMessage = `Bạn có chắc chắn muốn XÁC NHẬN lịch hẹn của khách ${customerName}${appointmentTime ? ` lúc ${appointmentTime}` : ""}?`;
    } else if (newStatus === "completed") {
      confirmMessage = `Bạn có chắc chắn muốn HOÀN THÀNH lịch hẹn của khách ${customerName}${appointmentTime ? ` lúc ${appointmentTime}` : ""}?`;
    } else if (newStatus === "cancelled") {
      confirmMessage = `Bạn có chắc chắn muốn HỦY lịch hẹn của khách ${customerName}${appointmentTime ? ` lúc ${appointmentTime}` : ""}?`;
    }

    // Show confirmation dialog - only proceed if user clicks "Đồng ý" / OK
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) {
      return; // User cancelled dialog → do nothing
    }

    try {
      // Parse id to integer to ensure type match with backend/database
      const appointmentId = parseInt(id, 10);
      if (isNaN(appointmentId)) {
        alert("ID lịch hẹn không hợp lệ");
        return;
      }

      // Call real API endpoint to update appointment status with parsed integer ID
      await axios.patch(`http://localhost:3001/appointments/${appointmentId}`, { status: newStatus });
      
      // After successful API call, refetch appointments to get latest data from DB
      await fetchAppointments();
      
      // Optional: Show success message
      // alert("Cập nhật trạng thái thành công!");
    } catch (err) {
      console.error("Error updating appointment status:", err);
      // Improved error handling: show specific message for 404, general error otherwise
      if (err.response?.status === 404) {
        alert("Không tìm thấy lịch hẹn này");
      } else {
        alert(err.response?.data?.message || "Lỗi khi cập nhật trạng thái. Vui lòng thử lại.");
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        label: "Chờ xác nhận",
        className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      },
      confirmed: {
        label: "Đã xác nhận",
        className: "bg-green-500/20 text-green-400 border-green-500/30",
      },
      success: {
        label: "Đã xác nhận",
        className: "bg-green-500/20 text-green-400 border-green-500/30",
      },
      completed: {
        label: "Hoàn thành",
        className: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
      },
      cancelled: {
        label: "Đã hủy",
        className: "bg-red-500/20 text-red-400 border-red-500/30",
      },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span
        className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${config.className}`}
      >
        {config.label}
      </span>
    );
  };

  const toDateStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const now = new Date();
  const todayStr = toDateStr(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = toDateStr(tomorrow);

  const getDateFromISO = (iso) => {
    if (!iso) return "";
    const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return "";
    const [, y, m, d] = match;
    return `${y}-${m}-${d}`;
  };

  const getAptDateStr = (apt) => getDateFromISO(apt?.time);

  const filteredAppointments = appointments.filter((apt) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "today") return getAptDateStr(apt) === todayStr;
    if (filterStatus === "tomorrow") return getAptDateStr(apt) === tomorrowStr;
    if (filterStatus === "completed") return apt.status === "completed";
    return apt.status === filterStatus;
  });

  return (
    <div className="p-8 w-full">
      {/* HEADER: Tiêu đề | Doanh thu */}
      <div className="flex items-start justify-between mb-6">
        <div className="admin-title-box">
          <h1 className="text-3xl uppercase admin-title-text">QUẢN LÝ LỊCH HẸN</h1>
        </div>
        <div className="revenue-card flex-1 min-w-0">
          <p className="text-zinc-400 text-sm">Doanh thu</p>
          <p className="text-xl font-bold text-[#d4a441] mt-1">
            {revenueLoading ? "..." : `${(revenue ?? 0).toLocaleString("vi-VN")}đ`}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setRevenueFilter("day")}
              className={`px-3 py-1 rounded text-sm ${
                revenueFilter === "day" ? "bg-[#d4a441] text-black" : "bg-zinc-800 text-white"
              }`}
            >
              Ngày
            </button>
            <button
              onClick={() => setRevenueFilter("month")}
              className={`px-3 py-1 rounded text-sm ${
                revenueFilter === "month" ? "bg-[#d4a441] text-black" : "bg-zinc-800 text-white"
              }`}
            >
              Tháng
            </button>
          </div>
        </div>
      </div>

      {/* Filter + TABLE */}
      <div className="flex items-center justify-between mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#d4a441]"
        >
          <option value="all">Tất cả</option>
          <option value="today">Hôm nay</option>
          <option value="tomorrow">Ngày mai</option>
          <option value="completed">Đã hoàn thành</option>
        </select>
      </div>

      {/* TABLE - full width */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800">
        <table className="w-full table-fixed">
          <thead className="bg-zinc-800/50 border-b border-zinc-700">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider w-[14%]">
                Khách hàng
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider w-[11%]">
                Số điện thoại
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider w-[11%]">
                Thợ cắt tóc
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider w-[18%]">
                Dịch vụ
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider w-[10%]">
                Giá tiền
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider w-[11%]">
                Thời gian
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider w-[22%]">
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-3 py-6 text-center text-zinc-400 text-xs">
                  Đang tải...
                </td>
              </tr>
            ) : filteredAppointments.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-3 py-6 text-center text-zinc-400 text-xs">
                  Chưa có dữ liệu
                </td>
              </tr>
            ) : (
              filteredAppointments.map((appointment) => (
                <tr
                  key={appointment.id}
                  className="hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="px-3 py-3 text-xs font-medium text-white">
                    {appointment.customerName}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-zinc-300">
                    {appointment.customerPhone}
                  </td>
                  <td className="px-3 py-3 text-xs text-zinc-300">
                    {appointment.barberName}
                  </td>
                  <td className="px-3 py-3 text-xs text-zinc-300 break-words">
                    {formatServices(appointment.services)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-zinc-300">
                    {appointment.totalPrice != null
                      ? Number(appointment.totalPrice).toLocaleString("vi-VN") + "đ"
                      : "---"}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-zinc-300">
                    {formatTime(appointment.time)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-2">
                      {getStatusBadge(appointment.status)}
                      {appointment.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleStatusChange(appointment.id, "confirmed", appointment)
                            }
                            className="px-2 py-1 text-[11px] bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/30 transition-colors"
                          >
                            Xác nhận
                          </button>
                          <button
                            onClick={() =>
                              handleStatusChange(appointment.id, "cancelled", appointment)
                            }
                            className="px-2 py-1 text-[11px] bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      )}
                      {appointment.status === "confirmed" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleStatusChange(appointment.id, "completed", appointment)
                            }
                            className="px-2 py-1 text-[11px] bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-colors"
                          >
                            Hoàn thành
                          </button>
                          <button
                            onClick={() =>
                              handleStatusChange(appointment.id, "cancelled", appointment)
                            }
                            className="px-2 py-1 text-[11px] bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}