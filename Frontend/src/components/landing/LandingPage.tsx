import React from 'react';
import { Header } from './Header';
import { HeroSection } from './HeroSection';
import { PlatformPreviewSection } from './PlatformPreviewSection';
import { CtaBanner } from './CtaBanner';
import { Footer } from './Footer';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] dark:bg-[#0D1E18] text-[#122B23] dark:text-[#F4F8F6] selection:bg-[#0B5D43] selection:text-white transition-colors duration-200">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <PlatformPreviewSection />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
