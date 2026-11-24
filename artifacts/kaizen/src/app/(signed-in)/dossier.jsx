export const dossierPanel =
  'min-w-0 min-h-dvh border-x border-outline-variant bg-surface font-body-md text-body-md text-on-surface';
export const dossierLabel =
  'font-label-mono-md text-label-mono-md uppercase tracking-wider';
export const dossierInput =
  'mt-space-xs block w-full min-w-0 border border-surface-bright bg-surface-container-lowest px-space-md py-space-sm font-body-md text-body-md text-on-surface focus-visible:outline-2 focus-visible:outline-primary [color-scheme:dark]';
export const dossierButton =
  'border border-primary-container bg-primary-container px-space-md py-space-sm font-label-mono-md text-label-mono-md uppercase text-on-primary-container hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60';

/** @param {{number: string, title: string, eyebrow: string, titleClass?: string}} props */
export function DossierHeader({ number, title, eyebrow, titleClass = '' }) {
  return (
    <header className="border-b-2 border-outline-variant bg-surface-container-lowest p-space-lg sm:p-margin-desktop">
      <p className={dossierLabel}>
        <span className="bg-primary-container px-space-sm py-space-xs text-on-primary-container">
          {eyebrow}
        </span>
      </p>
      <div className="mt-space-md flex flex-wrap items-end justify-between gap-space-lg">
        <h1
          className={`min-w-0 text-display-xl-mobile font-bold uppercase [overflow-wrap:anywhere] sm:text-display-lg xl:text-display-xl ${titleClass || 'font-display-xl'}`}
        >
          <span
            aria-hidden="true"
            className="mr-space-sm before:content-[attr(data-number)]"
            data-number={number}
          />
          {title}
        </h1>
      </div>
    </header>
  );
}

const metricThemes = {
  neutral: 'bg-surface-container-low text-on-surface',
  signal: 'bg-surface-container text-primary-container',
  paper: 'bg-secondary-fixed text-on-secondary-fixed',
  olive: 'bg-surface-container-lowest text-tertiary',
};

/** @param {{label: string, value: import('react').ReactNode, note?: import('react').ReactNode, tone?: keyof typeof metricThemes, valueClass?: string}} props */
export function DossierMetric({
  label,
  value,
  note,
  tone = 'neutral',
  valueClass = 'font-display-lg',
}) {
  return (
    <div
      className={`min-w-0 min-h-36 space-y-space-md p-space-md sm:p-space-lg ${metricThemes[tone]}`}
    >
      <dt className={dossierLabel}>{label}</dt>
      <dd
        className={`text-display-lg-mobile tabular-nums [overflow-wrap:anywhere] xl:text-display-lg ${valueClass}`}
      >
        {value}
      </dd>
      {note && (
        <dd className={`border-t border-current pt-space-sm ${dossierLabel}`}>
          {note}
        </dd>
      )}
    </div>
  );
}
