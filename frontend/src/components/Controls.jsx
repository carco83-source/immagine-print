import { useRef } from "react";
import { Plus } from "lucide-react";
import { Switch } from "./ui/switch";
import { Section, NumField, Segmented } from "./Field";
import { ItemCard } from "./ItemCard";
import { Templates } from "./Templates";

export const Controls = ({ p, set, items, update, remove, addFiles, info, onSaveTemplate, onUseTemplate, tplVersion }) => {
  const ref = useRef(null);
  return (
    <>
      <Section n={1} title="Immagini" right={
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Fronte / Retro
          <Switch data-testid="duplex-switch" checked={p.duplex} onCheckedChange={(v) => set({ duplex: v })} />
        </label>
      }>
        <div className="space-y-3">
          {items.map((it, i) => (
            <ItemCard key={it.id} item={it} i={i} p={p} setP={set} onSave={onSaveTemplate} update={update} remove={remove} canRemove={items.length > 1} />
          ))}
        </div>
        <input ref={ref} type="file" accept="image/*" multiple hidden data-testid="add-images-input"
          onChange={(e) => { addFiles([...e.target.files]); e.target.value = ""; }} />
        <button data-testid="add-image-btn" onClick={() => ref.current?.click()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-700 py-2.5 text-xs text-slate-300 transition-colors hover:border-[#00A8E8] hover:text-white">
          <Plus size={14} /> Aggiungi immagini
        </button>
        <p data-testid="layout-info" className="mt-3 font-mono text-[11px] text-slate-400">
          Totale copie <span className="text-slate-100">{info.total}</span> · fogli <span className="text-slate-100">{info.pages.length}</span>
          {info.unfit > 0 && <span className="text-amber-400"> · {info.unfit} non entrano</span>}
        </p>
      </Section>

      <Section n={2} title="Impaginazione">
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Spaziatura" value={p.gap} onChange={(v) => set({ gap: v })} testid="gap-input" />
          <div />
          <NumField label="Margine sup." value={p.margin_top} onChange={(v) => set({ margin_top: v })} testid="margin-top-input" />
          <NumField label="Margine inf." value={p.margin_bottom} onChange={(v) => set({ margin_bottom: v })} testid="margin-bottom-input" />
          <NumField label="Margine sin." value={p.margin_left} onChange={(v) => set({ margin_left: v })} testid="margin-left-input" />
          <NumField label="Margine des." value={p.margin_right} onChange={(v) => set({ margin_right: v })} testid="margin-right-input" />
        </div>
      </Section>

      <Section n={3} title="Taglio & Retro">
        <label className="flex items-center justify-between text-xs text-slate-300">
          <span>Segni di taglio <span className="text-slate-500">(solo fronte)</span></span>
          <Switch data-testid="cut-marks-switch" checked={p.cut_marks} onCheckedChange={(v) => set({ cut_marks: v })} />
        </label>
        {p.duplex && (
          <div className="mt-4">
            <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-500">Rotazione retro</span>
            <Segmented testid="flip" value={p.flip} onChange={(v) => set({ flip: v })}
              options={[{ value: "long", label: "Lato lungo" }, { value: "short", label: "Lato corto" }]} />
          </div>
        )}
      </Section>
      <Templates version={tplVersion} onUse={onUseTemplate} />
    </>
  );
};
