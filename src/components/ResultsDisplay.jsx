import { forwardRef } from 'react';
import CityMap from './CityMap';
import ScoreCard from './ScoreCard';
import RentChart from './RentChart';
import CrimeChart from './CrimeChart';
import EducationDonut from './EducationDonut';
import DataSourceBadge from './DataSourceBadge';
import InfoTooltip from './InfoTooltip';
import SectionMeta from './SectionMeta';

function sourceStatus(section) {
  if (!section) return 'error';
  if (section.error) return 'error';
  if (section.status === 'coming-soon') return 'coming-soon';
  if (section.note) return 'no-key';
  if (section.status === 'placeholder') return 'placeholder';
  return 'live';
}

function currency(v) {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(v));
}

const ResultsDisplay = forwardRef(function ResultsDisplay(
  { city, stateName, data, actions, errorMessage },
  ref,
) {
  const { census, crime, housing, livingWage, health, cdcWonder, coordinates } = data;

  const povertyPct =
    census?.population && census?.populationBelowPoverty
      ? ((census.populationBelowPoverty / census.population) * 100).toFixed(1)
      : null;

  const affordabilityRatio =
    census?.medianHomeValue && census?.medianHouseholdIncome
      ? (census.medianHomeValue / census.medianHouseholdIncome).toFixed(1)
      : null;

  return (
    <div ref={ref} className="mx-auto max-w-4xl px-4 py-8">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {city}, {stateName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Data fetched {new Date(data.fetchedAt).toLocaleString()}
          </p>
        </div>
        {actions && (
          <div data-pdf-hide="" className="flex flex-wrap gap-2">
            {actions}
          </div>
        )}
      </div>
      {errorMessage && (
        <p data-pdf-hide="" role="alert" className="mb-4 text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      {/* ── Map ────────────────────────────────────────────── */}
      {coordinates?.lat != null && (
        <div className="mb-6" data-pdf-hide="">
          <CityMap
            lat={coordinates.lat}
            lng={coordinates.lng}
            city={city}
            state={stateName}
          />
        </div>
      )}

      {/* ── At a Glance — Score Cards ──────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-700">At a Glance</h2>
        <SectionMeta source="U.S. Census ACS 5-Year Estimates" vintage="2024" scope="city" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ScoreCard
            label="Population"
            value={census?.population}
            tooltip="Total population within city limits. Census Bureau estimate based on 5-year survey data (2020–2024)."
          />
          <ScoreCard
            label="Median Age"
            value={census?.medianAge}
            format="plain"
            tooltip="Half the population is older and half is younger than this age. Lower values often indicate college towns or young-family areas; higher values suggest retirement communities."
          />
          <ScoreCard
            label="Median Income"
            value={census?.medianHouseholdIncome}
            format="currency"
            tooltip="Median household income — half of households earn more, half earn less. National median was ~$81,000 in 2024."
          />
          <ScoreCard
            label="Median Rent"
            value={census?.medianGrossRent}
            format="currency"
            tooltip="Median gross rent asked, including utilities. National median was ~$1,413 in 2024."
          />
        </div>
      </section>

      {/* ── Housing & Affordability ────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-700">Housing &amp; Affordability</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Rent chart (left) */}
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="mb-1 text-sm font-medium text-gray-500">
              Fair Market Rent (HUD){housing?.countyName ? ` — ${housing.countyName} County` : ''}
              <InfoTooltip text={housing?.scope === 'county'
                ? 'Fair Market Rent (FMR) is HUD\'s estimate of the 40th-percentile rent, used for Section 8 housing voucher calculations. This is county-level data specific to the area around this city.'
                : 'Fair Market Rent (FMR) is HUD\'s estimate of the 40th-percentile rent, used for Section 8 housing voucher calculations. This is state-level data — actual rents in this city may be higher or lower.'
              } />
            </h3>
            <SectionMeta
              source="HUD Fair Market Rent"
              vintage={housing?.year ? String(housing.year) : 'Current FY'}
              scope={housing?.scope || 'state'}
              note={housing?.scope === 'county' ? undefined : 'State-level estimate — may not reflect local rental market.'}
            />
            {housing?.note ? (
              <p className="text-sm text-amber-600">{housing.note}</p>
            ) : (
              <RentChart housing={housing} />
            )}
          </div>

          {/* Affordability stats (right) */}
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="mb-1 text-sm font-medium text-gray-500">Affordability</h3>
            <SectionMeta source="U.S. Census ACS 5-Year" vintage="2024" scope="city" />
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Median Home Value</dt>
                <dd className="font-semibold">{currency(census?.medianHomeValue)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Median Income</dt>
                <dd className="font-semibold">{currency(census?.medianHouseholdIncome)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">
                  Home / Income Ratio
                  <InfoTooltip text="A ratio above 3.0× is generally considered unaffordable. Above 5.0× indicates a severely unaffordable housing market. National median is roughly 3.5×." />
                </dt>
                <dd className="font-semibold">{affordabilityRatio ? `${affordabilityRatio}×` : '—'}</dd>
              </div>
              {/* Poverty gauge bar */}
              <div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">
                    Poverty Rate
                    <InfoTooltip text="Percentage of the population living below the federal poverty line. National average is ~12.5% (2024). Color guide: green (<12%), amber (12–20%), red (>20%)." />
                  </dt>
                  <dd className="font-semibold">
                    {povertyPct ? `${povertyPct}%` : '—'}
                    {povertyPct && (
                      <span className="ml-1 text-xs font-normal text-gray-400">
                        ({Number(povertyPct) > 20 ? 'high' : Number(povertyPct) > 12 ? 'moderate' : 'low'})
                      </span>
                    )}
                  </dd>
                </div>
                {povertyPct && (
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full rounded-full ${
                        Number(povertyPct) > 20
                          ? 'bg-red-500'
                          : Number(povertyPct) > 12
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(Number(povertyPct), 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ── Crime ──────────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-700">
          Crime {crime?.year ? `(${crime.year})` : ''}
          <InfoTooltip text={`Crime data from the FBI Crime Data Explorer covers the entire state of ${stateName}. City-level crime data is not available through this API. Rates are per 100,000 residents, making them comparable across states of different sizes.`} />
        </h2>
        <SectionMeta
          source="FBI Crime Data Explorer"
          vintage={crime?.year ? String(crime.year) : '2022'}
          scope="state"
        />
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚠ These are <strong>state-level</strong> rates per 100,000 residents, not city-specific figures. Actual crime in {city} may differ significantly from the statewide rate.
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          {crime?.note ? (
            <p className="text-sm text-amber-600">{crime.note}</p>
          ) : crime?.error ? (
            <p className="text-sm text-red-500">{crime.error}</p>
          ) : (
            <CrimeChart crime={crime} />
          )}
        </div>
      </section>

      {/* ── Education ──────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-700">
          Education Attainment
          <InfoTooltip text="Percentage of the population aged 25 and over holding each degree type. National averages (2024): Bachelor's ~22%, Master's ~10%, Doctorate ~2%." />
        </h2>
        <SectionMeta source="U.S. Census ACS 5-Year Estimates" vintage="2024" scope="city" />
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          {census?.error ? (
            <p className="text-sm text-red-500">{census.error}</p>
          ) : (
            <EducationDonut census={census} />
          )}
        </div>
      </section>

      {/* ── Placeholder Sources ────────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-700">Coming Soon</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <DataSourceBadge label="Living Wage" status="coming-soon" />
            <p className="mt-2 text-xs text-gray-500">
              {livingWage?.countyName
                ? `Living wage data for ${livingWage.countyName} County requires a data license from the Living Wage Institute. This feature is coming soon.`
                : 'MIT Living Wage data requires a data license for programmatic access. This feature is coming soon.'}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <DataSourceBadge label="Health Rankings" status="coming-soon" />
            <p className="mt-2 text-xs text-gray-500">
              {health?.countyName
                ? `Health rankings for ${health.countyName} County are not yet available via API. Data is provided as downloadable datasets by County Health Rankings. This feature is coming soon.`
                : 'County Health Rankings data is not available via API. This feature is coming soon.'}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <DataSourceBadge label="CDC WONDER" status="coming-soon" />
            <p className="mt-2 text-xs text-gray-500">
              CDC WONDER requires a data‑use agreement and API token. This feature is coming soon.
            </p>
          </div>
        </div>
      </section>

      {/* ── Data Source Status Footer ──────────────────────── */}
      <footer className="border-t pt-4">
        <p className="mb-2 text-[11px] text-gray-400">
          Data vintage and geographic scope vary by source. Hover the <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-200 text-[9px] text-gray-500">i</span> icons above for details.
          {data?.fips && <> County resolved: {data.fips.countyName} County, {data.fips.stateCode} (FIPS {data.fips.countyFIPS}).</>}
        </p>
        <p className="mb-2 text-[11px] text-gray-400">
          Geographic data uses the FCC Data API but is not endorsed or certified by the FCC.
        </p>
        <div className="flex flex-wrap gap-2">
          <DataSourceBadge label="Census" status={sourceStatus(census)} />
          <DataSourceBadge label="FBI Crime" status={sourceStatus(crime)} />
          <DataSourceBadge label="HUD FMR" status={sourceStatus(housing)} />
          <DataSourceBadge label="Living Wage" status={sourceStatus(livingWage)} />
          <DataSourceBadge label="Health" status={sourceStatus(health)} />
          <DataSourceBadge label="CDC WONDER" status={sourceStatus(cdcWonder)} />
        </div>
      </footer>
    </div>
  );
});

export default ResultsDisplay;
