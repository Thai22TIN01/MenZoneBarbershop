import { useState, useEffect } from "react";
import axios from "axios";
import API_BASE from "../../config";

const API_SERVICES = `${API_BASE}/api/services`;
const API_TOP_SERVICES = `${API_BASE}/api/services/top`;

export default function ServiceManager({ className = "" }) {
  const [services, setServices] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [form, setForm] = useState({
    ServiceName: "",
    Price: "",
    Duration: "",
  });

  useEffect(() => {
    fetchServices();
    fetchTopServices();
  }, []);

  const fetchTopServices = async () => {
    try {
      const res = await axios.get(API_TOP_SERVICES);
      setTopServices(res.data || []);
    } catch (err) {
      console.error("Error fetching top services:", err);
      setTopServices([]);
    }
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(API_SERVICES);
      setServices(res.data || []);
    } catch (err) {
      console.error("Error fetching services:", err);
      setError(err.response?.data?.message || "Không thể tải danh sách dịch vụ. Vui lòng thử lại.");
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchServices();
    fetchTopServices();
  };

  const handleAdd = () => {
    setEditingService(null);
    setForm({ ServiceName: "", Price: "", Duration: "" });
    setError(null);
    setShowModal(true);
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setForm({
      ServiceName: service.ServiceName ?? service.serviceName ?? "",
      Price: String(service.Price ?? service.price ?? ""),
      Duration: String(service.Duration ?? service.duration ?? ""),
    });
    setError(null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa dịch vụ này?")) return;
    try {
      setError(null);
      await axios.delete(`${API_SERVICES}/${id}`);
      await fetchServices();
      alert("Xóa thành công");
    } catch (err) {
      const msg = err.response?.data?.message || "Lỗi khi xóa";
      setError(msg);
      alert(msg);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const payload = {
        ServiceName: form.ServiceName.trim(),
        Price: parseInt(form.Price, 10) || 0,
        Duration: parseInt(form.Duration, 10) || 0,
      };
      if (editingService) {
        await axios.put(`${API_SERVICES}/${editingService.Id ?? editingService.id}`, payload);
        await fetchServices();
        alert("Cập nhật thành công");
      } else {
        await axios.post(API_SERVICES, payload);
        await fetchServices();
        await fetchTopServices();
        alert("Thêm thành công");
      }
      setShowModal(false);
    } catch (err) {
      const msg = err.response?.data?.message || "Lỗi khi lưu";
      setError(msg);
      alert(msg);
    }
  };

  const formatPrice = (price) => {
    const n = parseFloat(price);
    return Number.isNaN(n) ? "---" : n.toLocaleString("vi-VN") + "đ";
  };

  return (
    <div className={`flex flex-col h-full p-8 ${className}`.trim()}>
      {/* Header: Quản lý dịch vụ + nút hành động */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="admin-title-box mb-6 inline-block">
          <h1 className="text-3xl uppercase admin-title-text">QUẢN LÝ DỊCH VỤ</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            Làm mới
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-[#d4a441] text-black font-medium rounded-lg hover:bg-[#c49431] transition-colors"
          >
            Thêm dịch vụ
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center justify-between flex-shrink-0">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hai cột: Top dịch vụ | Bảng dịch vụ - chiều cao bằng nhau */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 items-stretch">
        {/* Bên trái: Card Top dịch vụ */}
        <div className="w-full lg:w-[30%] shrink-0 lg:h-full">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 lg:h-full flex flex-col">
            <p className="text-zinc-400 text-sm mb-3">Top dịch vụ tháng này</p>
            {topServices.length === 0 ? (
              <p className="text-zinc-500 text-sm">Chưa có dữ liệu</p>
            ) : (
              <div className="space-y-3">
                {topServices.map((service, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-white">{service.name}</span>
                    <span className="text-[#d4a441] font-medium">{service.count} lượt</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bên phải: Bảng quản lý dịch vụ */}
        <div className="flex-1 flex flex-col min-h-0 lg:h-full">
          <div className="overflow-y-auto flex-1 min-h-0">
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden h-full">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-800/50 border-b border-zinc-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider w-14">
                  Id
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Tên dịch vụ
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Giá
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Thời lượng
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-zinc-400">
                    Đang tải...
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-zinc-400">
                    Chưa có dữ liệu
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr
                    key={service.Id ?? service.id}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                      {service.Id ?? service.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {service.ServiceName ?? service.serviceName ?? "---"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-300">
                        {formatPrice(service.Price ?? service.price)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-300">
                        {service.Duration ?? service.duration ?? "---"} phút
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(service)}
                          className="text-[#d4a441] hover:text-[#c49431] transition-colors"
                        >
                          Sửa
                        </button>
                        <span className="text-zinc-600">|</span>
                        <button
                          onClick={() => handleDelete(service.Id ?? service.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
      </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div
            className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-4">
              {editingService ? "Sửa dịch vụ" : "Thêm dịch vụ"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Tên dịch vụ
                </label>
                <input
                  type="text"
                  required
                  value={form.ServiceName}
                  onChange={(e) => setForm({ ...form, ServiceName: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#d4a441]"
                  placeholder="VD: Cắt tóc nam"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Giá (VNĐ)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.Price}
                  onChange={(e) => setForm({ ...form, Price: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#d4a441]"
                  placeholder="70000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Thời lượng (phút)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.Duration}
                  onChange={(e) => setForm({ ...form, Duration: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#d4a441]"
                  placeholder="30"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#d4a441] text-black rounded-lg hover:bg-[#c49431] transition-colors font-medium"
                >
                  {editingService ? "Cập nhật" : "Thêm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
