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
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        style={{ zIndex: 2000 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="About Austin Health Pulse"
        className={`fixed top-0 right-0 h-full w-full max-w-[480px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ zIndex: 2001 }}
      >
        {/* Header */}
        <div className="bg-aph-dark-blue text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-aph-green text-2xl">
              info
            </span>
            <h2 className="text-lg font-semibold">About This Tool</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            aria-label="Close about drawer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-6">
          {/* About */}
          <Section title="About Austin Health Pulse">
            <p>
              Austin Health Pulse is an interactive data tool that allows
              residents and policymakers to explore health indicators across
              Travis County neighborhoods. Built by Austin Public Health, it
              combines life expectancy, chronic disease, and socioeconomic data
              to reveal health patterns at the ZIP code level.
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
              abridged period life tables and then aggregated to ZIP code (ZCTA)
              using population-weighted averages via HUD USPS crosswalk
              residential ratios.
            </MethodologyItem>
            <MethodologyItem>
              Health indicators (diabetes, hypertension, obesity prevalence) are
              model-based estimates from CDC PLACES, derived from Behavioral
              Risk Factor Surveillance System (BRFSS) survey data using
              multilevel regression and poststratification.
            </MethodologyItem>
            <MethodologyItem>
              Socioeconomic indicators (poverty rate, uninsured rate) come from
              the American Community Survey and represent 5-year period
              estimates at the ZCTA level.
            </MethodologyItem>
          </Section>

          {/* Limitations */}
          <Section title="Limitations">
            <LimitationItem>
              Life expectancy data is from 2010-2015 and may not reflect current
              conditions. More recent estimates are not yet available at this
              geographic level.
            </LimitationItem>
            <LimitationItem>
              These are statistical estimates for populations, not individual
              predictions. Individual health outcomes depend on many factors not
              captured here.
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
