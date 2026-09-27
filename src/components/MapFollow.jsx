import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export default function MapFollow({ position }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;
    map.setView(position, map.getZoom(), { animate: true });
  }, [position, map]);

  return null;
}
