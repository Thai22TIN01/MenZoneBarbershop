import { useState, useEffect } from "react";
import axios from "axios";
import API_BASE from "../../config";

const API_URL = `${API_BASE}/api/barbers`;
const API_TOP_BARBERS = `${API_BASE}/api/barbers/top`;

export default function BarberManager() {
  const [barbers, setBarbers] = useState([]);
  const [topBarbers, setTopBarbers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingBarber, setEditingBarber] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    status: "active",
    image: null,
  });

  useEffect(() => {
    fetchBarbers();
    fetchTopBarbers();
  }, []);

  const fetchTopBarbers = async () => {
    try {
      const res = await axios.get(API_TOP_BARBERS);
      setTopBarbers(res.data || []);
    } catch (err) {
      console.error("Error fetching top barbers:", err);
      setTopBarbers([]);
    }
  };

  const fetchBarbers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(API_URL);
      setBarbers(res.data || []);
    } catch (err) {
      console.error("Error fetching barbers:", err);
      setError(err.response?.data?.message || "Không thể tải danh sách thợ. Vui lòng thử lại.");
      setBarbers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingBarber(null);
    setForm({ name: "", phone: "", status: "active", image: null });
    setImagePreview(null);
    setError(null);
    setShowModal(true);
  };

  const handleEdit = (barber) => {
    setEditingBarber(barber);
    const name = barber.BarberName ?? barber.name ?? "";
    const statusRaw = (barber.Status ?? barber.status ?? "active").toLowerCase();
    const status = statusRaw === "inactive" ? "inactive" : "active";
    setForm({
      name,
      phone: barber.Phone ?? barber.phone ?? "",
      status,
      image: barber.Image ?? barber.image ?? null,
    });
    setImagePreview(barber.Image ?? barber.image ?? null);
    setError(null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Bạn có chắc chắn muốn xóa thợ cắt tóc này?")) return;

    try {
      setError(null);
      await axios.delete(`${API_URL}/${id}`);
      setBarbers(barbers.filter((b) => b.id !== id));
      await fetchTopBarbers();
      alert("Xóa thành công");
    } catch (err) {
      const msg = err.response?.data?.message || "Lỗi khi xóa";
      setError(msg);
      alert(msg);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Vui lòng chọn file ảnh");
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Kích thước ảnh không được vượt quá 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setForm({ ...form, image: base64String });
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const payload = {
        name: form.name,
        phone: form.phone,
        status: form.status,
        image: form.image,
      };
      if (editingBarber) {
        const res = await axios.put(`${API_URL}/${editingBarber.id}`, payload);
        setBarbers(
          barbers.map((b) =>
            b.id === editingBarber.id ? res.data : b
          )
        );
        await fetchTopBarbers();
        alert("Cập nhật thành công");
      } else {
        const res = await axios.post(API_URL, payload);
        const newBarber = res.data;
        setBarbers([...barbers, newBarber]);
        await fetchTopBarbers();
        alert("Thêm thành công");
      }
      setShowModal(false);
      setImagePreview(null);
    } catch (err) {
      const msg = err.response?.data?.message || "Lỗi khi lưu";
      setError(msg);
      alert(msg);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    return s === "active" ? (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
        Đang làm việc
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
        Nghỉ việc
      </span>
    );
  };

  const getPlaceholderImage = () => {
    return (
      <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-500 text-lg font-semibold">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>
    );
  };

  const renderBarberImage = (image) => {
    if (image) {
      return (
        <img
          src={image}
          alt="Barber"
          className="w-12 h-12 rounded-full object-cover border-2 border-zinc-700"
        />
      );
    }
    return getPlaceholderImage();
  };

  const getBarberName = (b) => b.BarberName ?? b.name ?? "";
  const getBarberPhone = (b) => b.Phone ?? b.phone ?? "";
  const getBarberImage = (b) => b.Image ?? b.image ?? null;
  const getBarberStatus = (b) => b.Status ?? b.status ?? "Active";
  const getTodayAppointments = (b) => {
    const arr = b.todayAppointments ?? b.TodayAppointments ?? [];
    return Array.isArray(arr) ? arr : [];
  };
  const formatTime = (str) => {
    if (!str) return "---";
    const match = String(str).match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
    if (!match) return str;
    const [, y, m, d, hh, mm] = match;
    return `${hh}:${mm} ${d}/${m}/${y}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* HEADER: Tiêu đề + Top thợ */}
      <div className="flex flex-col lg:flex-row items-start justify-between gap-4 mb-6">
        <h1 className="admin-tab mb-0">Quản lý thợ cắt tóc</h1>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 w-full lg:w-[320px] shrink-0">
          <p className="text-zinc-400 mb-3 text-sm">Top thợ được đặt nhiều nhất</p>
          {topBarbers.length === 0 ? (
            <p className="text-zinc-500 text-sm">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-2">
              {topBarbers.map((b, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-white">{b.name}</span>
                  <span className="text-[#d4a441] font-medium">{b.count} lượt</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm flex flex-wrap items-center justify-between gap-2">
          <span>{error}</span>
          <div className="flex gap-2">
            <button
              onClick={() => { fetchBarbers(); fetchTopBarbers(); }}
              className="px-2 py-1 bg-zinc-700 rounded hover:bg-zinc-600 text-white text-xs"
            >
              Thử lại
            </button>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        <div className="mb-4 px-4 sm:px-6 pt-4">
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-[#d4a441] text-black font-medium rounded-lg hover:opacity-90 transition"
          >
            + Thêm thợ
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-zinc-800/50 border-b border-zinc-700">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider w-14">
                  ID
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider w-20">
                  Ảnh
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Tên thợ
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  SĐT
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-zinc-400">
                    Đang tải...
                  </td>
                </tr>
              ) : barbers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-zinc-400">
                    Chưa có dữ liệu
                  </td>
                </tr>
              ) : (
                barbers.map((barber) => (
                  <tr
                    key={barber.id}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                      {barber.id}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      {renderBarberImage(getBarberImage(barber))}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {getBarberName(barber)}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-300">{getBarberPhone(barber)}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(getBarberStatus(barber))}
                        {(() => {
                          const times = getTodayAppointments(barber)
                            .map(formatTime)
                            .filter(Boolean);
                          return times.length > 0 ? (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 w-fit">
                              Có lịch ({times.join(", ")})
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <span
                        onClick={() => handleEdit(barber)}
                        className="text-yellow-500 cursor-pointer hover:underline"
                      >
                        Sửa
                      </span>
                      <span className="mx-2 text-zinc-500">|</span>
                      <span
                        onClick={() => handleDelete(barber.id)}
                        className="text-red-500 cursor-pointer hover:underline"
                      >
                        Xóa
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div
            className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-4">
              {editingBarber ? "Sửa thợ cắt tóc" : "Thêm thợ cắt tóc"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Ảnh đại diện
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-20 h-20 rounded-full object-cover border-2 border-zinc-700"
                      />
                    ) : (
                      getPlaceholderImage()
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <div className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm hover:bg-zinc-700 transition-colors text-center">
                        {imagePreview ? "Đổi ảnh" : "Chọn ảnh"}
                      </div>
                    </label>
                    <p className="text-xs text-zinc-500 mt-1">
                      JPG, PNG (tối đa 5MB)
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Tên thợ
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#d4a441]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#d4a441]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Trạng thái
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#d4a441]"
                >
                  <option value="active">Đang làm việc</option>
                  <option value="inactive">Nghỉ việc</option>
                </select>
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
                  {editingBarber ? "Cập nhật" : "Thêm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
