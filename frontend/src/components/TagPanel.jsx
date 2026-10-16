import { useState } from "react";
import { toast } from "sonner";
import { Gift, Save } from "lucide-react";
import { Switch } from "./ui/switch";
import { TextEditor } from "./TextEditor";
import { TAG_W, TAG_H } from "../lib/tag";

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

export const TagText = ({ item, t, set, p, onSave }) => {
  const [name, setName] = useState("");
  const save = async () => {
    if (!name.trim()) return toast.error("Dai un nome al modello");
    await onSave(item, name.trim());
    setName("");
  };
  return (
    <>
      <TextEditor t={`${t}-front-txt`} title="Testo fronte (facoltativo)" accent="#2563EB" showPos
        cfg={item.frontTxt} onChange={(patch) => set({ frontTxt: { ...item.frontTxt, ...patch } })} placeholder="Grazie!" />
      <TextEditor t={`${t}-back-txt`} title="Testo retro (a destra, 45×25 mm)" accent="#9333EA"
        cfg={item.backTxt} onChange={(patch) => set({ backTxt: { ...item.backTxt, ...patch } })} placeholder={"Marco & Giulia\n12 Giugno 2026"} />
      {!p.duplex && <p className="mt-2 text-[10px] text-amber-400">Attiva Fronte / Retro per stampare il testo del retro.</p>}
      <p className="mt-1.5 text-[10px] text-slate-500">La dimensione del testo si adatta automaticamente allo spazio.</p>
      <div className="mt-2 flex gap-2">
        <input data-testid={`${t}-template-name`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome modello (es. Matrimonio rose)"
          className="min-w-0 flex-1 rounded-md border border-slate-700 bg-[#0B0F17] px-2 py-2 text-xs text-slate-100 outline-none focus:border-[#FFD100]" />
        <button data-testid={`${t}-template-save`} onClick={save}
          className="flex items-center gap-1 rounded-md bg-[#FFD100] px-3 text-[11px] font-semibold text-[#0B0F17] transition-opacity hover:opacity-90">
          <Save size={12} /> Salva modello
        </button>
      </div>
    </>
  );
};
