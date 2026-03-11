import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { flushSync } from "react-dom";

import API_BASE from "../config";

const API_SERVICES = `${API_BASE}/api/services`;
const API_BARBERS = `${API_BASE}/api/barbers`;
const API_BOOKING = `${API_BASE}/api/booking`;

const times = [
  "08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00","18:30",
  "19:00","19:30","20:00",
];

// Helper: tạo đối tượng Date từ ngày (YYYY-MM-DD) và giờ (HH:mm) theo giờ local
const createDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }
  return new Date(year, month - 1, day, hour, minute, 0, 0);
};

// Helper: lấy giờ hiện tại theo timezone VN (Asia/Ho_Chi_Minh)
const getNowInVietnam = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "0";
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    hour: parseInt(get("hour"), 10),
    minute: parseInt(get("minute"), 10),
  };
};

// Helper: kiểm tra slot có bị disable không (quá khứ / đã qua)
// - Nếu ngày chọn KHÔNG phải hôm nay → tất cả giờ enabled
// - Nếu ngày chọn là hôm nay: min slot = now + 30 phút, làm tròn lên slot 30p tiếp theo
const isTimeSlotDisabled = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return false;

  const nowVN = getNowInVietnam();
  const [year, month, day] = dateStr.split("-").map(Number);
  const [slotHour, slotMinute] = timeStr.split(":").map(Number);

  // Ngày chọn khác hôm nay → không giới hạn
  if (year !== nowVN.year || month !== nowVN.month || day !== nowVN.day) {
    return false;
  }

  // Hôm nay: min slot = now + 30 phút, làm tròn lên slot 30p tiếp theo
  const currentMinutes = nowVN.hour * 60 + nowVN.minute;
  const minAllowedMinutes = currentMinutes + 30;
  const minSlotMinutes = Math.ceil(minAllowedMinutes / 30) * 30;

  const slotMinutes = slotHour * 60 + slotMinute;
  return slotMinutes < minSlotMinutes;
};

