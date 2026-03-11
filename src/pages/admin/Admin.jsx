import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import BarberManager from "./BarberManager";
import AppointmentManager from "./AppointmentManager";
import ServiceManager from "./ServiceManager";
import Revenue from "./Revenue";
import Dashboard from "./Dashboard";
import UserManager from "./UserManager";

const menuItems = [
  { id: "dashboard", path: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "appointments", path: "appointments", label: "Lịch hẹn", icon: "📅" },
  { id: "barbers", path: "barbers", label: "Thợ cắt tóc", icon: "✂️" },
  { id: "services", path: "services", label: "Dịch vụ", icon: "💈" },
  { id: "revenue", path: "revenue", label: "Doanh thu", icon: "💰" },
  { id: "users", path: "users", label: "Tài khoản", icon: "👤" },
];

export default function Admin() {
  return (
    <div className="flex h-screen pt-20 bg-zinc-950 text-white overflow-hidden">
      {/* SIDEBAR */}
      <aside className="sticky top-20 left-0 z-40 w-48 h-[calc(100vh-5rem)] shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-6 border-b border-zinc-800 flex-shrink-0">
          <h2 className="text-lg font-bold text-[#d4a441]">Dashboard</h2>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.id}
              to={`/admin/${item.path}`}
              end={item.path === "dashboard"}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? "bg-[#d4a441] text-black shadow-lg" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto">
        <Routes>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="appointments" element={<AppointmentManager />} />
          <Route path="barbers" element={<BarberManager />} />
          <Route path="services" element={<ServiceManager />} />
          <Route path="revenue" element={<Revenue />} />
          <Route path="users" element={<UserManager />} />
        </Routes>
      </main>
    </div>
  );
}
