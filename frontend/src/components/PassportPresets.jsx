import { useState } from "react";
import { Info, IdCard, LayoutTemplate } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

const PASSPORT = [
  { id: "foto", label: "CIE · Passaporto · Patente", w: 3.5, h: 4.5, note: "35×45 mm · standard ICAO · volto 70–80% · min 400 dpi" },
];

const QUICK = [
  { id: "bv", label: "Biglietto visita", w: 8.5, h: 5.5, note: "85×55 mm" },
  { id: "cart", label: "Cartolina", w: 15, h: 10, note: "150×100 mm" },
  { id: "a6", label: "Cartolina A6", w: 14.8, h: 10.5, note: "148×105 mm" },
  { id: "inv", label: "Invito", w: 12, h: 17, note: "120×170 mm" },
  { id: "invq", label: "Invito quadro", w: 15, h: 15, note: "150×150 mm" },
  { id: "dl", label: "Invito DL", w: 21, h: 9.9, note: "210×99 mm" },
];

const RULES = [
  ["Recente", "La foto non deve avere più di 6 mesi."],
  ["Sfondo", "Chiaro e uniforme, preferibilmente bianco, senza ombre o disegni."],
  ["Espressione", "Neutra, con bocca chiusa e occhi ben visibili e aperti; sguardo dritto verso l'obiettivo."],
  ["Viso", "Deve occupare circa il 70%–80% dell'altezza totale della foto (dal mento alla sommità della testa)."],
  ["Accessori", "Niente occhiali con lenti scure o montature pesanti che coprono gli occhi; capo scoperto (salvo motivi religiosi, purché il volto sia visibile dal mento alla fronte)."],
];

const RulesPopover = ({ testid }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button data-testid={`${testid}-info-btn`} className="rounded-full p-0.5 text-[#00A8E8] transition-colors hover:bg-[#00A8E8]/15" title="Regole fototessera">
        <Info size={13} />
      </button>
    </PopoverTrigger>
    <PopoverContent data-testid={`${testid}-rules`} className="w-80 border-slate-700 bg-[#111827] p-4 text-slate-200">
      <h3 className="mb-1 text-sm font-semibold">Regole generali (Standard ICAO)</h3>
      <p className="mb-2 text-[10px] text-slate-500">Solo indicative: la generazione funziona comunque.</p>
      <ul className="mb-3 space-y-0.5 font-mono text-[10px] text-slate-400">
        <li><span className="text-slate-200">CIE, Passaporto, Patente</span> — 35×45 mm, volto 70–80%, min 400 dpi</li>
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
);

const PresetGroup = ({ testid, title, icon: Icon, presets, cols, current, onApply, extra }) => {
  const [sel, setSel] = useState(null);
  return (
    <div data-testid={testid} className="mt-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon size={12} className="text-slate-500" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{title}</span>
        {extra}
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {presets.map((p) => {
          const active = sel === p.id && current[0] === p.w && current[1] === p.h;
          return (
            <button key={p.id} data-testid={`${testid}-${p.id}`} onClick={() => { setSel(p.id); onApply(p.w, p.h); }} title={p.note}
              className={`rounded-[4px] border px-1 py-1.5 text-[10px] leading-tight transition-colors ${active ? "border-[#00A8E8] bg-[#00A8E8]/15 text-white" : "border-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-100"}`}>
              {p.label}
              <span className="block font-mono text-[9px] text-slate-500">{Math.round(p.w * 10)}×{Math.round(p.h * 10)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const PassportPresets = ({ testid, current, onApply }) => (
  <PresetGroup testid={testid} title="Fototessera documenti" icon={IdCard} presets={PASSPORT} cols={1}
    current={current} onApply={onApply} extra={<RulesPopover testid={testid} />} />
);

export const QuickFormats = ({ testid, current, onApply }) => (
  <PresetGroup testid={testid} title="Biglietti, cartoline, inviti" icon={LayoutTemplate} presets={QUICK} cols={3} current={current} onApply={onApply} />
);
