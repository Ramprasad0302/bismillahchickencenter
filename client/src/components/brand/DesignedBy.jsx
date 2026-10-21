// "Designed by Nirmaan Digital" credit, linking to the agency's website.
// tone="light" for cream/white backgrounds, tone="dark" for the charcoal ones.
const NIRMAAN_URL = 'https://nirmaandigital.com';

const DesignedBy = ({ tone = 'light', className = '' }) => {
  const dark = tone === 'dark';
  return (
    <a
      href={NIRMAAN_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex items-center gap-1.5 text-[11px] tracking-wide transition-colors ${
        dark ? 'text-white/45 hover:text-gold-light' : 'text-muted hover:text-brand'
      } ${className}`}
    >
      <span>Designed by</span>
      <span
        className={`font-semibold underline-offset-4 group-hover:underline ${
          dark ? 'text-gold/90' : 'text-gold-dark'
        }`}
      >
        Nirmaan Digital
      </span>
      <svg aria-hidden viewBox="0 0 12 12" className="w-2.5 h-2.5 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
        <path d="M4 2h6v6M10 2 3 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </a>
  );
};

export default DesignedBy;
