import React from "react";
import "./hero-video.css";

const HERO_VIDEO_DESKTOP =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_3JjLYpV2xzn5QTLEZhkGddrqtlj/241c86d9-dc6c-4814-9af1-b01ee7070a9e.mp4";
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
          preload="metadata"
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
        <div className="gk-hero-video-edge" aria-hidden="true" />
      </div>
    </div>
  );
};
