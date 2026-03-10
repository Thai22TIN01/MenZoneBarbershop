import { useState, useEffect } from "react";

const API_SERVICES = "http://localhost:3001/api/services";

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_SERVICES)
      .then((res) => res.json())
      .then((data) => setServices(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Error fetching services:", err);
        setServices([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="services" className="py-32 bg-black">
      <div className="max-w-7xl mx-auto px-10 text-center">
        <h2 className="text-5xl font-bold mb-6">
          Dịch Vụ <span className="gold">Cao Cấp</span>
        </h2>

        <p className="text-gray-400 max-w-2xl mx-auto mb-20">
          Chúng tôi mang đến những dịch vụ chăm sóc tóc chất lượng nhất,
          giúp quý ông luôn tự tin và phong độ.
        </p>

        {loading ? (
          <div className="py-12 text-gray-400">Đang tải...</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-10">
            {services.map((service) => (
              <div
                key={service.Id ?? service.id}
                className="border border-white/10 p-10 text-left"
              >
                <h3 className="text-2xl font-semibold mb-4">
                  {service.ServiceName ?? service.serviceName ?? "---"}
                </h3>
                <p className="text-gray-400 mb-10">
                  Dịch vụ chăm sóc tóc chuyên nghiệp
                </p>
                <div className="flex justify-between text-sm">
                  <span className="gold text-lg font-semibold">
                    {(service.Price ?? service.price ?? 0).toLocaleString("vi-VN")}đ
                  </span>
                  <span className="text-gray-500">
                    {service.Duration ?? service.duration ?? 0} phút
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
