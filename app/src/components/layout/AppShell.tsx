import { useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import { useHealthData } from "../../hooks/useHealthData";
import { useIdleTimer } from "../../hooks/useIdleTimer";
import NeighborhoodMode from "../neighborhood/NeighborhoodMode";
import IdleShowcase from "../showcase/IdleShowcase";
import AboutDrawer from "../shared/AboutDrawer";

const ExploreMode = lazy(() => import("../explore/ExploreMode"));
const CompareMode = lazy(() => import("../compare/CompareMode"));

export default function AppShell() {
  const { loading, error } = useHealthData();
  const { isIdle } = useIdleTimer();
  const [aboutOpen, setAboutOpen] = useState(false);

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
            <Route path="/" element={<NeighborhoodMode />} />
            <Route path="/explore" element={<ExploreMode />} />
            <Route path="/compare" element={<CompareMode />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <AboutDrawer isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
      {isIdle && <IdleShowcase onDismiss={() => {}} />}
    </div>
  );
}
