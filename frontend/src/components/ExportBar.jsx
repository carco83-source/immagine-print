import { Download, Loader2, Save } from "lucide-react";
import { Segmented } from "./Field";

export const ExportBar = ({ p, set, onExport, onSave, loading, disabled }) => (
  <div className="sticky bottom-0 z-20 mt-auto space-y-3 border-t border-slate-800 bg-[#111827]/95 px-6 py-5 backdrop-blur-md">
    <div className="grid grid-cols-[1fr_auto] gap-3">
      <Segmented testid="format" value={p.format} onChange={(v) => set({ format: v })}
        options={[{ value: "pdf", label: "PDF" }, { value: "png", label: "PNG" }, { value: "jpg", label: "JPG" }]} />
      <select
        data-testid="dpi-select"
        value={p.dpi}
        onChange={(e) => set({ dpi: parseInt(e.target.value, 10) })}
        className="rounded-md border border-slate-800 bg-[#0B0F17] px-2 font-mono text-xs text-slate-300 outline-none"
      >
        {[150, 300, 600].map((d) => <option key={d} value={d}>{d} dpi</option>)}
      </select>
    </div>
    <div className="flex gap-2">
    <button data-testid="save-work-btn" onClick={onSave} disabled={disabled} title="Salva il lavoro per riaprirlo dopo"
      className="flex items-center justify-center gap-1.5 rounded-md border border-slate-700 px-4 text-sm font-medium text-slate-200 transition-colors hover:border-[#FFD100] hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
      <Save size={16} /> Salva
    </button>
    <button
      data-testid="export-btn"
      onClick={onExport}
      disabled={disabled || loading}
      className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#2563EB] py-3 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#1D4ED8] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      {loading ? "Generazione…" : "Genera e scarica"}
    </button>
    </div>
  </div>
);