export default function Booking({ onNext, disabled = false, initialData = null }) {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedBarberId, setSelectedBarberId] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [barbersLoading, setBarbersLoading] = useState(true);
  const [occupiedSlots, setOccupiedSlots] = useState([]);
  const [occupiedBarberIds, setOccupiedBarberIds] = useState([]);
  const dateRef = useRef(null);

  useEffect(() => {
    fetch(API_SERVICES)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setServices(
          list.map((s) => ({
            id: s.Id ?? s.id,
            name: s.ServiceName ?? s.serviceName ?? "",
            price: parseInt(s.Price ?? s.price, 10) || 0,
            duration: parseInt(s.Duration ?? s.duration, 10) || 0,
          }))
        );
      })
      .catch((err) => {
        console.error("Error fetching services:", err);
        setServices([]);
      })
      .finally(() => setServicesLoading(false));
  }, []);

  useEffect(() => {
    fetch(API_BARBERS)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setBarbers(
          list
            .filter((b) => {
              const status = (b.Status ?? b.status ?? "Active").toLowerCase();
              return status === "active";
            })
            .map((b) => ({
              id: b.id ?? b.Id,
              BarberName: b.BarberName ?? b.name ?? "",
              Phone: b.Phone ?? b.phone ?? "",
            }))
            .filter((b) => b.id && b.BarberName)
        );
      })
      .catch((err) => {
        console.error("Error fetching barbers:", err);
        setBarbers([]);
      })
      .finally(() => setBarbersLoading(false));
  }, []);

  // Hydrate state from initialData prop when component mounts or when returning to booking step
  useEffect(() => {
    if (initialData) {
      // Map service names back to service objects (requires services to be loaded)
      if (initialData.services && Array.isArray(initialData.services) && services.length > 0) {
        const hydratedServices = initialData.services
          .map((serviceName) => services.find((s) => s.name === serviceName))
          .filter(Boolean);
        setSelectedServices(hydratedServices);
      }
      if (initialData.date) setSelectedDate(initialData.date);
      if (initialData.time) setSelectedTime(initialData.time);
      if (initialData.barberId != null) {
        setSelectedBarberId(initialData.barberId);
      }
    } else {
      setSelectedServices([]);
      setSelectedDate("");
      setSelectedTime("");
      setSelectedBarberId(null);
    }
  }, [initialData, services]);

  // Khi đổi ngày: clear giờ đã chọn nếu giờ đó không còn hợp lệ (vd: đổi sang hôm nay)
  useEffect(() => {
    if (selectedDate && selectedTime && isTimeSlotDisabled(selectedDate, selectedTime)) {
      setSelectedTime("");
    }
  }, [selectedDate]);

  // Lấy các khung giờ thợ đã có lịch khi chọn thợ + ngày
  useEffect(() => {
    if (!selectedBarberId || !selectedDate) {
      setOccupiedSlots([]);
      return;
    }
    fetch(`${API_BARBERS}/${selectedBarberId}/occupied-slots?date=${selectedDate}`)
      .then((res) => res.json())
      .then((data) => {
        const slots = Array.isArray(data) ? data : [];
        setOccupiedSlots(slots);
        if (selectedTime && slots.includes(selectedTime)) {
          setSelectedTime("");
        }
      })
      .catch(() => setOccupiedSlots([]));
  }, [selectedBarberId, selectedDate]);

  // Lấy thợ đã có lịch trùng [time, time+duration) (để làm mờ thợ không chọn được)
  const totalTime = selectedServices.reduce((t, s) => t + s.duration, 0);
  useEffect(() => {
    if (!selectedDate || !selectedTime) {
      setOccupiedBarberIds([]);
      return;
    }
    const timePart = String(selectedTime).slice(0, 5);
    const dur = totalTime || 30;
    fetch(`${API_BOOKING}/occupied-barbers?date=${selectedDate}&time=${timePart}&duration=${dur}`)
      .then((res) => res.json())
      .then((data) => {
        const ids = Array.isArray(data) ? data.map((id) => Number(id)).filter((n) => !isNaN(n)) : [];
        setOccupiedBarberIds(ids);
        if (selectedBarberId && ids.includes(Number(selectedBarberId))) {
          setSelectedBarberId(null);
        }
      })
      .catch(() => setOccupiedBarberIds([]));
  }, [selectedDate, selectedTime, totalTime]);

  const toggleService = (service) => {
    setSelectedServices((prev) =>
      prev.find((s) => s.name === service.name)
        ? prev.filter((s) => s.name !== service.name)
        : [...prev, service]
    );
  };

  const totalPrice = selectedServices.reduce((t, s) => t + s.price, 0);

  // isComplete chỉ dùng để hiển thị UI (disabled state), không dùng để validation
  const isComplete =
    selectedServices.length > 0 && selectedDate && selectedTime && selectedBarberId != null;

  const handleDatePickerOpen = (e) => {
    if (!disabled) {
      e.stopPropagation();
      e.preventDefault();
      console.log("Date input clicked - opening picker");
      dateRef.current?.showPicker();
    }
  };

  const handleConfirm = (e) => {
    // Stop event propagation to prevent interference from date picker
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    try {
      // Tính toán từ state hiện tại để đảm bảo dữ liệu mới nhất
      const currentServices = selectedServices;
      const currentDate = selectedDate;
      const currentTime = selectedTime;
      const currentTotalTime = currentServices.reduce((t, s) => t + s.duration, 0);
      const currentTotalPrice = currentServices.reduce((t, s) => t + s.price, 0);

      // Validation trực tiếp từ state hiện tại
      const hasServices = currentServices.length > 0;
      const hasDate = currentDate && currentDate.trim() !== "";
      const hasTime = currentTime && currentTime.trim() !== "";
      const hasBarber = selectedBarberId != null;

      // Validation - chỉ return nếu thiếu dữ liệu
      if (!hasServices || !hasDate || !hasTime || !hasBarber) {
        alert("Vui lòng điền đầy đủ thông tin đặt lịch (dịch vụ, ngày, giờ, thợ cắt tóc)");
        return;
      }

      // Validation thời gian thực: giờ phải >= now + 30 phút (phút=0) hoặc + 1 tiếng (phút>0)
      if (isTimeSlotDisabled(currentDate, currentTime)) {
        alert("Thời gian đặt lịch phải sau thời điểm hiện tại ít nhất 30 phút (giờ chẵn) hoặc 1 tiếng (giờ lẻ). Vui lòng chọn lại.");
        return;
      }

      // Tạo bookingData từ state hiện tại
      const bookingData = {
        services: currentServices.map(s => s.name),
        date: currentDate,
        time: currentTime,
        duration: currentTotalTime,
        price: currentTotalPrice,
        barberId: selectedBarberId,
      };

      console.log("handleConfirm: bookingData created:", bookingData);
      console.log("handleConfirm: about to call onNext");

      // Gọi onNext với flushSync để force immediate state update
      if (onNext && typeof onNext === "function") {
        localStorage.setItem("bookingData", JSON.stringify(bookingData));

        // Use flushSync to force immediate state update, bypassing React batching
        flushSync(() => {
          console.log("handleConfirm: calling onNext with bookingData:", bookingData);
          onNext(bookingData);
        });

        console.log("handleConfirm: onNext call completed");

        // Sau khi chuyển sang bước tiếp theo (trang /booking hoặc form khách hàng),
        // luôn đưa viewport về đầu trang để không bị giữ lại vị trí scroll cũ.
        const scrollToTop = () => {
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        };
        // Gọi ngay và gọi lại trong frame tiếp theo để chắc chắn ghi đè mọi auto-scroll khác
        scrollToTop();
        requestAnimationFrame(scrollToTop);
      } else {
        // Fallback: Nếu không có onNext (trang Home), lưu và navigate
        console.warn("handleConfirm: onNext not provided, falling back to navigate('/booking')");
        localStorage.setItem("bookingData", JSON.stringify(bookingData));
        navigate("/booking");
      }
    } catch (error) {
      console.error("handleConfirm error:", error);
      alert("Đã xảy ra lỗi khi xử lý đặt lịch. Vui lòng thử lại.");
    }
  };

  return (
    <section
      id="booking"
      className={`pt-2 pb-10 bg-black ${
        disabled ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <div className="max-w-5xl mx-auto px-6">

        {/* 1. Chọn dịch vụ */}
        <div className="mb-10">
          <h3 className="text-xl lg:text-2xl font-semibold mb-6">
            1. Chọn Dịch Vụ (có thể chọn nhiều)
          </h3>

          {servicesLoading ? (
            <div className="py-8 text-center text-gray-400">Đang tải dịch vụ...</div>
          ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {services.map((s) => {
              const active = selectedServices.find(x => x.name === s.name);

              return (
                <div
                  key={s.name}
                  onClick={() => !disabled && toggleService(s)}
                  className={`relative border p-6 transition-all
                    ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                    ${active ? "border-[#d4a441]" : "border-white/10"}
                    ${!disabled ? "hover:border-[#d4a441]" : ""}`}
                >
                  {active && (
                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full
                      bg-black border border-[#d4a441] flex items-center justify-center">
                      <span className="text-[#d4a441] text-sm">✓</span>
                    </div>
                  )}

                  <h4 className="text-lg lg:text-xl font-semibold mb-1.5">
                    {s.name}
                  </h4>
                  <p className="gold mb-0.5 text-sm lg:text-base">
                    {s.price.toLocaleString()}đ
                  </p>
                  <p className="text-gray-500 text-xs lg:text-sm">
                    {s.duration} phút
                  </p>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* 2. Chọn ngày */}
        <div className="mb-10">
          <h3 className="text-xl lg:text-2xl font-semibold mb-6">
            2. Chọn Ngày
          </h3>
          <div className="flex items-center gap-2 max-w-3xl mx-auto">
            <input
              ref={dateRef}
              id="booking-date-input"
              type="date"
              value={selectedDate}
              onChange={(e) => !disabled && setSelectedDate(e.target.value)}
              onClick={(e) => {
                // Prevent default click behavior - picker opens via button instead
                e.stopPropagation();
                e.preventDefault();
                console.log("Date input clicked");
              }}
              onFocus={(e) => {
                // Stop focus event from bubbling
                e.stopPropagation();
              }}
              onBlur={(e) => {
                // Stop blur event from bubbling to prevent interference
                e.stopPropagation();
              }}
              disabled={disabled}
              min={new Date().toISOString().split("T")[0]}
              aria-label="Chọn ngày đặt lịch"
              title="Chọn ngày đặt lịch"
              className={`flex-1 bg-black border border-white/20 px-4 py-3 text-sm lg:text-base text-white text-center ${
                disabled ? "cursor-not-allowed opacity-50" : "cursor-text"
              }`}
            />
            <button
              type="button"
              onClick={handleDatePickerOpen}
              disabled={disabled}
              aria-label="Mở lịch chọn ngày"
              title="Mở lịch chọn ngày"
              className={`px-3 py-3 border border-white/20 text-white hover:border-[#d4a441] transition-colors ${
                disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              }`}
            >
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* 3. Chọn giờ */}
        <div className="mb-10">
          <h3 className="text-xl lg:text-2xl font-semibold mb-6">
            3. Chọn Giờ
          </h3>

          <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
            {times.map((t) => {
              const slotDisabled = isTimeSlotDisabled(selectedDate, t);
              const slotOccupied = selectedBarberId && occupiedSlots.includes(t);
              const isDisabled = slotDisabled || slotOccupied;
              return (
                <button
                  key={t}
                  onClick={() =>
                    !disabled && !isDisabled && setSelectedTime(t)
                  }
                  disabled={disabled || isDisabled}
                  title={slotOccupied ? "Thợ đã có lịch vào khung giờ này" : ""}
                  className={`border px-3 py-2 text-xs lg:text-sm transition
                  ${
                    selectedTime === t && !isDisabled
                      ? "bg-[#d4a441] text-black"
                      : isDisabled
                        ? "border-white/10 text-gray-500 bg-gray-700 opacity-50 cursor-not-allowed"
                        : "border-white/20 text-white"
                  }
                  ${
                    disabled || isDisabled
                      ? "cursor-not-allowed opacity-50"
                      : "hover:border-[#d4a441]"
                  }`}
                >
                  {t}
                  {slotOccupied && (
                    <span className="block text-[10px] text-red-400 mt-0.5">Đã đặt</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Chọn thợ cắt tóc */}
        <div className="mb-10">
          <h3 className="text-xl lg:text-2xl font-semibold mb-6">
            4. Chọn Thợ Cắt Tóc
          </h3>

          {barbersLoading ? (
            <div className="py-6 text-center text-gray-400">Đang tải danh sách thợ...</div>
          ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {barbers.map((barber) => {
              const name = barber.BarberName ?? barber.name ?? "";
              const phone = barber.Phone ?? barber.phone ?? "";
              const isSelected = selectedBarberId === barber.id;
              const isOccupied = selectedDate && selectedTime && occupiedBarberIds.includes(Number(barber.id));
              const isDisabled = disabled || isOccupied;
              return (
                <div
                  key={barber.id}
                  onClick={() => !isDisabled && setSelectedBarberId(barber.id)}
                  title={isOccupied ? "Thợ đã có lịch vào khung giờ này" : ""}
                  className={`relative border p-4 transition-all
                    ${isDisabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}
                    ${isOccupied ? "opacity-50 grayscale" : ""}
                    ${isSelected ? "border-[#d4a441] bg-[#d4a441]/10" : "border-white/10 opacity-70 hover:border-[#d4a441]/60"}
                    ${!isDisabled ? "hover:opacity-100" : ""}`}
                >
                  {isOccupied && (
                    <span className="absolute top-2 right-2 text-[10px] text-red-400 font-medium">Đã có lịch</span>
                  )}
                  {isSelected && !isOccupied && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#d4a441] flex items-center justify-center">
                      <span className="text-black text-xs">✓</span>
                    </div>
                  )}
                  <h4 className="text-sm lg:text-base font-semibold text-white mb-1">
                    {name}
                  </h4>
                  <p className="text-gray-400 text-xs">{phone}</p>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* Thông tin */}
        <div className="border border-[#d4a441]/40 p-6">
          <h3 className="text-lg lg:text-xl font-semibold mb-4">
            Thông Tin Đặt Lịch
          </h3>

          <p className="mb-1.5 text-sm lg:text-base">
            <span className="text-gray-400">Dịch vụ:</span>{" "}
            <span className="gold">
              {selectedServices.map(s => s.name).join(", ") || "---"}
            </span>
          </p>

          <p className="mb-1.5 text-sm lg:text-base">
            <span className="text-gray-400">Ngày:</span>{" "}
            <span className="gold">{selectedDate || "---"}</span>
          </p>

          <p className="mb-1.5 text-sm lg:text-base">
            <span className="text-gray-400">Giờ:</span>{" "}
            <span className="gold">{selectedTime || "---"}</span>
          </p>

          <p className="mb-1.5 text-sm lg:text-base">
            <span className="text-gray-400">Thợ cắt tóc:</span>{" "}
            <span className="gold">
              {selectedBarberId != null
                ? (barbers.find((b) => b.id === selectedBarberId)?.BarberName ??
                    barbers.find((b) => b.id === selectedBarberId)?.name ??
                    "---")
                : "---"}
            </span>
          </p>

          <p className="mb-1.5 text-sm lg:text-base">
            <span className="text-gray-400">Tổng thời gian:</span>{" "}
            <span className="gold">{totalTime} phút</span>
          </p>

          <p className="mb-6 text-sm lg:text-base">
            <span className="text-gray-400">Tổng chi phí:</span>{" "}
            <span className="gold">{totalPrice.toLocaleString()}đ</span>
          </p>

          <button
            type="button"
            disabled={!isComplete || disabled}
            onClick={(e) => {
              // Isolate button click event completely
              e.stopPropagation();
              e.preventDefault();
              console.log("Button clicked - handleConfirm starting");
              handleConfirm(e);
            }}
            onMouseDown={(e) => {
              // Stop mousedown from bubbling to prevent interference
              if (!disabled && isComplete) {
                e.stopPropagation();
              }
            }}
            onPointerDown={(e) => {
              // Ensure button click works even if date picker is interfering
              if (!disabled && isComplete) {
                e.stopPropagation();
              }
            }}
            className={`w-full py-4 text-sm lg:text-base font-semibold tracking-[0.2em] transition
              ${
                isComplete && !disabled
                  ? "bg-[#d4a441] text-black hover:brightness-110"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed"
              }`}
          >
            TIẾP TỤC
          </button>
        </div>
      </div>
    </section>
  );
}
