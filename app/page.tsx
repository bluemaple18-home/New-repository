"use client";

import { useEffect, useMemo, useState } from "react";
import FanCardPile from "./components/FanCardPile";
import ResultCard from "./components/ResultCard";
import { TAROT_CARDS, type TarotCard } from "./data/tarotCards";
import { randInt } from "./lib/random";
import {
  getTaiwanDateString,
  isVipDevice,
  loadTodayPick,
  saveTodayPick,
} from "./lib/tarotStorage";

const MAX_DAILY_PICKS = 3;
const BACK_IMAGE = "/cards/back.png";

const getFrontImagePath = (cardId: number) =>
  `/cards/${String(cardId).padStart(2, "0")}.png`;

const FLY_MS = 1800;
const REVEAL_HOLD_MS = 900;

type Phase = "idle" | "flying" | "revealed";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [picked, setPicked] = useState<TarotCard | null>(null);
  const [pickedFront, setPickedFront] = useState("");
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  const [count, setCount] = useState(0);
  const [isVip, setIsVip] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const remaining = useMemo(() => Math.max(0, MAX_DAILY_PICKS - count), [count]);
  const canPick = isVip || !isLocked;

  useEffect(() => {
    const vip = isVipDevice();
    setIsVip(vip);

    const today = getTaiwanDateString();
    const stored = loadTodayPick();

    if (stored && stored.date === today) {
      setCount(stored.count);
      setIsLocked(!vip && stored.count >= MAX_DAILY_PICKS);
    } else {
      setCount(0);
      setIsLocked(false);
    }
  }, []);

  const onPick = (slotIndex: number) => {
    if (!canPick || phase !== "idle") return;

    setActiveSlot(slotIndex);
    setPhase("flying");

    const card = TAROT_CARDS[randInt(0, TAROT_CARDS.length - 1)];
    const front = getFrontImagePath(card.id);

    // ✅ 關鍵：立刻 preload 正面圖
    const preload = new Image();
    preload.src = front;

    window.setTimeout(() => {
      const today = getTaiwanDateString();
      const stored = loadTodayPick();
      const nextCount =
        stored && stored.date === today ? stored.count + 1 : 1;

      saveTodayPick({ date: today, count: nextCount, lastCardId: card.id });

      setCount(nextCount);
      if (!isVip && nextCount >= MAX_DAILY_PICKS) setIsLocked(true);

      setPicked(card);
      setPickedFront(front);
      setPhase("revealed");
    }, FLY_MS);
  };

  const onAgain = () => {
    setPicked(null);
    setPickedFront("");
    setActiveSlot(null);
    setPhase("idle");
  };

  const onToggleVipTest = () => {
    setIsVip((prev) => {
      const next = !prev;
      if (next) {
        setIsLocked(false);
      } else {
        const today = getTaiwanDateString();
        const stored = loadTodayPick();
        setIsLocked(
          stored?.date === today && stored.count >= MAX_DAILY_PICKS
        );
      }
      return next;
    });
  };

  return (
    <main className={`page ${phase === "flying" ? "bgFlash" : ""} ${phase === "revealed" ? "bgGlow" : ""}`}>
      <div className="wrap">
        <header className="header">
          <h1 className="h1">每日限抽 {MAX_DAILY_PICKS} 張塔羅</h1>
          <p className="sub">抽一張牌，給今天一個溫柔的行動方向。</p>
        </header>

        <section className="panel">
          <div className="statusLine">
            {isVip ? "VIP 模式：不限次數" : isLocked ? "今日已抽完" : `剩 ${remaining} 次`}
          </div>

          <div className="testBtns">
            <button className="ghostBtn" onClick={onToggleVipTest}>
              {isVip ? "關閉 VIP" : "開啟 VIP（測試）"}
            </button>
          </div>

          {picked ? (
            <ResultCard
              picked={picked}
              frontImage={pickedFront}
              isVip={isVip}
              count={count}
              remaining={remaining}
              onAgain={onAgain}
            />
          ) : (
            <div className="pileArea">
              <FanCardPile
                phase={phase}
                disabled={!canPick}
                backImage={BACK_IMAGE}
                onPick={onPick}
                activeSlot={activeSlot}
              />
            </div>
          )}

          <footer className="footer">Tarot MVP · Next.js</footer>
        </section>
      </div>
    </main>
  );
}
