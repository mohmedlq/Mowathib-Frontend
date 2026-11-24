
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
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">

        {/* ================================================================ */}
        {/*                         Main Footer Content                     */}
        {/* ================================================================ */}

        <div className="grid grid-cols-1 gap-9 border-b border-[#19362B] pb-9 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8 lg:pb-10">

          {/* ============================================================ */}
          {/*                         Mowathib Brand                       */}
          {/* ============================================================ */}

          <div className="space-y-4 sm:col-span-2 lg:col-span-5">
            <Link
              to="/"
              aria-label="الرئيسية - مواظب"
              className="inline-flex rounded-lg transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75D39B]"
            >
              <BrandLogo
                variant="secondary"
                className="h-11 w-auto object-contain"
                alt="شعار منصة مواظب"
              />
            </Link>

            <p className="max-w-sm text-xs leading-7 text-[#9BBFB0]">
              منصة مواظب لإدارة الحضور والغياب المدرسي، وتوثيق إشعارات أولياء
              الأمور، وإصدار الكشوف الأسبوعية المعتمدة.
            </p>
          </div>

          {/* ============================================================ */}
          {/*                         Portal Links                         */}
          {/* ============================================================ */}

          <div className="space-y-4 lg:col-span-3">
            <h3 className="text-xs font-extrabold text-[#7AD4A2]">
              بوابات الدخول
            </h3>

            <ul className="space-y-3 text-xs font-medium text-[#B9D5C8]">
              <li>
                <Link
                  to="/admin/login"
                  className="inline-block transition-colors hover:text-white"
                >
                  لوحة إدارة المدرسة
                </Link>
              </li>

              <li>
                <Link
                  to="/clerk/login"
                  className="inline-block transition-colors hover:text-white"
                >
                  بوابة مسجّل الحضور
                </Link>
              </li>

              <li>
                <Link
                  to="/representative/login"
                  className="inline-block transition-colors hover:text-white"
                >
                  بوابة عرفاء الفصول
                </Link>
              </li>
            </ul>
          </div>

          {/* ============================================================ */}
          {/*                          Quenric Brand                       */}
          {/* ============================================================ */}

          <div className="flex flex-col items-start space-y-4 lg:col-span-4">

            {/* Subtle Brand Label */}
            <span className="text-[10px] font-semibold tracking-wide text-[#8FAE9E]">
              التطوير التقني
            </span>

            {/* Quenric Logo */}
            <div className="flex min-h-[55px] items-center">
              <QuenricLogo
                autoTheme={false}
                className="h-10 w-auto max-w-full object-contain sm:h-12"
              />
            </div>

            {/* Brand Description */}
            <p className="max-w-xs text-xs leading-7 text-[#9BBFB0]">
              حلول برمجية متكاملة وأنظمة رقمية مصممة لبناء تجارب عملية
              وموثوقة.
            </p>

          </div>
        </div>

        {/* ================================================================ */}
        {/*                         Bottom Footer                            */}
        {/* ================================================================ */}

        <div className="flex flex-col items-start justify-between gap-4 pt-6 text-[11px] text-[#7B9A8D] sm:flex-row sm:items-center">

          {/* Compliance */}
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#3E9B78]" />

            <span className="leading-5">
              متوافق مع متطلبات متابعة الانضباط المدرسي للعام 1448–1449هـ
            </span>
          </div>

          {/* Copyright */}
          <span className="text-right">
            جميع الحقوق محفوظة لمنصة مواظب © {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
