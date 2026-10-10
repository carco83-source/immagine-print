import { Minus, Plus, Trash2, Wand2, Maximize } from "lucide-react";
import { ImageDrop } from "./ImageDrop";
import { NumField } from "./Field";
import { capacity, tileSize } from "../lib/layout";

export const ItemCard = ({ item, i, p, update, remove, canRemove }) => {
  const t = `item-${i}`;
  const set = (patch) => update(item.id, patch);
  const ratio = item.front ? item.front.h / item.front.w : null;
  const [w] = tileSize(item, p);
  const dpi = item.front && w > 0 ? Math.round(item.front.w / (w / 2.54)) : null;
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
        {p.duplex && <ImageDrop label="Retro" image={item.back} onChange={(v) => set({ back: v })} testid={`${t}-back`} accent="#9333EA" />}
      </div>
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
      {!p.duplex && (
        <div className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <NumField label="Largh." value={item.width} onChange={(v) => set({ width: v })} testid={`${t}-width`} />
          <NumField label="Alt." value={item.height} onChange={(v) => set({ height: v })} testid={`${t}-height`} />
          <button data-testid={`${t}-ratio`} disabled={!ratio} onClick={() => set({ height: +(item.width * ratio).toFixed(2) })}
            title="Altezza in proporzione all'immagine"
            className="mb-0.5 rounded-md border border-slate-700 p-2 text-slate-400 transition-colors hover:border-slate-400 hover:text-white disabled:opacity-30">
            <Wand2 size={14} />
          </button>
        </div>
      )}
      {dpi && (
        <p data-testid={`${t}-dpi`} className={`mt-2 font-mono text-[10px] ${dpi < 150 ? "text-amber-400" : "text-emerald-400"}`}>
          {dpi} DPI {dpi < 150 && "— bassa per la stampa"}
        </p>
      )}
    </div>
  );
};
