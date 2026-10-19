import { Minus, Plus, Trash2, Wand2, Maximize } from "lucide-react";
import { ImageDrop } from "./ImageDrop";
import { NumField, FitSelect, Segmented } from "./Field";
import { Switch } from "./ui/switch";
import { PassportPresets, QuickFormats } from "./PassportPresets";
import { capacity, tileSize, SHEETS } from "../lib/layout";
import { TagToggle, TagText } from "./TagPanel";

export const ItemCard = ({ item, i, p, setP, onSave, update, remove, canRemove }) => {
  const t = `item-${i}`;
  const set = (patch) => update(item.id, patch);
  const ratio = item.front ? item.front.h / item.front.w : null;
  const [w] = tileSize(item, p);
  const zw = item.tag ? w / 2 : w;
  const dpi = item.front && zw > 0 ? Math.round(item.front.w / (zw / 2.54)) : null;
  const sz = item;
  const setSize = set;
  const fill = () => set({ copies: Math.max(1, capacity(...tileSize(item, p), p)) });

  return (
    <div data-testid={t} className="rounded-md border border-slate-800 bg-[#0F1520] p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="font-mono text-[11px] text-slate-400">Immagine {String.fromCharCode(65 + i)}</span>
        {canRemove && (
          <button data-testid={`${t}-delete`} onClick={() => remove(item.id)} className="rounded-sm p-1 text-slate-500 transition-colors hover:bg-red-500/15 hover:text-red-400">
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <div className={`grid gap-2 ${p.duplex ? "grid-cols-2" : "grid-cols-1"}`}>
        <ImageDrop label="Fronte" image={item.front} onChange={(v) => set({ front: v })} testid={`${t}-front`} accent="#2563EB" />
        {p.duplex && !item.tag && <ImageDrop label="Retro" image={item.back} onChange={(v) => set({ back: v })} testid={`${t}-back`} accent="#9333EA" />}
        {p.duplex && item.tag && (
          <div data-testid={`${t}-back-text-slot`} className="flex h-28 items-center justify-center rounded-md border border-dashed border-[#9333EA]/40 bg-[#0B0F17] px-2 text-center text-[10px] text-purple-300">
            Retro: testo a destra (vedi sotto)
          </div>
        )}
      </div>
      {i === 0 && (
        <div data-testid="sheet-format" className="mt-3 rounded-md border border-[#00A8E8]/25 bg-[#00A8E8]/5 p-2.5">
          <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#00A8E8]">Formato foglio (tutto il lavoro)</span>
          <Segmented testid="sheet" value={p.sheet} onChange={(v) => setP({ sheet: v })}
            options={Object.entries(SHEETS).map(([k, s]) => ({ value: k, label: s.label, sub: s.desc }))} />
          <div className="mt-2">
            <Segmented testid="orientation" value={p.orientation} onChange={(v) => setP({ orientation: v })}
              options={[{ value: "portrait", label: "Verticale" }, { value: "landscape", label: "Orizzontale" }]} />
          </div>
        </div>
      )}
      <TagToggle item={item} t={t} set={set} setP={setP} />
      <div className="mt-3">
        <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-500">Forma</span>
        <Segmented testid={`${t}-shape`} value={item.shape} onChange={(v) => set({ shape: v })}
          options={[{ value: "rect", label: "Squadrata" }, { value: "round", label: "Rotonda / Ovale" }]} />
        {item.shape === "round" && (
          <label className="mt-2 flex cursor-pointer items-center justify-between text-xs text-slate-400">
            Contorno (solo fronte)
            <Switch data-testid={`${t}-outline-switch`} checked={item.outline} onCheckedChange={(v) => set({ outline: v })} />
          </label>
        )}
      </div>
      <div className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <NumField label="Largh." value={sz.width} onChange={(v) => setSize({ width: v })} testid={`${t}-width`} />
          <NumField label="Alt." value={sz.height} onChange={(v) => setSize({ height: v })} testid={`${t}-height`} />
          <button data-testid={`${t}-ratio`} disabled={!ratio} onClick={() => setSize({ height: +(sz.width * ratio).toFixed(2) })}
            title="Altezza in proporzione all'immagine"
            className="mb-0.5 rounded-md border border-slate-700 p-2 text-slate-400 transition-colors hover:border-slate-400 hover:text-white disabled:opacity-30">
            <Wand2 size={14} />
          </button>
        </div>
      <FitSelect testid={`${t}-fit`} value={item.fit} onChange={(v) => set({ fit: v })} />
      {item.tag && <TagText item={item} t={t} set={set} p={p} onSave={onSave} />}
      <PassportPresets testid={`${t}-passport`} current={[sz.width, sz.height]} onApply={(width, height) => setSize({ width, height })} />
      <QuickFormats testid={`${t}-quick`} current={[sz.width, sz.height]} onApply={(width, height) => setSize({ width, height })} />
      <div className="mt-3 flex items-end gap-2">
        <div>
          <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-500">Copie</span>
          <div className="flex items-center rounded-md border border-slate-700 bg-[#0B0F17]">
            <button data-testid={`${t}-copies-dec`} onClick={() => set({ copies: Math.max(1, item.copies - 1) })} className="p-2 text-slate-400 hover:text-white"><Minus size={13} /></button>
            <input data-testid={`${t}-copies`} type="number" min={1} value={item.copies}
              onChange={(e) => set({ copies: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              className="w-12 bg-transparent text-center font-mono text-sm outline-none" />
            <button data-testid={`${t}-copies-inc`} onClick={() => set({ copies: item.copies + 1 })} className="p-2 text-slate-400 hover:text-white"><Plus size={13} /></button>
          </div>
        </div>
        <button data-testid={`${t}-fill`} onClick={fill} title="Riempi un foglio"
          className="flex items-center gap-1 rounded-md border border-slate-700 px-2.5 py-2 text-[11px] text-slate-300 transition-colors hover:border-slate-400">
          <Maximize size={12} /> Foglio pieno
        </button>
      </div>
      {dpi && (
        <p data-testid={`${t}-dpi`} className={`mt-2 font-mono text-[10px] ${dpi < 150 ? "text-amber-400" : "text-emerald-400"}`}>
          {dpi} DPI {dpi < 150 && "— bassa per la stampa"}
        </p>
      )}
    </div>
  );
};
