import { Link } from 'react-router-dom';

const stateStyles = {
  confirmed: { label: 'now', dot: 'bg-emerald-400', bar: 'bg-emerald-400' },
  predicted: { label: 'estimated', dot: 'bg-amber-400', bar: 'bg-amber-400' },
  stale: { label: 'stale', dot: 'bg-neutral-500', bar: 'bg-neutral-500' },
  none: { label: 'not tracked yet', dot: 'bg-neutral-700', bar: 'bg-neutral-700' },
};

export default function BusRunCard({ bus, live, percent, firstStop, lastStop }) {
  const state = live?.state || 'none';
  const style = stateStyles[state];

  return (
    <Link
      to={`/track/${bus.id}`}
      className="block rounded-xl border border-neutral-800 bg-neutral-900/60 px-5 py-4 hover:border-neutral-700 transition-colors"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-white font-semibold">{bus.bus_number}</div>
          <div className="text-neutral-500 text-sm">{bus.route_name || 'No route assigned'}</div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${state === 'confirmed' ? 'animate-pulse' : ''}`} />
          {style.label}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-300 w-20 truncate">{firstStop || '—'}</span>
        <div className="flex-1 h-1.5 rounded-full bg-neutral-800 relative">
          <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${percent ?? 0}%` }} />
          {percent !== null && (
            <div
              className="absolute -top-1.5 w-3.5 h-3.5 rounded-full border-2 border-neutral-950"
              style={{ left: `calc(${percent}% - 7px)`, background: 'currentColor' }}
            />
          )}
        </div>
        <span className="text-sm text-neutral-300 w-20 text-right truncate">{lastStop || '—'}</span>
      </div>
    </Link>
  );
}