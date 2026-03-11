import { useState, useEffect } from "react";
import axios from "axios";
import API_BASE from "../../config";

const API_URL = `${API_BASE}/api/users`;

function formatDate(str) {
  if (!str) return "---";
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
  if (!m) return str;
  const [, y, mo, d, hh, mm] = m;
  return `${d}/${mo}/${y} ${hh}:${mm}`;
}

function getRoleLabel(role) {
  const r = (role || "").toLowerCase();
  if (r === "admin") return "Admin";
  if (r === "user" || r === "customer") return "Khách";
  return r || "---";
}

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ fullName: "", phone: "", role: "user" });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(API_URL);
      setUsers(res.data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err.response?.data?.message || err.message || "Không thể tải danh sách tài khoản.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setForm({
      fullName: user.fullName ?? user.FullName ?? "",
      phone: user.phone ?? user.Phone ?? "",
      role: (user.role ?? user.Role ?? "user").toLowerCase(),
    });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const payload = {
        FullName: form.fullName.trim(),
        Phone: form.phone.trim(),
        Role: form.role,
      };
      const res = await axios.put(`${API_URL}/${editingUser.id}`, payload);
      setUsers(users.map((u) => (u.id === editingUser.id ? res.data : u)));
      setShowModal(false);
      alert("Cập nhật thành công");
    } catch (err) {
      const msg = err.response?.data?.message || "Lỗi khi cập nhật";
      setError(msg);
      alert(msg);
    }
  };

  const handleDelete = async (user) => {
    const role = (user.role ?? user.Role ?? "").toLowerCase();
    if (role === "admin") {
      alert("Không được phép xóa tài khoản admin");
      return;
    }
    if (!confirm("Bạn có chắc muốn xoá tài khoản này?")) return;
    try {
      setError(null);
      await axios.delete(`${API_URL}/${user.id}`);
      setUsers(users.filter((u) => u.id !== user.id));
      alert("Xóa thành công");
    } catch (err) {
      const msg = err.response?.data?.message || "Lỗi khi xóa";
      setError(msg);
      alert(msg);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="admin-tab mb-6">Quản lý tài khoản</h1>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm flex flex-wrap items-center justify-between gap-2">
          <span>{error}</span>
          <div className="flex gap-2">
            <button onClick={fetchUsers} className="px-2 py-1 bg-zinc-700 rounded hover:bg-zinc-600 text-white text-xs">
              Thử lại
            </button>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-zinc-800/50 border-b border-zinc-700">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider w-14">
                  ID
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Họ tên
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Số điện thoại
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Vai trò
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Ngày tạo
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-zinc-400">
                    Đang tải...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-zinc-400">
                    Chưa có dữ liệu
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                      {user.id}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {user.fullName ?? user.FullName ?? "---"}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                      {user.email ?? user.Email ?? "---"}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                      {user.phone ?? user.Phone ?? "---"}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          (user.role ?? user.Role ?? "").toLowerCase() === "admin"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-zinc-600/30 text-zinc-300 border border-zinc-500/30"
                        }`}
                      >
                        {getRoleLabel(user.role ?? user.Role)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                      {formatDate(user.createdAt ?? user.CreatedAt)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(user)}
                        className="px-3 py-1.5 text-[#d4a441] hover:bg-[#d4a441]/20 rounded-lg transition-colors"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={(user.role ?? user.Role ?? "").toLowerCase() === "admin"}
                        className={`ml-2 px-3 py-1.5 rounded-lg transition-colors ${
                          (user.role ?? user.Role ?? "").toLowerCase() === "admin"
                            ? "text-zinc-500 cursor-not-allowed"
                            : "text-red-500 hover:bg-red-500/20"
                        }`}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal sửa */}
      {showModal && editingUser && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div
            className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-4">Chỉnh sửa tài khoản</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Họ tên</label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#d4a441]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
                <input
                  type="email"
                  value={editingUser.email ?? editingUser.Email ?? ""}
                  disabled
                  className="w-full px-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-500 cursor-not-allowed"
                />
                <p className="text-xs text-zinc-500 mt-1">Email không thể thay đổi</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Số điện thoại</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#d4a441]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Vai trò</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#d4a441]"
                >
                  <option value="user">Khách</option>
                  <option value="customer">Khách</option>
                  <option value="admin">Admin</option>
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
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
