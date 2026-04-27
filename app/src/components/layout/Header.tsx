import { NavLink } from "react-router-dom";

const modes = [
  { to: "/", label: "Check Your Neighborhood", icon: "home" },
  { to: "/explore", label: "Explore the Map", icon: "map" },
  { to: "/compare", label: "Compare Zip Codes", icon: "compare_arrows" },
];

interface HeaderProps {
  onInfoClick?: () => void;
}

export default function Header({ onInfoClick }: HeaderProps) {
  return (
    <header className="bg-aph-dark-blue text-white">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-aph-green rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-2xl">
              health_and_safety
            </span>
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">
              Austin Health Pulse
            </h1>
            <p className="text-xs text-aph-light-blue opacity-80">
              Austin Public Health
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <nav className="hidden md:flex gap-1">
            {modes.map((mode) => (
              <NavLink
                key={mode.to}
                to={mode.to}
                end={mode.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-aph-blue text-white"
                      : "text-aph-light-blue hover:bg-white/10"
                  }`
                }
              >
                <span className="material-symbols-outlined text-lg">
                  {mode.icon}
                </span>
                {mode.label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={onInfoClick}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg border border-white/25 bg-white/5 text-aph-light-blue text-sm font-semibold hover:bg-white/15 hover:text-white transition-colors"
            aria-label="About this tool"
          >
            <span className="material-symbols-outlined text-lg">info</span>
            <span className="hidden sm:inline">About</span>
          </button>
        </div>
      </div>
      {/* Mobile nav */}
      <nav className="md:hidden flex border-t border-white/10">
        {modes.map((mode) => (
          <NavLink
            key={mode.to}
            to={mode.to}
            end={mode.to === "/"}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2 text-xs font-semibold transition-colors ${
                isActive ? "bg-aph-blue text-white" : "text-aph-light-blue"
              }`
            }
          >
            <span className="material-symbols-outlined text-lg">
              {mode.icon}
            </span>
            {mode.label.split(" ").slice(0, 2).join(" ")}
          </NavLink>
        ))}
      </nav>
      {/* Brand accent stripe */}
      <div className="h-1 bg-gradient-to-r from-aph-green via-aph-blue to-aph-dark-blue" />
    </header>
  );
}
