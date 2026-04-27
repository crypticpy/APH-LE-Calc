import { useState, useEffect, useCallback, useMemo } from "react";
import { useHealthData } from "../../hooks/useHealthData";

const SLIDE_INTERVAL_MS = 8_000;
const TOTAL_SLIDES = 4;

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

  // Build insights — interesting cross-indicator facts
  const insights = useMemo(() => {
    if (!healthData) return [] as { headline: string; detail: string }[];
    const items: { headline: string; detail: string }[] = [];

    const zctas = Object.entries(healthData.zctas);

    // Diabetes ratio insight
    let dHigh: { zip: string; v: number } | null = null;
    let dLow: { zip: string; v: number } | null = null;
    for (const [zip, d] of zctas) {
      if (d.diabetes != null) {
        if (!dHigh || d.diabetes > dHigh.v) dHigh = { zip, v: d.diabetes };
        if (!dLow || d.diabetes < dLow.v) dLow = { zip, v: d.diabetes };
      }
    }
    if (dHigh && dLow && dLow.v > 0) {
      const ratio = dHigh.v / dLow.v;
      if (ratio >= 1.4) {
        items.push({
          headline: `Diabetes is ${ratio.toFixed(1)}× more common in ${dHigh.zip} than ${dLow.zip}`,
          detail: `${dHigh.v.toFixed(1)}% vs ${dLow.v.toFixed(1)}% prevalence — a gap shaped by access to care, food environment, and income.`,
        });
      }
    }

    // Poverty insight
    let pHigh: { zip: string; v: number } | null = null;
    for (const [zip, d] of zctas) {
      if (d.povertyRate != null) {
        if (!pHigh || d.povertyRate > pHigh.v)
          pHigh = { zip, v: d.povertyRate };
      }
    }
    const countyPoverty = healthData.meta.countyAverage.povertyRate;
    if (pHigh && pHigh.v > countyPoverty * 1.5) {
      items.push({
        headline: `${pHigh.zip} has ${pHigh.v.toFixed(1)}% poverty`,
        detail: `That's ${(pHigh.v / countyPoverty).toFixed(1)}× the Travis County average of ${countyPoverty.toFixed(1)}%.`,
      });
    }

    // Uninsured insight
    let uHigh: { zip: string; v: number } | null = null;
    for (const [zip, d] of zctas) {
      if (d.uninsuredRate != null) {
        if (!uHigh || d.uninsuredRate > uHigh.v)
          uHigh = { zip, v: d.uninsuredRate };
      }
    }
    if (uHigh && uHigh.v >= 20) {
      items.push({
        headline: `1 in ${Math.round(100 / uHigh.v)} adults in ${uHigh.zip} is uninsured`,
        detail: `${uHigh.v.toFixed(1)}% lack health coverage — the highest rate in Travis County.`,
      });
    }

    return items;
  }, [healthData]);

  const [insightIndex, setInsightIndex] = useState(0);
  useEffect(() => {
    if (insights.length === 0) return;
    const id = setInterval(() => {
      setInsightIndex((i) => (i + 1) % insights.length);
    }, 4500);
    return () => clearInterval(id);
  }, [insights.length]);

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
        {currentSlide === 2 &&
          (insights.length > 0 ? (
            <SlideInsight
              headline={insights[insightIndex % insights.length].headline}
              detail={insights[insightIndex % insights.length].detail}
            />
          ) : (
            <SlideCTA />
          ))}
        {currentSlide === 3 && <SlideCTA />}
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

function SlideInsight({
  headline,
  detail,
}: {
  headline: string;
  detail: string;
}) {
  return (
    <div className="slide-float">
      <span className="material-symbols-outlined text-aph-green text-5xl mb-6 block">
        insights
      </span>
      <p className="text-aph-green text-sm font-semibold uppercase tracking-widest mb-4">
        Did you know?
      </p>
      <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight max-w-2xl mx-auto">
        {headline}
      </h2>
      <p className="text-lg md:text-xl text-white/85 leading-relaxed max-w-xl mx-auto">
        {detail}
      </p>
    </div>
  );
}

function SlideCTA() {
  return (
    <div className="slide-float">
      <span className="material-symbols-outlined text-aph-green text-5xl mb-6 block">
        auto_awesome
      </span>
      <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
        ~12 hours of internal development.
      </h2>
      <p className="text-lg md:text-xl text-white/85 leading-relaxed max-w-xl mx-auto mb-6">
        APH IT staff built this prototype in three four-hour AI-assisted
        sessions — work that would typically be a 6-8 week, $50K-$100K agency
        engagement.
      </p>
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <p className="text-aph-green text-xs font-semibold uppercase tracking-wider mb-1">
            APH IT
          </p>
          <p className="text-2xl font-bold">~12 hrs</p>
          <p className="text-white/60 text-xs mt-0.5">3 × 4-hr sessions</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">
            Typical agency
          </p>
          <p className="text-2xl font-bold">~$60K+</p>
          <p className="text-white/60 text-xs mt-0.5">6-8 weeks</p>
        </div>
      </div>
      <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
        <span className="material-symbols-outlined text-aph-green text-base">
          touch_app
        </span>
        <span className="text-white text-sm font-semibold">
          Tap anywhere to explore
        </span>
      </div>
    </div>
  );
}
