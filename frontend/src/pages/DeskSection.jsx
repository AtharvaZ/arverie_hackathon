/**
 * DeskSection.jsx — Arverié
 *
 * Ports the full desk scene from arverié_landing_desk.html verbatim.
 * Wheel-lock scroll animation drives desk tilt + zoom via direct DOM refs.
 * Name modal uses framer-motion AnimatePresence.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";

const DESK_CSS = `
/* ══ DESK KEYFRAMES ══════════════════════════ */
@keyframes legDrop {
  0%   { opacity:0; transform:scaleY(0);    transform-origin:top center; }
  60%  { opacity:1; transform:scaleY(1.08); transform-origin:top center; }
  100% { opacity:1; transform:scaleY(1);    transform-origin:top center; }
}
@keyframes pencilFloat {
  0%,100% { transform:translateY(0); }
  50%     { transform:translateY(-3px); }
}
@keyframes flicker {
  0%,100% { opacity:.75; }
  45%     { opacity:1; }
  72%     { opacity:.85; }
}

/* ══ SCENE WRAPPERS ══════════════════════════ */
.scene-outer {
  position:relative;
  height:100vh;
}
.scene-sticky {
  position:relative;
  height:100vh; overflow:hidden;
  display:flex; align-items:center; justify-content:center;
  background:linear-gradient(160deg,#F2E8D5 0%,var(--wall) 50%,#E4D8B8 100%);
}
.scene-texture {
  position:absolute; inset:0; pointer-events:none; opacity:.5;
  background:
    repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(140,110,60,.04) 3px,rgba(140,110,60,.04) 4px),
    repeating-linear-gradient(90deg,transparent,transparent 6px,rgba(140,110,60,.025) 6px,rgba(140,110,60,.025) 12px);
}
.scene-vignette {
  position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(ellipse at 50% 50%,transparent 38%,rgba(100,75,40,.16) 100%);
}
.scene-lampglow {
  position:absolute; pointer-events:none; width:50%; height:65%;
  top:8%; left:50%; transform:translateX(-20%);
  background:radial-gradient(ellipse at 62% 18%,rgba(220,165,55,.1) 0%,rgba(200,140,40,.04) 45%,transparent 72%);
}
.wall-name {
  position:absolute; top:36px; left:50%;
  transform:translateX(-50%) translateY(0px);
  font-family:'Cormorant Garamond',serif; font-style:italic;
  font-size:clamp(14px,2vw,20px); color:rgba(90,60,20,.3);
  letter-spacing:6px; white-space:nowrap;
  pointer-events:none; user-select:none;
  will-change:transform,opacity;
}
.wall-name span { color:rgba(90,60,20,.54); }

/* ══ DESK ASSEMBLY ══════════════════════════ */
.desk-scene { position:relative; }
.desk-wrap {
  position:relative; width:720px; max-width:92vw; height:500px;
  transform:perspective(1000px) rotateX(18deg) rotateZ(-1deg) scale(1.05);
  transform-style:preserve-3d;
  filter:drop-shadow(0 60px 36px rgba(40,20,5,.4)) drop-shadow(0 24px 16px rgba(40,20,5,.28));
  will-change:transform;
}

/* ── desk legs ── */
.desk-legs {
  position:absolute;
  top:100%; left:0; right:0;
  height:72px;
  pointer-events:none;
}
.leg {
  position:absolute; top:0; width:14px;
  background:linear-gradient(to bottom,var(--walnut-hi) 0%,var(--walnut) 50%,var(--walnut-face) 100%);
  border-radius:0 0 5px 5px;
  box-shadow:2px 0 6px rgba(0,0,0,.32),inset -2px 0 0 rgba(0,0,0,.18);
  opacity:0;
  animation:legDrop .6s cubic-bezier(.34,1.4,.64,1) forwards;
}
.lg1 { left:7%;  height:68px; animation-delay:.1s;  }
.lg2 { right:7%; height:68px; animation-delay:.18s; }
.lg3 { left:20%; height:56px; animation-delay:.08s; }
.lg4 { right:20%;height:56px; animation-delay:.14s; }

.desk-bar {
  position:absolute; top:42px; left:8%; right:8%; height:6px;
  background:linear-gradient(to bottom,var(--walnut-hi),var(--walnut-face));
  border-radius:2px; box-shadow:0 2px 4px rgba(0,0,0,.2);
  opacity:0; animation:legDrop .5s cubic-bezier(.34,1.2,.64,1) .28s forwards;
}

