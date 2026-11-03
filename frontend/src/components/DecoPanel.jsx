import { useState } from "react";
import { Type, Square, Circle, Trash2, Heart } from "lucide-react";
import { Switch } from "./ui/switch";
import { Segmented } from "./Field";
import { TextEditor } from "./TextEditor";
import { DecoStage } from "./DecoStage";
import { newDeco, newLayer } from "../lib/deco";

const NAMES = { none: "Testo", rect: "Rettangolo", ellipse: "Cerchio / Ovale", heart: "Cuore" };
const addBtn = "flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-700 py-2 text-[11px] text-slate-200 transition-colors hover:border-[#00A8E8]";
const colorCls = "h-7 w-9 cursor-pointer rounded border border-slate-700 bg-transparent p-0.5";

const LayerEditor = ({ l, k, t, onChange, onDelete, ratio }) => (
  <div data-testid={t} className="mt-2 rounded-md border border-[#00A8E8]/40 bg-[#0B0F17] p-2.5">
    <div className="mb-2 flex items-center justify-between">
      <span className="text-[11px] font-medium text-slate-200">{k + 1}. {NAMES[l.shape]}</span>
      <button data-testid={`${t}-delete`} onClick={onDelete} title="Elimina" className="rounded-sm p-1 text-slate-500 hover:bg-red-500/15 hover:text-red-400"><Trash2 size={13} /></button>
    </div>
    <Segmented testid={`${t}-shape`} value={l.shape} onChange={(v) => onChange({ shape: v })}
      options={[{ value: "none", label: "Testo" }, { value: "rect", label: "Riquadro" }, { value: "ellipse", label: "Ovale" }, { value: "heart", label: "Cuore" }]} />
    <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
      <span className="w-20 shrink-0">Rotazione</span>
      <input data-testid={`${t}-rot`} type="range" min={-180} max={180} value={l.rot || 0} onChange={(e) => onChange({ rot: +e.target.value })} className="edit-slider min-w-0 flex-1 accent-[#00A8E8]" />
      <span className="w-9 text-right font-mono text-slate-300">{l.rot || 0}°</span>
      <button data-testid={`${t}-rot-reset`} onClick={() => onChange({ rot: 0 })} className="text-[#00A8E8] hover:underline">0°</button>
    </div>
    {l.shape === "rect" && (
      <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
        <span className="w-20 shrink-0">Angoli arrotondati</span>
        <input data-testid={`${t}-radius`} type="range" min={0} max={100} value={l.radius || 0} onChange={(e) => onChange({ radius: +e.target.value })} className="edit-slider min-w-0 flex-1 accent-[#00A8E8]" />
        <span className="w-9 text-right font-mono text-slate-300">{l.radius || 0}%</span>
      </div>
    )}
    {l.shape !== "none" && (
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] text-slate-400">
        <label className="flex items-center gap-1.5">Colore
          <input data-testid={`${t}-fill`} type="color" value={l.fill} onChange={(e) => onChange({ fill: e.target.value })} className={colorCls} />
        </label>
        <label className="flex items-center gap-1.5">Opacità
          <input data-testid={`${t}-opacity`} type="range" min={0} max={100} value={l.opacity} onChange={(e) => onChange({ opacity: +e.target.value })} className="w-20 accent-[#00A8E8]" />
        </label>
        <label className="flex items-center gap-1.5">Bordo
          <Switch data-testid={`${t}-border`} checked={l.border} onCheckedChange={(v) => onChange({ border: v })} />
        </label>
        {l.border && <input data-testid={`${t}-border-color`} type="color" value={l.borderColor} onChange={(e) => onChange({ borderColor: e.target.value })} className={colorCls} />}
        <button data-testid={`${t}-square`} onClick={() => onChange({ h: Math.min(100, Math.round(l.w * ratio)) })} className="text-[#00A8E8] hover:underline">
          Rendi {l.shape === "ellipse" ? "cerchio" : l.shape === "heart" ? "proporzionato" : "quadrato"}
        </button>
      </div>
    )}
    <TextEditor t={`${t}-txt`} title="Testo" accent="#00A8E8" cfg={l.txt} onChange={(patch) => onChange({ txt: { ...l.txt, ...patch } })} placeholder="Scrivi qui…" />
  </div>
);

