import { useRef } from "react";
import { toast } from "sonner";
import { Upload, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { TAG_FONTS, addFontFile, useFonts } from "../lib/tag";
import { Segmented } from "./Field";

const ALIGNS = [["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]];
const tog = (on) => `rounded-md border p-2 transition-colors ${on ? "border-[#E6007E] bg-[#E6007E]/20 text-white" : "border-slate-700 text-slate-400 hover:border-slate-400 hover:text-white"}`;

export const TextEditor = ({ cfg, onChange, t, title, accent, showPos, placeholder }) => {
  const custom = useFonts();
  const ref = useRef(null);
  const fonts = [...TAG_FONTS, ...custom];
  const onFont = async (file) => {
    if (!file) return;
    try {
      onChange({ font: await addFontFile(file) });
      toast.success(`Carattere "${file.name}" caricato e salvato`);
    } catch {
      toast.error("File carattere non valido (usa .ttf, .otf o .woff)");
    }
  };
  return (
    <div data-testid={t} className="mt-3 rounded-md border p-3" style={{ borderColor: `${accent}4D`, background: `${accent}0D` }}>
      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider" style={{ color: accent }}>{title}</span>
      {showPos && (
        <div className="mb-2">
          <Segmented testid={`${t}-pos`} value={cfg.pos} onChange={(v) => onChange({ pos: v })}
            options={[{ value: "left", label: "Accanto (sinistra)" }, { value: "over", label: "Sopra l'immagine" }]} />
        </div>
      )}
      <textarea data-testid={`${t}-textarea`} rows={3} value={cfg.text} onChange={(e) => onChange({ text: e.target.value })}
        placeholder={placeholder}
        className="w-full resize-none rounded-md border border-slate-700 bg-[#0B0F17] p-2 text-sm text-slate-100 outline-none focus:border-slate-400"
        style={{ fontFamily: cfg.font, fontWeight: cfg.bold ? 700 : 400, fontStyle: cfg.italic ? "italic" : "normal", textAlign: cfg.align }} />
      <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-2">
        <select data-testid={`${t}-font`} value={cfg.font} onChange={(e) => onChange({ font: e.target.value })}
          className="min-w-0 rounded-md border border-slate-700 bg-[#0B0F17] px-2 py-2 text-xs text-slate-100 outline-none">
          {fonts.map((f) => (
            <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>{`${f.label}${f.note ? ` (${f.note})` : ""}`}</option>
          ))}
        </select>
        <input data-testid={`${t}-color`} type="color" value={cfg.color} onChange={(e) => onChange({ color: e.target.value })}
          title="Colore testo" className="h-9 w-10 cursor-pointer rounded-md border border-slate-700 bg-[#0B0F17] p-1" />
        <button data-testid={`${t}-font-upload`} onClick={() => ref.current?.click()} title="Carica un tuo carattere (.ttf/.otf)"
          className="flex items-center gap-1 rounded-md border border-slate-700 px-2 text-[11px] text-slate-300 transition-colors hover:border-slate-400">
          <Upload size={12} /> Font
        </button>
        <input ref={ref} type="file" accept=".ttf,.otf,.woff,.woff2" hidden data-testid={`${t}-font-input`}
          onChange={(e) => { onFont(e.target.files[0]); e.target.value = ""; }} />
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <button data-testid={`${t}-bold`} onClick={() => onChange({ bold: !cfg.bold })} title="Grassetto" className={tog(cfg.bold)}><Bold size={13} /></button>
        <button data-testid={`${t}-italic`} onClick={() => onChange({ italic: !cfg.italic })} title="Corsivo" className={tog(cfg.italic)}><Italic size={13} /></button>
        <span className="mx-1 h-5 w-px bg-slate-700" />
        {ALIGNS.map(([v, Icon]) => (
          <button key={v} data-testid={`${t}-align-${v}`} onClick={() => onChange({ align: v })} title={`Allinea ${v}`} className={tog(cfg.align === v)}><Icon size={13} /></button>
        ))}
      </div>
    </div>
  );
};
