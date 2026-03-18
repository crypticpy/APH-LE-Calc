import { useState, useEffect, useCallback } from "react";
import { useHealthData } from "../../hooks/useHealthData";

const SLIDE_INTERVAL_MS = 8_000;
const TOTAL_SLIDES = 3;

interface IdleShowcaseProps {
  onDismiss: () => void;
}

export default function IdleShowcase({ onDismiss }: IdleShowcaseProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const { healthData, summary } = useHealthData();

  // Auto-cycle slides
  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % TOTAL_SLIDES);
        setFadeIn(true);
      }, 300);
    }, SLIDE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Dismiss on any user interaction
  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    const events: Array<keyof WindowEventMap> = [
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];

    // Small delay to avoid instant dismissal from the event that just happened
    const timer = setTimeout(() => {
      events.forEach((event) => {
        window.addEventListener(event, handleDismiss, {
          once: true,
          passive: true,
        });
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      events.forEach((event) => {
        window.removeEventListener(event, handleDismiss);
      });
    };
  }, [handleDismiss]);

  // Compute stats from data
  const lifeExpStats = summary?.indicators.lifeExpectancy;
  const minLE = lifeExpStats?.min ?? 0;
  const maxLE = lifeExpStats?.max ?? 0;
  const gap = maxLE - minLE;

  // Find highest and lowest ZCTAs
  let highestZcta = "";
  let lowestZcta = "";
  if (healthData) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (const [zcta, data] of Object.entries(healthData.zctas)) {
      if (data.lifeExpectancy !== null) {
        if (data.lifeExpectancy > highest) {
          highest = data.lifeExpectancy;
          highestZcta = zcta;
        }
        if (data.lifeExpectancy < lowest) {
          lowest = data.lifeExpectancy;
          lowestZcta = zcta;
        }
      }
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 2000 }}
    >
      {/* Animated gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, #22254E 0%, #44499C 40%, #009F4D 100%)`,
          animation: "showcaseGradient 12s ease-in-out infinite alternate",
        }}
      />

      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Slide content */}
      <div
        className={`relative z-10 text-center text-white px-8 max-w-2xl mx-auto transition-opacity duration-300 ${
          fadeIn ? "opacity-100" : "opacity-0"
        }`}
      >
        {currentSlide === 0 && <SlideTitle />}
        {currentSlide === 1 && (
          <SlideStats
            minLE={minLE}
            maxLE={maxLE}
            gap={gap}
            highestZcta={highestZcta}
            lowestZcta={lowestZcta}
          />
        )}
        {currentSlide === 2 && <SlideCTA />}
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-3 z-10">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              i === currentSlide ? "bg-aph-green scale-125" : "bg-white/40"
            }`}
          />
        ))}
      </div>

      {/* Tap hint */}
      <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/50 text-sm z-10">
        Tap anywhere to explore
      </p>

      {/* Keyframe animation */}
      <style>{`
        @keyframes showcaseGradient {
          0% { background-position: 0% 50%; background-size: 200% 200%; }
          50% { background-position: 100% 50%; background-size: 200% 200%; }
          100% { background-position: 0% 50%; background-size: 200% 200%; }
        }
        @keyframes floatUp {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .slide-float {
          animation: floatUp 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}

function SlideTitle() {
  return (
    <div className="slide-float">
      <div className="w-20 h-20 bg-aph-green rounded-2xl flex items-center justify-center mx-auto mb-8">
        <span className="material-symbols-outlined text-white text-5xl">
          health_and_safety
        </span>
      </div>
      <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
        Austin Health Pulse
      </h1>
      <p className="text-xl md:text-2xl text-white/80 leading-relaxed">
        Explore life expectancy and health data
        <br />
        across Travis County
      </p>
    </div>
  );
}

interface SlideStatsProps {
  minLE: number;
  maxLE: number;
  gap: number;
  highestZcta: string;
  lowestZcta: string;
}

function SlideStats({
  minLE,
  maxLE,
  gap,
  highestZcta,
  lowestZcta,
}: SlideStatsProps) {
  return (
    <div className="slide-float">
      <span className="material-symbols-outlined text-aph-green text-5xl mb-6 block">
        analytics
      </span>
      <h2 className="text-3xl md:text-4xl font-bold mb-8">Key Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <p className="text-aph-green text-sm font-semibold uppercase tracking-wider mb-2">
            Life Expectancy Range
          </p>
          <p className="text-3xl font-bold">
            {minLE.toFixed(1)} - {maxLE.toFixed(1)}
          </p>
          <p className="text-white/60 text-sm mt-1">years</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <p className="text-aph-green text-sm font-semibold uppercase tracking-wider mb-2">
            Gap Between Neighborhoods
          </p>
          <p className="text-3xl font-bold">{gap.toFixed(1)} years</p>
          <p className="text-white/60 text-sm mt-1">difference</p>
        </div>
      </div>
      <div className="flex justify-center gap-8 text-sm text-white/70">
        <span>
          <span className="material-symbols-outlined text-aph-green text-base align-text-bottom mr-1">
            arrow_upward
          </span>
          Highest: {highestZcta}
        </span>
        <span>
          <span className="material-symbols-outlined text-aph-red text-base align-text-bottom mr-1">
            arrow_downward
          </span>
          Lowest: {lowestZcta}
        </span>
      </div>
    </div>
  );
}

function SlideCTA() {
  return (
    <div className="slide-float">
      <span className="material-symbols-outlined text-aph-green text-5xl mb-6 block">
        touch_app
      </span>
      <h2 className="text-3xl md:text-4xl font-bold mb-6">
        Touch to explore your neighborhood
      </h2>
      <p className="text-xl text-white/80 mb-10">
        Scan QR code to view on your phone
      </p>
      {/* QR code placeholder */}
      <div className="w-40 h-40 bg-white rounded-xl flex items-center justify-center mx-auto">
        <div className="text-center">
          <span className="material-symbols-outlined text-aph-dark-blue text-4xl">
            qr_code_2
          </span>
          <p className="text-aph-dark-blue text-xs font-semibold mt-1">
            QR Code
          </p>
        </div>
      </div>
    </div>
  );
}
