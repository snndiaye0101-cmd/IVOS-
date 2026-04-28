import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  Layers,
  Bell,
  Download,
  Truck,
  UserRound,
} from "lucide-react";
import {
  format,
  addDays,
  subDays,
  startOfWeek,
  addWeeks,
  subWeeks,
  isSameDay,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  getDay,
  eachDayOfInterval,
} from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { congesStore, type Conge } from "../../personnel/services/congesStore";
import { personnelStore } from "../../fleet/services/personnelStore";
import { vehiclesStore, joursAvantExpirationVT } from "../../fleet/services/vehiclesStore";

// ── Constants ──
const HOUR_START = 7;
const HOUR_END = 21;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const HOUR_HEIGHT_PX = 64; // px per hour row
const TOTAL_HEIGHT = HOURS.length * HOUR_HEIGHT_PX;

const EVENT_TYPES = [
  { key: "maintenance", label: "Maintenance", bg: "bg-red-600", border: "border-red-800", text: "text-white", light: "bg-red-100 text-red-800 border-red-300" },
  { key: "operations", label: "Opérations", bg: "bg-blue-700", border: "border-blue-900", text: "text-white", light: "bg-blue-100 text-blue-800 border-blue-300" },
  { key: "rh", label: "RH", bg: "bg-green-700", border: "border-green-900", text: "text-white", light: "bg-green-100 text-green-800 border-green-300" },
  { key: "conge", label: "Congés", bg: "bg-sky-500", border: "border-sky-700", text: "text-white", light: "bg-sky-100 text-sky-800 border-sky-300" },
  { key: "permission", label: "Permissions", bg: "bg-amber-500", border: "border-amber-700", text: "text-white", light: "bg-amber-100 text-amber-800 border-amber-300" },
  { key: "maladie", label: "Maladie", bg: "bg-rose-600", border: "border-rose-800", text: "text-white", light: "bg-rose-100 text-rose-800 border-rose-300" },
  { key: "visite_technique", label: "Visite Technique", bg: "bg-orange-600", border: "border-orange-800", text: "text-white", light: "bg-orange-100 text-orange-800 border-orange-300" },
  { key: "assurance_fleet", label: "Assurance Flotte", bg: "bg-purple-600", border: "border-purple-800", text: "text-white", light: "bg-purple-100 text-purple-800 border-purple-300" },
  { key: "carte_grise", label: "Carte Grise", bg: "bg-teal-600", border: "border-teal-800", text: "text-white", light: "bg-teal-100 text-teal-800 border-teal-300" },
  { key: "vignette", label: "Vignette/Taxe", bg: "bg-pink-600", border: "border-pink-800", text: "text-white", light: "bg-pink-100 text-pink-800 border-pink-300" },
];

type ViewMode = "month" | "week" | "day";

interface CalendarEvent {
  id: number;
  date: string;
  title: string;
  type: string;
  time: string;
  duration: number;
  location: string;
  client?: string;
  camion?: string;
  instructions?: string;
  // Absence metadata (for conge/permission/maladie events)
  _absence?: {
    employeId: string;
    employeNom: string;
    photo: string;
    typeAbsence: string;
    motif: string;
    remplacantNom: string;
    dateDebut: string;
    dateFin: string;
  };
}

const MOCK_EVENTS: CalendarEvent[] = [
  { id: 1, date: "2026-04-12", title: "Réunion équipe", type: "operations", time: "10:00", duration: 90, location: "Salle 1", client: "SOCOCIM", camion: "TK-204", instructions: "Préparer dossier projet" },
  { id: 2, date: "2026-04-12", title: "Maintenance serveur", type: "maintenance", time: "14:00", duration: 120, location: "Data Center", client: "Interne", camion: "—", instructions: "Vérifier onduleurs et climatisation" },
  { id: 3, date: "2026-04-15", title: "Entretien RH", type: "rh", time: "09:00", duration: 60, location: "Bureau RH", client: "—", camion: "—", instructions: "Entretien annuel M. Diallo" },
  { id: 4, date: "2026-04-13", title: "Inspection véhicules", type: "maintenance", time: "08:00", duration: 180, location: "Garage", client: "Interne", camion: "TK-101 / TK-102", instructions: "Contrôle freins + niveaux" },
  { id: 5, date: "2026-04-14", title: "Livraison site Nord", type: "operations", time: "07:30", duration: 150, location: "Site Nord", client: "DANGOTE", camion: "TK-305", instructions: "Chargement quai 3 à 07h00" },
  { id: 6, date: "2026-04-16", title: "Formation sécurité", type: "rh", time: "13:00", duration: 120, location: "Salle de formation", client: "—", camion: "—", instructions: "Apporter EPI" },
  { id: 7, date: "2026-04-17", title: "Vidange flotte", type: "maintenance", time: "09:00", duration: 240, location: "Atelier mécanique", client: "Interne", camion: "Flotte entière", instructions: "Huile 15W40, filtres neufs" },
  { id: 8, date: "2026-04-12", title: "Briefing opération", type: "operations", time: "08:00", duration: 60, location: "Bureau ops", client: "EIFFAGE", camion: "TK-210", instructions: "Confirmer itinéraire avec le client" },
  { id: 9, date: "2026-04-20", title: "Transport ciment", type: "operations", time: "06:30", duration: 300, location: "Usine Rufisque", client: "SOCOCIM", camion: "TK-401", instructions: "35 tonnes, bâcher obligatoire" },
  { id: 10, date: "2026-04-22", title: "Révision camion TK-305", type: "maintenance", time: "08:00", duration: 480, location: "Garage principal", client: "Interne", camion: "TK-305", instructions: "Vidange + courroie distribution" },
  { id: 11, date: "2026-04-25", title: "Paie & déclarations", type: "rh", time: "09:00", duration: 180, location: "Bureau comptabilité", client: "—", camion: "—", instructions: "Deadline CNSS : 30 avril" },
  { id: 12, date: "2026-04-12", title: "Livraison Thiès", type: "operations", time: "16:00", duration: 120, location: "Thiès centre", client: "AUCHAN", camion: "TK-112", instructions: "Palette fragile, attention déchargement" },
];

