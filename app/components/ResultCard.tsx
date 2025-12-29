"use client";

import type { TarotCard } from "../data/tarotCards";

type Props = {
  picked: TarotCard;
  frontImage: string;
  isVip: boolean;
  count: number;
  remaining: number;
  onAgain: () => void;
};

export default function ResultCard(props: Props) {
  const { picked, frontImage, isVip, count, remaining, onAgain } = props;

  return (
    <div className="resultWrap">
      <div className="resultCardFrame">
        <div className="resultImgBox">
          <img className="resultImg" src={frontImage} alt={picked.name} draggable={false} />
          <div className="resultScan" />
          <div className="resultGlow" />
        </div>

        <div className="resultText">
          <div className="resultTop">你抽到的是</div>
          <div className="resultTitle">{picked.name}</div>
          <div className="resultSummary">{picked.summary}</div>
          <div className="resultMeaning">{picked.meaning}</div>

          <div className="resultAdviceTitle">今日建議</div>
          <ul className="resultAdvice">
            {picked.advice.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>

          <div className="resultMeta">
            今天抽牌次數：{count}
            {isVip ? "（VIP 不限次）" : `（剩 ${remaining} 次）`}
          </div>

          <div className="resultActions">
            <button type="button" className="primaryBtn" onClick={onAgain}>
              再次抽牌
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
