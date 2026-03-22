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
  background:transparent;
}
.room-wall {
  --window-top: 15%;
  --window-scale: 1;
  --window-width-base: 462px;
  --window-width: calc(var(--window-width-base) * var(--window-scale));
  --window-height-ratio: 0.5974;
  --window-height: calc(var(--window-width) * var(--window-height-ratio));
  --window-gap: 68px;
  position:absolute;
  inset:0;
  pointer-events:none;
  z-index:1;
}

/* Explicit Safari class makes window-size testing deterministic. */
.scene-outer.is-safari-browser .room-wall {
  --window-scale: 0.90;
}
@media (min-width: 1201px) {
  .scene-outer.is-safari-browser .room-wall {
    --window-scale: 0.84;
  }
}
.room-wall-piece {
  position:absolute;
  background:linear-gradient(180deg,#EEE8D5 0%,#E7DDC4 100%);
}
.room-wall-top {
  top:0;
  left:0;
  right:0;
  height:var(--window-top);
}
.room-wall-left {
  top:var(--window-top);
  bottom:22%;
  left:0;
  width:calc(50% - ((var(--window-width) * 2 + var(--window-gap)) / 2));
}
.room-wall-middle {
  top:var(--window-top);
  bottom:22%;
  left:calc(50% - (var(--window-gap) / 2));
  width:var(--window-gap);
}
.room-wall-right {
  top:var(--window-top);
  bottom:22%;
  right:0;
  width:calc(50% - ((var(--window-width) * 2 + var(--window-gap)) / 2));
}
.room-wall-bottom {
  left:0;
  right:0;
  bottom:22%;
  height:calc(100% - var(--window-top) - var(--window-height) - 22%);
}
.scene-texture {
  position:absolute; inset:0; pointer-events:none; opacity:.35;
  background:
    repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(140,110,60,.04) 3px,rgba(140,110,60,.04) 4px),
    repeating-linear-gradient(90deg,transparent,transparent 6px,rgba(140,110,60,.02) 6px,rgba(140,110,60,.02) 12px);
  z-index:2;
}
.scene-vignette {
  position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(ellipse at 50% 45%,transparent 35%,rgba(90,60,20,.13) 100%);
  z-index:2;
}
.scene-lampglow {
  position:absolute; pointer-events:none; width:50%; height:65%;
  top:8%; left:50%; transform:translateX(-20%);
  background:radial-gradient(ellipse at 62% 18%,rgba(220,165,55,.08) 0%,rgba(200,140,40,.03) 45%,transparent 72%);
  z-index:2;
}

