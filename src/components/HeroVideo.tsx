import React from "react";
import "./hero-video.css";

const HERO_VIDEO_DESKTOP =
  "https://github.com/IsmaelGeraldo/G-Kais/releases/download/gkais-hero-hq-v2/gkais-hero-desktop-hq-v2.mp4";
const HERO_VIDEO_MOBILE =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_3JjLYpV2xzn5QTLEZhkGddrqtlj/755b4b23-e496-4249-b0a4-76e7021c1bd0.mp4";

export const HeroVideo: React.FC = () => {
  return (
    <div className="gk-hero-video" aria-label="G-KAIS product system demonstration">
      <div className="gk-hero-video-frame">
        <video
          className="gk-hero-video-media"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
        >
          <source
            media="(max-width: 720px)"
            src={HERO_VIDEO_MOBILE}
            type="video/mp4"
          />
          <source src={HERO_VIDEO_DESKTOP} type="video/mp4" />
        </video>
      </div>
    </div>
  );
};
