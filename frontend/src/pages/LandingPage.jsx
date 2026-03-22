/**
 * LandingPage.jsx — Arverié
 *
 * Hero: logo-animation.mp4 with 3D rise + breathing idle via GSAP
 * Background: watercolor-reveal effect — dull landscape with vivid mouse reveal
 * Then: DeskSection scroll experience
 */

import React, { useEffect, useRef, useState, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { useApp } from "../context/AppContext";
import logoSvgRaw from "../assets/logo.svg?raw";
import heroBg from "../assets/hero_background.jpeg";
import DeskSection from "./DeskSection";

const HeroCanvasP5 = React.lazy(() => import("../components/HeroCanvasP5"));

const TITLE_CHARS = ["A", "R", "V", "E", "R", "I", "É"];

const NAV_EKG_D = "M0,8 L5,8 L8,2 L11,14 L14,5 L17,11 L20,8 L44,8";
const NAV_FLAT_D = "M0,8 L44,8";

const prefersReduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer({ enableInteractivity, isCompactLayout }) {
  const footerCards = [
    {
      icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
      title: "Expressive Canvas",
      desc: "Pour your feelings onto an open canvas. A distraction-free space where your strokes reflect your inner state.",
      step: "Step 01",
      cue: "Externalize what words cannot hold",
      offset: 0,
    },
    {
      icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
      title: "Empathic AI",
      desc: "Receive warm, gentle reflections on your art. Our AI guide helps you unpack your thoughts securely.",
      step: "Step 02",
      cue: "Transform strokes into calm understanding",
      offset: -16,
    },
    {
      icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
      title: "Mood Journal",
      desc: "Collect your daily reflections. Turn your emotional history into a timeless, beautifully bound archive.",
      step: "Step 03",
      cue: "Build a living map of your emotional story",
      offset: -8,
    },
  ];

  return (
    <footer
      id="landing-footer"
      style={{
        background: "transparent",
        padding: isCompactLayout ? "104px 24px 132px" : "120px 48px 160px",
        position: "relative",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          borderRadius: "999px",
          padding: "8px 18px",
          marginBottom: "20px",
          background: "rgba(21, 54, 33, 0.4)",
          border: "1px solid rgba(166, 244, 185, 0.34)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        }}
      >
        <span style={{ fontSize: "8px", color: "#B5F8C7" }}>◆</span>
        <span
          style={{
            fontFamily: "Cinzel, serif",
            fontSize: "10px",
            letterSpacing: "0.22em",
            color: "rgba(220, 248, 228, 0.92)",
            textTransform: "uppercase",
          }}
        >
          The Arverié Flow
        </span>
      </motion.div>
      <h2
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(28px, 4vw, 48px)",
          fontStyle: "italic",
          letterSpacing: isCompactLayout ? "3px" : "5px",
          color: "#D8F4DD",
          textShadow:
            "0 2px 20px rgba(0,0,0,0.68), 0 0 36px rgba(92, 198, 126, 0.26)",
          marginBottom: "18px",
          textAlign: "center",
          padding: isCompactLayout ? "0 8px" : 0,
        }}
      >
        A Journey from Expression to Reflection
      </h2>
      <p
        style={{
          margin: "0 0 64px",
          maxWidth: "760px",
          textAlign: "center",
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(16px, 1.7vw, 22px)",
          letterSpacing: "0.8px",
          color: "rgba(214, 242, 219, 0.86)",
          lineHeight: 1.5,
        }}
      >
        Create freely, receive gentle guidance, and preserve each emotional
        chapter in your personal journal.
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "24px",
          maxWidth: "1100px",
          width: "100%",
          alignItems: "stretch",
        }}
      >
        {footerCards.map((item, i) => (
          <motion.div
            key={i}
            className="footer-glass-card"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.42, ease: "easeOut", delay: i * 0.08 }}
            whileHover={
              enableInteractivity
                ? {
                    y: -8,
                    borderColor: "rgba(183, 255, 204, 0.56)",
                    boxShadow:
                      "0 14px 46px rgba(0,0,0,0.4), 0 0 22px rgba(134, 244, 164, 0.24)",
                  }
                : undefined
            }
            style={{
              transform: "none",
              background:
                "linear-gradient(165deg, rgba(35, 78, 49, 0.32), rgba(20, 50, 31, 0.38))",
              border: "1px solid rgba(166, 244, 185, 0.24)",
              borderRadius: "14px",
              padding: "40px 32px",
              boxShadow:
                "0 10px 40px rgba(0,0,0,0.34), inset 0 1px 0 rgba(200, 255, 214, 0.1)",
              flex: "1 1 300px",
              maxWidth: isCompactLayout ? "480px" : "none",
              minWidth: 0,
              minHeight: "420px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              textAlign: "center",
              transition: "border-color 220ms ease, box-shadow 220ms ease",
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span
                style={{
                  fontFamily: "Cinzel, serif",
                  fontSize: "9px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(203, 245, 215, 0.82)",
                }}
              >
                {item.step}
              </span>
              <span
                style={{
                  width: "36px",
                  height: "1px",
                  background:
                    "linear-gradient(to right, rgba(181, 248, 198, 0.7), rgba(181, 248, 198, 0.1))",
                }}
              />
            </div>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 35% 30%, rgba(190, 255, 205, 0.45), rgba(119, 214, 143, 0.14))",
                border: "1px solid rgba(170, 246, 189, 0.48)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "8px",
              }}
            >
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="rgba(212, 255, 225, 0.96)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d={item.icon} />
              </svg>
            </div>
            <h3
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "22px",
                fontWeight: 300,
                color: "#D8F7DF",
                margin: 0,
              }}
            >
              {item.title}
            </h3>
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "16px",
                letterSpacing: "0.04em",
                color: "rgba(202, 241, 213, 0.82)",
                margin: "-4px 0 2px",
              }}
            >
              {item.cue}
            </p>
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "20px",
                letterSpacing: "0.02em",
                lineHeight: 1.35,
                color: "rgba(218, 244, 224, 0.84)",
                margin: 0,
              }}
            >
              {item.desc}
            </p>
          </motion.div>
        ))}
      </div>
      <p
        style={{
          marginTop: "80px",
          fontSize: "11px",
          letterSpacing: "2px",
          color: "rgba(203, 236, 210, 0.42)",
          textTransform: "uppercase",
        }}
      >
        © 2025 Arverié · All rights reserved
      </p>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { soundOn, setSoundOn } = useApp();
  const [deskInView, setDeskInView] = useState(false);
  const [showHeroOverlay, setShowHeroOverlay] = useState(true);
  const [heroOverlayReady, setHeroOverlayReady] = useState(false);
  const [showLowerSections, setShowLowerSections] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Layout refs
  const sceneRef = useRef(null);
  const logoContainerRef = useRef(null);
  const svgContainerRef = useRef(null);
  const logoSvgRef = useRef(null);
  const glowRef = useRef(null);
  const pulseRef = useRef(null);
  const titleRef = useRef(null);

  // UI refs
  const lineLeftRef = useRef(null);
  const lineRightRef = useRef(null);
  const subtitleRef = useRef(null);
  const btnRef = useRef(null);
  const scrollHintRef = useRef(null);
  const navRef = useRef(null);
  const navEkgRef = useRef(null);
  const navFlatRef = useRef(null);
  const beginFlowTimersRef = useRef([]);

  // Parallax quickTo
  const qtRotX = useRef(null);
  const qtRotY = useRef(null);

  // ─── Viewport checks ───────────────────────────────────────────────
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const [isCompactViewport, setIsCompactViewport] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1200 : false,
  );
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  useEffect(() => {
    const onResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
      setIsCompactViewport(window.innerWidth < 1200);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (prefersReduced) {
      setHeroOverlayReady(false);
      return;
    }
    const timerId = window.setTimeout(() => {
      setHeroOverlayReady(true);
    }, 180);
    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    if (showLowerSections) return;

    const revealThreshold = Math.max(120, window.innerHeight * 0.2);
    const onScroll = () => {
      if (window.scrollY < revealThreshold) return;
      setShowLowerSections(true);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [showLowerSections]);

  // ─── Body class for landing page background ─────────────────────────────
  useEffect(() => {
    document.body.classList.add("landing-page");
    return () => document.body.classList.remove("landing-page");
  }, []);

  // ─── Main GSAP timeline ─────────────────────────────────────────────────
  useEffect(() => {
    const letters = titleRef.current ? [...titleRef.current.children] : [];
    const logoPaths = logoSvgRef.current
      ? [...logoSvgRef.current.querySelectorAll("path")].filter(
          (p) => p.getAttribute("fill") !== "#000000",
        )
      : [];

    if (prefersReduced) {
      gsap.set(
        [
          navRef.current,
          svgContainerRef.current,
          titleRef.current,
          subtitleRef.current,
          scrollHintRef.current,
        ],
        { opacity: 1 },
      );
      gsap.set(letters, { opacity: 1, y: 0, rotateY: 0 });
      gsap.set([lineLeftRef.current, lineRightRef.current], { width: 80 });
      return;
    }

    // Initial states
    gsap.set(svgContainerRef.current, {
      scale: 0.7,
      rotateX: 20,
      filter: "blur(16px)",
      transformOrigin: "center center",
      opacity: 0,
    });
    gsap.set(logoContainerRef.current, { transformPerspective: 900 });
    gsap.set(navRef.current, { opacity: 0 });
    gsap.set(glowRef.current, { opacity: 0, scale: 0.6 });
    gsap.set(pulseRef.current, { scale: 0, opacity: 0 });
    gsap.set(letters, { opacity: 0, y: 20, rotateY: 90 });
    gsap.set(titleRef.current, { perspective: 600 });
    gsap.set(lineLeftRef.current, { width: 0 });
    gsap.set(lineRightRef.current, { width: 0 });
    gsap.set(subtitleRef.current, { opacity: 0, y: 10 });
    gsap.set(btnRef.current, { opacity: 0, y: 10 });
    gsap.set(scrollHintRef.current, { opacity: 0 });
    gsap.set(logoPaths, { opacity: 0 });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.1 });

      // ─ 0.3s  Gold radial pulse ──────────────────────────────────────────
      tl.set(pulseRef.current, { opacity: 0.45 }, 0.3);
      tl.to(
        pulseRef.current,
        { scale: 3.2, opacity: 0, duration: 1.0, ease: "power2.out" },
        0.3,
      );

      // ─ 0.4s  Video fade + 3D rise ───────────────────────────────────────
      tl.to(
        svgContainerRef.current,
        { opacity: 1, duration: 0.6, ease: "power2.out" },
        0.4,
      );
      tl.to(
        svgContainerRef.current,
        {
          scale: 1,
          rotateX: 0,
          filter: "blur(0px)",
          duration: 1.0,
          ease: "power3.out",
        },
        0.6,
      );

      if (logoPaths.length) {
        tl.to(
          logoPaths,
          { opacity: 1, duration: 0.01, stagger: 0.004, ease: "none" },
          0.8,
        );
      }

      // ─ 1.2s  Glow materializes ──────────────────────────────────────────
      tl.to(
        glowRef.current,
        { opacity: 0.18, scale: 1, duration: 0.8, ease: "power2.out" },
        1.2,
      );

      // ─ 1.6s  Breathing idle ─────────────────────────────────────────────
      tl.call(
        () => {
          gsap.to(svgContainerRef.current, {
            scale: 1.02,
            duration: 4,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
          gsap.to(glowRef.current, {
            opacity: 0.32,
            duration: 3,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        },
        null,
        1.6,
      );

      // ─ 1.8s  "ARVERIÉ" letters 3D flip stagger ──────────────────────────
      tl.to(
        letters,
        {
          opacity: 1,
          y: 0,
          rotateY: 0,
          duration: 0.45,
          stagger: 0.055,
          ease: "back.out(1.7)",
        },
        1.8,
      );

      // ─ 2.3s  Ornamental lines ────────────────────────────────────────────
      tl.to(
        lineLeftRef.current,
        { width: 76, duration: 0.35, ease: "power2.inOut" },
        2.3,
      );
      tl.to(
        lineRightRef.current,
        { width: 76, duration: 0.35, ease: "power2.inOut" },
        2.3,
      );

      // ─ 2.6s  Subtitle ────────────────────────────────────────────────────
      tl.to(
        subtitleRef.current,
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
        2.6,
      );

      // ─ 2.8s  Navbar ──────────────────────────────────────────────────────
      tl.to(
        navRef.current,
        { opacity: 1, duration: 0.5, ease: "power2.out" },
        2.8,
      );

      // ─ 2.9s  Begin Session button ────────────────────────────────────────
      tl.to(
        btnRef.current,
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
        2.9,
      );

      // ─ 3.5s  Scroll hint ─────────────────────────────────────────────────
      tl.to(scrollHintRef.current, { opacity: 1, duration: 0.45 }, 3.5);
    }, sceneRef);

    return () => ctx.revert();
  }, []);

  // ─── Mouse 3D parallax ───────────────────────────────────────────────────
  useEffect(() => {
    if (isMobileViewport || prefersReduced) return;
    const timer = setTimeout(() => {
      if (!logoContainerRef.current) return;
      qtRotX.current = gsap.quickTo(logoContainerRef.current, "rotateX", {
        duration: 0.55,
        ease: "power3",
      });
      qtRotY.current = gsap.quickTo(logoContainerRef.current, "rotateY", {
        duration: 0.55,
        ease: "power3",
      });
    }, 200);
    function onMouseMove(e) {
      if (!qtRotX.current) return;
      qtRotX.current((e.clientY / window.innerHeight - 0.5) * -16);
      qtRotY.current((e.clientX / window.innerWidth - 0.5) * 24);
    }
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [isMobileViewport]);

  // ─── Logo hover ──────────────────────────────────────────────────────────
  function handleLogoEnter() {
    if (prefersReduced || isMobileViewport) return;
    gsap.to(glowRef.current, { opacity: 0.52, duration: 0.28 });
    gsap.to(svgContainerRef.current, {
      scale: 1.06,
      duration: 0.4,
      ease: "back.out(1.4)",
    });
  }
  function handleLogoLeave() {
    if (prefersReduced || isMobileViewport) return;
    gsap.to(glowRef.current, { opacity: 0.18, duration: 0.5 });
    gsap.to(svgContainerRef.current, {
      scale: 1.0,
      duration: 0.5,
      ease: "power2.out",
    });
  }

  // ─── EKG toggle ──────────────────────────────────────────────────────────
  function toggleSound() {
    setSoundOn((prev) => {
      const next = !prev;
      gsap.to(navEkgRef.current, { opacity: next ? 1 : 0, duration: 0.35 });
      gsap.to(navFlatRef.current, { opacity: next ? 0 : 1, duration: 0.35 });
      return next;
    });
  }

  function clearBeginFlowTimers() {
    beginFlowTimersRef.current.forEach((timerId) =>
      window.clearTimeout(timerId),
    );
    beginFlowTimersRef.current = [];
  }

  function handleBeginSessionClick() {
    clearBeginFlowTimers();
    setShowLowerSections(true);

    const runBeginFlow = () => {
      const footerSection = document.getElementById("landing-footer");
      const deskSection = document.getElementById("desk-section");
      if (!deskSection) return;

      if (prefersReduced || !footerSection) {
        deskSection.scrollIntoView({ behavior: "smooth", block: "start" });
        const triggerId = window.setTimeout(() => {
          window.dispatchEvent(new Event("arverie:desk-scroll-to-end"));
        }, 350);
        beginFlowTimersRef.current.push(triggerId);
        return;
      }

      // Two-phase reveal: hero -> footer, then footer -> desk, then auto-play
      // the desk's scroll-driven animation to its final phase.
      footerSection.scrollIntoView({ behavior: "smooth", block: "start" });

      const toDeskId = window.setTimeout(() => {
        deskSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 950);

      const toDeskEndId = window.setTimeout(() => {
        window.dispatchEvent(new Event("arverie:desk-scroll-to-end"));
      }, 2200);

      beginFlowTimersRef.current.push(toDeskId, toDeskEndId);
    };

    window.requestAnimationFrame(runBeginFlow);
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!location.state?.focusDesk) return;

    const timer = window.setTimeout(() => {
      const deskSection = document.getElementById("desk-section");
      if (deskSection) {
        deskSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      navigate(location.pathname, {
        replace: true,
        state: {
          ...location.state,
          focusDesk: false,
        },
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [location.pathname, location.state, navigate]);

  useEffect(
    () => () => {
      clearBeginFlowTimers();
    },
    [],
  );

  useEffect(() => {
    function updateHeroOverlayVisibility() {
      const deskSection = document.getElementById("desk-section");
      if (!deskSection) {
        setShowHeroOverlay(!deskInView);
        return;
      }

      // Keep the dulling overlay until the desk floor-top line gets close to
      // the top of the viewport ("less space left"), then undull.
      const floorLine = deskSection.querySelector(".room-floor");
      if (floorLine) {
        const floorTop = floorLine.getBoundingClientRect().top;
        const floorNearTop =
          floorTop <= Math.max(120, window.innerHeight * 0.16);
        setShowHeroOverlay(!floorNearTop && !deskInView);
        return;
      }

      // Fallback in case floor line is unavailable.
      const deskTop = deskSection.getBoundingClientRect().top;
      setShowHeroOverlay(
        !(deskTop <= window.innerHeight * 0.95) && !deskInView,
      );
    }

    updateHeroOverlayVisibility();
    window.addEventListener("scroll", updateHeroOverlayVisibility, {
      passive: true,
    });
    window.addEventListener("resize", updateHeroOverlayVisibility);

    return () => {
      window.removeEventListener("scroll", updateHeroOverlayVisibility);
      window.removeEventListener("resize", updateHeroOverlayVisibility);
    };
  }, [deskInView]);

  return (
    <>
      <style>{`
      .nav-logo { height: 36px; width: auto; max-width: 120px; line-height: 0; flex-shrink: 0; overflow: hidden; }
      .nav-logo svg { height: 100%; width: auto; max-width: 100%; display: block; }
      .nav-logo svg path[fill="#000000"] { display: none; }
      .hero-logo-svg svg path[fill="#000000"] { display: none; }

      :root { --landing-vh: 100vh; }
      @supports (height: 100dvh) {
        :root { --landing-vh: 100dvh; }
      }

      .landing-hero-shell {
        height: var(--landing-vh);
        min-height: 100vh;
      }

      .landing-nav-glass {
        background: rgba(26,22,20,0.84);
      }

      .footer-glass-card {
        background: linear-gradient(165deg, rgba(35, 78, 49, 0.42), rgba(20, 50, 31, 0.5));
      }

      @supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
        .landing-nav-glass {
          background: rgba(26,22,20,0.72);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .footer-glass-card {
          background: linear-gradient(165deg, rgba(35, 78, 49, 0.32), rgba(20, 50, 31, 0.38));
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
      }

      .landscape-vivid {
        position: fixed;
        inset: 0;
        background-image: url('${heroBg}');
        background-size: cover;
        background-position: center;
        opacity: 1;
        filter: saturate(1.1) brightness(1.0);
        pointer-events: none;
        z-index: 0;
      }
    `}</style>
      <div>
        {/* ── Fixed background image ── */}
        <div className="landscape-vivid" />
        {/* ── Fixed p5 canvas (dulling overlay) ── */}
        {!prefersReduced && heroOverlayReady && showHeroOverlay && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1,
              pointerEvents: "none",
              opacity: 1,
            }}
          >
            <Suspense fallback={null}>
              <HeroCanvasP5 />
            </Suspense>
          </div>
        )}
        <div
          ref={sceneRef}
          className="landing-hero-shell"
          style={{
            width: "100vw",
            background: "transparent",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            zIndex: 2,
            perspective: "1000px",
            overflow: "hidden",
          }}
        >
          {/* ── Navbar ── */}
          <nav
            ref={navRef}
            className="landing-nav-glass"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              height: "52px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 28px",
              borderBottom: "1px solid rgba(200,160,64,0.15)",
              zIndex: 50,
            }}
          >
            <div
              className="nav-logo"
              dangerouslySetInnerHTML={{ __html: logoSvgRaw }}
            />

            <button
              onClick={toggleSound}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
              }}
              aria-label={soundOn ? "Mute ambient" : "Enable ambient"}
            >
              <svg
                width="48"
                height="20"
                viewBox="0 0 48 16"
                fill="none"
                style={{ overflow: "visible" }}
              >
                <path
                  ref={navEkgRef}
                  d={NAV_EKG_D}
                  stroke="var(--gold)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  ref={navFlatRef}
                  d={NAV_FLAT_D}
                  stroke="var(--gold)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ opacity: 0 }}
                />
              </svg>
              <span
                style={{
                  fontFamily: "Cinzel, serif",
                  fontSize: "8px",
                  letterSpacing: "0.18em",
                  color: "var(--gold)",
                  textTransform: "uppercase",
                }}
              >
                {soundOn ? "AMBIENT" : "SILENT"}
              </span>
            </button>
          </nav>

          {/* ── Hero content ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
              zIndex: 10,
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            {/* Awakening pulse */}
            <div
              ref={pulseRef}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "180px",
                height: "180px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(200,160,40,0.48) 0%, transparent 70%)",
                filter: "blur(12px)",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />

            {/* ── Logo: 3D parallax container ── */}
            <div
              ref={logoContainerRef}
              style={{
                position: "relative",
                width: isMobile ? "85vw" : "clamp(280px, 50vw, 600px)",
                maxWidth: isMobile ? "320px" : "520px",
                transformStyle: "preserve-3d",
                cursor: "default",
                pointerEvents: "auto",
              }}
              onMouseEnter={handleLogoEnter}
              onMouseLeave={handleLogoLeave}
            >
              {/* Warm gold glow behind logo */}
              <div
                ref={glowRef}
                style={{
                  position: "absolute",
                  inset: "-28%",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(ellipse, rgba(200,160,40,0.55) 0%, rgba(200,160,40,0.15) 45%, transparent 72%)",
                  filter: "blur(30px)",
                  opacity: 0,
                  pointerEvents: "none",
                  zIndex: 0,
                  willChange: "opacity, transform",
                }}
              />

              {/* Animated logo SVG */}
              <div
                ref={svgContainerRef}
                style={{
                  position: "relative",
                  zIndex: 1,
                  width: "100%",
                  transformOrigin: "center center",
                  willChange: "transform, opacity, filter",
                }}
              >
                <div
                  ref={logoSvgRef}
                  className="hero-logo-svg"
                  dangerouslySetInnerHTML={{ __html: logoSvgRaw }}
                />
              </div>
            </div>

            {/* ── "ARVERIÉ" — individual letters for 3D stagger ── */}
            <div
              ref={titleRef}
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                alignItems: "baseline",
                gap: "0.04em",
                rowGap: "6px",
                marginTop: "10px",
                perspective: "600px",
                transformStyle: "preserve-3d",
              }}
            >
              {TITLE_CHARS.map((ch, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: "Cinzel, serif",
                    fontSize: isMobile ? "34px" : "clamp(34px, 4.8vw, 52px)",
                    fontWeight: 400,
                    color: "#F5EFE0",
                    letterSpacing: isMobile
                      ? "0.14em"
                      : isCompactViewport
                        ? "0.17em"
                        : "0.22em",
                    display: "inline-block",
                    willChange: "transform, opacity",
                  }}
                >
                  {ch}
                </span>
              ))}
            </div>

            {/* Ornamental line divider with center diamond */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: "9px 0 7px",
              }}
            >
              <div
                ref={lineLeftRef}
                style={{
                  height: "1px",
                  background:
                    "linear-gradient(to left, var(--gold), transparent)",
                  width: 0,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  background: "var(--gold)",
                  transform: "rotate(45deg)",
                  opacity: 0.75,
                  flexShrink: 0,
                  boxShadow: "0 0 6px rgba(200,160,40,0.6)",
                }}
              />
              <div
                ref={lineRightRef}
                style={{
                  height: "1px",
                  background:
                    "linear-gradient(to right, var(--gold), transparent)",
                  width: 0,
                  flexShrink: 0,
                }}
              />
            </div>

            {/* Subtitle */}
            <p
              ref={subtitleRef}
              style={{
                fontFamily: "Cinzel, serif",
                fontSize: "11px",
                letterSpacing: "0.4em",
                color: "var(--gold)",
                textTransform: "uppercase",
                marginBottom: "28px",
                opacity: 0,
              }}
            >
              A space where feeling becomes form
            </p>

            {/* Begin Session button */}
            <motion.button
              ref={btnRef}
              onClick={handleBeginSessionClick}
              whileHover={
                !isMobileViewport
                  ? {
                      backgroundColor: "rgba(70, 161, 95, 0.36)",
                      borderColor: "rgba(181, 255, 201, 0.95)",
                      color: "#F3FFF6",
                      boxShadow:
                        "0 12px 34px rgba(20, 58, 31, 0.52), 0 0 24px rgba(139, 243, 166, 0.45), inset 0 0 0 1px rgba(219, 255, 229, 0.25)",
                      y: -2,
                    }
                  : undefined
              }
              whileTap={!isMobileViewport ? { scale: 0.97 } : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontFamily: "Cinzel, serif",
                fontSize: "12px",
                letterSpacing: "0.22em",
                color: "#E3F8E8",
                background:
                  "linear-gradient(180deg, rgba(16, 33, 22, 0.76), rgba(9, 22, 14, 0.82))",
                border: "1.5px solid rgba(129, 225, 157, 0.72)",
                borderRadius: "999px",
                padding: "14px 46px",
                cursor: "pointer",
                pointerEvents: "auto",
                marginBottom: "14px",
                opacity: 0,
                boxShadow:
                  "0 8px 26px rgba(0,0,0,0.42), inset 0 1px 0 rgba(210, 255, 220, 0.18)",
                transition:
                  "background-color 0.24s ease, border-color 0.24s ease, color 0.24s ease, box-shadow 0.24s ease, transform 0.24s ease",
              }}
              aria-label="Begin your Arverie session"
            >
              <span
                style={{ fontSize: "8px", opacity: 0.78, color: "#B5F8C7" }}
              >
                ◆
              </span>
              Begin Your Session
              <span
                style={{ fontSize: "8px", opacity: 0.78, color: "#B5F8C7" }}
              >
                ◆
              </span>
            </motion.button>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.25, duration: 0.45 }}
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "16px",
                letterSpacing: "0.06em",
                color: "rgba(205, 240, 214, 0.84)",
                margin: "0 0 24px",
              }}
            >
              Private, guided, and always yours.
            </motion.p>

            {/* Scroll hint */}
            <div
              ref={scrollHintRef}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                opacity: 0,
              }}
            >
              <span
                style={{
                  fontFamily: "Cinzel, serif",
                  fontSize: "8px",
                  letterSpacing: "0.28em",
                  color: "rgba(200,160,64,0.6)",
                  textTransform: "uppercase",
                }}
              >
                scroll to enter
              </span>
              <motion.div
                whileHover={
                  !isMobileViewport
                    ? { borderColor: "rgba(200,160,40,0.75)" }
                    : undefined
                }
                style={{
                  position: "relative",
                  width: "38px",
                  height: "56px",
                  borderRadius: "999px",
                  border: "1.5px solid rgba(200,160,40,0.45)",
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  cursor: "default",
                  transition: "border-color 0.22s ease",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "999px",
                    background:
                      "radial-gradient(ellipse at center bottom, rgba(200,160,40,0.18) 0%, transparent 70%)",
                    pointerEvents: "none",
                  }}
                />
                <div className="bounce">
                  <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
                    <path
                      d="M1 1L9 9L17 1"
                      stroke="rgba(200,160,64,0.6)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
        <Footer
          enableInteractivity={!isMobileViewport}
          isCompactLayout={isCompactViewport}
        />
        <div
          style={{
            opacity: showLowerSections ? 1 : 0,
            transform: showLowerSections
              ? "translateY(0px)"
              : "translateY(36px)",
            transition: "opacity 520ms ease, transform 520ms ease",
            pointerEvents: showLowerSections ? "auto" : "none",
          }}
        >
          <DeskSection
            sectionId="desk-section"
            onDeskInViewChange={setDeskInView}
          />
        </div>
      </div>
    </>
  );
}
