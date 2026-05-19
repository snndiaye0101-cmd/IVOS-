import { useEffect, useMemo, useState } from 'react';

const WEEKDAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

function formatSenegalDate(date: Date) {
  const weekday = WEEKDAYS[date.getDay()];
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${weekday} ${day} ${month} ${year} — ${time}`;
}

export default function RealTimeClock() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const intervalId = window.setInterval(tick, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  const label = useMemo(() => formatSenegalDate(now), [now]);

  return (
    <div className="hidden items-center text-sm font-medium tracking-tight text-slate-500 md:flex">
      {label}
    </div>
  );
}
