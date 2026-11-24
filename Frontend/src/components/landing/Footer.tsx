import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../common/BrandLogo';
import { QuenricLogo } from '../common/QuenricLogo';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer
      dir="rtl"
      className="border-t border-[#1C3D30] bg-[#0B1C16] text-white"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Main 3-Column Brand & Navigation Row */}
        <div className="grid grid-cols-1 gap-10 border-b border-[#19362B] pb-10 lg:grid-cols-12">
          {/* Mowathib Brand */}
          <div className="space-y-3 lg:col-span-5">
            <BrandLogo
              variant="secondary"
              className="h-11 w-auto object-contain"
              alt="شعار منصة مواظب"
            />
            <p className="max-w-sm text-xs leading-6 text-[#9BBFB0]">
              منصة مواظب لإدارة الحضور والغياب المدرسي، وتوثيق إشعارات أولياء
              الأمور، وإصدار الكشوف الأسبوعية المعتمدة.
            </p>
          </div>

          {/* Direct Portal Links */}
          <div className="space-y-3 lg:col-span-3">
            <h3 className="text-xs font-extrabold tracking-wide text-[#7AD4A2]">
              بوابات الدخول
            </h3>
            <ul className="space-y-2.5 text-xs font-medium text-[#B9D5C8]">
              <li>
                <Link to="/admin/login" className="transition-colors hover:text-white">
                  لوحة إدارة المدرسة
                </Link>
              </li>
              <li>
                <Link to="/clerk/login" className="transition-colors hover:text-white">
                  بوابة مسجّل الحضور
                </Link>
              </li>
              <li>
                <Link to="/representative/login" className="transition-colors hover:text-white">
                  بوابة عرفاء الفصول
                </Link>
              </li>
            </ul>
          </div>

          {/* Dedicated QUENRIC Brand Showcase */}
          <div className="lg:col-span-4">
            <div className="flex h-full flex-col justify-between gap-4 rounded-xl border border-[#214738] bg-[#0F241D] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold tracking-wide text-[#84AE9C]">
                  تطوير وتشغيل
                </span>
                <span className="h-2 w-2 rounded-full bg-[#3E9B78]" aria-hidden="true" />
              </div>

              <div className="py-1">
                <QuenricLogo className="h-7 w-auto sm:h-8" />
              </div>

              <p className="text-[11px] leading-5 text-[#93B5A6]">
                أنظمة برمجية مصممة للعمل المؤسسي اليومي ببساطة وموثوقية عالية.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Legal & Compliance Meta */}
        <div className="flex flex-col items-center justify-between gap-4 pt-6 text-[11px] text-[#7B9A8D] sm:flex-row">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#3E9B78]" />
            <span>متوافق مع متطلبات متابعة الانضباط المدرسي للعام 1448–1449هـ</span>
          </div>

          <span>جميع الحقوق محفوظة لمنصة مواظب © {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;