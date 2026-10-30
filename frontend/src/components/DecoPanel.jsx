import { useState } from "react";
import { Type, Square, Circle, Trash2 } from "lucide-react";
import { Switch } from "./ui/switch";
import { Segmented } from "./Field";
import { TextEditor } from "./TextEditor";
import { newDeco, newLayer } from "../lib/deco";

const NAMES = { none: "Testo", rect: "Rettangolo", ellipse: "Cerchio / Ovale" };
const addBtn = "flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-700 py-2 text-[11px] text-slate-200 transition-colors hover:border-[#00A8E8]";

const Range = ({ label, value, onChange, testid }) => (
  <label className="grid grid-cols-[52px_1fr_30px] items-center gap-2 text-[10px] text-slate-400">
    {label}
    <input data-testid={testid} type="range" min={0} max={100} value={value} onChange={(e) => onChange(+e.target.value)} className="accent-[#00A8E8]" />
    <span className="text-right font-mono text-slate-500">{value}</span>
  </label>
);

const LayerEditor = ({ l, k, t, onChange, onDelete, ratio }) => (
  <div data-testid={t} className="mt-2 rounded-md border border-slate-800 bg-[#0B0F17] p-2.5">
    <div className="mb-2 flex items-center justify-between">
      <span className="text-[11px] font-medium text-slate-200">{k + 1}. {NAMES[l.shape]}</span>
      <button data-testid={`${t}-delete`} onClick={onDelete} title="Elimina" className="rounded-sm p-1 text-slate-500 hover:bg-red-500/15 hover:text-red-400"><Trash2 size={13} /></button>
    </div>
    <Segmented testid={`${t}-shape`} value={l.shape} onChange={(v) => onChange({ shape: v })}
      options={[{ value: "none", label: "Solo testo" }, { value: "rect", label: "Rettangolo" }, { value: "ellipse", label: "Ovale" }]} />
    {l.shape !== "none" && (
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
        Colore
        <input data-testid={`${t}-fill`} type="color" value={l.fill} onChange={(e) => onChange({ fill: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-slate-700 bg-transparent p-0.5" />
        <div className="min-w-[140px] flex-1"><Range label="Opacità" value={l.opacity} onChange={(v) => onChange({ opacity: v })} testid={`${t}-opacity`} /></div>
        <label className="flex items-center gap-1.5">Bordo
          <Switch data-testid={`${t}-border`} checked={l.border} onCheckedChange={(v) => onChange({ border: v })} />
        </label>
        {l.border && <input data-testid={`${t}-border-color`} type="color" value={l.borderColor} onChange={(e) => onChange({ borderColor: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-slate-700 bg-transparent p-0.5" />}
      </div>
    )}
    <div className="mt-2 space-y-1">
      <Range label="Sinistra" value={l.x} onChange={(v) => onChange({ x: v })} testid={`${t}-x`} />
      <Range label="Alto" value={l.y} onChange={(v) => onChange({ y: v })} testid={`${t}-y`} />
      <Range label="Larghezza" value={l.w} onChange={(v) => onChange({ w: v })} testid={`${t}-w`} />
      <Range label="Altezza" value={l.h} onChange={(v) => onChange({ h: v })} testid={`${t}-h`} />
    </div>
    {l.shape !== "none" && (
      <button data-testid={`${t}-square`} onClick={() => onChange({ h: Math.min(100, Math.round(l.w * ratio)) })}
        className="mt-1.5 text-[10px] text-[#00A8E8] hover:underline">
        Rendi {l.shape === "ellipse" ? "cerchio" : "quadrato"}
      </button>
    )}
    <TextEditor t={`${t}-txt`} title="Testo" accent="#00A8E8" cfg={l.txt} onChange={(patch) => onChange({ txt: { ...l.txt, ...patch } })} placeholder="Scrivi qui…" />
  </div>
);

export const DecoPanel = ({ item, t, set, duplex }) => {
  const [side, setSide] = useState("front");
  const s = duplex ? side : "front";
  const deco = item.deco || newDeco();
  const d = deco[s];
  const pt = `${t}-deco-${s}`;
  const put = (patch) => set({ deco: { ...deco, [s]: { ...d, ...patch } } });
  const upd = (id, patch) => put({ layers: d.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  return (
    <div data-testid={`${t}-deco`} className="mt-3 rounded-md border border-[#00A8E8]/25 bg-[#00A8E8]/5 p-2.5">
      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#00A8E8]">Testi, forme e sfondo</span>
      {duplex && (
        <div className="mb-2">
          <Segmented testid={`${t}-deco-side`} value={side} onChange={setSide} options={[{ value: "front", label: "Fronte" }, { value: "back", label: "Retro" }]} />
        </div>
      )}
      <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
        <span>Colore sfondo {s === "front" ? "fronte" : "retro"}</span>
        <div className="flex items-center gap-2">
          {d.bg && <input data-testid={`${pt}-bg-color`} type="color" value={d.bg} onChange={(e) => put({ bg: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-slate-700 bg-transparent p-0.5" />}
          <Switch data-testid={`${pt}-bg-switch`} checked={!!d.bg} onCheckedChange={(v) => put({ bg: v ? "#FDE68A" : null })} />
        </div>
      </div>
      {d.bg && <p className="mt-1 text-[10px] text-slate-500">Lo sfondo si vede dove non c'è l'immagine (senza immagine o con «Adatta»).</p>}
      <div className="mt-2 flex gap-1.5">
        <button data-testid={`${pt}-add-text`} onClick={() => put({ layers: [...d.layers, newLayer("none")] })} className={addBtn}><Type size={12} /> Testo</button>
        <button data-testid={`${pt}-add-rect`} onClick={() => put({ layers: [...d.layers, newLayer("rect")] })} className={addBtn}><Square size={12} /> Rettangolo</button>
        <button data-testid={`${pt}-add-ellipse`} onClick={() => put({ layers: [...d.layers, newLayer("ellipse")] })} className={addBtn}><Circle size={12} /> Ovale</button>
      </div>
      {d.layers.map((l, k) => (
        <LayerEditor key={l.id} l={l} k={k} t={`${pt}-layer-${k}`} ratio={item.width / item.height}
          onChange={(patch) => upd(l.id, patch)} onDelete={() => put({ layers: d.layers.filter((x) => x.id !== l.id) })} />
      ))}
    </div>
  );
};
