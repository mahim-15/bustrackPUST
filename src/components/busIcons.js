import L from 'leaflet';

// Simple colored dot markers per state — no external image dependency.
// confirmed = solid green, predicted = dashed amber ring, stale = grey.
function dotIcon({ color, dashed = false, pulse = false }) {
  const ring = dashed ? `border: 2px dashed ${color};` : `border: 2px solid ${color};`;
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 18px; height: 18px; border-radius: 9999px;
        background: ${dashed ? 'transparent' : color};
        ${ring}
        box-shadow: 0 0 0 3px rgba(0,0,0,0.08);
        ${pulse ? 'animation: bus-pulse 1.6s ease-in-out infinite;' : ''}
      "></div>
      <style>
        @keyframes bus-pulse {
          0% { box-shadow: 0 0 0 0 ${color}55; }
          70% { box-shadow: 0 0 0 8px ${color}00; }
          100% { box-shadow: 0 0 0 0 ${color}00; }
        }
      </style>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export const stateIcons = {
  confirmed: dotIcon({ color: '#16a34a', pulse: true }), // green
  predicted: dotIcon({ color: '#d97706', dashed: true }), // amber, dashed = estimated
  stale: dotIcon({ color: '#9ca3af' }), // grey
};

export const stateLabels = {
  confirmed: 'Live',
  predicted: 'Estimated',
  stale: 'Last known',
};
