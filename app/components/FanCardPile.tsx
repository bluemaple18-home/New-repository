"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Phase = "idle" | "flying" | "revealed";

type Props = {
  phase: Phase;
  disabled: boolean;
  backImage: string;
  onPick: (slotIndex: number) => void;
  activeSlot: number | null;
};

const CARD_W = 128;
const CARD_H = 198;

// 扇形參數（可微調）
const COUNT_TOP = 11;
const COUNT_BOTTOM = 11;

const SPREAD = 28;
const OVERLAP = 34;
const ARC_Y = 8.5;

const ROW_GAP = 210;
const TOP_PADDING = 18;

// ✅ 自動算容器高度（避免擠爆）
function calcPileHeight() {
  const mid = (COUNT_TOP - 1) / 2;
  const maxArc = Math.abs(mid) * ARC_Y;
  const topMax = TOP_PADDING + maxArc + CARD_H;
  const bottomMax = TOP_PADDING + ROW_GAP + maxArc + CARD_H;
  return Math.ceil(Math.max(topMax, bottomMax) + 26);
}

function buildFanSlots(row: 0 | 1, count: number) {
  const mid = (count - 1) / 2;
  const rowOffsetY = row === 0 ? TOP_PADDING : TOP_PADDING + ROW_GAP;
  const baseRotate = row === 0 ? -8 : 8;

  return Array.from({ length: count }).map((_, i) => {
    const t = i - mid;
    const ratio = mid === 0 ? 0 : t / mid;
    const rotate = baseRotate + ratio * SPREAD;
    const x = t * OVERLAP;
    const arc = Math.abs(t) * ARC_Y;
    const y = rowOffsetY + arc;
    return { index: i, x, y, rotate, z: i };
  });
}

export default function FanCardPile(props: Props) {
  const { phase, disabled, backImage, onPick, activeSlot } = props;

  const pileHeight = useMemo(() => calcPileHeight(), []);
  const topSlots = useMemo(() => buildFanSlots(0, COUNT_TOP), []);
  const bottomSlots = useMemo(() => buildFanSlots(1, COUNT_BOTTOM), []);

  // ✅ 依容器寬度自動縮放：解決「爆版」
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      // 以 900 為設計寬，越小就縮
      const s = Math.min(1, Math.max(0.62, w / 900));
      setScale(s);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ✅ flying / revealed 時，整個牌堆淡出（避免動畫被壓住或還看得到 22 張）
  const pileHidden = phase !== "idle";

  const renderSlot = (row: "top" | "bottom", s: any, globalIndex: number) => {
    const isActive = activeSlot === globalIndex;

    // ✅ 點到那張立刻消失（避免同時看到兩張）
    const hideThis = phase === "flying" && isActive;

    return (
      <button
        key={`${row}-${s.index}`}
        type="button"
        onClick={() => onPick(globalIndex)}
        disabled={disabled || pileHidden}
        className={[
          "slotBtn",
          hideThis ? "slotHide" : "",
          disabled || pileHidden ? "slotDisabled" : "",
        ].join(" ")}
        style={{
          left: "50%",
          top: 0,
          transform: `translate(calc(-50% + ${s.x}px), ${s.y}px) rotate(${s.rotate}deg)`,
          zIndex: 10 + s.z,
        }}
      >
        <div className="slotCard">
          <img className="slotImg" src={backImage} alt="Tarot back" draggable={false} />
        </div>
      </button>
    );
  };

  return (
    <div className="pileShell">
      <div
        className={["pileHost", pileHidden ? "pileFadeOut" : "pileFadeIn"].join(" ")}
        ref={hostRef}
      >
        <div
          className="pileStage"
          style={{
            height: pileHeight,
            transform: `scale(${scale})`,
          }}
        >
          {topSlots.map((s, idx) => renderSlot("top", s, idx))}
          {bottomSlots.map((s, idx) => renderSlot("bottom", s, COUNT_TOP + idx))}
        </div>

        <div className="pileHint">
          {pileHidden ? "抽牌中…" : "滑鼠移到牌上會浮起，點一張抽牌"}
        </div>
      </div>
    </div>
  );
}
