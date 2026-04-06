import { supabase } from './supabaseClient';

/**
 * Trigger a browser file download from a Blob.
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(city, state) {
  return `${city}_${state}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Export results as JSON file download.
 */
export function exportJSON(data, city, state) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, `${safeFilename(city, state)}_rateland.json`);
}

/**
 * Export results as CSV file download.
 */
export function exportCSV(data, city, state) {
  const rows = [['Section', 'Metric', 'Value']];

  const { census, crime, housing } = data;

  if (census && !census.error) {
    rows.push(
      ['Census', 'Population', census.population],
      ['Census', 'Median Age', census.medianAge],
      ['Census', 'Median Household Income', census.medianHouseholdIncome],
      ['Census', 'Median Home Value', census.medianHomeValue],
      ['Census', 'Median Gross Rent', census.medianGrossRent],
      ['Census', 'Population Below Poverty', census.populationBelowPoverty],
      ['Census', 'Education - Bachelors %', census.educationBachelors],
      ['Census', 'Education - Masters %', census.educationMasters],
      ['Census', 'Education - Doctorate %', census.educationDoctorate],
    );
  }

  if (crime && !crime.error) {
    rows.push(
      ['Crime', 'Year', crime.year],
      ['Crime', 'Violent Crime Rate (per 100k)', crime.violentCrimeRate],
      ['Crime', 'Property Crime Rate (per 100k)', crime.propertyCrimeRate],
      ['Crime', 'Homicide Rate', crime.homicideRate],
      ['Crime', 'Robbery Rate', crime.robberyRate],
      ['Crime', 'Aggravated Assault Rate', crime.aggravatedAssaultRate],
      ['Crime', 'Burglary Rate', crime.burglaryRate],
      ['Crime', 'Larceny Rate', crime.larcenyRate],
      ['Crime', 'Motor Vehicle Theft Rate', crime.motorVehicleTheftRate],
    );
  }

  if (housing && !housing.error) {
    rows.push(
      ['Housing', 'Source', housing.source],
      ['Housing', 'Scope', housing.scope],
      ['Housing', 'FMR - Efficiency', housing.fmr_efficiency],
      ['Housing', 'FMR - 1 BR', housing.fmr_1br],
      ['Housing', 'FMR - 2 BR', housing.fmr_2br],
      ['Housing', 'FMR - 3 BR', housing.fmr_3br],
      ['Housing', 'FMR - 4 BR', housing.fmr_4br],
    );
  }

  const csv = rows
    .map((row) =>
      row
        .map((v) => {
          if (v == null) return '';
          const s = String(v);
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${safeFilename(city, state)}_rateland.csv`);
}

/**
 * Export the rendered results DOM element as a PDF.
 * html2pdf.js is dynamically imported to keep the initial bundle small.
 */
export async function exportPDF(element, city, state) {
  const html2pdf = (await import('html2pdf.js')).default;
  const filename = `${safeFilename(city, state)}_rateland.pdf`;

  await html2pdf()
    .set({
      margin: [10, 10, 10, 10],
      filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        ignoreElements: (el) => el.hasAttribute('data-pdf-hide'),
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .from(element)
    .save();
}

/**
 * Share results — inserts into shared_results and returns the shareable URL.
 */
export async function shareResults(city, state, data, userId) {
  const { data: row, error } = await supabase
    .from('shared_results')
    .insert({ city, state, data, created_by: userId })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  return `${window.location.origin}/shared/${row.id}`;
}