export const DecoPanel = ({ item, t, set, duplex }) => {
  const [side, setSide] = useState("front");
  const [sel, setSel] = useState(null);
  const s = duplex ? side : "front";
  const deco = item.deco || newDeco();
  const d = deco[s];
  const pt = `${t}-deco-${s}`;
  const put = (patch) => set({ deco: { ...deco, [s]: { ...d, ...patch } } });
  const upd = (id, patch) => put({ layers: d.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const add = (shape) => { const l = newLayer(shape); put({ layers: [...d.layers, l] }); setSel(l.id); };
  const k = d.layers.findIndex((l) => l.id === sel);
  return (
    <div data-testid={`${t}-deco`} className="mt-3 rounded-md border border-[#00A8E8]/25 bg-[#00A8E8]/5 p-2.5">
      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#00A8E8]">Testi, forme e sfondo</span>
      {duplex && (
        <div className="mb-2">
          <Segmented testid={`${t}-deco-side`} value={side} onChange={(v) => { setSide(v); setSel(null); }} options={[{ value: "front", label: "Fronte" }, { value: "back", label: "Retro" }]} />
        </div>
      )}
      <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
        <span>Colore sfondo {s === "front" ? "fronte" : "retro"}</span>
        <div className="flex items-center gap-2">
          {d.bg && <input data-testid={`${pt}-bg-color`} type="color" value={d.bg} onChange={(e) => put({ bg: e.target.value })} className={colorCls} />}
          <Switch data-testid={`${pt}-bg-switch`} checked={!!d.bg} onCheckedChange={(v) => put({ bg: v ? "#FDE68A" : null })} />
        </div>
      </div>
      {d.bg && <p className="mt-1 text-[10px] text-slate-500">Lo sfondo si vede dove non c'è l'immagine (senza immagine o con «Adatta»).</p>}
      <div className="mt-2 flex gap-1.5">
        <button data-testid={`${pt}-add-text`} onClick={() => add("none")} className={addBtn}><Type size={12} /> + Testo</button>
        <button data-testid={`${pt}-add-rect`} onClick={() => add("rect")} className={addBtn}><Square size={12} /> + Riquadro</button>
        <button data-testid={`${pt}-add-ellipse`} onClick={() => add("ellipse")} className={addBtn}><Circle size={12} /> + Cerchio</button>
        <button data-testid={`${pt}-add-heart`} onClick={() => add("heart")} className={addBtn}><Heart size={12} /> + Cuore</button>
      </div>
      <DecoStage testid={`${pt}-stage`} item={item} side={s} wcm={item.width} hcm={item.height} layers={d.layers} sel={sel} onSelect={setSel} onChange={upd} />
      {d.layers.length > 0 && (
        <p className="mt-1.5 text-[10px] text-slate-500">Clicca un elemento per selezionarlo: trascinalo per spostarlo, usa i pallini agli angoli per ingrandire in proporzione e i quadratini sui lati per deformare.</p>
      )}
      {d.layers.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {d.layers.map((l, i) => (
            <button key={l.id} data-testid={`${pt}-chip-${i}`} onClick={() => setSel(l.id)}
              className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${sel === l.id ? "border-[#00A8E8] bg-[#00A8E8]/20 text-white" : "border-slate-700 text-slate-400 hover:text-white"}`}>
              {i + 1}. {NAMES[l.shape]}{l.txt.text ? ` · ${l.txt.text.split("\n")[0].slice(0, 12)}` : ""}
            </button>
          ))}
        </div>
      )}
      {k >= 0 && (
        <LayerEditor l={d.layers[k]} k={k} t={`${pt}-layer-${k}`} ratio={item.width / item.height}
          onChange={(patch) => upd(sel, patch)} onDelete={() => { put({ layers: d.layers.filter((x) => x.id !== sel) }); setSel(null); }} />
      )}
    </div>
  );
};
