import { useState, lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import { useHealthData } from "../../hooks/useHealthData";
import { useIdleTimer } from "../../hooks/useIdleTimer";
import NeighborhoodMode from "../neighborhood/NeighborhoodMode";
import IdleShowcase from "../showcase/IdleShowcase";
import AboutDrawer from "../shared/AboutDrawer";
import TourOverlay from "../shared/TourOverlay";

const TOUR_SEEN_KEY = "aph_tour_seen_v1";

const ExploreMode = lazy(() => import("../explore/ExploreMode"));
const CompareMode = lazy(() => import("../compare/CompareMode"));

export default function AppShell() {
  const { loading, error } = useHealthData();
  const { isIdle } = useIdleTimer();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(true);

  useEffect(() => {
    try {
      setHasSeenTour(localStorage.getItem(TOUR_SEEN_KEY) === "1");
    } catch {
      // localStorage may be blocked — fall back to "seen" so we don't auto-pop
      setHasSeenTour(true);
    }
  }, []);

  const openTour = () => setTourOpen(true);
  const closeTour = () => {
    setTourOpen(false);
    try {
      localStorage.setItem(TOUR_SEEN_KEY, "1");
    } catch {
      // ignore
    }
    setHasSeenTour(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-aph-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-aph-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-aph-dark-blue font-semibold">
            Loading health data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-aph-white">
        <div className="text-center max-w-md p-8">
          <span className="material-symbols-outlined text-aph-red text-5xl mb-4 block">
            error
          </span>
          <h2 className="text-xl font-semibold text-aph-dark-blue mb-2">
            Unable to Load Data
          </h2>
          <p className="text-aph-dark-gray">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-aph-white">
      <Header onInfoClick={() => setAboutOpen(true)} />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-aph-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-aph-dark-blue font-semibold">Loading...</p>
              </div>
            </div>
          }
        >
          <Routes>
            <Route
              path="/"
              element={
                <NeighborhoodMode onAboutClick={() => setAboutOpen(true)} />
              }
            />
            <Route path="/explore" element={<ExploreMode />} />
            <Route path="/compare" element={<CompareMode />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />

      {/* Floating tour button */}
      <button
        onClick={openTour}
        className={`fixed bottom-5 right-5 group z-40 flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full bg-aph-blue text-white shadow-lg hover:brightness-110 active:scale-[0.97] transition ${
          !hasSeenTour ? "ring-4 ring-aph-blue/30" : ""
        }`}
        aria-label="Take a 60-second tour"
        title="Take a 60-second tour"
        style={{ zIndex: 1500 }}
      >
        <span className="material-symbols-outlined text-xl">tour</span>
        <span className="text-sm font-semibold">60-second tour</span>
      </button>

      <AboutDrawer isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
      {tourOpen && <TourOverlay onClose={closeTour} />}
      {isIdle && <IdleShowcase onDismiss={() => {}} />}
    </div>
  );
}
