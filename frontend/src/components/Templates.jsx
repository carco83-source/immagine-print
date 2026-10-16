import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookmarkCheck, Trash2 } from "lucide-react";
import { Section } from "./Field";
import { listTemplates, deleteTemplate } from "../lib/db";

export const Templates = ({ version, onUse }) => {
  const [list, setList] = useState([]);
  const refresh = () => listTemplates().then(setList).catch(() => setList([]));
  useEffect(() => { refresh(); }, [version]);
  const del = async (tpl) => {
    await deleteTemplate(tpl.id);
    toast.success(`Modello "${tpl.name}" eliminato`);
    refresh();
  };
  return (
    <Section n={4} title="Modelli salvati">
      {!list.length && <p data-testid="templates-empty" className="text-xs text-slate-500">Nessun modello. Crea un biglietto bomboniera e premi «Salva modello».</p>}
      <div className="space-y-2">
        {list.map((tpl) => (
          <div key={tpl.id} data-testid={`template-${tpl.id}`} className="flex items-center gap-3 rounded-md border border-slate-800 bg-[#0F1520] p-2">
            <img src={tpl.thumb} alt={tpl.name} className="h-8 w-[115px] shrink-0 rounded-sm bg-white object-contain" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-slate-100">{tpl.name}</p>
              <p className="font-mono text-[10px] text-slate-500">{tpl.size[0]}×{tpl.size[1]} cm</p>
            </div>
            <button data-testid={`template-${tpl.id}-use`} onClick={() => onUse(tpl)}
              className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1.5 text-[11px] text-slate-200 transition-colors hover:border-[#FFD100]">
              <BookmarkCheck size={12} /> Usa
            </button>
            <button data-testid={`template-${tpl.id}-delete`} onClick={() => del(tpl)} className="rounded-sm p-1 text-slate-500 hover:bg-red-500/15 hover:text-red-400">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </Section>
  );
};