function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h + m / 60;
}

function minutesToTimeStr(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getTopPx(time: string): number {
  return (parseTime(time) - HOUR_START) * HOUR_HEIGHT_PX;
}

function getHeightPx(duration: number): number {
  return (duration / 60) * HOUR_HEIGHT_PX;
}

function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((e) => e.date === format(day, "yyyy-MM-dd"));
}

function getTypeStyle(type: string) {
  return EVENT_TYPES.find((t) => t.key === type) || EVENT_TYPES[0];
}

// ── Temporal helpers ──
function getEventStatus(event: CalendarEvent, now: Date): "upcoming" | "in-progress" | "finished" | "future" {
  const todayStr = format(now, "yyyy-MM-dd");
  if (event.date !== todayStr) {
    return event.date < todayStr ? "finished" : "future";
  }
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [eh, em] = event.time.split(":").map(Number);
  const startMin = eh * 60 + em;
  const endMin = startMin + event.duration;
  if (nowMin >= endMin) return "finished";
  if (nowMin >= startMin) return "in-progress";
  if (startMin - nowMin <= 10) return "upcoming";
  return "future";
}

// ── Notification sound (professional ping) ──
function playNotificationPing() {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.3);
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    setTimeout(() => ctx.close(), 700);
  } catch { /* AudioContext not available */ }
}

