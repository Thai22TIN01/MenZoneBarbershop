import { useState, useEffect } from "react";
import axios from "axios";

export default function AppointmentManager() {
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

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleStatusChange = async (id, newStatus, appointment) => {
    // Get confirmation message based on action with customer name and time
    let confirmMessage = "";
    const customerName = appointment?.customerName || "khách hàng";
    const appointmentTime = appointment?.time 
      ? formatDateTime(appointment.time) 
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
        className={`px-2.5 py-1 text-xs font-medium rounded-full border ${config.className}`}
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

  const getAptDateStr = (apt) => (apt?.time ? toDateStr(new Date(apt.time)) : "");

  const filteredAppointments = appointments.filter((apt) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "today") return getAptDateStr(apt) === todayStr;
    if (filterStatus === "tomorrow") return getAptDateStr(apt) === tomorrowStr;
    if (filterStatus === "completed") return apt.status === "completed";
    return apt.status === filterStatus;
  });

  return (
    <div className="p-8">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Quản lý lịch hẹn</h1>
        <div className="flex items-center gap-2">
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
      </div>

      {/* TABLE */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-800/50 border-b border-zinc-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Khách hàng
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Số điện thoại
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Thợ cắt tóc
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Thời gian
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-zinc-400">
                    Đang tải...
                  </td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-zinc-400">
                    Chưa có dữ liệu
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {appointment.customerName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-300">
                        {appointment.customerPhone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-300">
                        {appointment.barberName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-300">
                        {formatDateTime(appointment.time)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(appointment.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {appointment.status === "pending" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              handleStatusChange(appointment.id, "confirmed", appointment)
                            }
                            className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/30 transition-colors"
                          >
                            Xác nhận
                          </button>
                          <button
                            onClick={() =>
                              handleStatusChange(appointment.id, "cancelled", appointment)
                            }
                            className="px-3 py-1 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      )}
                      {appointment.status === "confirmed" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              handleStatusChange(appointment.id, "completed", appointment)
                            }
                            className="px-3 py-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-colors"
                          >
                            Hoàn thành
                          </button>
                          <button
                            onClick={() =>
                              handleStatusChange(appointment.id, "cancelled", appointment)
                            }
                            className="px-3 py-1 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      )}
                      {(appointment.status === "completed" ||
                        appointment.status === "cancelled") && (
                        <span className="text-zinc-500 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}