.desk-front {
  position:absolute; top:100%; left:0; right:0; height:10px;
  background:linear-gradient(to bottom,var(--walnut-face),#1A0C04);
  box-shadow:0 4px 8px rgba(0,0,0,.28);
}
.desk-surface {
  position:absolute; inset:0; border-radius:5px 5px 0 0;
  background:
    linear-gradient(to bottom,rgba(255,210,130,.12) 0px,rgba(255,210,130,.04) 6px,transparent 20px),
    linear-gradient(118deg,var(--walnut-hi) 0%,var(--walnut) 35%,#3A2210 65%,var(--walnut-face) 100%);
  box-shadow:inset 0 1px 0 rgba(255,220,140,.18);
  overflow:hidden;
}
.desk-grain {
  position:absolute; inset:0; pointer-events:none;
  background:
    repeating-linear-gradient(93deg,transparent,transparent 28px,rgba(0,0,0,.07) 28px,rgba(0,0,0,.07) 29px),
    repeating-linear-gradient(87deg,transparent,transparent 52px,rgba(255,255,255,.025) 52px,rgba(255,255,255,.025) 53px);
}
.desk-mat {
  position:absolute; top:18%; left:20%; right:8%; height:68%;
  background:rgba(16,10,4,.2); border-radius:1px;
}

/* ── lamp ── */
.lamp {
  position:absolute; top:-56px; right:17%; z-index:6;
  display:flex; flex-direction:column; align-items:center;
  cursor:default; transition:filter .3s;
}
.lamp:hover { filter:brightness(1.1); }
.lamp-shade {
  width:48px; height:26px;
  background:linear-gradient(165deg,#2A2624,#1C1A18);
  border-radius:24px 24px 0 0; position:relative;
  box-shadow:0 -2px 10px rgba(0,0,0,.3);
}
.lamp-bulb {
  position:absolute; bottom:5px; left:50%; transform:translateX(-50%);
  width:10px; height:10px; border-radius:50%; background:#FFF0A0;
  box-shadow:0 0 8px rgba(255,220,80,1),0 0 20px rgba(255,180,50,.8),0 0 44px rgba(255,150,30,.4);
}
.lamp-glow {
  position:absolute; top:26px; left:50%; transform:translateX(-50%);
  width:320px; height:220px; pointer-events:none;
  background:radial-gradient(ellipse at 50% 0%,rgba(255,205,70,.22) 0%,rgba(255,170,40,.09) 38%,transparent 68%);
  animation:flicker 5s ease-in-out infinite;
}
.lamp-neck { width:2px; height:22px; background:#1C1A18; }
.lamp-arm  { width:2px; height:52px; background:linear-gradient(to bottom,#2A2624,#1C1A18); transform:rotate(4deg); transform-origin:top center; }
.lamp-foot { width:34px; height:9px; background:linear-gradient(to bottom,#2A2624,#141210); border-radius:0 0 5px 5px; box-shadow:0 3px 8px rgba(0,0,0,.4); }

/* ── pencils & pens ── */
.pencils {
  position:absolute; top:5%; left:4%; z-index:5;
  display:flex; gap:5px; align-items:flex-end;
  transform:rotate(14deg); transform-origin:bottom center;
  transition:transform .4s cubic-bezier(.2,.85,.3,1);
  filter:drop-shadow(2px 6px 8px rgba(0,0,0,.32));
}
.pencils:hover { transform:rotate(8deg) translateY(-10px); }
.pencils:hover .pitem { animation:pencilFloat .6s ease-in-out infinite; }
.pencils:hover .pitem:nth-child(1) { animation-delay:0s; }
.pencils:hover .pitem:nth-child(2) { animation-delay:.08s; }
.pencils:hover .pitem:nth-child(3) { animation-delay:.16s; }

.pitem { position:relative; border-radius:1.5px 1.5px 0 0; }

/* pencil body */
.pcl {
  width:8px; border-radius:1.5px 1.5px 0 0;
  box-shadow:
    inset -2px 0 0 rgba(0,0,0,.22),
    inset  2px 0 0 rgba(255,255,255,.12),
    inset -4px 0 0 rgba(0,0,0,.08),
    inset  4px 0 0 rgba(255,255,255,.05);
}
.pcl::before {
  content:''; position:absolute; top:0; left:-0.5px; right:-0.5px; height:12px;
  background:linear-gradient(to bottom,#E8C4BE 0%,#D4A099 40%,#BA7F78 70%,#9A6060 100%);
  border-radius:2px 2px 0 0; border-bottom:3px solid #A89070;
  box-shadow:0 -1px 0 rgba(255,255,255,.18),inset 0 1px 0 rgba(255,255,255,.22);
}
.pcl::after {
  content:''; position:absolute; bottom:0; left:0; right:0; height:22px;
  background:linear-gradient(to bottom,
    var(--wood-tip, #C4956A) 0%,
    var(--wood-tip, #C4956A) 56%,
    #3A3028 58%,#1C1814 78%,#0E0C0A 100%
  );
  clip-path:polygon(20% 0%, 80% 0%, 50% 100%);
}
.pcl-yellow { background:linear-gradient(180deg,#E8C840 0%,#D4B020 50%,#B89010 100%); --wood-tip:#C4956A; }
.pcl-green  { background:linear-gradient(180deg,#6B9E5A 0%,#4E7D42 50%,#3A6030 100%); --wood-tip:#B8835A; }
.pcl-red    { background:linear-gradient(180deg,#C05040 0%,#A03530 50%,#802820 100%); --wood-tip:#C49060; }
.pcl-blue   { background:linear-gradient(180deg,#5070B8 0%,#3A5496 50%,#2A3E78 100%); --wood-tip:#C49870; }

/* pen body */
.pen {
  width:6px; border-radius:2px 2px 0 0;
  box-shadow:
    inset -1.5px 0 0 rgba(0,0,0,.30),
    inset  1.5px 0 0 rgba(255,255,255,.10),
    inset -3px   0 0 rgba(0,0,0,.10);
}
.pen::before {
  content:''; position:absolute; top:0; left:0; right:0; height:8px;
  border-radius:2px 2px 0 0;
  background:linear-gradient(135deg,#C8C4BC 0%,#9A9690 30%,#D4D0C8 55%,#888480 100%);
  box-shadow:0 1px 0 rgba(0,0,0,.2);
}
.pen::after {
  content:''; position:absolute; bottom:0; left:0; right:0; height:18px;
  background:linear-gradient(to bottom,
    var(--nib-color, #888480) 0%,#606058 40%,#3A3830 70%,#1E1C18 100%
  );
  clip-path:polygon(22% 0%, 78% 0%, 50% 100%);
}
.pen-clip {
  position:absolute; right:-1px; top:6px; width:1.5px; height:40%;
  background:linear-gradient(to bottom,rgba(200,195,185,.8),rgba(140,135,125,.4));
  border-radius:0 0 1px 1px;
}
.pen-navy    { background:linear-gradient(180deg,#2A3650 0%,#1C2640 50%,#121A30 100%); --nib-color:#6A6860; }
.pen-charcoal{ background:linear-gradient(180deg,#484440 0%,#30302C 50%,#202020 100%); --nib-color:#787470; }

/* ── scattered papers ── */
.scatter { position:absolute; background:var(--paper); border-radius:1px; box-shadow:0 2px 8px rgba(30,18,6,.22),0 1px 2px rgba(30,18,6,.14); }
.sc1 { top:6%;  left:26%; width:12%; height:9%; transform:rotate(-4deg); }
.sc2 { top:4%;  left:41%; width:10%; height:7%; transform:rotate(3.5deg); }
.sc3 { top:9%;  left:55%; width:8%;  height:6%; transform:rotate(-2deg); opacity:.7; }

/* ── big drawing paper ── */
.big-paper {
  position:absolute; top:12%; left:15%; width:50%; height:65%;
  background:var(--paper); border-radius:2px; cursor:pointer; z-index:5;
  box-shadow:0 8px 28px rgba(20,10,2,.38),0 3px 8px rgba(20,10,2,.22),inset 0 0 0 .5px rgba(0,0,0,.05);
  transition:transform .32s cubic-bezier(.2,.85,.3,1),box-shadow .32s;
  display:flex; align-items:center; justify-content:center; overflow:hidden;
}
.big-paper:hover {
  transform:translateY(-10px) scale(1.02);
  box-shadow:0 22px 56px rgba(20,10,2,.46),0 8px 18px rgba(20,10,2,.28),inset 0 0 0 .5px rgba(200,168,75,.2);
}
.big-paper::before { content:none; }
.big-paper::after  { content:none; }
.big-paper-shine {
  position:absolute; top:0; left:0; right:0; height:2px;
  background:linear-gradient(to right,transparent,rgba(255,235,180,.5),transparent);
  pointer-events:none;
}
.big-paper-body { position:relative; z-index:1; text-align:center; padding:14px 18px; }
.big-paper-icon {
  font-size:22px; color:rgba(110,75,30,.18); margin-bottom:14px; display:block;
  transition:color .3s;
}
.big-paper:hover .big-paper-icon { color:rgba(140,100,45,.36); }
.big-paper-title {
  font-family:'Cormorant Garamond',serif; font-style:italic;
  font-size:clamp(11px,1.6vw,15px); color:rgba(70,45,15,.36); line-height:1.75;
}
.big-paper-cta {
  font-size:8px; letter-spacing:2px; text-transform:uppercase;
  color:rgba(110,75,30,.22); margin-top:12px; transition:color .3s;
}
.big-paper:hover .big-paper-cta { color:rgba(160,115,50,.48); }
.paper-corner {
  position:absolute; bottom:0; right:0; width:0; height:0;
  border-style:solid; border-width:0 0 26px 26px;
  border-color:transparent transparent var(--paper-lo) transparent;
}

/* ── journal ── */
.journal {
  position:absolute; top:10%; right:4%; width:20%; height:42%;
  cursor:pointer; z-index:5;
  transition:transform .32s cubic-bezier(.2,.85,.3,1),filter .3s;
}
.journal:hover { transform:translateY(-8px) rotate(-4deg); }
.journal.no-sessions { filter:brightness(.6) saturate(.3); }
.journal-cover {
  width:100%; height:100%;
  background:linear-gradient(148deg,#C4916A,#A87050,#8A5A38);
  border-radius:2px 6px 6px 2px;
  box-shadow:-3px 4px 0 #A87050,-5px 6px 0 #6A4028,0 10px 24px rgba(30,12,4,.38);
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;
  position:relative; overflow:hidden;
}
.journal-cover::before {
  content:''; position:absolute; inset:8px;
  border:.75px solid rgba(240,205,130,.4); border-radius:1px 5px 5px 1px;
  pointer-events:none;
}
.journal-cover::after {
  content:''; position:absolute; inset:0; opacity:.04; pointer-events:none;
  background:repeating-linear-gradient(96deg,transparent,transparent 4px,rgba(0,0,0,.5) 4px,rgba(0,0,0,.5) 5px);
}
.journal-spine {
  position:absolute; left:0; top:0; width:13%; height:100%;
  background:#6A4028; border-radius:2px 0 0 2px;
  box-shadow:inset -2px 0 6px rgba(0,0,0,.22);
}
.journal-pages {
  position:absolute; right:-5px; top:5px; bottom:5px; width:6px;
  background:repeating-linear-gradient(to bottom,#F8F0DA 0,#F8F0DA 1px,#DDD0A0 1px,#DDD0A0 3px);
  border-radius:0 2px 2px 0; box-shadow:2px 0 5px rgba(0,0,0,.2);
}
.journal-orn  { font-size:15px; color:rgba(245,215,140,.9); position:relative; z-index:1; }
.journal-name {
  font-family:'Cormorant Garamond',serif; font-size:clamp(8px,1.1vw,11px);
  font-weight:600; color:#FFF4E0; letter-spacing:2px;
  position:relative; z-index:1; text-align:center; text-shadow:0 1px 3px rgba(80,40,0,.3);
}
.journal-rule {
  width:28px; height:.5px;
  background:linear-gradient(to right,transparent,rgba(245,215,140,.6),transparent);
  position:relative; z-index:1;
}
.journal-sub {
  font-size:7px; color:rgba(255,235,185,.8); letter-spacing:2.5px; text-transform:uppercase;
  position:relative; z-index:1; text-align:center; text-shadow:0 1px 2px rgba(80,40,0,.25);
}
.journal-label {
  position:absolute; bottom:-26px; left:50%; transform:translateX(-50%);
  font-size:8px; color:rgba(255,235,185,.8); white-space:nowrap; letter-spacing:1.5px;
  opacity:0; transition:opacity .2s; text-transform:uppercase;
}
.journal:hover .journal-label { opacity:1; }

/* ── palette cards ── */
.palette-cards { position:absolute; bottom:9%; left:5%; z-index:5; display:flex; gap:10px; }
.pal-card {
  width:60px; height:76px; background:var(--paper); border-radius:2px;
  box-shadow:0 3px 12px rgba(30,18,6,.28),0 1px 3px rgba(30,18,6,.16);
  display:flex; flex-direction:column; overflow:hidden;
  transform:rotate(var(--r));
  transition:transform .28s cubic-bezier(.2,.85,.3,1),box-shadow .28s;
}
.pal-card:hover { transform:rotate(var(--r)) translateY(-7px); box-shadow:0 12px 28px rgba(30,18,6,.36); }
.pal-swatches { flex:1; display:flex; flex-direction:column; }
.pal-swatch   { flex:1; }
.pal-date     { font-size:12px; color:rgba(70,46,16,.72); padding:3px 4px; text-align:center; background:var(--paper); letter-spacing:.6px; font-weight:500; }

/* ── stat papers ── */
.stat-paper {
  position:absolute; background:var(--paper); border-radius:1px;
  padding:10px 12px; z-index:5;
  box-shadow:0 4px 14px rgba(30,18,6,.28),0 1px 3px rgba(30,18,6,.15);
  transition:transform .28s cubic-bezier(.2,.85,.3,1),box-shadow .28s;
  overflow:hidden;
}
.stat-paper::after {
  content:''; position:absolute; inset:0; pointer-events:none;
  background:repeating-linear-gradient(transparent,transparent 14px,rgba(140,100,40,.06) 14px,rgba(140,100,40,.06) 15px);
}
.gc-tl { position:absolute; top:5px;    left:5px;  width:9px; height:9px; border-top:.75px solid rgba(200,168,75,.45); border-left:.75px solid rgba(200,168,75,.45); }
.gc-br { position:absolute; bottom:5px; right:5px; width:9px; height:9px; border-bottom:.75px solid rgba(200,168,75,.28); border-right:.75px solid rgba(200,168,75,.28); }
.sp-back  { bottom:18%; right:12%; width:21%; transform:rotate(-2deg); }
.sp-back:hover  { transform:rotate(-2deg) translateY(-7px);  box-shadow:0 14px 32px rgba(30,18,6,.36); }
.sp-front { bottom:5%;  right:7%;  width:23%; transform:rotate(2.8deg); }
.sp-front:hover { transform:rotate(2.8deg) translateY(-7px); box-shadow:0 14px 32px rgba(30,18,6,.36); }
.stat-lbl  { font-family:'Cormorant Garamond',serif; font-size:10px;  color:rgba(70,46,16,.44); text-transform:uppercase; letter-spacing:1.2px; margin-bottom:2px; position:relative; z-index:1; }
.stat-val  { font-family:'Cormorant Garamond',serif; font-size:22px; font-weight:300; color:#1E1710; line-height:1; position:relative; z-index:1; }
.stat-unit { font-size:11px; color:rgba(70,46,16,.34); margin-top:3px; letter-spacing:.5px; position:relative; z-index:1; }
.stat-bars { display:flex; gap:2px; align-items:flex-end; height:22px; margin-top:6px; position:relative; z-index:1; }
.stat-bar  { flex:1; border-radius:1px 1px 0 0; }

/* ── Journal Opening Overlay ── */
.journal-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(26,56,59,0.8); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
}

.book-anim-wrapper {
  position: relative;
  width: 160px; height: 240px;
  perspective: 1200px;
  animation: bookEnlarge 2.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
}

@keyframes bookEnlarge {
  0% { transform: scale(0.5); opacity: 0; }
  12% { transform: scale(1.2); opacity: 1; }
  85% { transform: scale(1.8); opacity: 1; }
  100% { transform: scale(3.5); opacity: 0; }
}

.book-part {
  position: absolute; inset: 0;
  transform-style: preserve-3d;
  transform-origin: left center;
}

.book-cover {
  z-index: 10;
  background: linear-gradient(148deg,#C4916A,#A87050,#8A5A38);
  border-radius: 2px 6px 6px 2px;
  box-shadow: inset 4px 0 10px rgba(0,0,0,0.1), 5px 5px 15px rgba(0,0,0,0.4);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  animation: coverFlip 2s 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.book-cover::before {
  content: ''; position: absolute; inset: 8px;
  border: .75px solid rgba(240,205,130,.4); border-radius: 1px 5px 5px 1px;
}

.book-back {
  z-index: 1;
  background: linear-gradient(148deg,#8A5A38,#A87050);
  border-radius: 2px 6px 6px 2px;
  box-shadow: 10px 20px 40px rgba(0,0,0,0.5);
}

.book-page {
  background: #F8F0DA;
  border-radius: 2px 4px 4px 2px;
  box-shadow: inset 2px 0 5px rgba(0,0,0,0.05);
}

.bp1 { z-index: 8; animation: pageFlip 1.5s 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
.bp2 { z-index: 7; animation: pageFlip 1.5s 0.55s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
.bp3 { z-index: 6; animation: pageFlip 1.5s 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
.bp-base { z-index: 5; }

@keyframes coverFlip {
  0% { transform: rotateY(0deg); }
  100% { transform: rotateY(-160deg); }
}

@keyframes pageFlip {
  0% { transform: rotateY(0deg); }
  100% { transform: rotateY(-155deg); }
}

.book-orn { font-size: 20px; color: rgba(245,215,140,.9); }
.book-name { font-family: 'Cormorant Garamond', serif; font-size: 16px; font-weight: 600; color: #FFF4E0; letter-spacing: 3px; }
.book-rule { width: 40px; height: 1px; background: linear-gradient(to right,transparent,rgba(245,215,140,.6),transparent); }
.book-sub { font-size: 10px; color: rgba(255,235,185,.8); letter-spacing: 3px; text-transform: uppercase; }
`;

export default function DeskSection() {
  const navigate = useNavigate();
  const { user } = useApp();

  // modal state — show if no name (user.name is always set in AppContext for now)
  const [showModal, setShowModal] = useState(false);
  const [modalName, setModalName] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [isOpeningJournal, setIsOpeningJournal] = useState(false);

  // scroll animation refs — no state to avoid re-renders
  const sectionRef = useRef(null);
  const deskWrapRef = useRef(null);
  const wallNameRef = useRef(null);
  const deskLegsRef = useRef(null);
  const progressRef = useRef(0);

  const TOTAL_PHASES = 2;

  useEffect(() => {
    // All animation logic lives inside the effect so there is no stale-closure
    // risk — every function here always has a fresh reference to the DOM refs.

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }
    function clamp01(v) {
      return Math.max(0, Math.min(1, v));
    }

    function applyAnim(p) {
      progressRef.current = Math.max(0, Math.min(TOTAL_PHASES, p));

      // Phase 1 (0→1): flatten tilt
      const p1 = clamp01(progressRef.current);
      const rotX = lerp(18, 0, p1);
      const rotZ = lerp(-1, 0, p1);
      const sc1 = lerp(1.05, 1, p1);

      // Phase 2 (1→2): zoom in
      const p2 = clamp01(progressRef.current - 1);
      const zoom = lerp(1, 1.38, p2);

      if (deskWrapRef.current) {
        deskWrapRef.current.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateZ(${rotZ}deg) scale(${sc1 * zoom})`;
      }
      if (wallNameRef.current) {
        wallNameRef.current.style.transform = `translateX(-50%) translateY(${lerp(0, -80, p1)}px)`;
        wallNameRef.current.style.opacity = String(lerp(1, 0.35, p1));
      }
      if (deskLegsRef.current) {
        const legP = clamp01((p1 - 0.3) / 0.45);
        deskLegsRef.current.style.opacity = String(1 - legP);
        deskLegsRef.current.style.transform = `translateY(${lerp(0, 28, legP)}px)`;
      }
    }

    // Set initial tilted state — matches the CSS default transform
    applyAnim(0);

    // Use a generous tolerance (10px) so sub-pixel rounding and fractional
    // viewport heights on different devices don't prevent the lock from firing.
    function deskInView() {
      const r = sectionRef.current?.getBoundingClientRect();
      if (!r) return false;
      return r.top <= 10 && r.bottom >= window.innerHeight - 10;
    }

    function onWheel(e) {
      if (!deskInView()) return;
      const goingDown = e.deltaY > 0;
      const goingUp = e.deltaY < 0;
      if (goingDown && progressRef.current < TOTAL_PHASES) {
        e.preventDefault();
        applyAnim(progressRef.current + Math.abs(e.deltaY) / 500);
      } else if (goingUp && progressRef.current > 0) {
        e.preventDefault();
        applyAnim(progressRef.current - Math.abs(e.deltaY) / 500);
      }
    }

    let touchStartY = 0;
    function onTouchStart(e) {
      touchStartY = e.touches[0].clientY;
    }
    function onTouchMove(e) {
      if (!deskInView()) return;
      const delta = touchStartY - e.touches[0].clientY;
      touchStartY = e.touches[0].clientY;
      const goingDown = delta > 0;
      const goingUp = delta < 0;
      if (goingDown && progressRef.current < TOTAL_PHASES) {
        e.preventDefault();
        applyAnim(progressRef.current + Math.abs(delta) / 300);
      } else if (goingUp && progressRef.current > 0) {
        e.preventDefault();
        applyAnim(progressRef.current - Math.abs(delta) / 300);
      }
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigation handler — show modal if no name
  function handleClick(action) {
    if (!user?.name) {
      setPendingAction(action);
      setShowModal(true);
      return;
    }
    dispatch(action);
  }

  function dispatch(action) {
    if (action === "session") navigate("/session");
    if (action === "journal") {
      setIsOpeningJournal(true);
      setTimeout(() => {
        navigate("/journal");
      }, 2500);
    }
  }

  function handleModalSave() {
    const trimmed = modalName.trim();
    if (!trimmed) return;
    // AppContext user.name is static in this project; just proceed
    setShowModal(false);
    setModalName("");
    if (pendingAction) {
      const a = pendingAction;
      setPendingAction(null);
      dispatch(a);
    }
  }

  function handleModalSkip() {
    setShowModal(false);
    setModalName("");
    setPendingAction(null);
  }

  const displayName = user?.name || null;

  return (
    <>
      <style>{DESK_CSS}</style>

      <section className="scene-outer" ref={sectionRef}>
        <div className="scene-sticky">
          <div className="scene-texture" />
          <div className="scene-vignette" />
          <div className="scene-lampglow" />

          <div className="wall-name" ref={wallNameRef}>
            {displayName ? (
              <>
                {displayName}
                <span>'s space</span>
              </>
            ) : (
              <>
                your<span> space</span>
              </>
            )}
          </div>

          <div className="desk-scene">
            <div className="desk-wrap" ref={deskWrapRef}>
              <div className="desk-surface">
                <div className="desk-grain" />
                <div className="desk-mat" />

                {/* Lamp */}
                <div className="lamp">
                  <div className="lamp-shade">
                    <div className="lamp-bulb" />
                  </div>
                  <div className="lamp-glow" />
                  <div className="lamp-neck" />
                  <div className="lamp-arm" />
                  <div className="lamp-foot" />
                </div>

                {/* Pencils & Pens */}
                <div className="pencils" aria-hidden="true">
                  <div
                    className="pitem pcl pcl-yellow"
                    style={{ height: 72, transform: "rotate(-2deg)" }}
                  />
                  <div
                    className="pitem pen pen-navy"
                    style={{ height: 80, transform: "rotate(1deg)" }}
                  >
                    <div className="pen-clip" />
                  </div>
                  <div
                    className="pitem pcl pcl-green"
                    style={{ height: 58, transform: "rotate(-1deg)" }}
                  />
                </div>

                {/* Scattered papers */}
                <div className="scatter sc1" />
                <div className="scatter sc2" />
                <div className="scatter sc3" />

                {/* Big drawing paper */}
                <div
                  className="big-paper"
                  role="button"
                  tabIndex={0}
                  aria-label="Open drawing session"
                  onClick={() => handleClick("session")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleClick("session");
                    }
                  }}
                >
                  <div className="big-paper-shine" />
                  <div className="big-paper-body">
                    <span className="big-paper-icon">✦</span>
                    <div className="big-paper-title">your canvas awaits</div>
                    <div className="big-paper-cta">click to begin</div>
                  </div>
                  <div className="paper-corner" />
                </div>

                {/* Journal */}
                <div
                  className="journal"
                  role="button"
                  tabIndex={0}
                  aria-label="Open journal"
                  onClick={() => handleClick("journal")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleClick("journal");
                    }
                  }}
                >
                  <div className="journal-cover">
                    <div className="journal-spine" />
                    <div className="journal-pages" />
                    <div className="journal-orn">✦</div>
                    <div className="journal-name">Arverié</div>
                    <div className="journal-rule" />
                    <div className="journal-sub">Your Journal</div>
                  </div>
                  <div className="journal-label">open journal</div>
                </div>

                {/* Palette cards */}
                <div className="palette-cards">
                  <div className="pal-card" style={{ "--r": "-5deg" }}>
                    <div className="pal-swatches">
                      <div
                        className="pal-swatch"
                        style={{ background: "#2C3E50" }}
                      />
                      <div
                        className="pal-swatch"
                        style={{ background: "#34495E" }}
                      />
                      <div
                        className="pal-swatch"
                        style={{ background: "#1A252F" }}
                      />
                    </div>
                    <div className="pal-date">mar 3</div>
                  </div>
                  <div className="pal-card" style={{ "--r": "2deg" }}>
                    <div className="pal-swatches">
                      <div
                        className="pal-swatch"
                        style={{ background: "#5D6D7E" }}
                      />
                      <div
                        className="pal-swatch"
                        style={{ background: "#E59866" }}
                      />
                      <div
                        className="pal-swatch"
                        style={{ background: "#F0B27A" }}
                      />
                    </div>
                    <div className="pal-date">mar 9</div>
                  </div>
                  <div className="pal-card" style={{ "--r": "-2.5deg" }}>
                    <div className="pal-swatches">
                      <div
                        className="pal-swatch"
                        style={{ background: "#F4D03F" }}
                      />
                      <div
                        className="pal-swatch"
                        style={{ background: "#58D68D" }}
                      />
                      <div
                        className="pal-swatch"
                        style={{ background: "#7FB3D3" }}
                      />
                    </div>
                    <div className="pal-date">mar 14</div>
                  </div>
                </div>

                {/* Stat papers */}
                <div className="stat-paper sp-back">
                  <div className="gc-tl" />
                  <div className="gc-br" />
                  <div className="stat-lbl">sessions</div>
                  <div className="stat-val">5</div>
                  <div className="stat-unit">this month</div>
                </div>
                <div className="stat-paper sp-front">
                  <div className="gc-tl" />
                  <div className="gc-br" />
                  <div className="stat-lbl">avg lift</div>
                  <div className="stat-val">+1.8</div>
                  <div className="stat-unit">mood · per session</div>
                  <div className="stat-bars">
                    <div
                      className="stat-bar"
                      style={{ height: "36%", background: "#B09070" }}
                    />
                    <div
                      className="stat-bar"
                      style={{ height: "50%", background: "#B89868" }}
                    />
                    <div
                      className="stat-bar"
                      style={{ height: "46%", background: "#C09860" }}
                    />
                    <div
                      className="stat-bar"
                      style={{ height: "68%", background: "#C4956A" }}
                    />
                    <div
                      className="stat-bar"
                      style={{ height: "84%", background: "#C8A84B" }}
                    />
                  </div>
                </div>
              </div>
              {/* /desk-surface */}

              <div className="desk-front" />

              <div className="desk-legs" ref={deskLegsRef}>
                <div className="leg lg1" />
                <div className="leg lg2" />
                <div className="leg lg3" />
                <div className="leg lg4" />
                <div className="desk-bar" />
              </div>
            </div>
            {/* /desk-wrap */}
          </div>
          {/* /desk-scene */}
        </div>
        {/* /scene-sticky */}
      </section>

      {/* Name modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            key="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) handleModalSkip();
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 300,
              background: "rgba(20,14,6,.72)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ duration: 0.28 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              style={{
                background: "linear-gradient(155deg,#1E1812,#140E08)",
                border: ".5px solid rgba(196,149,106,.22)",
                borderRadius: "3px",
                padding: "2.6rem 2.2rem 2.2rem",
                maxWidth: "340px",
                width: "100%",
                textAlign: "center",
                position: "relative",
                boxShadow:
                  "0 40px 100px rgba(0,0,0,.65),inset 0 1px 0 rgba(200,168,75,.06)",
              }}
            >
              {/* Corner marks via pseudo — replicated as divs */}
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  width: 18,
                  height: 18,
                  borderTop: ".75px solid rgba(196,149,106,.38)",
                  borderLeft: ".75px solid rgba(196,149,106,.38)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 10,
                  right: 10,
                  width: 18,
                  height: 18,
                  borderBottom: ".75px solid rgba(196,149,106,.38)",
                  borderRight: ".75px solid rgba(196,149,106,.38)",
                }}
              />

              <div
                style={{
                  fontSize: "8.5px",
                  letterSpacing: "4px",
                  textTransform: "uppercase",
                  color: "rgba(196,149,106,.5)",
                  marginBottom: "20px",
                }}
              >
                welcome to arverié
              </div>
              <div
                id="modal-title"
                style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: "30px",
                  fontWeight: 300,
                  color: "#F5EFE0",
                  marginBottom: "8px",
                }}
              >
                what should we
                <br />
                call you?
              </div>
              <div
                style={{
                  width: "32px",
                  height: ".5px",
                  background:
                    "linear-gradient(to right,transparent,rgba(196,149,106,.35),transparent)",
                  margin: "0 auto 14px",
                }}
              />
              <p
                style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontStyle: "italic",
                  fontSize: "13px",
                  color: "rgba(200,182,155,.42)",
                  lineHeight: 1.65,
                  marginBottom: "30px",
                }}
              >
                this is your space.
                <br />
                we'll remember you here.
              </p>
              <input
                type="text"
                value={modalName}
                onChange={(e) => setModalName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleModalSave();
                }}
                placeholder="your name"
                autoComplete="off"
                maxLength={30}
                aria-label="Your name"
                autoFocus
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,.04)",
                  border: ".5px solid rgba(196,149,106,.22)",
                  borderRadius: "2px",
                  padding: "13px 16px",
                  color: "#F5EFE0",
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: "20px",
                  fontWeight: 300,
                  outline: "none",
                  marginBottom: "14px",
                  textAlign: "center",
                  letterSpacing: "2px",
                }}
              />
              <button
                onClick={handleModalSave}
                style={{
                  width: "100%",
                  background: "rgba(196,149,106,.1)",
                  color: "#F5EFE0",
                  border: ".5px solid rgba(196,149,106,.38)",
                  padding: "13px",
                  borderRadius: "2px",
                  fontSize: "10.5px",
                  letterSpacing: "2.5px",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Enter My Space →
              </button>
              <div
                onClick={handleModalSkip}
                style={{
                  fontSize: "9px",
                  color: "rgba(200,182,155,.28)",
                  marginTop: "16px",
                  cursor: "pointer",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                }}
              >
                maybe later
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpeningJournal && (
          <motion.div
            className="journal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="book-anim-wrapper">
              {/* Back cover (shadow layer) */}
              <div className="book-part book-back"></div>

              {/* Base stack of pages */}
              <div
                className="book-part book-page bp-base"
                style={{ right: "-6px", top: "4px", bottom: "4px" }}
              ></div>

              {/* Flipping pages */}
              <div
                className="book-part book-page bp3"
                style={{ right: "-5px", top: "5px", bottom: "5px" }}
              ></div>
              <div
                className="book-part book-page bp2"
                style={{ right: "-3px", top: "6px", bottom: "6px" }}
              ></div>
              <div
                className="book-part book-page bp1"
                style={{ right: "-1px", top: "7px", bottom: "7px" }}
              ></div>

              {/* The front cover flipping open */}
              <div className="book-part book-cover">
                <div className="book-orn">✦</div>
                <div className="book-name">Arverié</div>
                <div className="book-rule" />
                <div className="book-sub">journal</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
