import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Radio, Activity, Gauge, Fuel, Crosshair,
  Navigation, FileDown, AlertTriangle, Clock,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────
const SITE_KEY  = 'ivos_site_config_v1';
const DEFAULT_CENTER: [number, number] = [14.7167, -17.4677];
const ALERT_THRESHOLD_MS = 60_000; // 60s immobile → alerte

// ─── Types ────────────────────────────────────────────────────────────────────
type VehicleStatus = 'moving' | 'stopped' | 'working' | 'alert';

interface Vehicle {
  id: string;
  name: string;
  type: 'truck' | 'crane';
  speed: number;
  fuel: number;
  pos: [number, number];
  status: VehicleStatus;
  lastMove: number;   // timestamp of last actual movement
  avgSpeed: number;   // running average for PDF
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getSiteCenter(): [number, number] {
  try {
    const raw = localStorage.getItem(SITE_KEY);
    if (raw) {
      const { lat, lng } = JSON.parse(raw);
      if (typeof lat === 'number' && typeof lng === 'number') return [lat, lng];
    }
  } catch {}
  return DEFAULT_CENTER;
}

function now() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function playAlertSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

// ─── Icon factories ───────────────────────────────────────────────────────────
const STATUS_COLOR: Record<VehicleStatus, string> = {
  moving:  '#16a34a',
  stopped: '#dc2626',
  working: '#2563eb',
  alert:   '#f97316',
};

function makeVehicleIcon(v: Vehicle) {
  const color = STATUS_COLOR[v.status];
  const emoji = v.type === 'crane' ? '🏗️' : '🚛';
  const isAlert = v.status === 'alert';
  const pulse = (v.status === 'moving' || isAlert)
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:2.5px solid ${color};opacity:0.5;animation:${isAlert ? 'ping 0.7s' : 'ping 1.8s'} infinite;"></div>`
    : '';
  return L.divIcon({
    html: `<div style="position:relative;width:42px;height:42px;">${pulse}<div style="position:relative;background:${color};border-radius:50%;width:42px;height:42px;display:flex;align-items:center;justify-content:center;font-size:21px;border:3px solid white;box-shadow:0 4px 14px rgba(0,0,0,0.35);">${emoji}</div></div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    className: '',
  });
}

function makeSiteIcon() {
  return L.divIcon({
    html: `<div style="background:#1e3a8a;border-radius:12px;width:46px;height:46px;display:flex;align-items:center;justify-content:center;font-size:23px;border:3px solid white;box-shadow:0 4px 16px rgba(0,0,0,0.4);">🏢</div>`,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    className: '',
  });
}

function popupHtml(v: Vehicle) {
  const c = STATUS_COLOR[v.status];
  const label = v.status === 'alert' ? '⚠️ ALERTE' : v.status === 'moving' ? '● En route' : v.status === 'working' ? '● En opération' : '● Arrêté';
  return `<div style="font-family:system-ui,sans-serif;min-width:190px">
    <div style="font-weight:700;font-size:14px;margin-bottom:3px">${v.id} — ${v.name}</div>
    <div style="display:flex;align-items:center;gap:5px;margin-bottom:4px">
      <span style="color:${c};font-weight:700;font-size:12px">${label}</span>
    </div>
    <div style="font-size:12px">🚀 <b>${Math.round(v.speed)} km/h</b> &nbsp;⛽ <b>${Math.round(v.fuel)}%</b></div>
    <div style="margin-top:5px;font-size:11px;background:#f3f4f6;border-radius:6px;height:8px;overflow:hidden">
      <div style="width:${v.fuel}%;height:100%;background:${v.fuel < 20 ? '#dc2626' : v.fuel < 50 ? '#f97316' : '#16a34a'};border-radius:6px"></div>
    </div>
    <div style="font-size:10px;color:#9ca3af;margin-top:5px">📍 ${v.pos[0].toFixed(5)}, ${v.pos[1].toFixed(5)}</div>
    <div style="font-size:10px;color:#9ca3af">🕐 ${now()}</div>
  </div>`;
}

// ─── Initial fleet ────────────────────────────────────────────────────────────
function buildFleet(center: [number, number]): Vehicle[] {
  return [
    { id: 'TRK-01',  name: 'Convoi Ciment',  type: 'truck', speed: 45, fuel: 80, pos: [center[0] + 0.012, center[1] - 0.018], status: 'moving',  lastMove: Date.now(), avgSpeed: 45 },
    { id: 'TRK-02',  name: 'Livraison Port', type: 'truck', speed: 0,  fuel: 35, pos: [center[0] - 0.008, center[1] + 0.014], status: 'stopped', lastMove: Date.now(), avgSpeed: 0  },
    { id: 'GRUE-01', name: 'Levage Site A',  type: 'crane', speed: 0,  fuel: 95, pos: [center[0] + 0.021, center[1] + 0.009], status: 'working', lastMove: Date.now(), avgSpeed: 0  },
    { id: 'TRK-03',  name: 'Transport GNL',  type: 'truck', speed: 38, fuel: 62, pos: [center[0] - 0.015, center[1] - 0.022], status: 'moving',  lastMove: Date.now(), avgSpeed: 38 },
  ];
}

// ─── PDF Report ───────────────────────────────────────────────────────────────
function generatePDF(vehicles: Vehicle[]) {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('IVOS FLEET TRACKING', 14, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Rapport de Flotte — Station de Contrôle', 14, 20);
  doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 140, 20);

  // Table
  autoTable(doc, {
    startY: 36,
    head: [['ID Véhicule', 'Nom', 'Statut', 'Vitesse moy.', 'Carburant', 'Conso. est.', 'Position GPS']],
    body: vehicles.map(v => [
      v.id,
      v.name,
      v.status === 'alert' ? '⚠ ALERTE' : v.status === 'moving' ? 'En route' : v.status === 'working' ? 'En opération' : 'Arrêté',
      `${Math.round(v.avgSpeed)} km/h`,
      `${Math.round(v.fuel)} %`,
      `${(v.avgSpeed * 0.35).toFixed(1)} L/100km`,
      `${v.pos[0].toFixed(4)}, ${v.pos[1].toFixed(4)}`,
    ]),
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    rowPageBreak: 'auto',
    styles: { fontSize: 9, cellPadding: 4 },
    didDrawCell: (data) => {
      if (data.column.index === 2 && data.section === 'body') {
        const val = String(data.cell.raw);
        if (val.includes('ALERTE')) data.cell.styles.textColor = [249, 115, 22];
        else if (val === 'En route') data.cell.styles.textColor = [22, 163, 74];
        else if (val === 'Arrêté') data.cell.styles.textColor = [220, 38, 38];
      }
    },
  });

  // Footer
  const pageCount = (doc as jsPDF & { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`IVOS Fleet Management — Page ${i}/${pageCount}`, 14, 290);
  }

  doc.save(`ivos-rapport-flotte-${Date.now()}.pdf`);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TrackingRealtime() {
  const center = getSiteCenter();
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => buildFleet(center));
  const [selected, setSelected] = useState<string | null>(null);
  const alertedIds = useRef<Set<string>>(new Set());

  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef  = useRef<Map<string, L.Marker>>(new Map());

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView(center, 12);
    mapInstance.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© IVOS Fleet · © OpenStreetMap', maxZoom: 19,
    }).addTo(map);
    L.marker(center, { icon: makeSiteIcon() }).addTo(map)
      .bindPopup(`<b>🏢 Site IVOS</b><br/><small>${center[0].toFixed(5)}, ${center[1].toFixed(5)}</small>`);
    vehicles.forEach(v => {
      const m = L.marker(v.pos, { icon: makeVehicleIcon(v) }).addTo(map).bindPopup(popupHtml(v));
      markersRef.current.set(v.id, m);
    });
    return () => {
      markersRef.current.clear();
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // ── Simulation + Alert watchdog — every 2s ────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const now_ts = Date.now();
      setVehicles(prev => prev.map(v => {
        // Only simulate movement for 'moving' status
        if (v.status !== 'moving') {
          // Alert watchdog: stopped/working vehicles that were previously moving
          if ((v.status === 'stopped') && (now_ts - v.lastMove > ALERT_THRESHOLD_MS)) {
            if (!alertedIds.current.has(v.id)) {
              alertedIds.current.add(v.id);
              playAlertSound();
              toast.warning(`⚠️ Arrêt prolongé détecté pour ${v.id}`, {
                description: `${v.name} est immobile depuis plus de 60 secondes.`,
                duration: 8000,
              });
              return { ...v, status: 'alert' as VehicleStatus };
            }
          }
          // Drain fuel slightly
          return { ...v, fuel: Math.max(0, v.fuel - 0.02) };
        }

        const step = 0.00012;
        const dLat = (Math.random() - 0.42) * step * 2;
        const dLng = (Math.random() - 0.42) * step * 2;
        const newSpeed = Math.max(10, Math.min(90, v.speed + (Math.random() - 0.5) * 10));
        const newFuel = Math.max(0, v.fuel - 0.05);
        const newAvg = (v.avgSpeed * 0.9) + (newSpeed * 0.1);

        return {
          ...v,
          pos: [v.pos[0] + dLat, v.pos[1] + dLng],
          speed: newSpeed,
          fuel: newFuel,
          avgSpeed: newAvg,
          lastMove: now_ts,
        };
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // ── Sync Leaflet markers with React state ─────────────────────────────────
  useEffect(() => {
    vehicles.forEach(v => {
      const m = markersRef.current.get(v.id);
      if (!m) return;
      m.setLatLng(v.pos);
      m.setIcon(makeVehicleIcon(v));
      m.setPopupContent(popupHtml(v));
    });
  }, [vehicles]);

  // ── FlyTo ─────────────────────────────────────────────────────────────────
  const flyTo = useCallback((v: Vehicle) => {
    setSelected(v.id);
    mapInstance.current?.flyTo(v.pos, 17, { animate: true, duration: 1.0 });
    markersRef.current.get(v.id)?.openPopup();
  }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const counts = {
    moving:  vehicles.filter(v => v.status === 'moving').length,
    stopped: vehicles.filter(v => v.status === 'stopped').length,
    working: vehicles.filter(v => v.status === 'working').length,
    alert:   vehicles.filter(v => v.status === 'alert').length,
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', width: '100%', fontFamily: 'system-ui,sans-serif', background: '#0f172a' }}>

      {/* ── MAP 70% ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: '0 0 70%', position: 'relative' }}>
        <style>{`
          @keyframes ping { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(2.4);opacity:0} }
          @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        `}</style>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* ── SIDEBAR 30% ─────────────────────────────────────────────────────── */}
      <div style={{
        flex: '0 0 30%', display: 'flex', flexDirection: 'column',
        background: '#0f172a', color: 'white',
        borderLeft: '1px solid #1e293b', overflowY: 'auto',
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ background: '#1d4ed8', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Radio size={18} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Station de Contrôle</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>IVOS Fleet · Simulation Live</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#064e3b', padding: '3px 9px', borderRadius: 20 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'ping 1.5s infinite' }}></span>
              <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 700 }}>LIVE</span>
            </div>
          </div>

          {/* KPI badges */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
            {([
              { label: 'Route',   value: counts.moving,  color: '#16a34a', bg: '#052e16' },
              { label: 'Stop',    value: counts.stopped, color: '#dc2626', bg: '#2d0a0a' },
              { label: 'Travail', value: counts.working, color: '#2563eb', bg: '#0c1a4a' },
              { label: 'Alerte',  value: counts.alert,   color: '#f97316', bg: '#3b1a00' },
            ] as const).map(k => (
              <div key={k.label} style={{
                background: k.bg, borderRadius: 9, padding: '7px 6px', textAlign: 'center',
                border: `1px solid ${k.color}44`,
                animation: k.label === 'Alerte' && counts.alert > 0 ? 'blink 1s infinite' : undefined,
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 9, color: '#94a3b8' }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PDF Button ── */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e293b' }}>
          <button
            onClick={() => generatePDF(vehicles)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
              border: 'none', borderRadius: 10, padding: '10px 0', color: 'white',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(99,102,241,0.35)',
            }}
          >
            <FileDown size={16} />
            Générer Rapport de Flotte
          </button>
        </div>

        {/* ── Section label ── */}
        <div style={{ padding: '10px 18px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={12} color="#64748b" />
          <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Véhicules ({vehicles.length})
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#334155' }}>↻ {now()}</span>
        </div>

        {/* ── Vehicle cards ── */}
        <div style={{ padding: '0 10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {vehicles.map(v => {
            const isSelected = selected === v.id;
            const sc = STATUS_COLOR[v.status];
            const isAlert = v.status === 'alert';
            const fuelColor = v.fuel < 20 ? '#dc2626' : v.fuel < 50 ? '#f97316' : '#16a34a';

            return (
              <div
                key={v.id}
                onClick={() => flyTo(v)}
                style={{
                  background: isAlert ? '#1c0a00' : isSelected ? '#1e3a8a18' : '#1e293b',
                  border: `1.5px solid ${isAlert ? '#f97316' : isSelected ? '#3b82f6' : '#334155'}`,
                  borderRadius: 12, padding: '11px 13px', cursor: 'pointer',
                  animation: isAlert ? 'blink 1s infinite' : undefined,
                  transition: 'border 0.2s',
                }}
              >
                {/* Row 1: icon + id + status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: `${sc}22`,
                    border: `2px solid ${sc}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0,
                  }}>
                    {v.type === 'crane' ? '🏗️' : '🚛'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9' }}>{v.id}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    {isAlert && <AlertTriangle size={13} color="#f97316" />}
                    <span style={{ fontSize: 10, fontWeight: 700, color: sc }}>
                      {v.status === 'alert' ? 'ALERTE' : v.status === 'moving' ? 'En route' : v.status === 'working' ? 'Travail' : 'Arrêté'}
                    </span>
                  </div>
                </div>

                {/* Row 2: speed + fuel gauge */}
                <div style={{ marginBottom: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Gauge size={12} color="#64748b" />
                      <span style={{ fontSize: 12, fontWeight: 700, color: v.status === 'moving' ? '#4ade80' : '#94a3b8' }}>
                        {Math.round(v.speed)} km/h
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Fuel size={12} color="#64748b" />
                      <span style={{ fontSize: 12, fontWeight: 700, color: fuelColor }}>{Math.round(v.fuel)}%</span>
                    </div>
                  </div>
                  {/* Fuel bar */}
                  <div style={{ height: 6, background: '#1e293b', borderRadius: 4, overflow: 'hidden', border: '1px solid #334155' }}>
                    <div style={{
                      width: `${v.fuel}%`, height: '100%', borderRadius: 4,
                      background: `linear-gradient(90deg, ${fuelColor}, ${fuelColor}aa)`,
                      transition: 'width 1s ease',
                    }} />
                  </div>
                </div>

                {/* Row 3: coords + Focus button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Clock size={10} color="#475569" />
                    <span style={{ fontSize: 9, color: '#475569' }}>{v.pos[0].toFixed(4)}, {v.pos[1].toFixed(4)}</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); flyTo(v); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: isAlert ? '#9a3412' : isSelected ? '#1d4ed8' : '#1e3a8a',
                      border: 'none', borderRadius: 7, padding: '5px 11px',
                      color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    <Crosshair size={11} />
                    Focus
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div style={{ marginTop: 'auto', padding: '10px 18px', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Navigation size={11} color="#475569" />
          <span style={{ fontSize: 9, color: '#475569' }}>Simulation · 2s · Alerte après 60s d'immobilité</span>
        </div>
      </div>
    </div>
  );
}
