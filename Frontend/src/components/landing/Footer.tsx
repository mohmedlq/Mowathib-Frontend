import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../common/BrandLogo';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#122B23] text-white border-t border-[#1E4638] pt-14 pb-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Top of dark footer section: Secondary Badge Logo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-[#1E4638]">
          <div className="space-y-2">
            <BrandLogo
              variant="secondary"
              className="h-[54px] w-auto object-contain"
              alt="شعار منصة مواظب - حضور منظم لبيئة تعليمية أفضل"
            />
            <p className="text-xs text-[#A3C7B9] font-medium max-w-md pt-1">
              حضور منظم.. لبيئة تعليمية أفضل — المنظومة الذكية لرصد الحضور والانضباط المدرسي.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-[#A3C7B9]">
            <Link to="/admin/login" className="hover:text-white transition-colors">
              لوحة الإدارة
            </Link>
            <span>•</span>
            <Link to="/representative/login" className="hover:text-white transition-colors">
              بوابة العرفاء
            </Link>
            <span>•</span>
            <a href="#hero" className="hover:text-white transition-colors">
              الرئيسية
            </a>
          </div>
        </div>

        {/* Footer Bottom Meta */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#718A80]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#3E9B78]" />
            <span>نظام مواظب المعتمد — متوافق مع لوائح الانضباط المدرسي 1446-1447هـ</span>
          </div>

          <div>
            <span>جميع الحقوق محفوظة لمنصة مواظب © {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
