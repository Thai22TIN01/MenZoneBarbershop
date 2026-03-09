import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { flushSync } from "react-dom";

const services = [
  { name: "Cắt Tóc Nam", price: 70000, duration: 30 },
  { name: "Uốn Tóc", price: 150000, duration: 60 },
  { name: "Nhuộm Tóc", price: 200000, duration: 60 },
];

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

// Helper: kiểm tra slot có sớm hơn (now + 1h) không
const isBeforeOneHourFromNow = (dateStr, timeStr) => {
  const slot = createDateTime(dateStr, timeStr);
  if (!slot) return false;
  const now = new Date();
  const minAllowed = new Date(now.getTime() + 60 * 60 * 1000);
  return slot < minAllowed;
};

export default function Booking({ onNext, disabled = false, initialData = null }) {
  const navigate = useNavigate();
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const dateRef = useRef(null);

  // Hydrate state from initialData prop when component mounts or when returning to booking step
  useEffect(() => {
    if (initialData) {
      // Map service names back to service objects
      if (initialData.services && Array.isArray(initialData.services)) {
        const hydratedServices = initialData.services
          .map(serviceName => services.find(s => s.name === serviceName))
          .filter(Boolean); // Remove any undefined values
        setSelectedServices(hydratedServices);
      }
      
      if (initialData.date) {
        setSelectedDate(initialData.date);
      }
      
      if (initialData.time) {
        setSelectedTime(initialData.time);
      }
    } else {
      // Reset state when initialData is null/undefined
      setSelectedServices([]);
      setSelectedDate("");
      setSelectedTime("");
    }
  }, [initialData]);

  const toggleService = (service) => {
    setSelectedServices((prev) =>
      prev.find((s) => s.name === service.name)
        ? prev.filter((s) => s.name !== service.name)
        : [...prev, service]
    );
  };

  const totalTime = selectedServices.reduce((t, s) => t + s.duration, 0);
  const totalPrice = selectedServices.reduce((t, s) => t + s.price, 0);

  // isComplete chỉ dùng để hiển thị UI (disabled state), không dùng để validation
  const isComplete =
    selectedServices.length > 0 && selectedDate && selectedTime;

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

      // Validation - chỉ return nếu thiếu dữ liệu
      if (!hasServices || !hasDate || !hasTime) {
        alert("Vui lòng điền đầy đủ thông tin đặt lịch");
        return;
      }

      // Validation thời gian thực: chỉ cho phép đặt sau thời điểm hiện tại ít nhất 1 giờ
      if (isBeforeOneHourFromNow(currentDate, currentTime)) {
        alert("Thời gian đặt lịch phải sau thời điểm hiện tại ít nhất 1 giờ. Vui lòng chọn lại.");
        return;
      }

      // Tạo bookingData từ state hiện tại
      const bookingData = {
        services: currentServices.map(s => s.name),
        date: currentDate,
        time: currentTime,
        duration: currentTotalTime,
        price: currentTotalPrice,
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
              const slotDisabled = isBeforeOneHourFromNow(selectedDate, t);
              return (
                <button
                  key={t}
                  onClick={() =>
                    !disabled && !slotDisabled && setSelectedTime(t)
                  }
                  disabled={disabled || slotDisabled}
                  className={`border px-3 py-2 text-xs lg:text-sm transition
                  ${
                    selectedTime === t && !slotDisabled
                      ? "bg-[#d4a441] text-black"
                      : "border-white/20 text-white"
                  }
                  ${
                    disabled || slotDisabled
                      ? "cursor-not-allowed opacity-40"
                      : "hover:border-[#d4a441]"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
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