/* Crown molding */
.room-molding {
  position:absolute; top:0; left:0; right:0; height:20px;
  background:linear-gradient(to bottom,#D8CC98,#C4B47E,#DACEAA);
  border-bottom:1px solid rgba(140,110,60,.15);
  pointer-events:none; z-index:3;
}
/* Hardwood floor */
.room-floor {
  position:absolute; bottom:0; left:0; right:0; height:22%;
  background:
    repeating-linear-gradient(90deg,
      transparent,transparent 99px,
      rgba(0,0,0,.04) 99px,rgba(0,0,0,.04) 100px
    ),
    linear-gradient(180deg,#C8A85A 0%,#B89040 50%,#A07830 100%);
  pointer-events:none; z-index:1;
}
.room-rug-hint {
  position:absolute;
  left:50%;
  bottom:5%;
  width:min(64vw, 940px);
  height:17%;
  transform:translateX(-50%);
  border-radius:48% 52% 42% 58% / 65% 62% 38% 35%;
  background:
    radial-gradient(ellipse at 50% 42%,rgba(210,186,128,.18),rgba(156,121,66,.13) 54%,rgba(126,92,44,.08) 82%,transparent 100%);
  box-shadow:0 14px 40px rgba(45,24,6,.2);
  pointer-events:none;
  z-index:1;
}
/* Baseboard */
.room-baseboard {
  position:absolute; bottom:22%; left:0; right:0; height:10px;
  background:linear-gradient(to bottom,#DCC88A,#C4AA6A);
  box-shadow:0 3px 8px rgba(50,28,5,.18);
  pointer-events:none; z-index:2;
}

/* ══ WINDOWS (two panels side by side) ════════════════════ */
.room-window-wrap {
  position:absolute;
  top:var(--window-top);
  left:50%;
  transform:translateX(-50%);
  display:flex;
  gap:var(--window-gap);
  pointer-events:none; z-index:2;
  will-change:transform,opacity;
}
.room-window-panel { display:flex; flex-direction:column; }
/* Outer wall trim — window sill frame */
.room-window-trim {
  position:relative;
  padding:9px 9px 0 9px;
  background:transparent;
  border-radius:4px 4px 0 0;
  box-shadow:0 8px 20px rgba(50,28,5,.2);
  z-index:1;
}
.room-window-curtain {
  position:absolute;
  inset:1px;
  border-radius:2px;
  overflow:hidden;
  pointer-events:none;
  z-index:2;
}
.room-window-curtain::before,
.room-window-curtain::after {
  content:"";
  position:absolute;
  top:0;
  bottom:0;
  width:50%;
  background:
    repeating-linear-gradient(90deg,rgba(255,255,255,.22) 0 3px,rgba(255,255,255,.08) 3px 7px),
    linear-gradient(180deg,rgba(255,255,255,.78),rgba(255,255,255,.58) 62%,rgba(245,245,245,.42) 100%);
  border:1px solid rgba(255,255,255,.54);
  backdrop-filter: blur(.7px);
  -webkit-backdrop-filter: blur(.7px);
}
.room-window-curtain::before {
  left:0;
  border-right:none;
  border-radius:2px 0 0 2px;
}
.room-window-curtain::after {
  right:0;
  border-left:none;
  border-radius:0 2px 2px 0;
}
.room-window-curtain-center {
  position:absolute;
  left:50%;
  top:0;
  bottom:0;
  width:4px;
  transform:translateX(-50%);
  background:rgba(188,165,120,.7);
  z-index:3;
}
.room-window-trim::before {
  content:"";
  position:absolute;
  inset:0;
  border-radius:4px 4px 0 0;
  box-shadow:
    inset 0 0 0 9px #C4B878,
    inset 0 3px 8px rgba(0,0,0,.1);
  pointer-events:none;
}
/* Single sill strip below both windows */
.room-window-sill-strip {
  position:absolute;
  left:50%;
  top:calc(var(--window-height) + 12px);
  width:calc(var(--window-width) * 2 + var(--window-gap) + 36px);
  height:14px;
  transform:translateX(-50%);
  border-radius:0 0 4px 4px;
  background:linear-gradient(to bottom,#CCBE7D,#9D7633);
  box-shadow:0 5px 11px rgba(50,28,5,.28);
  z-index:4;
}
/* Glass pane */
.room-window-glass {
  width:var(--window-width);
  height:var(--window-height);
  position:relative;
  background:
    radial-gradient(circle at 22% 16%,rgba(255,235,195,.38),transparent 36%),
    linear-gradient(180deg,rgba(170,198,214,.46) 0%,rgba(148,173,186,.34) 48%,rgba(131,157,169,.28) 100%);
  border-radius:2px;
  box-shadow:
    inset 0 0 0 1px rgba(100,78,42,.34),
    inset 0 0 40px rgba(255,220,170,.08);
  z-index:1;
}
.room-window-glass::before {
  content:"";
  position:absolute;
  left:50%;
  top:0;
  bottom:0;
  width:1px;
  transform:translateX(-50%);
  background:linear-gradient(180deg,rgba(91,72,40,.14),rgba(91,72,40,.3),rgba(91,72,40,.16));
  z-index:1;
}
.room-window-glass::after {
  content:"";
  position:absolute;
  top:50%;
  left:0;
  right:0;
  height:1px;
  transform:translateY(-50%);
  background:linear-gradient(90deg,rgba(91,72,40,.14),rgba(91,72,40,.3),rgba(91,72,40,.14));
  z-index:1;
}
/* Soft light spill below windows */
.room-window-glow {
  position:absolute; top:100%; left:50%; transform:translateX(-50%);
  width:min(86vw,920px);
  height:88px;
  pointer-events:none;
  background:radial-gradient(ellipse at 50% 0%,rgba(220,205,155,.18) 0%,transparent 70%);
}
.room-art {
  position:absolute;
  top:15%;
  left:6%;
  width:min(11vw,150px);
  aspect-ratio:4/5;
  border-radius:3px;
  background:linear-gradient(145deg,#B99962,#8E6D3D);
  box-shadow:0 11px 24px rgba(42,22,4,.22);
  pointer-events:none;
  z-index:3;
}
.room-art::before {
  content:"";
  position:absolute;
  inset:11px;
  border-radius:2px;
  background:var(--paper);
  box-shadow:inset 0 0 0 1px rgba(146,110,58,.2);
}
.room-art-canvas {
  position:absolute;
  inset:20px;
  border-radius:1px;
  background:
    radial-gradient(circle at 70% 22%,rgba(247,210,142,.62),rgba(236,182,98,.36) 18%,transparent 44%),
    linear-gradient(180deg,rgba(128,174,192,.55) 0%,rgba(109,154,166,.42) 40%,rgba(95,128,102,.62) 41%,rgba(88,114,83,.72) 100%);
  overflow:hidden;
}
.room-art-canvas::before,
.room-art-canvas::after {
  content:"";
  position:absolute;
}
.room-art-canvas::before {
  left:-8%;
  right:-10%;
  bottom:20%;
  height:48%;
  border-radius:48% 52% 0 0;
  background:
    radial-gradient(ellipse at 28% 30%,rgba(127,162,115,.82),rgba(90,124,82,.88) 58%,rgba(73,98,68,.94) 100%);
  box-shadow:inset 0 10px 16px rgba(173,210,141,.18);
}
.room-art-canvas::after {
  left:32%;
  bottom:-6%;
  width:36%;
  height:60%;
  border-radius:50% 50% 44% 44%;
  transform:rotate(-2deg);
  background:
    linear-gradient(180deg,rgba(227,199,150,.92) 0%,rgba(184,151,102,.86) 36%,rgba(127,96,59,.9) 72%,rgba(99,74,43,.94) 100%);
  filter:blur(.2px);
  opacity:.94;
}

.room-shelf {
  position:absolute;
  top:21%;
  right:3%;
  width:min(14vw,180px);
  height:12px;
  border-radius:2px;
  background:linear-gradient(180deg,#B88F4F,#8D6734);
  box-shadow:0 8px 12px rgba(42,22,4,.22);
  pointer-events:none;
  z-index:3;
}
.room-shelf::before,
.room-shelf::after {
  content:"";
  position:absolute;
  top:100%;
  width:3px;
  height:13px;
  background:rgba(94,67,36,.42);
}
.room-shelf::before { left:18%; }
.room-shelf::after { right:14%; }
.room-shelf-books {
  position:absolute;
  left:8%;
  bottom:100%;
  display:flex;
  gap:4px;
  align-items:flex-end;
}
.room-book {
  width:11px;
  border-radius:1px 1px 0 0;
  box-shadow:inset -1px 0 0 rgba(0,0,0,.18);
}
.rb1 { height:35px; background:linear-gradient(180deg,#946749,#6E4B34); }
.rb2 { height:41px; background:linear-gradient(180deg,#74806D,#58644F); }
.rb3 { height:30px; background:linear-gradient(180deg,#B0865A,#825D3A); }
.rb4 { height:37px; background:linear-gradient(180deg,#8E6C57,#6B4D3D); }

.room-plant {
  position:absolute;
  right:12%;
  bottom:100%;
  width:40px;
  height:56px;
}
.room-plant-pot {
  position:absolute;
  left:8px;
  bottom:0;
  width:24px;
  height:18px;
  border-radius:2px 2px 6px 6px;
  background:linear-gradient(180deg,#A4724B,#7A4E30);
  box-shadow:0 4px 8px rgba(42,22,4,.22);
}
.room-plant-leaf {
  position:absolute;
  bottom:11px;
  width:14px;
  height:30px;
  border-radius:20px 20px 0 20px;
  background:linear-gradient(180deg,#7A9258,#55713D);
  transform-origin:bottom center;
}
.rleaf1 { left:8px; transform:rotate(-22deg); }
.rleaf2 { left:15px; height:34px; transform:rotate(4deg); }
.rleaf3 { left:22px; transform:rotate(24deg) scaleX(-1); }

.room-clock {
  position:absolute;
  top:6%;
  right:7%;
  width:54px;
  height:54px;
  border-radius:50%;
  background:radial-gradient(circle at 36% 30%,#FBF3DA,#E5D4AA 62%,#D4BB8A 100%);
  box-shadow:0 8px 18px rgba(42,22,4,.18), inset 0 0 0 2px rgba(130,94,49,.38);
  pointer-events:none;
  z-index:3;
}
.room-clock::before,
.room-clock::after {
  content:"";
  position:absolute;
  left:52%;
  bottom:45%;
  transform-origin:bottom center;
  border-radius:999px;
  background:rgba(95,66,34,.68);
}
.room-clock::before {
  width:2px;
  height:18px;
  transform:translateX(-50%) rotate(34deg);
}
.room-clock::after {
  width:2px;
  height:23px;
  transform:translateX(-50%) rotate(-48deg);
}

.room-wall-lamp {
  position:absolute;
  top:11%;
  left:10%;
  width:24px;
  height:24px;
  border-radius:50% 50% 46% 46%;
  background:radial-gradient(circle at 36% 28%,#E5CC8C 0%,#B69354 52%,#846231 100%);
  box-shadow:0 6px 14px rgba(42,22,4,.24), inset 0 -1px 0 rgba(72,48,20,.36);
  pointer-events:none;
  z-index:3;
}
.room-wall-lamp::before {
  content:"";
  position:absolute;
  left:50%;
  top:4px;
  width:88px;
  height:88px;
  transform:translateX(-50%);
  background:radial-gradient(circle,rgba(234,192,118,.3) 0%,rgba(234,192,118,.1) 42%,transparent 70%);
}
.room-wall-lamp::after {
  content:"";
  position:absolute;
  left:50%;
  top:-9px;
  width:3px;
  height:10px;
  transform:translateX(-50%);
  border-radius:3px;
  background:rgba(112,82,41,.7);
}

.room-side-cabinet {
  position:absolute;
  right:4%;
  bottom:20%;
  width:min(19vw, 280px);
  height:min(22vh, 200px);
  border-radius:5px 5px 3px 3px;
  padding:12px 10px 8px;
  background:
    linear-gradient(180deg,rgba(183,139,79,.22),transparent 22%),
    linear-gradient(118deg,#8D6734 0%,#765228 48%,#5E401E 100%);
  box-shadow:
    0 12px 24px rgba(42,22,4,.22),
    inset 0 1px 0 rgba(255,220,160,.12),
    inset 0 -1px 0 rgba(40,18,4,.3);
  pointer-events:none;
  z-index:3;
}
.room-side-cabinet::before {
  content:"";
  position:absolute;
  left:0;
  right:0;
  top:-7px;
  height:9px;
  border-radius:3px 3px 1px 1px;
  background:linear-gradient(180deg,#A77A45,#7A5529);
  box-shadow:0 4px 8px rgba(30,14,2,.2);
}
.cabinet-drawers {
  position:relative;
  display:grid;
  grid-template-rows:repeat(3, 1fr);
  gap:6px;
  height:100%;
}
.cabinet-drawer {
  position:relative;
  border-radius:2px;
  background:
    linear-gradient(180deg,rgba(210,170,112,.14),transparent 34%),
    linear-gradient(112deg,#7E5A2E 0%,#684620 52%,#55381A 100%);
  box-shadow:
    inset 0 1px 0 rgba(240,205,150,.1),
    inset 0 -1px 0 rgba(40,20,7,.36);
}
.cabinet-drawer::before {
  content:"";
  position:absolute;
  left:10px;
  right:10px;
  top:0;
  height:1px;
  background:rgba(237,205,154,.14);
}
.cabinet-handle {
  position:absolute;
  top:50%;
  left:50%;
  width:12px;
  height:12px;
  border-radius:50%;
  transform:translate(-50%, -50%);
  background:radial-gradient(circle at 36% 30%,#E5CF95,#B7904D 58%,#8A642D 100%);
  box-shadow:0 1px 3px rgba(0,0,0,.22);
}
.cabinet-legs {
  position:absolute;
  top:100%;
  left:0;
  right:0;
  height:30px;
  pointer-events:none;
}
.cabinet-leg {
  position:absolute;
  top:0;
  width:10px;
  height:28px;
  border-radius:0 0 3px 3px;
  background:linear-gradient(to right,#120804 0%,#2A1A0A 35%,#1E1008 65%,#0E0604 100%);
  box-shadow:
    2px 0 6px rgba(0,0,0,.5),
    inset -1px 0 0 rgba(0,0,0,.34),
    inset 1px 0 0 rgba(255,255,255,.04);
}
.cabinet-leg.l1 { left:12%; transform:rotate(-1deg); }
.cabinet-leg.l2 { left:38%; transform:rotate(0.6deg); }
.cabinet-leg.l3 { right:38%; transform:rotate(-0.6deg); }
.cabinet-leg.l4 { right:12%; transform:rotate(1deg); }
.wall-name {
  position:absolute; top:7%; left:50%;
  transform:translateX(-50%) translateY(0px);
  font-family:'Cormorant Garamond',serif; font-style:italic;
  font-size:clamp(22px,3vw,34px); color:rgba(90,60,20,.46);
  letter-spacing:6px; white-space:nowrap;
  pointer-events:none; user-select:none;
  z-index:7;
  will-change:transform,opacity;
}
.wall-name span { color:rgba(90,60,20,.68); }

/* ══ DESK ASSEMBLY ══════════════════════════ */
.desk-wrap {
  position:relative; width:960px; max-width:92vw; height:460px;
  transform:perspective(1000px) rotateX(18deg) rotateZ(0deg) scale(0.78);
  transform-origin:50% 80%;
  filter:drop-shadow(0 60px 36px rgba(40,20,5,.4)) drop-shadow(0 24px 16px rgba(40,20,5,.28));
  will-change:transform;
}

/* ══ DESK SCENE ══════════════════════════ */
.desk-scene { position:absolute; bottom:14%; left:50%; transform:translateX(-50%); z-index:5; }

/* ── desk legs ── */
.desk-legs {
  position:absolute;
  top:100%; left:0; right:0;
  height:100px;
  pointer-events:none;
}
.leg {
  position:absolute; top:0; width:30px;
  background:linear-gradient(to right,#120804 0%,#2A1A0A 35%,#1E1008 65%,#0E0604 100%);
  border-radius:0 0 4px 4px;
  box-shadow:3px 0 10px rgba(0,0,0,.55),inset -3px 0 0 rgba(0,0,0,.35),inset 3px 0 0 rgba(255,255,255,.04);
  opacity:0;
  animation:legDrop .6s cubic-bezier(.34,1.4,.64,1) forwards;
}
.lg1 { left:6%;  height:96px; animation-delay:.1s;  transform-origin:top center; transform:rotate(-1.5deg); }
.lg2 { right:6%; height:96px; animation-delay:.18s; transform-origin:top center; transform:rotate(1.5deg); }
.lg3 { left:22%; height:82px; animation-delay:.08s; width:22px; background:linear-gradient(to right,#0E0604 0%,#1E1008 60%,#0A0402 100%); }
.lg4 { right:22%;height:82px; animation-delay:.14s; width:22px; background:linear-gradient(to right,#0E0604 0%,#1E1008 60%,#0A0402 100%); }

.desk-bar {
  position:absolute; top:56px; left:7%; right:7%; height:10px;
  background:linear-gradient(to bottom,#2A1A0A,#120804);
  border-radius:2px; box-shadow:0 3px 8px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.05);
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

/* ── scattered papers — hidden ── */
.sc1, .sc2, .sc3 { display:none; }

/* ── back paper (previous drawing, peeks from behind main canvas) ── */
.back-paper {
  position:absolute; top:11%; left:10%; width:43%; height:57%;
  background:var(--paper-lo); border-radius:2px; z-index:4;
  transform:rotate(8deg) translateX(47%);
  box-shadow:0 4px 18px rgba(20,10,2,.28), 0 1px 4px rgba(20,10,2,.14);
  pointer-events:none; overflow:hidden;
}
.back-paper img {
  width:100%;
  height:100%;
  object-fit:contain;
  object-position:center center;
  background:var(--paper-lo);
  opacity:0.7;
}

/* ── big drawing paper ── */
.big-paper {
  position:absolute; top:6%; left:17%; width:35%; height:73%;
  background:var(--paper); border-radius:2px; cursor:pointer; z-index:5;
  box-shadow:0 8px 28px rgba(20,10,2,.38),0 3px 8px rgba(20,10,2,.22),inset 0 0 0 .5px rgba(0,0,0,.05);
  transition:transform .32s cubic-bezier(.2,.85,.3,1),box-shadow .32s;
  display:flex; align-items:center; justify-content:center; overflow:hidden;
  isolation:isolate;
}
.big-paper:hover {
  transform:translateY(-10px) scale(1.02);
  box-shadow:0 22px 56px rgba(20,10,2,.46),0 8px 18px rgba(20,10,2,.28),inset 0 0 0 .5px rgba(200,168,75,.2);
}
.big-paper::before { content:none; }
.big-paper::after  { content:none; }
/* Safety: hide any stale center clip markup from old bundles/cached UI */
.big-paper-clip { display:none !important; }
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

/* Safari-only safety for legacy/ghost clip artifacts over the main paper */
.is-safari-browser .back-paper { z-index:3; }
.is-safari-browser .big-paper { z-index:6; }
.is-safari-browser .big-paper::before,
.is-safari-browser .big-paper::after,
.is-safari-browser .big-paper .big-paper-clip,
.is-safari-browser .big-paper [class*="clip"] {
  content:none !important;
  display:none !important;
}

/* ── journal ── */
.journal {
  position:absolute; top:5%; right:4%; width:14%; height:40%;
  cursor:pointer; z-index:5; overflow:visible;
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

/* ── palette cards — vertical stack left side below pens ── */
.palette-cards { position:absolute; top:40%; left:3%; z-index:5; display:flex; flex-direction:column; gap:8px; }
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
.sp-back  { top:56%; right:4%; width:17%; transform:rotate(-2deg); }
.sp-back:hover  { transform:rotate(-2deg) translateY(-7px);  box-shadow:0 14px 32px rgba(30,18,6,.36); }
.sp-front { top:74%; right:4%; width:17%; transform:rotate(2.5deg); }
.sp-front:hover { transform:rotate(2.5deg) translateY(-7px); box-shadow:0 14px 32px rgba(30,18,6,.36); }
.stat-lbl  { font-family:'Cormorant Garamond',serif; font-size:10px;  color:rgba(70,46,16,.44); text-transform:uppercase; letter-spacing:1.2px; margin-bottom:2px; position:relative; z-index:1; }
.stat-val  { font-family:'Cormorant Garamond',serif; font-size:22px; font-weight:300; color:#1E1710; line-height:1; position:relative; z-index:1; }
.stat-unit { font-size:11px; color:rgba(70,46,16,.34); margin-top:3px; letter-spacing:.5px; position:relative; z-index:1; }
.stat-bars { display:flex; gap:2px; align-items:flex-end; height:22px; margin-top:6px; position:relative; z-index:1; }
.stat-bar  { flex:1; border-radius:1px 1px 0 0; }

@media (max-width: 1200px) {
  .room-wall {
    --window-width-base: 392px;
    --window-height-ratio: 0.602;
    --window-gap: 42px;
  }
  .room-art {
    left:2.5%;
    width:min(11vw,132px);
    top:28%;
  }
  .room-shelf {
    right:2.5%;
    width:min(13vw,160px);
  }
  .room-side-cabinet {
    right:2%;
    width:min(20vw, 186px);
    height:min(21vh, 136px);
  }
}

@media (max-width: 900px) {
  .room-wall {
    --window-top: 13%;
    --window-width-base: min(43vw, 268px);
    --window-height-ratio: 0.709;
    --window-gap: min(5vw, 26px);
  }
  .room-window-wrap { top:14%; }
  .room-clock { right:3%; width:48px; height:48px; }
  .room-shelf,
  .room-art,
  .room-wall-lamp { display:none; }
  .room-side-cabinet {
    right:2%;
    width:min(24vw, 156px);
    height:min(17vh, 112px);
  }
  .cabinet-legs { height:24px; }
  .cabinet-leg { height:22px; width:8px; }
}

@media (max-width: 640px) {
  .room-wall {
    --window-top: 15%;
    --window-width-base: min(39vw, 170px);
    --window-height-ratio: 0.8;
    --window-gap: 14px;
  }
  .room-window-trim { padding:6px 6px 0 6px; }
  .room-window-trim::before { box-shadow:inset 0 0 0 6px #C4B878,inset 0 2px 6px rgba(0,0,0,.1); }
  .room-window-sill-strip { height:8px; top:calc(var(--window-height) + 9px); }
  .room-window-glow { width:min(92vw, 420px); height:54px; }
  .room-art,
  .room-shelf,
  .room-wall-lamp,
  .room-clock,
  .room-side-cabinet { display:none; }
  .room-plant { transform:scale(.88); transform-origin:bottom right; }
  .room-rug-hint { width:92vw; height:14%; bottom:6%; opacity:.72; }
}

@media (max-width: 767px) {
  .lamp:hover,
  .pencils:hover,
  .big-paper:hover,
  .journal:hover,
  .pal-card:hover,
  .sp-back:hover,
  .sp-front:hover {
    transform: none !important;
    filter: none !important;
    box-shadow: inherit !important;
  }

  .pencils:hover .pitem {
    animation: none !important;
  }

  .journal:hover .journal-label,
  .big-paper:hover .big-paper-icon,
  .big-paper:hover .big-paper-cta {
    opacity: inherit !important;
    color: inherit !important;
  }
}
`;

export default function DeskSection({
  onDeskInViewChange,
  sectionId = "desk-section",
}) {
  const navigate = useNavigate();
  const { user, setUserName, session, pastSessions, refreshPastSessions } =
    useApp();

  const getSessionPalette = (sessionRow) => {
    const fromData = Array.isArray(sessionRow?.data?.color_palette)
      ? sessionRow.data.color_palette
      : [];
    const fromSummary = Array.isArray(
      sessionRow?.data?.canvas_summary?.colors_used,
    )
      ? sessionRow.data.canvas_summary.colors_used
      : [];
    const unique = [];
    [...fromData, ...fromSummary].forEach((token) => {
      if (typeof token !== "string") return;
      const value = token.trim();
      if (!value) return;
      if (!unique.includes(value)) unique.push(value);
    });
    return unique.slice(0, 3);
  };

  const latestDrawingUrl =
    session?.drawingDataURL ||
    session?.drawingUrl ||
    pastSessions?.[0]?.drawing_url ||
    pastSessions?.[0]?.data?.drawing_url ||
    null;

  // modal state — show if no name (user.name is always set in AppContext for now)
  const [showModal, setShowModal] = useState(false);
  const [modalName, setModalName] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );

  // scroll animation refs — no state to avoid re-renders
  const sectionRef = useRef(null);
  const deskWrapRef = useRef(null);
  const deskSceneRef = useRef(null);
  const wallNameRef = useRef(null);
  const wallTopRef = useRef(null);
  const deskLegsRef = useRef(null);
  const windowsRef = useRef(null);
  const progressRef = useRef(0);

  const TOTAL_PHASES = 2;

  useEffect(() => {
    const userId = session?.userId || user?.id;
    if (!userId) return;
    refreshPastSessions(userId);

    const onFocus = () => refreshPastSessions(userId);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshPastSessions, session?.userId, user?.id]);

  useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (typeof onDeskInViewChange !== "function") return;
    const TRIGGER_Y = 72;
    let rafId = 0;

    const updateDeskActive = () => {
      rafId = 0;
      const sectionEl = sectionRef.current;
      const wallEl = wallTopRef.current;
      if (!sectionEl || !wallEl) return;

      const wallTop = wallEl.getBoundingClientRect().top;
      const sectionBottom = sectionEl.getBoundingClientRect().bottom;
      const isActive = wallTop <= TRIGGER_Y && sectionBottom > TRIGGER_Y;
      onDeskInViewChange(isActive);
    };

    const requestUpdate = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(updateDeskActive);
    };

    updateDeskActive();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      onDeskInViewChange(false);
    };
  }, [onDeskInViewChange]);

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
      const rotZ = 0;
      const sc1 = lerp(0.78, 1, p1);

      // Phase 2 (1→2): zoom in
      const p2 = clamp01(progressRef.current - 1);
      const zoom = lerp(1, 1.35, p2);

      if (deskWrapRef.current) {
        deskWrapRef.current.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateZ(${rotZ}deg) scale(${sc1 * zoom})`;
      }
      if (deskSceneRef.current) {
        const upShift = lerp(0, -60, p1);
        deskSceneRef.current.style.transform = `translateX(-50%) translateY(${upShift}px)`;
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
      if (windowsRef.current) {
        const windowFade = clamp01((p1 - 0.04) / 0.52);
        const windowOpacity = 1 - windowFade * windowFade;
        windowsRef.current.style.transform = `translateX(-50%) translateY(${lerp(0, -100, p1)}px)`;
        windowsRef.current.style.opacity = String(windowOpacity);
        windowsRef.current.style.filter = `blur(${lerp(0, 6, windowFade)}px)`;
      }
    }

    // On mobile, avoid scroll-lock style interactions and keep a stable desk state.
    if (isMobileViewport) {
      applyAnim(1);
      return;
    }

    // Set initial tilted state — matches the CSS default transform
    applyAnim(0);

    let autoPlayRafId = 0;

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function autoPlayTo(targetProgress, durationMs) {
      if (autoPlayRafId) window.cancelAnimationFrame(autoPlayRafId);
      const startProgress = progressRef.current;
      const delta = targetProgress - startProgress;
      const startTime = performance.now();

      const tick = (now) => {
        const t = Math.min((now - startTime) / durationMs, 1);
        applyAnim(startProgress + delta * easeOutCubic(t));
        if (t < 1) {
          autoPlayRafId = window.requestAnimationFrame(tick);
        } else {
          autoPlayRafId = 0;
        }
      };

      autoPlayRafId = window.requestAnimationFrame(tick);
    }

    function onScrollDeskToEnd() {
      autoPlayTo(TOTAL_PHASES, 1500);
    }

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
      // Normalize across browsers: Safari trackpad sends tiny deltas (2–5px),
      // Chrome sends large ones (100px+). Clamp to [8, 80] for consistent feel.
      const delta = Math.max(Math.min(Math.abs(e.deltaY), 80), 8) / 500;
      if (goingDown && progressRef.current < TOTAL_PHASES) {
        e.preventDefault();
        applyAnim(progressRef.current + delta);
      } else if (goingUp && progressRef.current > 0) {
        e.preventDefault();
        applyAnim(progressRef.current - delta);
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
      const normalized = Math.max(Math.min(Math.abs(delta), 60), 4) / 300;
      if (goingDown && progressRef.current < TOTAL_PHASES) {
        e.preventDefault();
        applyAnim(progressRef.current + normalized);
      } else if (goingUp && progressRef.current > 0) {
        e.preventDefault();
        applyAnim(progressRef.current - normalized);
      }
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("arverie:desk-scroll-to-end", onScrollDeskToEnd);

    return () => {
      if (autoPlayRafId) window.cancelAnimationFrame(autoPlayRafId);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener(
        "arverie:desk-scroll-to-end",
        onScrollDeskToEnd,
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileViewport]);

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
      navigate("/journal");
    }
  }

  function handleModalSave() {
    const trimmed = modalName.trim();
    if (!trimmed) return;
    setUserName(trimmed);
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
  const isSafariBrowser =
    typeof navigator !== "undefined" &&
    /safari/i.test(navigator.userAgent) &&
    !/chrome|chromium|android/i.test(navigator.userAgent);

  return (
    <>
      <style>{DESK_CSS}</style>

      <section
        id={sectionId}
        className={`scene-outer ${isSafariBrowser ? "is-safari-browser" : ""}`.trim()}
        ref={sectionRef}
      >
        <div className="scene-sticky">
          <div className="room-wall" aria-hidden="true">
            <div className="room-wall-piece room-wall-top" />
            <div className="room-wall-piece room-wall-left" />
            <div className="room-wall-piece room-wall-middle" />
            <div className="room-wall-piece room-wall-right" />
            <div className="room-wall-piece room-wall-bottom" />
          </div>

          {/* Room details */}
          <div className="room-molding" ref={wallTopRef} />
          <div className="room-floor" />
          <div className="room-rug-hint" />
          <div className="room-baseboard" />
          <div className="room-window-wrap" ref={windowsRef}>
            <div className="room-window-glow" />
            <div className="room-window-panel">
              <div className="room-window-trim">
                <div className="room-window-glass">
                  <div className="room-window-curtain">
                    <div className="room-window-curtain-center" />
                  </div>
                </div>
              </div>
            </div>
            <div className="room-window-panel">
              <div className="room-window-trim">
                <div className="room-window-glass">
                  <div className="room-window-curtain">
                    <div className="room-window-curtain-center" />
                  </div>
                </div>
              </div>
            </div>
            <div className="room-window-sill-strip" />
          </div>
          <div className="room-art">
            <div className="room-art-canvas" />
          </div>
          <div className="room-shelf">
            <div className="room-shelf-books">
              <div className="room-book rb1" />
              <div className="room-book rb2" />
              <div className="room-book rb3" />
              <div className="room-book rb4" />
            </div>
            <div className="room-plant">
              <div className="room-plant-pot" />
              <div className="room-plant-leaf rleaf1" />
              <div className="room-plant-leaf rleaf2" />
              <div className="room-plant-leaf rleaf3" />
            </div>
          </div>
          <div className="room-clock" />
          <div className="room-wall-lamp" />
          <div className="room-side-cabinet">
            <div className="cabinet-drawers">
              <div className="cabinet-drawer">
                <div className="cabinet-handle" />
              </div>
              <div className="cabinet-drawer">
                <div className="cabinet-handle" />
              </div>
              <div className="cabinet-drawer">
                <div className="cabinet-handle" />
              </div>
            </div>
            <div className="cabinet-legs">
              <div className="cabinet-leg l1" />
              <div className="cabinet-leg l2" />
              <div className="cabinet-leg l3" />
              <div className="cabinet-leg l4" />
            </div>
          </div>

          <div className="scene-texture" />
          <div className="scene-vignette" />
          <div className="scene-lampglow" />

          <div className="wall-name" ref={wallNameRef}>
            {displayName ? (
              <>
                {displayName}
                <span>'s Space</span>
              </>
            ) : (
              <>
                Your<span> Space</span>
              </>
            )}
          </div>

          <div className="desk-scene" ref={deskSceneRef}>
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

                {/* Back paper — previous drawing peeks behind main canvas */}
                <div className="back-paper">
                  {latestDrawingUrl && <img src={latestDrawingUrl} alt="" />}
                </div>

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

                {/* Palette cards — latest sessions (1–3), or black placeholders if none */}
                <div className="palette-cards">
                  {pastSessions.length > 0
                    ? pastSessions.slice(0, 3).map((s, i) => {
                        const rotations = ["-5deg", "2deg", "-2.5deg"];
                        const colors = getSessionPalette(s);
                        const dateLabel = new Date(
                          s.created_at,
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        });
                        return (
                          <div
                            key={s.id}
                            className="pal-card"
                            style={{ "--r": rotations[i] }}
                          >
                            <div className="pal-swatches">
                              {colors.slice(0, 3).map((hex, ci) => (
                                <div
                                  key={ci}
                                  className="pal-swatch"
                                  style={{ background: hex }}
                                />
                              ))}
                              {colors.length === 0 && (
                                <div
                                  className="pal-swatch"
                                  style={{ background: "#8a7a6a" }}
                                />
                              )}
                            </div>
                            <div className="pal-date">{dateLabel}</div>
                          </div>
                        );
                      })
                    : ["-5deg", "2deg", "-2.5deg"].map((r, i) => (
                        <div
                          key={i}
                          className="pal-card"
                          style={{ "--r": r, background: "#111" }}
                        >
                          <div className="pal-swatches">
                            <div
                              className="pal-swatch"
                              style={{ background: "#111" }}
                            />
                            <div
                              className="pal-swatch"
                              style={{ background: "#1a1a1a" }}
                            />
                            <div
                              className="pal-swatch"
                              style={{ background: "#0a0a0a" }}
                            />
                          </div>
                          <div
                            className="pal-date"
                            style={{
                              background: "#1a1a1a",
                              color: "rgba(255,255,255,.35)",
                              fontSize: "8px",
                              letterSpacing: "1px",
                            }}
                          >
                            {i === 0 ? "no sessions yet" : "no session"}
                          </div>
                        </div>
                      ))}
                </div>

                {/* Stat papers — real session data */}
                <div className="stat-paper sp-back">
                  <div className="gc-tl" />
                  <div className="gc-br" />
                  <div className="stat-lbl">sessions</div>
                  <div className="stat-val">{pastSessions.length}</div>
                  <div className="stat-unit">total</div>
                </div>
                {(() => {
                  const getSessionErasures = (sessionRow) => {
                    const directCount =
                      sessionRow?.erasure_count ??
                      sessionRow?.erasureCount ??
                      sessionRow?.data?.erasure_count ??
                      sessionRow?.data?.erasureCount ??
                      sessionRow?.data?.canvas_summary?.erasure_count ??
                      sessionRow?.data?.canvas_summary?.erasureCount;

                    if (typeof directCount === "number" && directCount >= 0) {
                      return directCount;
                    }

                    const eraseEvents =
                      sessionRow?.data?.canvas_summary?.erase_events;
                    if (Array.isArray(eraseEvents)) return eraseEvents.length;

                    return 0;
                  };

                  const erasuresPerSession =
                    pastSessions.map(getSessionErasures);
                  const totalErasures = erasuresPerSession.reduce(
                    (sum, count) => sum + count,
                    0,
                  );

                  const barColors = [
                    "#B09070",
                    "#B89868",
                    "#C09860",
                    "#C4956A",
                    "#C8A84B",
                  ];
                  const recentErasures = erasuresPerSession.slice(-5);
                  const maxErasures = Math.max(1, ...recentErasures);
                  const barHeights = recentErasures.length
                    ? recentErasures.map((count) =>
                        Math.max(
                          10,
                          Math.min(100, (count / maxErasures) * 100),
                        ),
                      )
                    : [16, 24, 18, 30, 20];
                  return (
                    <div className="stat-paper sp-front">
                      <div className="gc-tl" />
                      <div className="gc-br" />
                      <div className="stat-lbl">total erasures</div>
                      <div className="stat-val">{totalErasures}</div>
                      <div className="stat-unit">across all sessions</div>
                      <div className="stat-bars">
                        {barHeights.map((h, i) => (
                          <div
                            key={i}
                            className="stat-bar"
                            style={{
                              height: `${h}%`,
                              background: barColors[i],
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}
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
    </>
  );
}
