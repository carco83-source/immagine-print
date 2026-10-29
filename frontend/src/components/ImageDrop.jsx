import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, X, Pencil, RefreshCw } from "lucide-react";
import { loadForPrint } from "../lib/image";
import { ImageEditor } from "./ImageEditor";

export const ImageDrop = ({ label, image, onChange, testid, accent, aspect, preview }) => {
  const ref = useRef(null);
  const [editing, setEditing] = useState(false);
  const handle = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const img = await loadForPrint(file);
    if (img.op === "bg") toast.success("Sfondo a quadretti/trasparente sostituito con bianco");
    onChange(img);
  };
  const btn = "rounded-md bg-black/70 p-2 text-slate-200 transition-colors hover:bg-[#E6007E] hover:text-white";
  const badge = (
    <span className="absolute left-1.5 top-1.5 z-10 rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest text-white" style={{ background: accent }}>
      {label}
    </span>
  );
  const input = (
    <input ref={ref} type="file" accept="image/*" hidden data-testid={`${testid}-input`}
      onChange={(e) => { handle(e.target.files[0]); e.target.value = ""; }} />
  );

  if (image && editing)
    return (
      <div className="relative col-span-full">
        {input}
        <ImageEditor image={image} aspect={aspect} testid={testid}
          onDone={(img) => { onChange(img); setEditing(false); }} />
      </div>
    );

  return (
    <div
      data-testid={`${testid}-dropzone`}
      onClick={() => !image && ref.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); handle(e.dataTransfer.files[0]); }}
      className={`group relative flex ${image ? "h-60 cursor-default" : "h-28 cursor-pointer"} flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-700 bg-[#0B0F17] transition-colors duration-200 hover:border-slate-400`}
    >
      {input}
      {badge}
      {image ? (
        <>
          <div data-testid={`${testid}-mini-preview`} className="flex h-full w-full items-center justify-center p-2 pb-4 pt-10">{preview}</div>
          <span data-testid={`${testid}-info`} className="absolute bottom-1 left-0 right-0 truncate text-center font-mono text-[9px] text-slate-500">{image.w}×{image.h}px</span>
          <div className="absolute right-1.5 top-1.5 z-10 flex gap-1">
            <button data-testid={`${testid}-edit`} onClick={() => setEditing(true)} title="Modifica (ritaglia, colori, contrasto)"
              className="flex items-center gap-1 rounded-md bg-[#E6007E]/90 px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-[#E6007E]"><Pencil size={12} /> Modifica</button>
            <button data-testid={`${testid}-replace`} onClick={() => ref.current?.click()} title="Sostituisci immagine" className={btn}><RefreshCw size={13} /></button>
            <button data-testid={`${testid}-remove`} onClick={() => onChange(null)} title="Rimuovi" className="rounded-md bg-black/70 p-2 text-slate-200 transition-colors hover:bg-red-500 hover:text-white">
              <X size={13} />
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-1 text-slate-500 transition-colors group-hover:text-slate-300">
          <ImagePlus size={20} strokeWidth={1.5} />
          <span className="text-[11px]">Trascina o clicca</span>
        </div>
      )}
    </div>
  );
};
