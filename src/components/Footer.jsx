export default function Footer() {
  const scrollTo = (id) => () => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="bg-black border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-10 grid md:grid-cols-3 gap-14">

        {/* Brand */}
        <div>
          <h3 className="text-xl font-semibold mb-4 tracking-widest">
            MenZone <span className="gold">BARBERSHOP</span>
          </h3>
          <p className="text-gray-400 leading-relaxed max-w-sm">
            Nơi nghệ thuật cắt tóc truyền thống gặp gỡ phong cách hiện đại,
            mang đến trải nghiệm chỉnh chu cho quý ông.
          </p>
        </div>

        {/* Links + Contact */}
        <div>
          <h4 className="font-semibold mb-5 tracking-wide">Liên kết</h4>
          <ul className="space-y-3 text-gray-400">
            <li
              onClick={scrollTo("home")}
              className="cursor-pointer hover:text-[#d4a441] transition"
            >
              Trang Chủ
            </li>
            <li
              onClick={scrollTo("services")}
              className="cursor-pointer hover:text-[#d4a441] transition"
            >
              Dịch Vụ
            </li>
            <li
              onClick={scrollTo("booking")}
              className="cursor-pointer hover:text-[#d4a441] transition"
            >
              Đặt Lịch
            </li>
          </ul>

          {/* Contact */}
          <div className="mt-6 space-y-2">
            <p className="text-gray-400">
              <span className="text-gray-500">SĐT:</span>{" "}
              <span className="hover:text-[#d4a441] transition cursor-pointer">
                0865539759
              </span>
            </p>
            <p className="text-gray-400 leading-relaxed">
              <span className="text-gray-500">Địa chỉ:</span>{" "}
              84 Nguyễn Văn Cừ Nối Dài, An Bình, Ninh Kiều, Cần Thơ, Việt Nam
            </p>
          </div>
        </div>

        {/* Time */}
        <div>
          <h4 className="font-semibold mb-5 tracking-wide">
            Giờ Hoạt Động
          </h4>
          <p className="text-gray-400">Thứ 2 - Chủ Nhật</p>
          <p className="gold mt-2 tracking-widest">
            8:00 – 20:30
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-10">
        <div className="border-t border-white/10 my-8" />
      </div>

      {/* Copyright */}
      <div className="text-center text-gray-500 text-sm tracking-wide">
        © 2026 MenZone BARBERSHOP. All rights reserved.
      </div>
    </footer>
  );
}
