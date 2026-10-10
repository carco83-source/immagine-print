import { useState } from "react";
import { Info, IdCard } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

const PRESETS = [
  { id: "cie", label: "CIE", w: 3.5, h: 4.5, note: "35×45 mm · volto 70–80% · min 400 dpi" },
  { id: "pass", label: "Passaporto", w: 3.5, h: 4.5, note: "35×45 mm · standard ICAO" },
  { id: "pass40", label: "Passap. 35×40", w: 3.5, h: 4.0, note: "35×40 mm · contesti specifici" },
  { id: "pat", label: "Patente", w: 3.5, h: 4.5, note: "35×45 mm" },
];

const RULES = [
  ["Recente", "La foto non deve avere più di 6 mesi."],
  ["Sfondo", "Chiaro e uniforme, preferibilmente bianco, senza ombre o disegni."],
  ["Espressione", "Neutra, con bocca chiusa e occhi ben visibili e aperti; sguardo dritto verso l'obiettivo."],
  ["Viso", "Deve occupare circa il 70%–80% dell'altezza totale della foto (dal mento alla sommità della testa)."],
  ["Accessori", "Niente occhiali con lenti scure o montature pesanti che coprono gli occhi; capo scoperto (salvo motivi religiosi, purché il volto sia visibile dal mento alla fronte)."],
];

export const PassportPresets = ({ testid, current, onApply }) => {
  const [sel, setSel] = useState(null);
  return (
  <div data-testid={testid} className="mt-3">
    <div className="mb-1.5 flex items-center gap-1.5">
      <IdCard size={12} className="text-slate-500" />
      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Fototessera documenti</span>
      <Popover>
        <PopoverTrigger asChild>
          <button data-testid={`${testid}-info-btn`} className="rounded-full p-0.5 text-[#00A8E8] transition-colors hover:bg-[#00A8E8]/15" title="Regole fototessera">
            <Info size={13} />
          </button>
        </PopoverTrigger>
        <PopoverContent data-testid={`${testid}-rules`} className="w-80 border-slate-700 bg-[#111827] p-4 text-slate-200">
          <h3 className="mb-1 text-sm font-semibold">Regole generali (Standard ICAO)</h3>
          <ul className="mb-3 space-y-0.5 font-mono text-[10px] text-slate-400">
            {PRESETS.map((p) => <li key={p.id}><span className="text-slate-200">{p.label}</span> — {p.note}</li>)}
          </ul>
          <ul className="space-y-2">
            {RULES.map(([k, v]) => (
              <li key={k} className="text-xs leading-relaxed">
                <span className="font-semibold text-[#00A8E8]">{k}:</span> <span className="text-slate-300">{v}</span>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
    <div className="grid grid-cols-4 gap-1">
      {PRESETS.map((p) => {
        const active = sel === p.id && current[0] === p.w && current[1] === p.h;
        return (
          <button key={p.id} data-testid={`${testid}-${p.id}`} onClick={() => { setSel(p.id); onApply(p.w, p.h); }} title={p.note}
            className={`rounded-[4px] border px-1 py-1.5 text-[10px] leading-tight transition-colors ${active ? "border-[#00A8E8] bg-[#00A8E8]/15 text-white" : "border-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-100"}`}>
            {p.label}
            <span className="block font-mono text-[9px] text-slate-500">{p.w * 10}×{p.h * 10}</span>
          </button>
        );
      })}
    </div>
  </div>
);
};
