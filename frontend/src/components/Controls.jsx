import { Link2, Link2Off, Wand2 } from "lucide-react";
import { Switch } from "./ui/switch";
import { ImageDrop } from "./ImageDrop";
import { Section, NumField, Segmented } from "./Field";
import { SHEETS } from "../lib/layout";

export const Controls = ({ p, set, front, setFront, back, setBack, duplex, setDuplex, lock, setLock, lay }) => {
  const ratio = front ? front.h / front.w : null;
  const setWidth = (v) => set({ width: v, ...(lock && ratio && !Number.isNaN(v) ? { height: +(v * ratio).toFixed(2) } : {}) });
  const setHeight = (v) => set({ height: v, ...(lock && ratio && !Number.isNaN(v) ? { width: +(v / ratio).toFixed(2) } : {}) });
  const dpi = front && p.width > 0 ? Math.round(front.w / (p.width / 2.54)) : null;

  return (
    <>
      <Section n={1} title="Immagini" right={
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Fronte / Retro
          <Switch data-testid="duplex-switch" checked={duplex} onCheckedChange={setDuplex} />
        </label>
      }>
        <div className={`grid gap-3 ${duplex ? "grid-cols-2" : "grid-cols-1"}`}>
          <ImageDrop label="Fronte" image={front} onChange={setFront} testid="front-image" accent="#2563EB" />
          {duplex && <ImageDrop label="Retro" image={back} onChange={setBack} testid="back-image" accent="#9333EA" />}
        </div>
        {dpi && (
          <p data-testid="dpi-info" className={`mt-3 font-mono text-[11px] ${dpi < 150 ? "text-amber-400" : "text-emerald-400"}`}>
            Risoluzione effettiva: {dpi} DPI {dpi < 150 && "— bassa per la stampa"}
          </p>
        )}
      </Section>

      <Section n={2} title="Formato foglio">
        <Segmented testid="sheet" value={p.sheet} onChange={(v) => set({ sheet: v })}
          options={Object.entries(SHEETS).map(([k, s]) => ({ value: k, label: s.label, sub: s.desc.replace(" mm", "") }))} />
        <div className="mt-3">
          <Segmented testid="orientation" value={p.orientation} onChange={(v) => set({ orientation: v })}
            options={[{ value: "portrait", label: "Verticale" }, { value: "landscape", label: "Orizzontale" }]} />
        </div>
      </Section>

      <Section n={3} title="Dimensioni immagine" right={
        <div className="flex gap-1">
          <button data-testid="lock-ratio-btn" onClick={() => setLock(!lock)} title="Mantieni proporzioni"
            className={`rounded-sm p-1.5 transition-colors ${lock ? "bg-[#00A8E8] text-black" : "text-slate-500 hover:bg-slate-800"}`}>
            {lock ? <Link2 size={14} /> : <Link2Off size={14} />}
          </button>
          {ratio && (
            <button data-testid="use-image-ratio-btn" onClick={() => setWidth(p.width)} title="Usa proporzioni immagine"
              className="rounded-sm p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-100">
              <Wand2 size={14} />
            </button>
          )}
        </div>
      }>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Larghezza" value={p.width} onChange={setWidth} testid="width-input" />
          <NumField label="Altezza" value={p.height} onChange={setHeight} testid="height-input" />
          <NumField label="Copie (0 = max)" value={p.copies} onChange={(v) => set({ copies: Math.max(0, Math.floor(v) || 0) })} testid="copies-input" step={1} unit="" />
          <NumField label="Spaziatura" value={p.gap} onChange={(v) => set({ gap: v })} testid="gap-input" />
        </div>
        <div className="mt-3">
          <Segmented testid="fit" value={p.fit} onChange={(v) => set({ fit: v })}
            options={[{ value: "cover", label: "Riempi" }, { value: "contain", label: "Adatta" }, { value: "stretch", label: "Deforma" }]} />
        </div>
        <p data-testid="layout-info" className="mt-3 font-mono text-[11px] text-slate-400">
          Griglia {lay.cols}×{lay.rows} · max {lay.cap} · sul foglio <span className="text-slate-100">{lay.n}</span>
        </p>
      </Section>

      <Section n={4} title="Margini foglio">
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Superiore" value={p.margin_top} onChange={(v) => set({ margin_top: v })} testid="margin-top-input" />
          <NumField label="Inferiore" value={p.margin_bottom} onChange={(v) => set({ margin_bottom: v })} testid="margin-bottom-input" />
          <NumField label="Sinistro" value={p.margin_left} onChange={(v) => set({ margin_left: v })} testid="margin-left-input" />
          <NumField label="Destro" value={p.margin_right} onChange={(v) => set({ margin_right: v })} testid="margin-right-input" />
        </div>
      </Section>

      <Section n={5} title="Taglio & Retro">
        <label className="flex items-center justify-between text-xs text-slate-300">
          <span>Segni di taglio <span className="text-slate-500">(solo fronte)</span></span>
          <Switch data-testid="cut-marks-switch" checked={p.cut_marks} onCheckedChange={(v) => set({ cut_marks: v })} />
        </label>
        {duplex && (
          <div className="mt-4">
            <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-500">Rotazione retro</span>
            <Segmented testid="flip" value={p.flip} onChange={(v) => set({ flip: v })}
              options={[{ value: "long", label: "Lato lungo" }, { value: "short", label: "Lato corto" }]} />
          </div>
        )}
      </Section>
    </>
  );
};
