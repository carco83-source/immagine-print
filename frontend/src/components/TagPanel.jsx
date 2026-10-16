import { useRef } from "react";
import { toast } from "sonner";
import { Gift, Upload } from "lucide-react";
import { Switch } from "./ui/switch";
import { TAG_FONTS, TAG_W, TAG_H, addFontFile, useFonts } from "../lib/tag";

export const TagToggle = ({ item, t, set, setP }) => {
  const toggle = (on) => {
    set(on ? { tag: true, width: TAG_W, height: TAG_H, shape: "rect" } : { tag: false });
    if (on) setP({ duplex: true, width: TAG_W, height: TAG_H });
  };
  return (
    <label className="mt-3 flex cursor-pointer items-center justify-between rounded-md border border-[#FFD100]/30 bg-[#FFD100]/5 px-3 py-2 text-xs text-slate-300">
      <span className="flex items-center gap-2">
        <Gift size={13} className="text-[#FFD100]" />
        <span>Biglietto bomboniera <span className="font-mono text-[10px] text-slate-500">90×25 · immagine/testo a destra</span></span>
      </span>
      <Switch data-testid={`${t}-tag-switch`} checked={!!item.tag} onCheckedChange={toggle} />
    </label>
  );
};

export const TagText = ({ item, t, set, p }) => {
  const custom = useFonts();
  const ref = useRef(null);
  const fonts = [...TAG_FONTS, ...custom];
  const onFont = async (file) => {
    if (!file) return;
    try {
      const family = await addFontFile(file);
      set({ font: family });
      toast.success(`Carattere "${file.name}" caricato`);
    } catch {
      toast.error("File carattere non valido (usa .ttf, .otf o .woff)");
    }
  };
  return (
    <div data-testid={`${t}-tag-text`} className="mt-3 rounded-md border border-[#9333EA]/30 bg-[#9333EA]/5 p-3">
      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-purple-300">Testo retro (a destra, 45×25 mm)</span>
      {!p.duplex && <p className="mb-2 text-[10px] text-amber-400">Attiva Fronte / Retro per stampare il testo.</p>}
      <textarea data-testid={`${t}-tag-textarea`} rows={3} value={item.text} onChange={(e) => set({ text: e.target.value })}
        placeholder={"Marco & Giulia\n12 Giugno 2026"}
        className="w-full resize-none rounded-md border border-slate-700 bg-[#0B0F17] p-2 text-sm text-slate-100 outline-none focus:border-[#9333EA]"
        style={{ fontFamily: item.font }} />
      <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-2">
        <select data-testid={`${t}-tag-font`} value={item.font} onChange={(e) => set({ font: e.target.value })}
          className="min-w-0 rounded-md border border-slate-700 bg-[#0B0F17] px-2 py-2 text-xs text-slate-100 outline-none">
          {fonts.map((f) => (
            <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>{f.label}{f.note ? ` (${f.note})` : ""}</option>
          ))}
        </select>
        <input data-testid={`${t}-tag-color`} type="color" value={item.color} onChange={(e) => set({ color: e.target.value })}
          title="Colore testo" className="h-9 w-10 cursor-pointer rounded-md border border-slate-700 bg-[#0B0F17] p-1" />
        <button data-testid={`${t}-tag-font-upload`} onClick={() => ref.current?.click()} title="Carica un tuo carattere (.ttf/.otf)"
          className="flex items-center gap-1 rounded-md border border-slate-700 px-2 text-[11px] text-slate-300 transition-colors hover:border-slate-400">
          <Upload size={12} /> Font
        </button>
        <input ref={ref} type="file" accept=".ttf,.otf,.woff,.woff2" hidden data-testid={`${t}-tag-font-input`}
          onChange={(e) => { onFont(e.target.files[0]); e.target.value = ""; }} />
      </div>
      <p className="mt-1.5 text-[10px] text-slate-500">La dimensione del testo si adatta automaticamente allo spazio.</p>
    </div>
  );
};
