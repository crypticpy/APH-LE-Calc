export default function Footer() {
  return (
    <footer className="bg-aph-dark-blue text-aph-light-blue text-xs py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <p className="font-semibold text-white mb-1">Austin Health Pulse</p>
            <p>Austin Public Health | City of Austin</p>
            <p className="mt-2 text-aph-light-gray max-w-md">
              This tool provides statistical estimates based on historical data
              and is intended for informational purposes only. Individual
              outcomes may vary.
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className="font-semibold text-white mb-1">Data Sources</p>
            <p>Life Expectancy: CDC USALEEP (2010-2015)</p>
            <p>Poverty & Insurance: ACS 5-Year (2022)</p>
            <p>Chronic Disease: CDC PLACES (2023)</p>
            <p className="mt-2 text-aph-light-gray">
              Data current as of March 2026
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
