import { useState, useEffect, useRef } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import Booking from "../components/Booking";
import CustomerInfo from "../components/CustomerInfo";
import EmailVerification from "../components/EmailVerification";
import DepositPayment from "../components/DepositPayment";
import EmailConfirmationSent from "../components/EmailConfirmationSent";
import VnpayPayment from "../components/VnpayPayment";
import axios from "axios";

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState("booking"); // 'booking', 'customer', 'emailSent', 'verification', 'payment', 'success
  const [bookingData, setBookingData] = useState(null);
  const [emailVerificationData, setEmailVerificationData] = useState(null);
  // Ref để track xem đã mount lần đầu chưa (chỉ restore khi mount lần đầu)
  const hasMountedRef = useRef(false);

  // Đảm bảo khi vào trang /booking luôn ở đúng đầu trang, không bị giữ lại vị trí scroll cũ
  useEffect(() => {
    if (location.pathname === "/booking") {
      // Tắt cơ chế tự restore scroll của trình duyệt cho lần render này
      const prevScrollRestoration = window.history.scrollRestoration;
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }

      // Đặt lại scroll về top, áp dụng cho mọi trường hợp
      const scrollToTop = () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      };

      // Gọi ngay khi mount
      scrollToTop();
      // Gọi lại sau một frame để "đè" lên mọi auto-scroll khác (nếu có)
      requestAnimationFrame(scrollToTop);

      // Khôi phục lại cấu hình cũ khi rời trang
      return () => {
        if ("scrollRestoration" in window.history) {
          window.history.scrollRestoration = prevScrollRestoration;
        }
      };
    }
  }, [location.pathname]);

  // useEffect chỉ chạy khi mount hoặc searchParams thay đổi
  // Chỉ restore state từ localStorage khi mount lần đầu hoặc có searchParams đặc biệt
  useEffect(() => {
    // Check if user came from successful confirmation redirect
    const confirmed = searchParams.get("confirmed");
    if (confirmed === "true") {
      hasMountedRef.current = true;
      // Avoid synchronous setState inside effect (eslint rule)
      queueMicrotask(() => setCurrentStep("success"));
      // Clear booking data after successful confirmation
      localStorage.removeItem("bookingData");
      localStorage.removeItem("paymentData");
      localStorage.removeItem("emailToVerify");
      localStorage.removeItem("emailVerified");
      return;
    }

    // Check if user came from email verification link (old flow)
    const token = searchParams.get("token");
    const emailParam = searchParams.get("email");

    if (token && emailParam) {
      hasMountedRef.current = true;
      // User clicked email verification link
      // Avoid synchronous setState inside effect (eslint rule)
      queueMicrotask(() => {
        setCurrentStep("verification");
        setEmailVerificationData({
          email: emailParam,
          token: token,
        });
      });
      return;
    }

    // QUAN TRỌNG: Chỉ restore state từ localStorage khi mount lần đầu (chưa mount)
    // Sau khi mount lần đầu, không restore nữa để tránh override state khi click TIẾP TỤC
    if (hasMountedRef.current) {
      return; // Đã mount rồi, không restore nữa
    }

    // Đánh dấu đã mount lần đầu
    hasMountedRef.current = true;

    // Restore state từ localStorage khi mount lần đầu (không có searchParams đặc biệt)
    // Restore bookingData bất kể có customer hay không (bao gồm cả services/date/time only)
    const savedData = localStorage.getItem("bookingData");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        
        // Xác định step dựa trên dữ liệu đã có
        if (parsed.customer && parsed.appointmentId) {
          // Đã tạo booking và có appointmentId -> chỉ show payment nếu chưa thanh toán
          (async () => {
            try {
              const res = await axios.get("http://localhost:3001/appointments");
              const list = res.data || [];
              const appointment = list.find((a) => Number(a.Id) === Number(parsed.appointmentId));
              const rawStatus = appointment?.Status ?? appointment?.status;
              const normalizedStatus =
                typeof rawStatus === "string" ? rawStatus.trim().toLowerCase() : "";

              // If we can't find the appointment, don't keep stale cached flow
              if (!appointment) {
                localStorage.removeItem("bookingData");
                localStorage.removeItem("paymentData");
                localStorage.removeItem("emailToVerify");
                localStorage.removeItem("emailVerified");
                setBookingData(null);
                setCurrentStep("booking");
                return;
              }

              // Treat these statuses as already paid/finished so user can book again
              if (["success", "paid", "completed"].includes(normalizedStatus)) {
                // Đã thanh toán rồi -> xóa data cũ, cho user đặt lịch mới
                localStorage.removeItem("bookingData");
                localStorage.removeItem("paymentData");
                localStorage.removeItem("emailToVerify");
                localStorage.removeItem("emailVerified");
                setBookingData(null);
                setCurrentStep("booking");
                return;
              }

              // NEW: If payment is still pending, start a fresh booking (do not restore old payment page)
              if (normalizedStatus === "pending") {
                localStorage.removeItem("bookingData");
                localStorage.removeItem("paymentData");
                localStorage.removeItem("emailToVerify");
                localStorage.removeItem("emailVerified");
                setBookingData(null);
                setCurrentStep("booking");
                return;
              }
              setBookingData(parsed);
              setCurrentStep("payment");
            } catch (err) {
              console.error("Error checking appointment status:", err);
              // If we can't verify status, prefer starting fresh instead of forcing user back to payment
              localStorage.removeItem("bookingData");
              localStorage.removeItem("paymentData");
              localStorage.removeItem("emailToVerify");
              localStorage.removeItem("emailVerified");
              setBookingData(null);
              setCurrentStep("booking");
            }
          })();
          return;
        }

        // Avoid synchronous setState inside effect (eslint rule)
        const next = (() => {
          if (parsed.customer && parsed.verificationToken) {
            return {
              step: "verification",
              emailVerificationData: {
                email: parsed.customer.email,
                verificationLink: `http://localhost:5173/verify-email?token=${parsed.verificationToken}&email=${encodeURIComponent(
                  parsed.customer.email
                )}`,
                token: parsed.verificationToken,
              },
            };
          }

          if (parsed.customer) {
            const emailVerified = localStorage.getItem("emailVerified") === "true";
            const emailToVerify = localStorage.getItem("emailToVerify");
            return {
              step: emailVerified && emailToVerify === parsed.customer.email ? "payment" : "customer",
            };
          }

          if (parsed.services && parsed.date && parsed.time) {
            return { step: "booking" };
          }

          return {};
        })();

        queueMicrotask(() => {
          setBookingData(parsed);
          if (next.emailVerificationData) {
            setEmailVerificationData(next.emailVerificationData);
          }
          if (next.step) {
            setCurrentStep(next.step);
          }
        });
        // Nếu không có dữ liệu hợp lệ, giữ nguyên step mặc định "booking"
      } catch (err) {
        console.error("Error parsing booking data:", err);
      }
    }
  }, [searchParams]); // CHỈ phụ thuộc vào searchParams

  const handleBookingNext = (bookingDataFromComponent) => {
    // Validate và lấy bookingData từ callback
    if (!bookingDataFromComponent) {
      alert("Không tìm thấy thông tin đặt lịch. Vui lòng điền đầy đủ thông tin.");
      return;
    }

    const parsed = bookingDataFromComponent;
    
    // Validate required fields
    if (!parsed.services || parsed.services.length === 0) {
      alert("Vui lòng chọn ít nhất một dịch vụ");
      return;
    }
    
    if (!parsed.date) {
      alert("Vui lòng chọn ngày");
      return;
    }
    
    if (!parsed.time) {
      alert("Vui lòng chọn giờ");
      return;
    }
    
    // Update state, save to localStorage, and change step (go to customer info)
    setBookingData(parsed);
    localStorage.setItem("bookingData", JSON.stringify(parsed));
    setCurrentStep("customer");
  };

  const handleCustomerBack = () => {
    setCurrentStep("booking");
  };

  const handleEmailSent = () => {
    // Sau khi submit thông tin khách hàng, cập nhật bookingData từ localStorage
    const savedData = localStorage.getItem("bookingData");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setBookingData(parsed);
      } catch (err) {
        console.error("Error parsing booking data after email sent:", err);
      }
    }

    // Lưu email để hiển thị nếu cần và chuyển sang bước thanh toán (VNPAY)
    setCurrentStep("payment");
  };

  const handleEmailVerified = async () => {
    // Verify with backend
    try {
      const savedData = localStorage.getItem("bookingData");
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.customer && parsed.customer.email) {
          const response = await axios.post(
            "http://localhost:3001/api/booking/check-verification",
            { email: parsed.customer.email }
          );

          if (response.data.verified) {
            setCurrentStep("payment");
          } else {
            alert("Email chưa được xác nhận. Vui lòng kiểm tra lại.");
          }
        }
      }
    } catch (err) {
      console.error("Error checking verification:", err);
      alert("Lỗi khi kiểm tra trạng thái xác nhận email.");
    }
  };

  const handleResendEmail = async () => {
    const savedData = localStorage.getItem("bookingData");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.customer && parsed.customer.email) {
          // For logged-in users, we may not have fullName and phone
          // Use empty strings or get from localStorage if available
          const email = parsed.customer.email;
          const fullName = parsed.customer.fullName || "";
          const phone = parsed.customer.phone || "";

          const response = await axios.post(
            "http://localhost:3001/api/booking/send-verification",
            {
              email: email,
              fullName: fullName,
              phone: phone,
              bookingData: parsed,
            }
          );

          const updatedBookingData = {
            ...parsed,
            verificationToken: response.data.token,
          };

          localStorage.setItem("bookingData", JSON.stringify(updatedBookingData));
          localStorage.setItem("emailToVerify", email);
          localStorage.setItem("emailVerified", "false");

          setEmailVerificationData({
            email: email,
            verificationLink: response.data.verificationLink,
            token: response.data.token,
          });

          alert("Đã gửi lại email xác nhận!");
        }
      } catch (err) {
        alert(err.response?.data?.message || "Lỗi khi gửi lại email");
      }
    }
  };

  const handlePaymentBack = () => {
    // Quay lại bước nhập thông tin khách hàng
    setCurrentStep("customer");
  };

  const handleComplete = async () => {
    // Verify email is confirmed before allowing payment
    try {
      const savedData = localStorage.getItem("bookingData");
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.customer && parsed.customer.email) {
          const response = await axios.post(
            "http://localhost:3001/api/booking/check-verification",
            { email: parsed.customer.email }
          );

          if (!response.data.verified) {
            alert("Vui lòng xác nhận email trước khi hoàn tất đặt lịch.");
            setCurrentStep("verification");
            return;
          }
        }
      }

      console.log("Booking completed successfully!");
      // Clear verification data
      localStorage.removeItem("emailVerificationToken");
      localStorage.removeItem("emailToVerify");
      alert("Đặt lịch thành công! Chúng tôi sẽ liên hệ với bạn sớm nhất.");
    } catch (err) {
      console.error("Error completing booking:", err);
      alert("Lỗi khi hoàn tất đặt lịch. Vui lòng thử lại.");
    }
  };

  return (
    <div className="pt-24 bg-black text-white min-h-screen">
      {/* Booking component LUÔN render, chỉ ẩn bằng CSS khi không ở step booking */}
      <div className={currentStep !== "booking" ? "hidden" : ""}>
        <div className="max-w-5xl mx-auto px-6 mb-4">
          <h1
            id="booking-heading"
            className="text-3xl lg:text-4xl font-bold mb-3 tracking-tight"
          >
            Đặt Lịch <span className="gold">Cắt Tóc</span>
          </h1>
          <p className="text-gray-400 text-sm lg:text-base max-w-3xl">
            Vui lòng chọn dịch vụ, ngày và giờ phù hợp để chúng tôi phục vụ bạn tốt nhất.
          </p>
        </div>
        <Booking onNext={handleBookingNext} initialData={bookingData} />
      </div>

      {/* Các step khác render chồng phía dưới hoặc thay thế UI */}
      {currentStep === "customer" && (
        <div className="relative z-10">
          <CustomerInfo
            bookingData={bookingData}
            onBack={handleCustomerBack}
            onEmailSent={handleEmailSent}
          />
        </div>
      )}

      {currentStep === "success" && (
        <div className="relative z-10 pt-24 bg-black text-white min-h-screen">
          <div className="max-w-4xl mx-auto px-10">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
              <div className="mb-8 flex justify-center">
                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-4 text-green-400">
                Đặt lịch thành công!
              </h2>
              <p className="text-gray-300 text-lg mb-8">
                Đặt lịch của bạn đã được xác nhận thành công.
              </p>
              <p className="text-gray-400 mb-8">
                Chúng tôi sẽ liên hệ với bạn sớm nhất để xác nhận lại.
              </p>
              <button
                onClick={() => navigate("/")}
                className="px-8 py-3 bg-[#d4a441] text-black rounded-lg hover:bg-[#c49431] transition-colors font-semibold"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      )}

      {currentStep === "verification" && emailVerificationData && (
        <div className="relative z-10">
          <EmailVerification
            email={emailVerificationData.email}
            verificationLink={emailVerificationData.verificationLink}
            onVerified={handleEmailVerified}
            onResend={handleResendEmail}
          />
        </div>
      )}

      {currentStep === "payment" && bookingData && (
        <div className="relative z-10">
          <VnpayPayment
            bookingData={bookingData}
            onBack={handlePaymentBack}
            onSuccess={handleComplete}
            onFailure={(message) => {
              console.error("VNPAY payment failed:", message);
              alert(message || "Thanh toán VNPAY thất bại. Vui lòng thử lại.");
            }}
          />
        </div>
      )}
    </div>
  );
}
