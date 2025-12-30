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

const FLY_MS = 1800; // 飛行+多圈旋轉（久一點）
const REVEAL_HOLD_MS = 900; // 背景/掃描線停留

type Phase = "idle" | "flying" | "revealed";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("idle");

  const [picked, setPicked] = useState<TarotCard | null>(null);
  const [pickedFront, setPickedFront] = useState<string>("");

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
      if (!vip && stored.count >= MAX_DAILY_PICKS) setIsLocked(true);
      else setIsLocked(false);
    } else {
      setCount(0);
      setIsLocked(false);
    }
  }, []);

  const onPick = (slotIndex: number) => {
    if (!canPick) return;
    if (phase !== "idle") return;

    setActiveSlot(slotIndex);
    setPhase("flying");

    // 先決定抽哪張（避免飛行途中跳格）
    const card = TAROT_CARDS[randInt(0, TAROT_CARDS.length - 1)];
    const front = getFrontImagePath(card.id);

    window.setTimeout(() => {
      // 更新次數（VIP 不鎖）
      const today = getTaiwanDateString();
      const stored = loadTodayPick();

      let nextCount = 1;
      if (stored && stored.date === today) nextCount = stored.count + 1;

      saveTodayPick({ date: today, count: nextCount, lastCardId: card.id });

      setCount(nextCount);
      if (!isVip && nextCount >= MAX_DAILY_PICKS) setIsLocked(true);

      // 顯示結果（此時牌堆不再顯示）
      setPicked(card);
      setPickedFront(front);
      setPhase("revealed");

      window.setTimeout(() => {
        // 停在 revealed，等使用者按「再次抽牌」
      }, REVEAL_HOLD_MS);
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
  
      // 開 VIP：直接解鎖
      if (next) {
        setIsLocked(false);
        return next;
      }
  
      // 關 VIP：回到一般規則（若今天已抽滿就鎖）
      const today = getTaiwanDateString();
      const stored = loadTodayPick();
      const todayCount = stored && stored.date === today ? stored.count : 0;
      setIsLocked(todayCount >= MAX_DAILY_PICKS);
  
      return next;
    });
  };
  

 

  return (
    <main
      className={[
        "page",
        phase === "flying" ? "bgFlash" : "",
        phase === "revealed" ? "bgGlow" : "",
      ].join(" ")}
    >
      <div className="wrap">
        <header className="header">
          <h1 className="h1">每日限抽 {MAX_DAILY_PICKS} 張塔羅</h1>
          <p className="sub">
            抽一張牌，看看今天的節奏與提醒。這不是預言，是給你一個溫柔的行動方向。
          </p>
        </header>

        <section className="panel">
          <div className="statusLine">
            {isVip ? (
              <span className="vip">VIP 測試模式：不限次數抽牌</span>
            ) : isLocked ? (
              <span className="locked">今日已達抽牌上限，明天再來 🌙</span>
            ) : (
              <span className="remain">今天還可以再抽 {remaining} 次</span>
            )}
          </div>

          <div className="testBtns">
            <button className="ghostBtn" type="button" onClick={onToggleVipTest}>
              {isVip ? "關閉 VIP（回一般模式）" : "開啟 VIP（測試解鎖）"}
            </button>
          </div>


          {/* ✅ 抽完：只留結果，不顯示 22 張 */}
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

              {/* ✅ 飛行中那張：固定在最上層，不會被 22 張壓住 */}
              {activeSlot !== null && phase === "flying" && (
                <div className="flyingOverlay" aria-hidden>
                  <div className="flyCard perspective">
                    <div className="flyInner preserve3d flyAnim">
                      {/* 背面 */}
                      <div className="flyFace back backfaceHidden">
                        <img className="flyImg" src={BACK_IMAGE} alt="back" draggable={false} />
                        <div className="scan scanActive" />
                      </div>

                      {/* 正面（飛行時先用背面假裝；到 revealed 才切到真正正面在 ResultCard 顯示） */}
                      <div className="flyFace front backfaceHidden rotateY180">
                        <img className="flyImg" src={BACK_IMAGE} alt="front" draggable={false} />
                        <div className="scan scanActive" />
                        <div className="burst90" />
                      </div>
                    </div>
                  </div>

                  {/* 粒子（很輕量，不會卡） */}
                  <div className="sparkLayer">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <span key={i} className="spark" style={{ ["--i" as any]: i }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <footer className="footer">Tarot MVP · Next.js</footer>
        </section>
      </div>
    </main>
  );
}
