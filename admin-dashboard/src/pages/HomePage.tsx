import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// ─── SVG Vectors and Icons ───
const StoreIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const ScooterIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="18" r="3" />
    <path d="M6 18h12" />
    <path d="M18 18V9h-4" />
    <path d="M8 8h3v10" />
    <path d="M12 5h4" />
  </svg>
);

const ChartIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const ShieldIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 11 11 13 15 9" />
  </svg>
);

const WalletIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
    <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
    <path d="M18 12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4v-6h-4z" />
  </svg>
);

const MapPinIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const BellIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const SpeedometerIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="landing-root">
      {/* Premium CSS Stylesheet */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;600;700;800&display=swap');

        .landing-root {
          font-family: 'Readex Pro', sans-serif;
          direction: rtl;
          background-color: #FFFFFF;
          color: #222222;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          scroll-behavior: smooth;
        }

        .landing-root * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .landing-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* ── Header ── */
        .landing-header {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
          padding: 16px 0;
        }

        .header-wrap {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo-img {
          height: 44px;
          object-fit: contain;
          cursor: pointer;
        }

        .nav-menu {
          display: flex;
          gap: 32px;
          align-items: center;
        }

        .nav-link {
          color: #64748b;
          font-weight: 600;
          text-decoration: none;
          font-size: 14.5px;
        }

        .nav-link:hover {
          color: #B1124D;
        }

        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        /* ── Buttons ── */
        .btn-brand-primary {
          background: #B1124D;
          color: #FFFFFF;
          font-weight: 700;
          font-size: 14px;
          padding: 12px 28px;
          border-radius: 50px;
          border: none;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(177, 18, 77, 0.2);
        }

        .btn-brand-primary:hover {
          background: #D81B60;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(177, 18, 77, 0.3);
        }

        .btn-brand-outline {
          background: transparent;
          color: #222222;
          font-weight: 600;
          font-size: 14px;
          padding: 12px 26px;
          border-radius: 50px;
          border: 1.5px solid #e2e8f0;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .btn-brand-outline:hover {
          background: #F8F8F8;
          transform: translateY(-2px);
        }

        /* ── Premium App Store & Google Play Badges ── */
        .premium-badge-btn {
          background: #000000;
          color: #FFFFFF;
          border-radius: 12px;
          padding: 10px 20px;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          border: 1px solid rgba(255, 255, 255, 0.15);
          text-align: right;
          cursor: pointer;
        }

        .premium-badge-btn:hover {
          background: #1c1c1e;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        .badge-btn-text {
          display: flex;
          flex-direction: column;
        }

        .badge-subtitle {
          font-size: 9px;
          opacity: 0.7;
          font-weight: 400;
        }

        .badge-title {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        /* ── Hero Section ── */
        .hero-section {
          padding: 100px 0 120px;
          background: radial-gradient(circle at 80% 20%, rgba(255, 214, 226, 0.25) 0%, rgba(255, 255, 255, 0) 60%);
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 60px;
          align-items: center;
        }

        .hero-title {
          font-size: 56px;
          font-weight: 800;
          color: #222222;
          line-height: 1.2;
          margin-bottom: 24px;
        }

        .hero-title span {
          color: #B1124D;
        }

        .hero-desc {
          font-size: 18px;
          color: #64748b;
          line-height: 1.8;
          margin-bottom: 40px;
          max-width: 520px;
        }

        .hero-buttons {
          display: flex;
          gap: 16px;
        }

        /* ── 3D Isometric CSS Hero Illustration ── */
        .hero-illustration-container {
          position: relative;
          width: 100%;
          height: 480px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .iso-scene {
          position: relative;
          width: 380px;
          height: 380px;
          transform: rotateX(55deg) rotateZ(-45deg);
          transform-style: preserve-3d;
        }

        .iso-plane {
          position: absolute;
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.9);
          border: 2px dashed rgba(177, 18, 77, 0.15);
          border-radius: 36px;
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.05);
        }

        .logo-sphere {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) translateZ(40px);
          width: 90px;
          height: 90px;
          background: #FFFFFF;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.02);
          animation: sphereFloat 4s ease-in-out infinite;
        }

        .logo-sphere img {
          width: 58px;
          height: 58px;
          object-fit: contain;
        }

        @keyframes sphereFloat {
          0%, 100% { transform: translate(-50%, -50%) translateZ(40px); }
          50% { transform: translate(-50%, -50%) translateZ(60px); }
        }

        .iso-card {
          position: absolute;
          background: rgba(255, 255, 255, 0.92);
          border-radius: 16px;
          padding: 12px 18px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 13px;
          color: #222222;
        }

        .iso-card.restaurant {
          top: 10%;
          left: 10%;
          transform: translateZ(80px);
          animation: cardFloat 5s ease-in-out infinite;
        }

        .iso-card.driver {
          bottom: 15%;
          right: 5%;
          transform: translateZ(90px);
          animation: cardFloat 6s ease-in-out infinite 0.5s;
        }

        .iso-card.tracking {
          top: 20%;
          right: 10%;
          transform: translateZ(100px);
          animation: cardFloat 5.5s ease-in-out infinite 1s;
        }

        .iso-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #FFD6E2;
          color: #B1124D;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @keyframes cardFloat {
          0%, 100% { transform: translateY(0) translateZ(80px); }
          50% { transform: translateY(-10px) translateZ(95px); }
        }

        /* ── Platform Ecosystem (Connected Illustration) ── */
        .ecosystem-section {
          padding: 100px 0;
          background: #F8F8F8;
        }

        .eco-wrap {
          display: flex;
          justify-content: space-around;
          align-items: center;
          gap: 30px;
          margin-top: 60px;
          position: relative;
          flex-wrap: wrap;
        }

        .eco-card {
          background: #FFFFFF;
          border-radius: 28px;
          padding: 40px 32px;
          width: 320px;
          text-align: center;
          border: 1px solid rgba(0, 0, 0, 0.03);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02);
          position: relative;
          z-index: 2;
        }

        .eco-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(177, 18, 77, 0.06);
        }

        .eco-badge {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background: #FFD6E2;
          color: #B1124D;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }

        .eco-title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .eco-desc {
          font-size: 14.5px;
          color: #64748b;
          line-height: 1.7;
        }

        .central-cloud {
          background: #B1124D;
          color: #FFFFFF;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          box-shadow: 0 10px 30px rgba(177, 18, 77, 0.3);
          z-index: 3;
          position: relative;
        }

        /* ── Features Grid Illustration ── */
        .features-section {
          padding: 100px 0;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 30px;
          margin-top: 60px;
        }

        .feature-card {
          background: #FFFFFF;
          border: 1.5px solid #F8F8F8;
          border-radius: 24px;
          padding: 32px;
        }

        .feature-card:hover {
          border-color: #FFD6E2;
          transform: translateY(-6px);
          box-shadow: 0 15px 35px rgba(177, 18, 77, 0.04);
        }

        .feature-icon-circle {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: rgba(177, 18, 77, 0.05);
          color: #B1124D;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        /* ── Workflow Diagram (How It Works) ── */
        .workflow-section {
          padding: 100px 0;
          background: #F8F8F8;
        }

        .flow-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 60px;
          position: relative;
          flex-wrap: wrap;
          gap: 20px;
        }

        .flow-step {
          background: #FFFFFF;
          border-radius: 20px;
          padding: 24px;
          width: 220px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02);
          position: relative;
          z-index: 2;
        }

        .flow-step-num {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #FFD6E2;
          color: #B1124D;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }

        .flow-step-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .flow-step-desc {
          font-size: 13px;
          color: #64748b;
          line-height: 1.6;
        }

        .flow-arrow-svg {
          position: absolute;
          top: 50%;
          left: 0;
          width: 100%;
          height: 40px;
          z-index: 1;
          pointer-events: none;
        }

        /* ── App Mockups Showcase ── */
        .mockup-section {
          padding: 100px 0;
        }

        .mockup-wrap {
          display: flex;
          justify-content: center;
          gap: 40px;
          margin-top: 60px;
          flex-wrap: wrap;
        }

        .css-phone {
          width: 260px;
          height: 500px;
          background: #111;
          border-radius: 40px;
          border: 8px solid #222;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.15);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .css-phone:hover {
          transform: translateY(-12px) scale(1.02);
        }

        .phone-notch {
          width: 110px;
          height: 20px;
          background: #222;
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
        }

        .phone-screen {
          flex: 1;
          background: #FFFFFF;
          padding: 24px 16px 16px;
          display: flex;
          flex-direction: column;
          font-family: inherit;
        }

        .screen-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          font-weight: 700;
          font-size: 11px;
          color: #64748b;
        }

        .mock-card {
          background: #F8F8F8;
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 10px;
          border: 1px solid rgba(0, 0, 0, 0.02);
        }

        .mock-title {
          font-size: 12px;
          font-weight: 700;
          color: #222222;
          margin-bottom: 4px;
        }

        .mock-txt {
          font-size: 10px;
          color: #64748b;
        }

        .mock-btn {
          background: #B1124D;
          color: #FFFFFF;
          border-radius: 8px;
          padding: 8px;
          font-size: 11px;
          font-weight: 700;
          text-align: center;
          margin-top: auto;
        }

        /* ── Partners & Testimonials Section ── */
        .partners-section {
          padding: 100px 0;
          background: #FFFFFF;
        }

        .testimonial-card {
          background: #F8F8F8;
          border-radius: 32px;
          padding: 50px;
          display: flex;
          align-items: center;
          gap: 40px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(0, 0, 0, 0.01);
          text-align: right;
          margin-top: 50px;
        }

        .testimonial-author-side {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 220px;
          text-align: center;
        }

        .testimonial-logo-container {
          width: 120px;
          height: 120px;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
          background: #FFFFFF;
          border: 2px solid #FFFFFF;
          margin-bottom: 16px;
        }

        .testimonial-logo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .testimonial-stars {
          color: #FFB800;
          font-size: 18px;
          margin-bottom: 8px;
        }

        .testimonial-author-name {
          font-size: 15px;
          font-weight: 700;
          color: #222222;
        }

        .testimonial-author-title {
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
        }

        .testimonial-content-side {
          flex: 1;
          position: relative;
        }

        .testimonial-quote-icon {
          font-size: 80px;
          color: #FFD6E2;
          line-height: 1;
          position: absolute;
          top: -40px;
          right: -10px;
          opacity: 0.8;
          user-select: none;
        }

        .testimonial-quote-text {
          font-size: 18px;
          font-weight: 600;
          color: #222222;
          line-height: 1.8;
          position: relative;
          z-index: 2;
          margin-bottom: 24px;
        }

        /* ── Download CTA ── */
        .download-section {
          padding: 80px 0;
        }

        .download-box {
          background: #FFD6E2;
          border-radius: 36px;
          padding: 80px 60px;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          align-items: center;
          gap: 40px;
          overflow: hidden;
          position: relative;
        }

        .download-mockup-wrapper {
          display: flex;
          justify-content: center;
          position: relative;
        }

        /* ── FAQ ── */
        .faq-section {
          padding: 100px 0;
          background: #F8F8F8;
        }

        .faq-list {
          max-width: 800px;
          margin: 60px auto 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .faq-item {
          background: #FFFFFF;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.02);
        }

        .faq-question {
          padding: 24px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .faq-answer {
          padding: 0 24px 24px;
          font-size: 14.5px;
          color: #64748b;
          line-height: 1.7;
          display: none;
        }

        .faq-item.active .faq-answer {
          display: block;
        }

        /* ── Baghdad Skyline ── */
        .baghdad-skyline-container {
          width: 100%;
          height: 180px;
          background: #0f172a;
          position: relative;
          overflow: hidden;
          border-top: 1px solid #1e293b;
        }

        /* ── Footer ── */
        .landing-footer {
          background: #0f172a;
          color: #94a3b8;
          padding: 80px 0 30px;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr;
          gap: 60px;
          margin-bottom: 60px;
        }

        .footer-logo {
          height: 48px;
          margin-bottom: 24px;
        }

        .footer-desc {
          font-size: 14px;
          line-height: 1.8;
          max-width: 320px;
        }

        .footer-title {
          color: #FFFFFF;
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 24px;
        }

        .footer-links {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .footer-links a {
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
        }

        .footer-links a:hover {
          color: #FFFFFF;
        }

        .footer-bottom {
          border-top: 1px solid #1e293b;
          padding-top: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13.5px;
        }

        /* ── Animations ── */
        .animate-on-scroll {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }

        .animate-on-scroll.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .eco-wrap {
            flex-direction: column;
            gap: 40px;
          }
          .mockup-wrap {
            gap: 20px;
          }
          .download-box {
            grid-template-columns: 1fr;
            padding: 40px;
            text-align: center;
          }
          .download-buttons {
            justify-content: center;
          }
        }

        @media (max-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 40px;
          }
          .hero-title {
            font-size: 40px;
          }
          .hero-desc {
            margin: 0 auto 30px;
          }
          .hero-buttons {
            justify-content: center;
          }
          .nav-menu {
            display: none;
          }
          .flow-container {
            flex-direction: column;
            gap: 40px;
          }
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
        }
      ` }} />

      {/* Sticky Navigation Bar */}
      <header className="landing-header">
        <div className="landing-container header-wrap">
          <img src="/logo_remove_bg.png" alt="تيم السند" className="logo-img" onClick={() => navigate('/home')} />
          <nav className="nav-menu">
            <a href="#home" className="nav-link">الرئيسية</a>
            <a href="#features" className="nav-link">المميزات</a>
            <a href="#how-it-works" className="nav-link">كيف نعمل</a>
            <a href="#partners" className="nav-link">الشركاء</a>
            <a href="#faq" className="nav-link">الأسئلة الشائعة</a>
            <a href="#contact" className="nav-link">اتصل بنا</a>
          </nav>
          <div className="header-actions">
            {user ? (
              <button onClick={() => navigate('/')} className="btn-brand-outline">📊 لوحة التحكم</button>
            ) : (
              <button onClick={() => navigate('/login')} className="btn-brand-outline">🔑 تسجيل الدخول</button>
            )}
            <a href="#download" className="btn-brand-primary">حمل التطبيق</a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="hero-section">
        <div className="landing-container hero-grid">
          <div className="animate-on-scroll">
            <h1 className="hero-title">
              توصيل <span>أسرع</span><br />
              دعم <span>أقوى</span>
            </h1>
            <p className="hero-desc">
              تيم السند هو منصة توصيل لوجستية عراقية ذكية، تربط بين المطاعم التي لا تمتلك كباتن توصيل وشبكة واسعة من كباتن التوصيل المستقلين لتوفير سرعة توصيل وجودة فائقة.
            </p>
            <div className="hero-buttons">
              <a href="#download" className="btn-brand-primary">📥 حمل التطبيق</a>
              <a href="#contact" className="btn-brand-outline">💬 تواصل معنا</a>
            </div>
          </div>

          {/* Premium 3D Isometric Hero Illustration */}
          <div className="hero-illustration-container animate-on-scroll">
            <div className="iso-scene">
              <div className="iso-plane"></div>
              {/* Central Logo Sphere */}
              <div className="logo-sphere">
                <img src="/logo_remove_bg.png" alt="تيم السند" />
              </div>
              {/* Floating Cards */}
              <div className="iso-card restaurant">
                <div className="iso-icon-wrap"><StoreIcon size={16} /></div>
                تطبيق المطعم
              </div>
              <div className="iso-card driver">
                <div className="iso-icon-wrap"><ScooterIcon size={16} /></div>
                تطبيق الكابتن
              </div>
              <div className="iso-card tracking">
                <div className="iso-icon-wrap"><MapPinIcon size={16} /></div>
                تتبع الطلب المباشر
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Ecosystem (Connected Illustration) */}
      <section className="ecosystem-section">
        <div className="landing-container">
          <div className="section-header animate-on-scroll">
            <span className="section-tag">هيكل المنصة</span>
            <h2 className="section-title">دورة لوجستية متكاملة وسحابية</h2>
          </div>

          <div className="eco-wrap animate-on-scroll">
            <div className="eco-card">
              <div className="eco-badge"><StoreIcon size={28} /></div>
              <h3 className="eco-title">تطبيق المطعم</h3>
              <p className="eco-desc">يرفع طلبات التوصيل بالدقة والأسعار الجغرافية وعناوين العملاء المحددة بالأحياء.</p>
            </div>

            <div className="central-cloud">☁️</div>

            <div className="eco-card">
              <div className="eco-badge"><ScooterIcon size={28} /></div>
              <h3 className="eco-title">تطبيق الكابتن</h3>
              <p className="eco-desc">يستقبل إشعارات البث الفوري، ويسحب العمولات، ويتتبع الطلبات بخرائط جوجل المباشرة.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Illustration */}
      <section id="features" className="features-section">
        <div className="landing-container">
          <div className="section-header animate-on-scroll">
            <span className="section-tag">المميزات</span>
            <h2 className="section-title">تكنولوجيا متكاملة مصممة لأجلك</h2>
          </div>

          <div className="feature-grid animate-on-scroll">
            <div className="feature-card">
              <div className="feature-icon-circle"><SpeedometerIcon size={24} /></div>
              <h3 className="feature-title">سرعة فائقة</h3>
              <p className="feature-desc">استجابة وبث ذكي فوري لأقرب السائقين لتقليص مدة التسليم.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-circle"><MapPinIcon size={24} /></div>
              <h3 className="feature-title">نظام الـ GPS</h3>
              <p className="feature-desc">خرائط متكاملة للمناطق لتوجيه الكباتن مباشرة لعناوين العملاء.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-circle"><WalletIcon size={24} /></div>
              <h3 className="feature-title">المحفظة الذكية</h3>
              <p className="feature-desc">خصم مباشر لرسوم التوصيل، وشحن فوري بالأكواد المحمية.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-circle"><BellIcon size={24} /></div>
              <h3 className="feature-title">إشعارات البث</h3>
              <p className="feature-desc">إشعار فوري وتنبيهات لحظية للكباتن بالطلبات المتاحة فوراً.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-circle"><ShieldIcon size={24} /></div>
              <h3 className="feature-title">الأمان والموثوقية</h3>
              <p className="feature-desc">تشفير كامل لكافة المدفوعات والعمليات المالية والحسابات الرقمية للمطاعم والكباتن.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (Logistics Workflow) */}
      <section id="how-it-works" className="workflow-section">
        <div className="landing-container">
          <div className="section-header animate-on-scroll">
            <span className="section-tag">آلية العمل</span>
            <h2 className="section-title">كيف يتم شحن وتوصيل الطلب؟</h2>
          </div>

          <div className="flow-container animate-on-scroll">
            <div className="flow-step">
              <div className="flow-step-num">1</div>
              <h4 className="flow-step-title">إنشاء الطلب</h4>
              <p className="flow-step-desc">المطعم يسجل العنوان وقيمة الطلب ويرسله للسحابة اللوجستية.</p>
            </div>
            <div className="flow-step">
              <div className="flow-step-num">2</div>
              <h4 className="flow-step-title">السحابة الذكية</h4>
              <p className="flow-step-desc">يقوم النظام ببث إشعار الكابتن الأقرب جغرافياً ممن لديهم رصيد محفظة كافٍ.</p>
            </div>
            <div className="flow-step">
              <div className="flow-step-num">3</div>
              <h4 className="flow-step-title">كابتن السند</h4>
              <p className="flow-step-desc">يقبل السائق الطلب، يستلمه نقداً ويتوجه للموقع باستعمال توجيه الخرائط.</p>
            </div>
            <div className="flow-step">
              <div className="flow-step-num">4</div>
              <h4 className="flow-step-title">العميل يستلم</h4>
              <p className="flow-step-desc">يسلم الطلب للعميل بنجاح ويخصم النظام الرسوم تلقائياً من محفظته.</p>
            </div>
          </div>
        </div>
      </section>

      {/* App Mockups Showcase */}
      <section className="mockup-section">
        <div className="landing-container">
          <div className="section-header animate-on-scroll">
            <span className="section-tag">واجهات التطبيقات</span>
            <h2 className="section-title">تطبيقات ذكية بأعلى درجات التنسيق البصري</h2>
          </div>

          <div className="mockup-wrap animate-on-scroll">
            {/* Phone 1: Restaurant */}
            <div className="css-phone">
              <div className="phone-notch"></div>
              <div className="phone-screen">
                <div className="screen-header">
                  <span>تيم السند للمطاعم</span>
                  <span>📶 94%</span>
                </div>
                <div className="mock-card" style={{ borderRight: '4px solid #B1124D' }}>
                  <div className="mock-title">طلب توصيل جديد</div>
                  <div className="mock-txt">الزبون: الكرادة - ساحة الواثق</div>
                  <div className="mock-txt">الحساب: 25,000 د.ع</div>
                </div>
                <div className="mock-card">
                  <div className="mock-title">رصيد المحفظة</div>
                  <div className="mock-txt" style={{ color: '#B1124D', fontWeight: 'bold' }}>150,000 د.ع</div>
                </div>
                <div className="mock-btn">إرسال كابتن ⚡</div>
              </div>
            </div>

            {/* Phone 2: Driver */}
            <div className="css-phone">
              <div className="phone-notch"></div>
              <div className="phone-screen">
                <div className="screen-header">
                  <span>تيم السند كابتن</span>
                  <span>📶 98%</span>
                </div>
                <div className="mock-card" style={{ background: '#FFD6E2' }}>
                  <div className="mock-title" style={{ color: '#B1124D' }}>طلب قادم! 🔔</div>
                  <div className="mock-txt">المطعم: برجر زون</div>
                  <div className="mock-txt">المسافة: 1.2 كم مجاور لك</div>
                </div>
                <div className="mock-card">
                  <div className="mock-title">تتبع الزبون بالخريطة</div>
                  <div className="mock-txt">توجيه Waze / جوجل مابس</div>
                </div>
                <div className="mock-btn" style={{ background: '#222' }}>قبول الطلب ✅</div>
              </div>
            </div>

            {/* Phone 3: Tracking */}
            <div className="css-phone">
              <div className="phone-notch"></div>
              <div className="phone-screen">
                <div className="screen-header">
                  <span>تتبع طلبك - السند</span>
                  <span>📶 100%</span>
                </div>
                <div className="mock-card" style={{ borderRight: '4px solid #4CAF50' }}>
                  <div className="mock-title">حالة الطلب: جاري التوصيل 🛵</div>
                  <div className="mock-txt">الكابتن: علي أحمد</div>
                  <div className="mock-txt">المسافة المتبقية: 8 دقائق</div>
                </div>
                <div className="mock-card">
                  <div className="mock-title">تفاصيل الطلب</div>
                  <div className="mock-txt">الطلب من: مطعم عالحطب</div>
                  <div className="mock-txt">رقم الطلب: #1284</div>
                </div>
                <div className="mock-btn" style={{ background: '#222' }}>مكالمة الكابتن 📞</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partnership Section */}
      <section id="partners" className="partners-section">
        <div className="landing-container">
          <div className="section-header animate-on-scroll">
            <span className="section-tag">شركاء النجاح</span>
            <h2 className="section-title">مطاعم شريكة تصنع الفرق مع تيم السند</h2>
          </div>

          <div className="testimonial-card animate-on-scroll">
            <div className="testimonial-author-side">
              <div className="testimonial-logo-container">
                <img src="/west_burger.jpg" alt="West Burger ويست برجر" className="testimonial-logo-img" />
              </div>
              <div className="testimonial-stars">⭐⭐⭐⭐⭐</div>
              <h4 className="testimonial-author-name">ويست برجر - West Burger</h4>
              <p className="testimonial-author-title">مطعم شريك رئيسي - بغداد</p>
            </div>

            <div className="testimonial-content-side">
              <div className="testimonial-quote-icon">”</div>
              <p className="testimonial-quote-text">
                "منذ انضمامنا لمنصة تيم السند، تمكنا من مضاعفة مبيعات التوصيل بأكثر من 150%. النظام السحابي ذكي للغاية، فالكباتن يستلمون الطلب خلال دقائق معدودة والتوجيه بالـ GPS ساهم في وصول الوجبات ساخنة وطازجة للزبائن."
              </p>
              <a href="#contact" className="btn-brand-primary">🤝 انضم كشريك نجاح الآن</a>
            </div>
          </div>
        </div>
      </section>

      {/* Download CTA Section */}
      <section id="download" className="download-section">
        <div className="landing-container">
          <div className="download-box animate-on-scroll">
            <div className="download-content">
              <h2 className="download-title">حمل تطبيق تيم السند وابدأ العمل الآن</h2>
              <p className="download-desc">
                احصل على النسخة المخصصة لهاتفك وباشر بالوصول السريع لزبائنك أو زيادة أرباحك اليومية.
              </p>
              <div className="download-buttons">
                <a href="#download" className="premium-badge-btn">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="#FFFFFF">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.79 16.32 3.23 10.3 6.96 9.87c1.38-.17 2.37.58 3.13.58.76 0 2.05-.73 3.6-.56 1.66.17 2.87.82 3.51 1.84-3.3 2.03-2.52 6.58.4 7.74-.68 1.72-1.57 3.6-2.5 4.81zM12.03 8.3c-.08-2.6 1.75-4.8 4.2-4.9.22 2.65-2.14 5-4.2 4.9z"/>
                  </svg>
                  <div className="badge-btn-text">
                    <span className="badge-subtitle">حمل من متجر</span>
                    <span className="badge-title">App Store</span>
                  </div>
                </a>

                <a href="#download" className="premium-badge-btn">
                  <svg viewBox="0 0 24 24" width="22" height="22">
                    <path d="M3.609 2.083C3.218 2.477 3 3.076 3 3.824v16.353c0 .748.218 1.347.61 1.74l.068.068 9.176-9.177v-.168L3.677 2.016l-.068.067z" fill="#00F0FF"/>
                    <path d="M16.522 15.195l-3.669-3.67v-.168l3.67-3.67.087.05 4.347 2.472c1.24.704 1.24 1.862 0 2.569l-4.347 2.473-.088.044z" fill="#FFC107"/>
                    <path d="M12.94 11.439l-9.33 9.33a1.442 1.442 0 001.912.062l9.33-5.305-1.912-4.087z" fill="#FF3D00"/>
                    <path d="M12.94 11.439l1.912-4.087-9.33-5.305c-.65-.369-1.393-.346-1.912.062l9.33 9.33z" fill="#4CAF50"/>
                  </svg>
                  <div className="badge-btn-text">
                    <span className="badge-subtitle">حمل من متجر</span>
                    <span className="badge-title">Google Play</span>
                  </div>
                </a>
              </div>
            </div>
            <div className="download-mockup-wrapper">
              <div className="css-phone" style={{ transform: 'rotate(5deg)' }}>
                <div className="phone-notch"></div>
                <div className="phone-screen" style={{ justifyContent: 'center', alignItems: 'center', background: '#B1124D' }}>
                  <img src="/logo light.png" alt="تيم السند" style={{ width: 80, objectFit: 'contain' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="landing-container">
          <div className="section-header animate-on-scroll">
            <span className="section-tag">الأسئلة الشائعة</span>
            <h2 className="section-title">كل ما تريد معرفته عن منصة تيم السند</h2>
          </div>

          <div className="faq-list animate-on-scroll">
            <div className={`faq-item ${activeFaq === 0 ? 'active' : ''}`}>
              <div className="faq-question" onClick={() => toggleFaq(0)}>
                <span>هل يوفر تيم السند سائقين مخصصين لمطعمي؟</span>
                <span>{activeFaq === 0 ? '−' : '+'}</span>
              </div>
              <div className="faq-answer">
                لا، تيم السند هو نظام تشاركي ذكي. يتم بث الطلبات التي يسجلها مطعمك آلياً إلى أقرب السائقين النشطين جغرافياً، ويقوم السائق الأقرب بقبول الطلب وتوصيله.
              </div>
            </div>

            <div className={`faq-item ${activeFaq === 1 ? 'active' : ''}`}>
              <div className="faq-question" onClick={() => toggleFaq(1)}>
                <span>كيف يتم تحصيل رسوم التوصيل وأموال الطلبات؟</span>
                <span>{activeFaq === 1 ? '−' : '+'}</span>
              </div>
              <div className="faq-answer">
                يدفع الكابتن للمطعم قيمة الطلب نقداً عند استلامه، وعند وصول الكابتن للعميل يستلم منه كامل القيمة نقداً متضمنة رسوم التوصيل، بينما يُخصم رصيد عمولة الخدمة المبرمجة آلياً من محفظة السائق.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Baghdad Skyline Vector Footer */}
      <div className="baghdad-skyline-container">
        <svg width="100%" height="100%" viewBox="0 0 1200 180" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0 }}>
          <defs>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          {/* Minimal Baghdad Skyline Shapes in Cherry Red accents */}
          <path d="M 0 180 L 0 140 L 40 140 L 40 100 L 60 100 L 60 140 L 100 140 L 100 120 L 130 120 L 130 140 L 180 140 L 180 90 L 220 90 L 220 140 L 260 140 L 260 130 L 300 130 L 300 180 Z" fill="rgba(177, 18, 77, 0.15)" />
          {/* Monument of Freedom Silhouette */}
          <path d="M 400 180 L 400 120 L 420 120 L 420 80 L 480 80 L 480 120 L 500 120 L 500 180 Z" fill="rgba(177, 18, 77, 0.25)" />
          {/* Baghdad Tower Silhouette */}
          <path d="M 700 180 L 710 180 L 710 70 L 700 60 L 700 40 L 712 30 L 712 10 L 716 10 L 716 30 L 728 40 L 728 60 L 718 70 L 718 180 L 730 180 Z" fill="rgba(177, 18, 77, 0.3)" />
          {/* Palm Trees silhouettes */}
          <path d="M 900 180 L 902 140 Q 890 130 880 135 Q 902 125 905 140 Q 920 130 930 135 L 906 180 Z" fill="rgba(177, 18, 77, 0.2)" />
        </svg>
      </div>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container footer-grid">
          <div>
            <img src="/logo light.png" alt="تيم السند" style={{ height: 48, marginBottom: 24 }} />
            <p className="footer-desc">
              منصة تيم السند هي منصة توصيل عراقية متطورة تسعى لإعادة ابتكار الحلول اللوجستية وتسهيل أعمال المطاعم والكباتن بكفاءة وأمان.
            </p>
          </div>
          <div>
            <h4 className="footer-title">روابط سريعة</h4>
            <ul className="footer-links">
              <li><a href="#home">الرئيسية</a></li>
              <li><a href="#features">المميزات</a></li>
              <li><a href="#how-it-works">كيف يعمل</a></li>
              <li><a href="#partners">شركاء النجاح</a></li>
            </ul>
          </div>
          <div>
            <h4 className="footer-title">تواصل معنا</h4>
            <ul className="footer-links" style={{ color: '#94a3b8', fontSize: '14px' }}>
              <li>بغداد، العراق</li>
              <li>هاتف: 0770 123 4567</li>
              <li>إيميل: info@teamsnd.com</li>
            </ul>
          </div>
        </div>

        <div className="landing-container footer-bottom">
          <span>جميع الحقوق محفوظة © {new Date().getFullYear()} تيم السند</span>
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{ cursor: 'pointer' }}>فيسبوك</span>
            <span style={{ cursor: 'pointer' }}>إنستغرام</span>
            <span style={{ cursor: 'pointer' }}>يوتيوب</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
