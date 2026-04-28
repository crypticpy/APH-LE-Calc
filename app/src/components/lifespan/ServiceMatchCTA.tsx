import { APH_COLORS, SERVICE_GUIDE_URL } from "../../lib/constants";
import {
  FACTOR_ICONS,
  type ImprovementOpportunity,
} from "../../lib/lifespanModel";

interface ServiceMatchCTAProps {
  opportunities: ImprovementOpportunity[];
}

/**
 * Maps a model factor to the Service Guide category slug. Used to build the
 * `focus=` deep-link query so the resident services intake can pre-load
 * relevant services.
 */
const FACTOR_TO_CATEGORY: Record<string, string> = {
  smoking: "smoking_cessation",
  exercise: "physical_activity",
  diet: "nutrition",
  bmi: "nutrition",
  sleep: "mental_health",
  stress: "mental_health",
};

function buildIntakeUrl(opportunities: ImprovementOpportunity[]): string {
  const focus = Array.from(
    new Set(
      opportunities
        .map((o) => FACTOR_TO_CATEGORY[o.factor])
        .filter((s): s is string => typeof s === "string"),
    ),
  ).join(",");
  const params = new URLSearchParams({ event: "healthspan" });
  if (focus) params.set("focus", focus);
  const base = SERVICE_GUIDE_URL.replace(/\/+$/, "");
  return `${base}/intake?${params.toString()}`;
}

export default function ServiceMatchCTA({
  opportunities,
}: ServiceMatchCTAProps) {
  if (opportunities.length === 0) {
    return (
      <div
        className="rounded-2xl shadow-sm p-6 text-white"
        style={{
          background: `linear-gradient(135deg, ${APH_COLORS.darkGreen} 0%, ${APH_COLORS.green} 100%)`,
        }}
      >
        <div className="flex items-start gap-3">
          <span
            className="material-symbols-outlined text-white"
            style={{ fontSize: "28px" }}
          >
            check_circle
          </span>
          <div>
            <p className="font-semibold text-lg">
              You're already covering the modifiable factors well.
            </p>
            <p className="text-white/85 text-sm mt-1">
              Keep doing what you're doing. If anything changes, the Austin
              Service Guide can help match you to local resources.
            </p>
          </div>
        </div>
        <a
          href={buildIntakeUrl([])}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-white text-aph-dark-green font-semibold text-sm hover:bg-white/90 transition"
        >
          Browse Austin services
          <span className="material-symbols-outlined text-base">
            open_in_new
          </span>
        </a>
      </div>
    );
  }

  const url = buildIntakeUrl(opportunities);
  const totalGain = opportunities.reduce((s, o) => s + o.potentialGain, 0);

  return (
    <div
      className="rounded-2xl shadow-md p-6 md:p-7 text-aph-dark-blue border border-aph-blue/20"
      style={{
        background: "linear-gradient(135deg, #eef4fb 0%, #dceaf6 100%)",
      }}
    >
      <div className="flex items-start gap-3 mb-1">
        <span
          className="material-symbols-outlined"
          style={{ color: APH_COLORS.darkGreen, fontSize: "28px" }}
        >
          trending_up
        </span>
        <div>
          <h4 className="font-bold text-lg leading-tight">
            Up to{" "}
            <span style={{ color: APH_COLORS.darkGreen }}>
              +{totalGain.toFixed(1)} years
            </span>{" "}
            could be on the table
          </h4>
          <p className="text-sm text-aph-dark-blue/80 mt-1">
            Based on your inputs, these are the factors with the most years
            recoverable. Austin Public Health partners with services that can
            help.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {opportunities.map((o) => (
          <li
            key={o.factor}
            className="bg-white rounded-lg px-3 py-2 flex items-center justify-between gap-3 border border-aph-light-gray/50"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px", color: APH_COLORS.blue }}
              >
                {FACTOR_ICONS[o.factor]}
              </span>
              {o.label}
            </span>
            <span
              className="text-sm font-bold tabular-nums whitespace-nowrap"
              style={{ color: APH_COLORS.darkGreen }}
            >
              +{o.potentialGain.toFixed(1)} yrs
            </span>
          </li>
        ))}
      </ul>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-lg bg-aph-green text-white font-semibold text-sm hover:brightness-110 active:scale-[0.97] transition"
      >
        <span className="material-symbols-outlined text-base">handshake</span>
        Find Austin services that can help
        <span className="material-symbols-outlined text-base">
          arrow_forward
        </span>
      </a>
      <p className="text-xs text-aph-dark-gray mt-3">
        Opens the Austin Service Guide. Your responses on this page are not sent
        — only the factor categories are shared.
      </p>
    </div>
  );
}
