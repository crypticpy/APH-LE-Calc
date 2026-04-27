import { useEffect, useRef } from "react";

interface AboutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutDrawer({ isOpen, onClose }: AboutDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !drawerRef.current) return;

    const drawer = drawerRef.current;
    const focusableElements = drawer.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    firstFocusable?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    drawer.addEventListener("keydown", handleTab);
    return () => drawer.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        style={{ zIndex: 2000 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal container — full-screen sheet on mobile, centered modal on desktop */}
      <div
        className={`fixed inset-0 flex items-end md:items-center justify-center md:p-6 pointer-events-none transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        style={{ zIndex: 2001 }}
        aria-hidden={!isOpen}
      >
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="About Austin Health Pulse"
          className={`bg-white shadow-2xl flex flex-col w-full md:max-w-2xl h-[92vh] md:h-auto md:max-h-[85vh] rounded-t-2xl md:rounded-2xl overflow-hidden transition-all duration-300 ease-out ${
            isOpen
              ? "pointer-events-auto translate-y-0 md:scale-100 opacity-100"
              : "pointer-events-none translate-y-full md:translate-y-4 md:scale-95 opacity-0"
          }`}
        >
          {/* Mobile drag-handle indicator */}
          <div className="md:hidden flex justify-center pt-2 pb-1 bg-aph-dark-blue">
            <div className="w-10 h-1 rounded-full bg-white/30" />
          </div>

          {/* Header */}
          <div className="bg-aph-dark-blue text-white px-5 md:px-6 py-4 md:py-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-aph-green text-2xl">
                info
              </span>
              <h2 className="text-lg font-semibold">About This Tool</h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              aria-label="Close about"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 px-5 md:px-6 py-6 overscroll-contain">
            {/* About */}
            <Section title="About Austin Health Pulse">
              <p>
                Austin Health Pulse is an interactive data tool that allows
                residents and policymakers to explore health indicators across
                Travis County neighborhoods. Built by Austin Public Health, it
                combines life expectancy, chronic disease, and socioeconomic
                data to reveal health patterns at the ZIP code level.
              </p>
            </Section>

            {/* Data Sources */}
            <Section title="Data Sources">
              <DataSourceItem
                label="Life Expectancy"
                source="CDC U.S. Small-Area Life Expectancy Estimates Project (USALEEP)"
                period="2010-2015"
              />
              <DataSourceItem
                label="Poverty & Insurance"
                source="U.S. Census Bureau, American Community Survey 5-Year Estimates"
                period="2022"
              />
              <DataSourceItem
                label="Chronic Disease"
                source="CDC PLACES: Local Data for Better Health"
                period="2023"
              />
            </Section>

            {/* Methodology */}
            <Section title="Methodology">
              <MethodologyItem>
                Life expectancy is calculated at the census tract level using
                abridged period life tables and then aggregated to ZIP code
                (ZCTA) using population-weighted averages via HUD USPS crosswalk
                residential ratios.
              </MethodologyItem>
              <MethodologyItem>
                Health indicators (diabetes, hypertension, obesity prevalence)
                are model-based estimates from CDC PLACES, derived from
                Behavioral Risk Factor Surveillance System (BRFSS) survey data
                using multilevel regression and poststratification.
              </MethodologyItem>
              <MethodologyItem>
                Socioeconomic indicators (poverty rate, uninsured rate) come
                from the American Community Survey and represent 5-year period
                estimates at the ZCTA level.
              </MethodologyItem>
            </Section>

            {/* Limitations */}
            <Section title="Limitations">
              <LimitationItem>
                Life expectancy data is from 2010-2015 and may not reflect
                current conditions. More recent estimates are not yet available
                at this geographic level.
              </LimitationItem>
              <LimitationItem>
                These are statistical estimates for populations, not individual
                predictions. Individual health outcomes depend on many factors
                not captured here.
              </LimitationItem>
              <LimitationItem>
                ZIP code level data may mask significant variation within
                neighborhoods. Health outcomes can differ substantially even
                within a single ZIP code.
              </LimitationItem>
              <LimitationItem>
                Model-based estimates from CDC PLACES have associated margins of
                error and should be interpreted with appropriate caution.
              </LimitationItem>
            </Section>

            {/* How this was built */}
            <Section title="How This Was Built">
              <p>
                Built by APH staff using modern development tools including AI
                agents like Claude, across three focused sessions.
              </p>

              {/* Timeline */}
              <div className="mt-4 space-y-3">
                <TimelineEntry
                  icon="database"
                  label="Session 1"
                  title="Data foundation"
                  detail="Pulled USALEEP, ACS, and CDC PLACES data; built the Python pipeline that joins census tracts to ZIP codes; rendered the first interactive Travis County map."
                />
                <TimelineEntry
                  icon="dashboard"
                  label="Session 2"
                  title="Three audience modes"
                  detail="Added the policy-maker explorer, neighborhood lookup, and indicator gauges; wired up geolocation and ZIP search; computed the county comparisons."
                />
                <TimelineEntry
                  icon="auto_awesome"
                  label="Session 3"
                  title="Calculators & demo polish"
                  detail="Added the smoking-impact and generations calculators; built the kiosk showcase mode; tightened mobile responsiveness; added this About panel."
                />
              </div>

              {/* Agency comparison */}
              <div className="mt-5 rounded-lg border border-aph-light-gray/60 overflow-hidden">
                <div className="bg-aph-dark-blue text-white px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wider">
                    How this compares
                  </p>
                </div>
                <div className="grid grid-cols-2 divide-x divide-aph-light-gray/60">
                  <div className="p-3 bg-white">
                    <p className="text-[10px] font-semibold text-aph-green uppercase tracking-wider mb-1">
                      APH IT (this build)
                    </p>
                    <p className="text-2xl font-bold text-aph-dark-blue leading-none">
                      ~12 hrs
                    </p>
                    <p className="text-[11px] text-aph-dark-gray mt-1 leading-tight">
                      3 × 4-hour sessions
                    </p>
                    <p className="text-[11px] text-aph-dark-gray mt-1 leading-tight">
                      Loaded staff cost:{" "}
                      <span className="font-semibold">~$1.5K</span>
                    </p>
                  </div>
                  <div className="p-3 bg-aph-white">
                    <p className="text-[10px] font-semibold text-aph-dark-gray uppercase tracking-wider mb-1">
                      Typical agency
                    </p>
                    <p className="text-2xl font-bold text-aph-dark-blue leading-none">
                      6-8 wks
                    </p>
                    <p className="text-[11px] text-aph-dark-gray mt-1 leading-tight">
                      250-400 hours
                    </p>
                    <p className="text-[11px] text-aph-dark-gray mt-1 leading-tight">
                      Estimated cost:{" "}
                      <span className="font-semibold">$50K-$100K</span>
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-aph-dark-gray px-3 py-2 bg-aph-white/60 border-t border-aph-light-gray/60 leading-snug">
                  Agency estimate based on typical small-to-mid agency rates
                  ($175-$250/hr blended) for an interactive data product with
                  pipeline, map, three modes, and calculators.
                </p>
              </div>

              <div className="mt-5">
                <p className="font-semibold text-aph-dark-blue text-xs uppercase tracking-wider mb-2">
                  A production deployment would add
                </p>
                <ul className="text-xs space-y-1.5 list-disc pl-4">
                  <li>
                    Authenticated APH-hosted environment with audit logging
                  </li>
                  <li>Automated data refresh as new vintages publish</li>
                  <li>Full WCAG 2.1 AA accessibility audit and remediation</li>
                  <li>
                    Stakeholder review of indicator selection and methodology
                    notes
                  </li>
                  <li>Spanish-language localization</li>
                  <li>Privacy and data-governance review</li>
                </ul>
              </div>
            </Section>

            {/* Credits */}
            <Section title="Credits" last>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-aph-green rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-white text-xl">
                    health_and_safety
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-aph-dark-blue">
                    Austin Public Health
                  </p>
                  <p className="text-sm text-aph-dark-gray">
                    City of Austin, Texas
                  </p>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---- Sub-components ---- */

function Section({
  title,
  children,
  last = false,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section className={last ? "" : "mb-8"}>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-aph-blue mb-3">
        {title}
      </h3>
      <div className="text-sm text-aph-dark-gray leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

function DataSourceItem({
  label,
  source,
  period,
}: {
  label: string;
  source: string;
  period: string;
}) {
  return (
    <div className="bg-aph-white rounded-lg p-3 border border-aph-light-gray/30">
      <p className="font-semibold text-aph-dark-blue text-sm">{label}</p>
      <p className="text-xs text-aph-dark-gray mt-1">{source}</p>
      <p className="text-xs text-aph-blue mt-0.5">Data period: {period}</p>
    </div>
  );
}

function MethodologyItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="material-symbols-outlined text-aph-green text-base mt-0.5 shrink-0">
        science
      </span>
      <p>{children}</p>
    </div>
  );
}

function LimitationItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="material-symbols-outlined text-aph-orange text-base mt-0.5 shrink-0">
        warning
      </span>
      <p>{children}</p>
    </div>
  );
}

function TimelineEntry({
  icon,
  label,
  title,
  detail,
}: {
  icon: string;
  label: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-9 h-9 rounded-full bg-aph-blue/10 border border-aph-blue/30 flex items-center justify-center">
          <span className="material-symbols-outlined text-aph-blue text-lg">
            {icon}
          </span>
        </div>
      </div>
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-aph-blue">
            {label}
          </span>
        </div>
        <p className="text-sm font-semibold text-aph-dark-blue leading-tight mt-0.5">
          {title}
        </p>
        <p className="text-xs text-aph-dark-gray mt-1 leading-relaxed">
          {detail}
        </p>
      </div>
    </div>
  );
}
