"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  // ✅ 存「這次要顯示的結果」，避免飛行中 UI 亂跳
  const pendingCardRef = useRef<TarotCard | null>(null);
  const pendingFrontRef = useRef<string>("");

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

    // ✅ 先存起來：飛行結束再 setPicked
    pendingCardRef.current = card;
    pendingFrontRef.current = front;

    // ✅ preload 正面圖（加速顯示）
    if (typeof window !== "undefined") {
      const preload = new Image();
      preload.src = front;
    }

    window.setTimeout(() => {
      const finalCard = pendingCardRef.current;
      const finalFront = pendingFrontRef.current;

      if (!finalCard || !finalFront) {
        setPhase("idle");
        setActiveSlot(null);
        return;
      }

      // 更新次數（VIP 不鎖）
      const today = getTaiwanDateString();
      const stored = loadTodayPick();
      const nextCount = stored && stored.date === today ? stored.count + 1 : 1;

      saveTodayPick({ date: today, count: nextCount, lastCardId: finalCard.id });

      setCount(nextCount);
      if (!isVip && nextCount >= MAX_DAILY_PICKS) setIsLocked(true);

      // ✅ 現在才顯示結果
      setPicked(finalCard);
      setPickedFront(finalFront);
      setPhase("revealed");

      window.setTimeout(() => {
        // 留在 revealed，等使用者按「再次抽牌」
      }, REVEAL_HOLD_MS);
    }, FLY_MS);
  };

  const onAgain = () => {
    setPicked(null);
    setPickedFront("");
    setActiveSlot(null);
    setPhase("idle");

    pendingCardRef.current = null;
    pendingFrontRef.current = "";
  };

  const onToggleVipTest = () => {
    setIsVip((prev) => {
      const next = !prev;

      if (next) {
        setIsLocked(false);
      } else {
        const today = getTaiwanDateString();
        const stored = loadTodayPick();
        setIsLocked(stored?.date === today && stored.count >= MAX_DAILY_PICKS);
      }

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
          <p className="sub">抽一張牌，給今天一個溫柔的行動方向。</p>
        </header>

        <section className="panel">
          <div className="statusLine">
            {isVip ? (
              <span className="vip">VIP 模式：不限次數</span>
            ) : isLocked ? (
              <span className="locked">今日已抽完</span>
            ) : (
              <span className="remain">剩 {remaining} 次</span>
            )}
          </div>

          <div className="testBtns">
            <button className="ghostBtn" type="button" onClick={onToggleVipTest}>
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

              {/* ✅ 抽牌動畫：你剛剛這段整個不見了，所以才「動畫消失」 */}
              {activeSlot !== null && phase === "flying" && (
                <div className="flyingOverlay" aria-hidden>
                  <div className="flyCard perspective">
                    <div className="flyInner preserve3d flyAnim">
                      {/* 背面 */}
                      <div className="flyFace back backfaceHidden">
                        <img className="flyImg" src={BACK_IMAGE} alt="back" draggable={false} />
                        <div className="scan scanActive" />
                      </div>

                      {/* 正面（飛行時先用背面假裝；真正正面在 ResultCard 顯示） */}
                      <div className="flyFace front backfaceHidden rotateY180">
                        <img className="flyImg" src={BACK_IMAGE} alt="front" draggable={false} />
                        <div className="scan scanActive" />
                        <div className="burst90" />
                      </div>
                    </div>
                  </div>

                  {/* 粒子 */}
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