// ── Current Time Hook (updates every minute) ──
function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ── Month Grid helpers ──
function getMonthGrid(anchor: Date): Date[] {
  const start = startOfMonth(anchor);
  let dayOfWeek = getDay(start);
  if (dayOfWeek === 0) dayOfWeek = 7;
  const gridStart = subDays(start, dayOfWeek - 1);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

// ── Convert validated congés to calendar events ──
function congeTypeToEventKey(typeAbsence: string): string {
  if (typeAbsence === "Permission") return "permission";
  if (typeAbsence === "Maladie") return "maladie";
  return "conge"; // Congé annuel, Récupération
}

function buildAbsenceEvents(conges: Conge[]): CalendarEvent[] {
  const agents = personnelStore.load();
  const validated = conges.filter((c) => c.statut === "Validé par direction");
  const events: CalendarEvent[] = [];

  for (const c of validated) {
    const agent = agents.find((a) => a.id === c.employeId);
    const photo = agent?.photo || "";
    const days = eachDayOfInterval({
      start: new Date(c.dateDebut),
      end: new Date(c.dateFin),
    });
    const typeKey = congeTypeToEventKey(c.typeAbsence);
    const prefix =
      typeKey === "permission" ? "PERMISSION" : typeKey === "maladie" ? "MALADIE" : "CONGÉ";

    for (const day of days) {
      events.push({
        id: c.id * 100000 + days.indexOf(day),
        date: format(day, "yyyy-MM-dd"),
        title: `[${prefix}] ${c.employeNom}`,
        type: typeKey,
        time: "08:00",
        duration: 600, // journée entière 08h-18h
        location: "—",
        _absence: {
          employeId: c.employeId,
          employeNom: c.employeNom,
          photo,
          typeAbsence: c.typeAbsence,
          motif: c.motif,
          remplacantNom: c.remplacantNom,
          dateDebut: c.dateDebut,
          dateFin: c.dateFin,
        },
      });
    }
  }
  return events;
}

// ── Build Visite Technique alert events (15 days before expiry) ──
function buildVisiteTechniqueEvents(): CalendarEvent[] {
  const vehicles = vehiclesStore.load();
  const events: CalendarEvent[] = [];

  for (const v of vehicles) {
    if (!v.technicalControlExpiry) continue;
    const days = joursAvantExpirationVT(v.technicalControlExpiry);
    if (days === null) continue;
    // Show alert if within 15 days or already expired
    if (days <= 15) {
      const expiryDate = v.technicalControlExpiry;
      // Place event on the expiry date itself
      const label = days < 0
        ? `⚠ VT EXPIRÉE — ${v.registration}`
        : days === 0
        ? `⚠ VT expire AUJOURD'HUI — ${v.registration}`
        : `⚠ VT dans ${days}j — ${v.registration}`;

      events.push({
        id: Date.now() + Math.random() * 100000 + events.length,
        date: expiryDate,
        title: label,
        type: "visite_technique",
        time: "08:00",
        duration: 60,
        location: v.brand ? `${v.brand} ${v.model}` : "—",
        instructions: days < 0
          ? `Visite technique expirée depuis ${Math.abs(days)} jours ! Véhicule non conforme.`
          : `Expiration le ${new Date(expiryDate).toLocaleDateString("fr-FR")}. Planifier le renouvellement.`,
      });

      // Also place a reminder 15 days before expiry if not already past
      if (days > 0 && days <= 15) {
        const reminderDate = new Date(expiryDate);
        reminderDate.setDate(reminderDate.getDate() - 15);
        if (reminderDate >= new Date(new Date().toISOString().slice(0, 10))) {
          events.push({
            id: Date.now() + Math.random() * 100000 + events.length + 50000,
            date: format(reminderDate, "yyyy-MM-dd"),
            title: `🔔 Rappel VT J-15 — ${v.registration}`,
            type: "visite_technique",
            time: "09:00",
            duration: 30,
            location: v.brand ? `${v.brand} ${v.model}` : "—",
            instructions: `La visite technique de ${v.registration} expire le ${new Date(expiryDate).toLocaleDateString("fr-FR")}. Prendre RDV.`,
          });
        }
      }
    }
  }
  return events;
}

// ── Build compliance alert events for assurance, carte grise, vignette ──
function buildComplianceAlertEvents(): CalendarEvent[] {
  const vehicles = vehiclesStore.load();
  const events: CalendarEvent[] = [];
  const now = new Date();

  const checks: { field: keyof typeof vehicles[0]; type: string; label: string; emoji: string }[] = [
    { field: 'insuranceExpiry', type: 'assurance_fleet', label: 'Assurance', emoji: '🛡' },
    { field: 'carteGriseExpiry', type: 'carte_grise', label: 'Carte Grise', emoji: '📋' },
    { field: 'vignetteExpiry', type: 'vignette', label: 'Vignette', emoji: '🏷' },
  ];

  for (const v of vehicles) {
    for (const check of checks) {
      const dateStr = v[check.field] as string | undefined;
      if (!dateStr) continue;
      const expiryDate = new Date(dateStr);
      if (isNaN(expiryDate.getTime())) continue;
      const days = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

      if (days <= 15) {
        const title = days < 0
          ? `${check.emoji} ${check.label} EXPIRÉE — ${v.registration}`
          : days === 0
          ? `${check.emoji} ${check.label} expire AUJOURD'HUI — ${v.registration}`
          : `${check.emoji} ${check.label} dans ${days}j — ${v.registration}`;

        events.push({
          id: Date.now() + Math.random() * 100000 + events.length,
          date: dateStr,
          title,
          type: check.type,
          time: "08:00",
          duration: 60,
          location: v.brand ? `${v.brand} ${v.model}` : "—",
          instructions: days < 0
            ? `${check.label} expirée depuis ${Math.abs(days)} jours ! Véhicule non conforme.`
            : `Expiration le ${expiryDate.toLocaleDateString("fr-FR")}. Planifier le renouvellement.`,
        });

        if (days > 0 && days <= 15) {
          const reminderDate = new Date(dateStr);
          reminderDate.setDate(reminderDate.getDate() - 15);
          if (reminderDate >= new Date(now.toISOString().slice(0, 10))) {
            events.push({
              id: Date.now() + Math.random() * 100000 + events.length + 70000,
              date: format(reminderDate, "yyyy-MM-dd"),
              title: `🔔 Rappel ${check.label} J-15 — ${v.registration}`,
              type: check.type,
              time: "09:00",
              duration: 30,
              location: v.brand ? `${v.brand} ${v.model}` : "—",
              instructions: `${check.label} de ${v.registration} expire le ${expiryDate.toLocaleDateString("fr-FR")}.`,
            });
          }
        }
      }
    }
  }
  return events;
}

// ── Main Component ──
export default function TeamCalendar() {
  const now = useCurrentTime();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(MOCK_EVENTS);
  const [absenceEvents, setAbsenceEvents] = useState<CalendarEvent[]>([]);
  const [vtAlertEvents, setVtAlertEvents] = useState<CalendarEvent[]>([]);
  const [complianceAlertEvents, setComplianceAlertEvents] = useState<CalendarEvent[]>([]);
  const [filters, setFilters] = useState(EVENT_TYPES.map((f) => f.key));
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDate, setAddDate] = useState<string>("");
  const [addTime, setAddTime] = useState<string>("08:00");
  const [hoveredAbsence, setHoveredAbsence] = useState<{ event: CalendarEvent; x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load validated congés as calendar events
  useEffect(() => {
    const sync = () => setAbsenceEvents(buildAbsenceEvents(congesStore.loadConges()));
    sync();
    window.addEventListener("conges:updated", sync);
    return () => window.removeEventListener("conges:updated", sync);
  }, []);

  // Load visite technique alert events from fleet
  useEffect(() => {
    const syncVT = () => setVtAlertEvents(buildVisiteTechniqueEvents());
    syncVT();
    window.addEventListener("fleetVehicles:updated", syncVT);
    return () => window.removeEventListener("fleetVehicles:updated", syncVT);
  }, []);

  // Load compliance alert events (assurance, carte grise, vignette)
  useEffect(() => {
    const syncCompliance = () => setComplianceAlertEvents(buildComplianceAlertEvents());
    syncCompliance();
    window.addEventListener("fleetVehicles:updated", syncCompliance);
    return () => window.removeEventListener("fleetVehicles:updated", syncCompliance);
  }, []);

  // Week days
  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const visibleDays = viewMode === "week" ? weekDays : viewMode === "day" ? [anchorDate] : [];

  // Merge regular + absence + VT alert + compliance events then filter
  const allEvents = [...events, ...absenceEvents, ...vtAlertEvents, ...complianceAlertEvents];

  const filteredEvents = allEvents.filter((e) => filters.includes(e.type));

  // Track which events have already been notified
  const notifiedRef = useRef<Set<string>>(new Set());

  // Auto-scroll to current time on mount
  const scrollToNow = useCallback(() => {
    if (scrollRef.current) {
      const nowHour = new Date().getHours() + new Date().getMinutes() / 60;
      const scrollTo = Math.max(0, (nowHour - HOUR_START - 1) * HOUR_HEIGHT_PX);
      scrollRef.current.scrollTo({ top: scrollTo, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    if (viewMode !== "month") scrollToNow();
  }, [viewMode]);

  // ── Notification system: check every 60s for events starting in ≤10 min ──
  useEffect(() => {
    const checkUpcomingEvents = () => {
      const currentNow = new Date();
      const todayStr = format(currentNow, "yyyy-MM-dd");
      const nowMin = currentNow.getHours() * 60 + currentNow.getMinutes();

      events.forEach((ev) => {
        if (ev.date !== todayStr) return;
        if (!filters.includes(ev.type)) return;
        const [eh, em] = ev.time.split(":").map(Number);
        const startMin = eh * 60 + em;
        const diff = startMin - nowMin;
        // Notify if event starts in 8-10 minutes (window for the 1-min interval)
        if (diff >= 8 && diff <= 10) {
          const notifKey = `${ev.id}-${ev.date}`;
          if (!notifiedRef.current.has(notifKey)) {
            notifiedRef.current.add(notifKey);
            const typeLabel = EVENT_TYPES.find((t) => t.key === ev.type)?.label || ev.type;
            playNotificationPing();
            toast(`${typeLabel} : ${ev.title} commence dans 10 minutes !`, {
              icon: <Bell size={16} className="text-amber-500" />,
              duration: 8000,
              position: "top-right",
            });
          }
        }
      });
    };

    checkUpcomingEvents(); // run immediately
    const id = setInterval(checkUpcomingEvents, 60_000);
    return () => clearInterval(id);
  }, [events, filters]);

  // ── PDF Export (chauffeur-oriented) ──
  const exportDayPDF = useCallback(() => {
    const targetDate = viewMode === "day" ? anchorDate : new Date();
    const dateStr = format(targetDate, "yyyy-MM-dd");
    const dateLabelFr = format(targetDate, "EEEE d MMMM yyyy", { locale: fr });
    const dayEvents = events
      .filter((e) => e.date === dateStr && filters.includes(e.type))
      .sort((a, b) => parseTime(a.time) - parseTime(b.time));

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header banner
    doc.setFillColor(29, 78, 216);
    doc.rect(0, 0, pageWidth, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("IVOS \u2014 Planning Chauffeur", pageWidth / 2, 10, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(dateLabelFr.charAt(0).toUpperCase() + dateLabelFr.slice(1), pageWidth / 2, 17, { align: "center" });

    if (dayEvents.length === 0) {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(11);
      doc.text("Aucune opération prévue ce jour.", pageWidth / 2, 35, { align: "center" });
    } else {
      const tableData = dayEvents.map((ev) => {
        const endMin = parseTime(ev.time) * 60 + ev.duration;
        const endStr = minutesToTimeStr(endMin);
        return [
          `${ev.time} \u2013 ${endStr}`,
          ev.client || "\u2014",
          ev.camion || "\u2014",
          ev.instructions || "\u2014",
        ];
      });

      const typeColorMap: Record<string, [number, number, number]> = {
        maintenance: [220, 38, 38],
        operations: [29, 78, 216],
        rh: [21, 128, 61],
      };

      autoTable(doc, {
        startY: 28,
        head: [["Heure", "Client", "Camion", "Instructions"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [29, 78, 216],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 22 },
          2: { cellWidth: 20 },
          3: { cellWidth: "auto" },
        },
        didParseCell: (data: any) => {
          if (data.section === "body" && data.column.index === 0) {
            const evType = dayEvents[data.row.index]?.type;
            const rgb = evType ? typeColorMap[evType] : undefined;
            if (rgb) {
              data.cell.styles.fillColor = rgb;
              data.cell.styles.textColor = [255, 255, 255];
            }
          }
        },
        margin: { left: 8, right: 8 },
      });
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`G\u00e9n\u00e9r\u00e9 le ${format(new Date(), "dd/MM/yyyy \u00e0 HH:mm")} \u2014 IVOS Fleet Management`, pageWidth / 2, pageHeight - 5, { align: "center" });

    doc.save(`IVOS_Planning_${dateStr}.pdf`);
    toast.success("PDF export\u00e9 avec succ\u00e8s");
  }, [anchorDate, viewMode, events, filters]);

  // Navigation
  const goToday = () => {
    setAnchorDate(new Date());
    if (viewMode !== "month") setTimeout(scrollToNow, 100);
  };
  const goPrev = () =>
    setAnchorDate((d) =>
      viewMode === "month" ? subMonths(d, 1) : viewMode === "week" ? subWeeks(d, 1) : subDays(d, 1)
    );
  const goNext = () =>
    setAnchorDate((d) =>
      viewMode === "month" ? addMonths(d, 1) : viewMode === "week" ? addWeeks(d, 1) : addDays(d, 1)
    );

  // Click on empty cell (week/day)
  const handleGridClick = (date: Date, hour: number) => {
    setAddDate(format(date, "yyyy-MM-dd"));
    setAddTime(`${String(hour).padStart(2, "0")}:00`);
    setShowAddModal(true);
  };

  // CRUD
  const handleAddEvent = (ev: CalendarEvent) => {
    setEvents((prev) => [...prev, ev]);
    setShowAddModal(false);
  };
  const handleUpdateEvent = (ev: CalendarEvent) => {
    setEvents((prev) => prev.map((e) => (e.id === ev.id ? ev : e)));
    setSelectedEvent(null);
  };
  const handleDeleteEvent = (id: number) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setSelectedEvent(null);
  };

  // Click on month cell → switch to day view
  const handleMonthDayClick = (date: Date) => {
    setAnchorDate(date);
    setViewMode("day");
  };

  // Resize handler — updates event duration
  const handleResize = useCallback(
    (eventId: number, newDuration: number) => {
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, duration: Math.max(15, newDuration) } : e))
      );
    },
    []
  );

  // Current time indicator position
  const nowMinutes = now.getHours() + now.getMinutes() / 60;
  const showTimeIndicator = nowMinutes >= HOUR_START && nowMinutes <= HOUR_END;
  const timeIndicatorTop = (nowMinutes - HOUR_START) * HOUR_HEIGHT_PX;

  // Header date label
  const headerLabel =
    viewMode === "month"
      ? format(anchorDate, "MMMM yyyy", { locale: fr })
      : viewMode === "week"
      ? `${format(weekDays[0], "d MMM", { locale: fr })} – ${format(weekDays[6], "d MMM yyyy", { locale: fr })}`
      : format(anchorDate, "EEEE d MMMM yyyy", { locale: fr });

  // Month grid
  const monthGrid = getMonthGrid(anchorDate);
  const currentMonth = anchorDate.getMonth();

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
      {/* ── Filter Sidebar ── */}
      <aside className="w-44 bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-200">
          <div className="font-bold text-sm flex items-center gap-2 mb-3">
            <CalendarIcon size={16} className="text-blue-700" /> Filtres
          </div>
          <div className="flex flex-col gap-2">
            {EVENT_TYPES.filter((f) => !["conge", "permission", "maladie", "visite_technique", "assurance_fleet", "carte_grise", "vignette"].includes(f.key)).map((f) => (
              <label key={f.key} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={filters.includes(f.key)}
                  onChange={() =>
                    setFilters((prev) =>
                      prev.includes(f.key) ? prev.filter((k) => k !== f.key) : [...prev, f.key]
                    )
                  }
                  className="rounded"
                />
                <span className={`w-3 h-3 rounded-full ${f.bg} inline-block`} />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
          {/* Absence Personnel section */}
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="font-semibold text-xs text-slate-500 flex items-center gap-1.5 mb-2">
              <UserRound size={13} /> Absences Personnel
            </div>
            <div className="flex flex-col gap-2">
              {EVENT_TYPES.filter((f) => ["conge", "permission", "maladie"].includes(f.key)).map((f) => (
                <label key={f.key} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={filters.includes(f.key)}
                    onChange={() =>
                      setFilters((prev) =>
                        prev.includes(f.key) ? prev.filter((k) => k !== f.key) : [...prev, f.key]
                      )
                    }
                    className="rounded"
                  />
                  <span className={`w-3 h-3 rounded-full ${f.bg} inline-block`} />
                  <span>{f.label}</span>
                </label>
              ))}
            </div>
          </div>
          {/* Conformité Flotte section */}
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="font-semibold text-xs text-slate-500 flex items-center gap-1.5 mb-2">
              <Truck size={13} /> Conformité Flotte
            </div>
            <div className="flex flex-col gap-2">
              {EVENT_TYPES.filter((f) => ["visite_technique", "assurance_fleet", "carte_grise", "vignette"].includes(f.key)).map((f) => (
                <label key={f.key} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={filters.includes(f.key)}
                    onChange={() =>
                      setFilters((prev) =>
                        prev.includes(f.key) ? prev.filter((k) => k !== f.key) : [...prev, f.key]
                      )
                    }
                    className="rounded"
                  />
                  <span className={`w-3 h-3 rounded-full ${f.bg} inline-block`} />
                  <span>{f.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="font-bold text-sm flex items-center gap-2 mb-3">
            <Eye size={16} className="text-blue-700" /> Vue
          </div>
          <div className="flex flex-col gap-1">
            {(["month", "week", "day"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  viewMode === mode ? "bg-blue-100 text-blue-700 font-semibold" : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                {mode === "month" ? "Mois" : mode === "week" ? "Semaine" : "Jour"}
              </button>
            ))}
          </div>
        </div>
        {/* Mini legend */}
        <div className="mt-auto p-4 border-t border-slate-200">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
            <Layers size={12} /> Légende
          </div>
          {EVENT_TYPES.map((t) => (
            <div key={t.key} className="flex items-center gap-2 text-xs mb-1">
              <span className={`w-2.5 h-2.5 rounded-sm ${t.bg}`} />
              <span className="text-slate-600">{t.label}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white flex-shrink-0 rounded-tr-2xl">
          <div className="flex items-center gap-1">
            <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-white/10">
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goToday}
              className="px-3 py-1 rounded-lg text-sm hover:bg-white/10 font-semibold"
            >
              Aujourd'hui
            </button>
            <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-white/10">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="text-base font-bold flex items-center gap-2 capitalize">
            <CalendarIcon size={18} />
            {headerLabel}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportDayPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-white text-[#1a1a2e] hover:bg-gray-100 font-medium transition-colors shadow-sm"
              title="Télécharger Planning"
            >
              <Download size={14} />
              Télécharger Planning
            </button>
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
              {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    viewMode === mode ? "bg-white shadow-sm text-[#1a1a2e]" : "text-gray-300 hover:text-white"
                  }`}
                >
                  {mode === "month" ? "Mois" : mode === "week" ? "Semaine" : "Jour"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ══ MONTH VIEW ══ */}
        {viewMode === "month" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-200 flex-shrink-0">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                <div key={d} className="text-center py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-7 grid-rows-6 overflow-hidden">
              {monthGrid.map((day, idx) => {
                const isCurrentMonth = day.getMonth() === currentMonth;
                const isToday = isSameDay(day, new Date());
                const dayStr = format(day, "yyyy-MM-dd");
                const dayEvs = filteredEvents.filter((e) => e.date === dayStr);
                const MAX_VISIBLE = 3;
                const visibleEvs = dayEvs.slice(0, MAX_VISIBLE);
                const overflow = dayEvs.length - MAX_VISIBLE;

                return (
                  <div
                    key={idx}
                    onClick={() => handleMonthDayClick(day)}
                    className={`border-b border-r border-slate-100 p-1 cursor-pointer hover:bg-blue-50/40 transition-colors flex flex-col overflow-hidden ${
                      !isCurrentMonth ? "bg-slate-50/60" : ""
                    } ${isToday ? "bg-blue-50" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday
                            ? "bg-blue-700 text-white"
                            : isCurrentMonth
                            ? "text-slate-800"
                            : "text-slate-300"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1 min-h-0 overflow-hidden">
                      {visibleEvs.map((ev) => {
                        const evStyle = getTypeStyle(ev.type);
                        return (
                          <div
                            key={ev.id}
                            className={`${evStyle.bg} text-white text-sm leading-normal font-semibold px-1.5 py-0.5 rounded truncate`}
                            title={ev._absence ? `${ev._absence.typeAbsence} — ${ev._absence.employeNom}` : `${ev.time} — ${ev.title}`}
                            onMouseEnter={(e) => {
                              if (ev._absence) {
                                e.stopPropagation();
                                setHoveredAbsence({ event: ev, x: e.clientX, y: e.clientY });
                              }
                            }}
                            onMouseLeave={() => {
                              if (ev._absence) setHoveredAbsence(null);
                            }}
                          >
                            {ev._absence ? ev.title : `${ev.time.slice(0, 5)} ${ev.title}`}
                          </div>
                        );
                      })}
                      {overflow > 0 && (
                        <div className="text-xs text-blue-700 font-bold px-1">
                          + {overflow} autre{overflow > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ WEEK / DAY VIEW ══ */}
        {(viewMode === "week" || viewMode === "day") && (
        <>
        {/* Day headers */}
        <div className="flex border-b border-slate-200 flex-shrink-0 sticky top-0 z-20 bg-white shadow-sm">
          <div className="w-14 flex-shrink-0" /> {/* gutter for time labels */}
          {visibleDays.map((d) => {
            const isToday = isSameDay(d, new Date());
            return (
              <div
                key={d.toISOString()}
                className={`flex-1 text-center py-2 text-sm border-l border-slate-100 ${
                  isToday ? "bg-blue-50" : ""
                }`}
              >
                <div className="text-slate-400 text-[11px] uppercase tracking-wider">
                  {format(d, "EEE", { locale: fr })}
                </div>
                <div
                  className={`text-lg font-bold inline-flex items-center justify-center w-8 h-8 rounded-full ${
                    isToday ? "bg-blue-700 text-white" : "text-slate-800"
                  }`}
                >
                  {format(d, "d")}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Time Grid (scrollable) ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="flex relative" style={{ height: TOTAL_HEIGHT }}>
            {/* Hour labels */}
            <div className="w-14 flex-shrink-0 relative">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute right-2 text-[11px] text-slate-400 font-medium"
                  style={{ top: (h - HOUR_START) * HOUR_HEIGHT_PX - 7 }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {visibleDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              const dayEvents = getEventsForDay(filteredEvents, day);
              return (
                <div
                  key={day.toISOString()}
                  className={`flex-1 relative border-l border-slate-100 ${isToday ? "bg-blue-50/40" : ""}`}
                >
                  {/* Hour grid lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-slate-100 cursor-pointer hover:bg-blue-50/50 transition-colors"
                      style={{ top: (h - HOUR_START) * HOUR_HEIGHT_PX, height: HOUR_HEIGHT_PX }}
                      onClick={() => handleGridClick(day, h)}
                    />
                  ))}
                  {/* Half-hour dashed lines */}
                  {HOURS.map((h) => (
                    <div
                      key={`${h}-half`}
                      className="absolute left-0 right-0 border-t border-dashed border-slate-50"
                      style={{ top: (h - HOUR_START) * HOUR_HEIGHT_PX + HOUR_HEIGHT_PX / 2 }}
                    />
                  ))}
                  {/* Events */}
                  {dayEvents.map((ev) => (
                    <EventBlock
                      key={ev.id}
                      event={ev}
                      now={now}
                      onClick={() => setSelectedEvent(ev)}
                      onResize={handleResize}
                      onAbsenceHover={setHoveredAbsence}
                    />
                  ))}
                </div>
              );
            })}

            {/* ── Current Time Indicator ── */}
            {showTimeIndicator && (
              <div
                className="absolute left-14 right-0 z-10 pointer-events-none flex items-center"
                style={{ top: timeIndicatorTop }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shadow-sm shadow-red-300" />
                <div className="flex-1 h-[2px] bg-red-500 shadow-sm shadow-red-200" />
              </div>
            )}
          </div>
        </div>
        </>
        )}
      </div>

      {/* ── Add Event Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
            <button
              className="absolute top-3 right-3 text-slate-400 hover:text-red-600"
              onClick={() => setShowAddModal(false)}
            >
              <X size={22} />
            </button>
            <span className="font-bold text-lg mb-4 block">Ajouter un événement</span>
            <AddEventForm
              initialDate={addDate}
              initialTime={addTime}
              onAdd={handleAddEvent}
              onCancel={() => setShowAddModal(false)}
            />
          </div>
        </div>
      )}

      {/* ── Event Detail Modal ── */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
            <button
              className="absolute top-3 right-3 text-slate-400 hover:text-red-600"
              onClick={() => setSelectedEvent(null)}
            >
              <X size={22} />
            </button>
            <span className="font-bold text-lg mb-4 block">Événement</span>
            <EventPreview
              event={selectedEvent}
              onUpdate={handleUpdateEvent}
              onDelete={handleDeleteEvent}
              onCancel={() => setSelectedEvent(null)}
            />
          </div>
        </div>
      )}

      {/* ── Absence Tooltip ── */}
      {hoveredAbsence && hoveredAbsence.event._absence && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{ left: hoveredAbsence.x + 12, top: hoveredAbsence.y - 10 }}
        >
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-3 w-64">
            <div className="flex items-center gap-3 mb-2">
              {hoveredAbsence.event._absence.photo ? (
                <img
                  src={hoveredAbsence.event._absence.photo}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border-2 border-slate-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                  <UserRound size={18} className="text-slate-500" />
                </div>
              )}
              <div>
                <div className="font-bold text-sm text-slate-800">{hoveredAbsence.event._absence.employeNom}</div>
                <div className={`text-xs font-medium ${getTypeStyle(hoveredAbsence.event.type).bg} text-white px-2 py-0.5 rounded-full inline-block mt-0.5`}>
                  {hoveredAbsence.event._absence.typeAbsence}
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5">
                <CalendarIcon size={12} className="text-slate-400" />
                <span>{hoveredAbsence.event._absence.dateDebut} → {hoveredAbsence.event._absence.dateFin}</span>
              </div>
              {hoveredAbsence.event._absence.motif && (
                <div className="flex items-start gap-1.5">
                  <span className="text-slate-400 font-medium">Motif :</span>
                  <span>{hoveredAbsence.event._absence.motif}</span>
                </div>
              )}
              {hoveredAbsence.event._absence.remplacantNom && (
                <div className="flex items-center gap-1.5">
                  <UserRound size={12} className="text-slate-400" />
                  <span>Remplaçant : <strong>{hoveredAbsence.event._absence.remplacantNom}</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Event Block (positioned, resizable, temporal-aware) ──
function EventBlock({
  event,
  now,
  onClick,
  onResize,
  onAbsenceHover,
}: {
  event: CalendarEvent;
  now: Date;
  onClick: () => void;
  onResize: (id: number, newDuration: number) => void;
  onAbsenceHover?: (info: { event: CalendarEvent; x: number; y: number } | null) => void;
}) {
  const style = getTypeStyle(event.type);
  const top = getTopPx(event.time);
  const height = Math.max(getHeightPx(event.duration), 20);
  const status = getEventStatus(event, now);
  const resizeRef = useRef<{ startY: number; startDuration: number } | null>(null);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = { startY: e.clientY, startDuration: event.duration };

    const handleMove = (me: MouseEvent) => {
      if (!resizeRef.current) return;
      const dy = me.clientY - resizeRef.current.startY;
      const dMin = Math.round((dy / HOUR_HEIGHT_PX) * 60);
      const newDuration = Math.max(15, Math.round((resizeRef.current.startDuration + dMin) / 15) * 15);
      onResize(event.id, newDuration);
    };
    const handleUp = () => {
      resizeRef.current = null;
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const endTimeStr = minutesToTimeStr(Math.floor(parseTime(event.time)) * 60 + event.duration + (parseTime(event.time) % 1) * 60);

  // Temporal styling
  const isFinished = status === "finished";
  const isInProgress = status === "in-progress";
  const isUpcoming = status === "upcoming";

  const colorMap: Record<string, [string, string]> = {
    maintenance: ["#dc2626", "#b91c1c"],
    operations: ["#1d4ed8", "#1e3a8a"],
    rh: ["#15803d", "#14532d"],
    conge: ["#0ea5e9", "#0284c7"],
    permission: ["#f59e0b", "#d97706"],
    maladie: ["#e11d48", "#be123c"],
    visite_technique: ["#ea580c", "#c2410c"],
  };
  const [c1, c2] = colorMap[event.type] || colorMap.maintenance;

  return (
    <div
      className={`absolute left-1 right-1 rounded-lg overflow-hidden cursor-pointer group select-none transition-all ${
        isInProgress
          ? "border-l-[5px] shadow-xl ring-2 ring-white/50 z-10 animate-pulse-subtle"
          : isFinished
          ? "border-l-4 opacity-50 hover:opacity-80"
          : isUpcoming
          ? "border-l-[5px] shadow-lg ring-2 ring-amber-400/70"
          : "border-l-4 hover:shadow-lg hover:z-20"
      } ${style.border}`}
      style={{
        top,
        height,
        background: isFinished
          ? `linear-gradient(135deg, ${c1}aa, ${c2}aa)`
          : `linear-gradient(135deg, ${c1}, ${c2})`,
        zIndex: isInProgress ? 15 : 5,
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (event._absence && onAbsenceHover) {
          onAbsenceHover({ event, x: e.clientX, y: e.clientY });
        }
      }}
      onMouseLeave={() => {
        if (event._absence && onAbsenceHover) onAbsenceHover(null);
      }}
    >
      <div className="px-2 py-1 h-full flex flex-col overflow-hidden">
        <div className="flex items-center gap-1">
          {isInProgress && (
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping inline-block flex-shrink-0" />
          )}
          {isUpcoming && <Bell size={10} className="text-white flex-shrink-0" />}
          <span className="text-white font-bold text-sm truncate leading-normal">{event.title}</span>
        </div>
        {height > 32 && (
          <div className="text-white/90 text-xs truncate mt-1">
            {event.time} – {endTimeStr}
            {isInProgress && <span className="ml-1 text-white font-bold">• EN COURS</span>}
            {isFinished && <span className="ml-1 italic">Terminé</span>}
          </div>
        )}
        {height > 52 && (
          <div className="text-white/90 text-xs truncate flex items-center gap-1 mt-1">
            <MapPin size={10} /> {event.location}
          </div>
        )}
        {height > 70 && event.camion && event.camion !== "—" && (
          <div className="text-white/90 text-xs truncate flex items-center gap-1 mt-1">
            <Truck size={10} /> {event.camion}
          </div>
        )}
      </div>
      {/* Resize handle */}
      {!isFinished && (
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.2))" }}
          onMouseDown={handleResizeStart}
        >
          <div className="mx-auto mt-0.5 w-6 h-1 rounded-full bg-white/50" />
        </div>
      )}
    </div>
  );
}

// ── Add Event Form ──
function AddEventForm({
  initialDate,
  initialTime,
  onAdd,
  onCancel,
}: {
  initialDate: string;
  initialTime: string;
  onAdd: (ev: CalendarEvent) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState(EVENT_TYPES[0].key);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState("");
  const [client, setClient] = useState("");
  const [camion, setCamion] = useState("");
  const [instructions, setInstructions] = useState("");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd({ id: Date.now(), date, title, type, time, duration, location, client, camion, instructions });
      }}
    >
      <input className="border rounded px-3 py-2" placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <select className="border rounded px-3 py-2" value={type} onChange={(e) => setType(e.target.value)}>
        {EVENT_TYPES.map((t) => (
          <option key={t.key} value={t.key}>{t.label}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <input className="border rounded px-3 py-2 flex-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <input className="border rounded px-3 py-2 flex-1" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-slate-500 mb-1 block">Dur\u00e9e (min)</label>
          <select className="border rounded px-3 py-2 w-full" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {[15, 30, 45, 60, 90, 120, 180, 240].map((d) => (
              <option key={d} value={d}>{d} min ({d >= 60 ? `${d / 60}h` : ""})</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-slate-500 mb-1 block">Lieu</label>
          <input className="border rounded px-3 py-2 w-full" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lieu" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-slate-500 mb-1 block">Client</label>
          <input className="border rounded px-3 py-2 w-full" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client" />
        </div>
        <div className="flex-1">
          <label className="text-xs text-slate-500 mb-1 block">Camion</label>
          <input className="border rounded px-3 py-2 w-full" value={camion} onChange={(e) => setCamion(e.target.value)} placeholder="Ex: TK-204" />
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-500 mb-1 block">Instructions</label>
        <textarea className="border rounded px-3 py-2 w-full" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Instructions pour le chauffeur..." rows={2} />
      </div>
      <div className="flex gap-2 justify-end mt-2">
        <button type="button" className="bg-gray-200 px-4 py-2 rounded" onClick={onCancel}>Annuler</button>
        <button type="submit" className="bg-blue-700 text-white px-4 py-2 rounded font-bold">Ajouter</button>
      </div>
    </form>
  );
}

// ── Event Preview / Edit / Delete ──
function EventPreview({
  event,
  onUpdate,
  onDelete,
  onCancel,
}: {
  event: CalendarEvent;
  onUpdate: (ev: CalendarEvent) => void;
  onDelete: (id: number) => void;
  onCancel: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [type, setType] = useState(event.type);
  const [time, setTime] = useState(event.time);
  const [duration, setDuration] = useState(event.duration);
  const [location, setLocation] = useState(event.location);
  const [client, setClient] = useState(event.client || "");
  const [camion, setCamion] = useState(event.camion || "");
  const [instructions, setInstructions] = useState(event.instructions || "");
  const style = getTypeStyle(event.type);

  if (edit) {
    return (
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); onUpdate({ ...event, title, type, time, duration, location, client, camion, instructions }); setEdit(false); }}>
        <input className="border rounded px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <select className="border rounded px-3 py-2" value={type} onChange={(e) => setType(e.target.value)}>
          {EVENT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <div className="flex gap-2">
          <input className="border rounded px-3 py-2 flex-1" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <select className="border rounded px-3 py-2 flex-1" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {[15, 30, 45, 60, 90, 120, 180, 240].map((d) => <option key={d} value={d}>{d} min</option>)}
          </select>
        </div>
        <input className="border rounded px-3 py-2" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lieu" />
        <div className="flex gap-2">
          <input className="border rounded px-3 py-2 flex-1" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client" />
          <input className="border rounded px-3 py-2 flex-1" value={camion} onChange={(e) => setCamion(e.target.value)} placeholder="Camion" />
        </div>
        <textarea className="border rounded px-3 py-2" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Instructions" rows={2} />
        <div className="flex gap-2 justify-end mt-2">
          <button type="button" className="bg-gray-200 px-4 py-2 rounded" onClick={onCancel}>Annuler</button>
          <button type="submit" className="bg-blue-700 text-white px-4 py-2 rounded font-bold">Enregistrer</button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-lg font-bold"><CalendarIcon size={18} /> {event.title}</div>
      <div className="flex items-center gap-2 text-sm"><Clock size={16} /> {event.time} ({event.duration} min)</div>
      <div className="flex items-center gap-2 text-sm"><MapPin size={16} /> {event.location || "–"}</div>
      {event.client && event.client !== "—" && <div className="flex items-center gap-2 text-sm"><span className="font-medium">Client:</span> {event.client}</div>}
      {event.camion && event.camion !== "—" && <div className="flex items-center gap-2 text-sm"><Truck size={16} /> {event.camion}</div>}
      {event.instructions && <div className="text-sm bg-slate-50 rounded-lg p-3 border border-slate-200"><span className="font-medium">Instructions:</span> {event.instructions}</div>}
      <div className="flex items-center gap-2 text-sm">
        <span className={`w-3 h-3 rounded-full ${style.bg}`} />
        {style.label}
      </div>
      <div className="flex gap-2 justify-end mt-2">
        <button type="button" className="bg-gray-200 px-4 py-2 rounded" onClick={onCancel}>Fermer</button>
        <button type="button" className="bg-yellow-500 text-white px-4 py-2 rounded font-bold" onClick={() => setEdit(true)}>Modifier</button>
        <button type="button" className="bg-red-600 text-white px-4 py-2 rounded font-bold" onClick={() => onDelete(event.id)}>Supprimer</button>
      </div>
    </div>
  );
}
