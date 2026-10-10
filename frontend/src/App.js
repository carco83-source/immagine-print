import { useMemo, useState } from "react";
import "@/App.css";
import axios from "axios";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { Controls } from "./components/Controls";
import { ExportBar } from "./components/ExportBar";
import { SheetPreview } from "./components/SheetPreview";
import { computeLayout } from "./lib/layout";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEFAULTS = {
  sheet: "A4", orientation: "portrait", width: 8.5, height: 5.5, copies: 0,
  margin_top: 1, margin_bottom: 1, margin_left: 1, margin_right: 1, gap: 0,
  fit: "cover", cut_marks: true, flip: "long", format: "pdf", dpi: 300,
};

const num = (v) => (Number.isFinite(v) ? v : 0);

export default function App() {
  const [p, setP] = useState(DEFAULTS);
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);
  const [duplex, setDuplex] = useState(false);
  const [lock, setLock] = useState(false);
  const [view, setView] = useState("front");
  const [loading, setLoading] = useState(false);
  const set = (patch) => setP((s) => ({ ...s, ...patch }));

  const clean = useMemo(() => {
    const c = { ...p };
    ["width", "height", "gap", "margin_top", "margin_bottom", "margin_left", "margin_right"].forEach((k) => (c[k] = num(c[k])));
    return c;
  }, [p]);
  const lay = useMemo(() => computeLayout(clean), [clean]);
  const showBack = duplex && view === "back";

  const onExport = async () => {
    if (!front) return toast.error("Carica l'immagine del fronte");
    if (duplex && !back) return toast.error("Carica l'immagine del retro");
    if (!lay.n) return toast.error("L'immagine non entra nel foglio");
    const fd = new FormData();
    fd.append("params", JSON.stringify(clean));
    fd.append("front", front.file);
    if (duplex) fd.append("back", back.file);
    setLoading(true);
    try {
      const res = await axios.post(`${API}/generate`, fd, { responseType: "blob" });
      const ext = duplex && p.format !== "pdf" ? "zip" : p.format;
      const name = `stampa_${p.sheet}_${p.orientation === "portrait" ? "vert" : "oriz"}.${ext}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(res.data);
      a.download = name;
      a.click();
      toast.success(`File generato: ${name}`);
    } catch (e) {
      let msg = e.message;
      try { msg = JSON.parse(await e.response.data.text()).detail; } catch (_) { /* keep message */ }
      toast.error(typeof msg === "string" ? msg : "Errore nella generazione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0B0F17] text-slate-100">
      <Toaster theme="dark" position="top-right" />
      <header className="z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-[#111827]/90 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5">
            {["#00A8E8", "#E6007E", "#FFD100", "#F1F5F9"].map((c) => <span key={c} className="h-4 w-1.5" style={{ background: c }} />)}
          </div>
          <h1 className="font-display text-lg font-bold tracking-tight">Impagina<span className="text-slate-500">Print</span></h1>
        </div>
        <span data-testid="sheet-dims" className="font-mono text-[11px] text-slate-400">
          {p.sheet} · {lay.W} × {lay.H} cm
        </span>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <aside className="flex w-full shrink-0 flex-col border-r border-slate-800 bg-[#111827] lg:w-[440px] lg:overflow-y-auto">
          <Controls {...{ p, set, front, setFront, back, setBack, duplex, setDuplex, lock, setLock, lay }} />
          <ExportBar p={p} set={set} onExport={onExport} loading={loading} disabled={!front} />
        </aside>

        <main className="workbench relative flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between px-8 pt-6">
            <span className="font-mono text-[11px] uppercase tracking-widest text-slate-500">Anteprima di stampa</span>
            {duplex && (
              <div className="flex rounded-md border border-slate-800 bg-[#111827] p-1">
                {[["front", "Fronte", "#2563EB"], ["back", "Retro", "#9333EA"]].map(([v, l, c]) => (
                  <button key={v} data-testid={`view-${v}-btn`} onClick={() => setView(v)}
                    className={`rounded-[4px] px-4 py-1.5 text-xs font-medium transition-colors ${view === v ? "text-white" : "text-slate-400 hover:text-slate-100"}`}
                    style={view === v ? { background: c } : undefined}>
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div key={`${p.sheet}${p.orientation}${showBack}`} className="sheet-enter flex min-h-[420px] flex-1 items-center justify-center p-8 lg:p-12">
            <SheetPreview lay={lay} p={clean} image={showBack ? back : front} side={showBack ? "back" : "front"} />
          </div>
          {!lay.n && (
            <div data-testid="no-fit-warning" className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
              L'immagine non entra nell'area stampabile: riduci dimensioni o margini.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
