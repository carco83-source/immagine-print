import { useMemo, useState } from "react";
import "@/App.css";
import axios from "axios";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { Controls } from "./components/Controls";
import { ExportBar } from "./components/ExportBar";
import { SheetPreview } from "./components/SheetPreview";
import { computePages } from "./lib/layout";
import { loadForPrint } from "./lib/image";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEFAULTS = {
  sheet: "A4", orientation: "portrait", duplex: false, width: 8.5, height: 5.5,
  margin_top: 1, margin_bottom: 1, margin_left: 1, margin_right: 1, gap: 0,
  cut_marks: true, flip: "long", format: "pdf", dpi: 300,
};

let uid = 0;
const newItem = (front = null) => ({ id: ++uid, front, back: null, copies: 1, width: 8.5, height: 5.5, fit: "cover" });
const num = (v) => (Number.isFinite(v) ? v : 0);
const NUM_KEYS = ["width", "height", "gap", "margin_top", "margin_bottom", "margin_left", "margin_right"];

export default function App() {
  const [p, setP] = useState(DEFAULTS);
  const [items, setItems] = useState(() => [newItem()]);
  const [view, setView] = useState("front");
  const [pageIdx, setPageIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const set = (patch) => setP((s) => ({ ...s, ...patch }));
  const update = (id, patch) => setItems((s) => s.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id) => setItems((s) => s.filter((it) => it.id !== id));
  const addFiles = async (files) => {
    const imgs = await Promise.all(files.filter((f) => f.type.startsWith("image/")).map(loadForPrint));
    if (imgs.some((i) => i.op === "bg")) toast.success("Sfondo a quadretti/trasparente sostituito con bianco");
    if (!imgs.length) return;
    const fresh = imgs.map((img) => newItem(img));
    setItems((s) => (s.length === 1 && !s[0].front ? fresh : [...s, ...fresh]));
  };

  const clean = useMemo(() => {
    const c = { ...p };
    NUM_KEYS.forEach((k) => (c[k] = num(c[k])));
    return c;
  }, [p]);
  const cleanItems = useMemo(() => items.map((it) => ({ ...it, width: num(it.width), height: num(it.height) })), [items]);
  const info = useMemo(() => computePages(cleanItems, clean), [cleanItems, clean]);
  const page = Math.min(pageIdx, Math.max(0, info.pages.length - 1));
  const showBack = p.duplex && view === "back";

  const onExport = async () => {
    if (items.some((it) => !it.front)) return toast.error("Carica il fronte di ogni immagine");
    if (p.duplex && items.some((it) => !it.back)) return toast.error("Carica il retro di ogni immagine");
    if (!info.total) return toast.error("Nessuna immagine entra nel foglio");
    const fd = new FormData();
    fd.append("params", JSON.stringify({ ...clean, items: cleanItems.map(({ width, height, copies, fit }) => ({ width, height, copies, fit })) }));
    items.forEach((it, i) => {
      fd.append(`front_${i}`, it.front.file);
      if (p.duplex) fd.append(`back_${i}`, it.back.file);
    });
    setLoading(true);
    try {
      const res = await axios.post(`${API}/generate`, fd, { responseType: "blob" });
      const multi = p.format !== "pdf" && (p.duplex || info.pages.length > 1);
      const name = `stampa_${p.sheet}_${p.orientation === "portrait" ? "vert" : "oriz"}.${multi ? "zip" : p.format}`;
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
        <span data-testid="sheet-dims" className="font-mono text-[11px] text-slate-400">{p.sheet} · {info.W} × {info.H} cm</span>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <aside className="flex w-full shrink-0 flex-col border-r border-slate-800 bg-[#111827] lg:w-[440px] lg:overflow-y-auto">
          <Controls {...{ p, set, items, update, remove, addFiles, info }} />
          <ExportBar p={p} set={set} onExport={onExport} loading={loading} disabled={!items.some((it) => it.front)} />
        </aside>

        <main className="workbench relative flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-8 pt-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-slate-500">Anteprima</span>
              {info.pages.length > 1 && (
                <div className="flex items-center gap-1 rounded-md border border-slate-800 bg-[#111827] p-1">
                  <button data-testid="page-prev-btn" disabled={page === 0} onClick={() => setPageIdx(page - 1)} className="p-1 text-slate-400 hover:text-white disabled:opacity-30"><ChevronLeft size={14} /></button>
                  <span data-testid="page-indicator" className="px-1 font-mono text-[11px]">Foglio {page + 1}/{info.pages.length}</span>
                  <button data-testid="page-next-btn" disabled={page >= info.pages.length - 1} onClick={() => setPageIdx(page + 1)} className="p-1 text-slate-400 hover:text-white disabled:opacity-30"><ChevronRight size={14} /></button>
                </div>
              )}
            </div>
            {p.duplex && (
              <div className="flex rounded-md border border-slate-800 bg-[#111827] p-1">
                {[["front", "Fronte", "#2563EB"], ["back", "Retro", "#9333EA"]].map(([v, l, c]) => (
                  <button key={v} data-testid={`view-${v}-btn`} onClick={() => setView(v)}
                    className={`rounded-[4px] px-4 py-1.5 text-xs font-medium transition-colors ${view === v ? "text-white" : "text-slate-400 hover:text-slate-100"}`}
                    style={view === v ? { background: c } : undefined}>{l}</button>
                ))}
              </div>
            )}
          </div>
          <div key={`${p.sheet}${p.orientation}${showBack}${page}`} className="sheet-enter flex min-h-[420px] flex-1 items-center justify-center p-8 lg:p-12">
            <SheetPreview info={info} page={info.pages[page] || []} p={clean} items={items} side={showBack ? "back" : "front"} />
          </div>
          {info.unfit > 0 && (
            <div data-testid="no-fit-warning" className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
              {info.unfit} copie non entrano nell'area stampabile: riduci dimensioni o margini.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
