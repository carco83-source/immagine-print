import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FolderOpen, Trash2, ImageIcon } from "lucide-react";
import { Section } from "./Field";
import { listWorks, deleteWork } from "../lib/db";

export const Works = ({ version, onOpen }) => {
  const [list, setList] = useState([]);
  const refresh = () => listWorks().then((l) => setList(l.reverse())).catch(() => setList([]));
  useEffect(() => { refresh(); }, [version]);
  const del = async (w) => {
    if (!window.confirm(`Eliminare il lavoro "${w.name}"?`)) return;
    await deleteWork(w.id);
    toast.success(`Lavoro "${w.name}" eliminato`);
    refresh();
  };
  return (
    <Section n={5} title="Lavori salvati">
      {!list.length && <p data-testid="works-empty" className="text-xs text-slate-500">Nessun lavoro salvato. Premi «Salva» in basso per conservare il lavoro attuale.</p>}
      <div className="space-y-2">
        {list.map((w) => (
          <div key={w.id} data-testid={`work-${w.id}`} className="flex items-center gap-3 rounded-md border border-slate-800 bg-[#0F1520] p-2">
            {w.thumb ? <img src={w.thumb} alt="" className="h-10 w-10 shrink-0 rounded-sm object-cover" />
              : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-slate-800 text-slate-500"><ImageIcon size={14} /></div>}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-slate-100">{w.name}</p>
              <p className="font-mono text-[10px] text-slate-500">{w.items.length} immagin{w.items.length === 1 ? "e" : "i"} · {w.p.sheet} · {new Date(w.created).toLocaleDateString("it-IT")}</p>
            </div>
            <button data-testid={`work-${w.id}-open`} onClick={() => onOpen(w)}
              className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1.5 text-[11px] text-slate-200 transition-colors hover:border-[#FFD100]">
              <FolderOpen size={12} /> Apri
            </button>
            <button data-testid={`work-${w.id}-delete`} onClick={() => del(w)} className="rounded-sm p-1 text-slate-500 hover:bg-red-500/15 hover:text-red-400">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </Section>
  );
};
