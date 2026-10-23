import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, X, Crop, Undo2, Eraser, Sparkles } from "lucide-react";
import { loadForPrint, trimImage, hasCheckerboard, removeCheckerboard, enhanceImage } from "../lib/image";

export const ImageDrop = ({ label, image, onChange, testid, accent }) => {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const handle = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const img = await loadForPrint(file);
    if (img.op === "bg") toast.success("Sfondo a quadretti/trasparente sostituito con bianco");
    onChange(img);
  };
  const run = (op, fn, okMsg, noneMsg) => async (e) => {
    e.stopPropagation();
    if (image.op === op) return onChange(image.prev);
    setBusy(true);
    const t = await fn(image);
    setBusy(false);
    if (!t) return toast.info(noneMsg);
    onChange({ ...t, prev: image, op });
    toast.success(okMsg(t));
  };
  const trim = run("trim", trimImage, (t) => `Rifilata: ${image.w}×${image.h} → ${t.w}×${t.h}px`, "Nessun bordo da rifilare");
  const clearBg = run("bg", removeCheckerboard, () => "Sfondo sostituito con bianco", "Nessuno sfondo a quadretti trovato");
  const enhance = run("enh", enhanceImage, (t) => `Immagine migliorata (${t.w}×${t.h}px)`, "Impossibile migliorare");
  const btn = (on) => `rounded-sm p-1 transition-colors ${on ? "bg-[#E6007E] text-white" : "bg-black/60 text-slate-300 hover:bg-[#E6007E] hover:text-white"}`;
  return (
    <div
      data-testid={`${testid}-dropzone`}
      onClick={() => ref.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); handle(e.dataTransfer.files[0]); }}
      className="group relative flex h-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-700 bg-[#0B0F17] transition-colors duration-200 hover:border-slate-400"
    >
      <input ref={ref} type="file" accept="image/*" hidden data-testid={`${testid}-input`}
        onChange={(e) => { handle(e.target.files[0]); e.target.value = ""; }} />
      <span className="absolute left-1.5 top-1.5 z-10 rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest text-white" style={{ background: accent }}>
        {label}
      </span>
      {image ? (
        <>
          <img src={image.url} alt={label} className="h-full w-full object-contain p-2 pb-5" />
          <span data-testid={`${testid}-info`} className="absolute bottom-1 left-2 font-mono text-[9px] text-slate-400">{image.w}×{image.h}px</span>
          <div className="absolute right-1.5 top-1.5 z-10 flex gap-1">
            <button data-testid={`${testid}-enhance`} onClick={enhance} disabled={busy}
              title={image.op === "enh" ? "Annulla miglioramento" : "Migliora immagine (nitidezza, contrasto, colori)"} className={btn(image.op === "enh")}>
              {image.op === "enh" ? <Undo2 size={13} /> : <Sparkles size={13} />}
            </button>
            <button data-testid={`${testid}-clear-bg`} onClick={clearBg} disabled={busy}
              title={image.op === "bg" ? "Ripristina sfondo" : "Rimuovi sfondo a quadretti"} className={btn(image.op === "bg")}>
              {image.op === "bg" ? <Undo2 size={13} /> : <Eraser size={13} />}
            </button>
            <button data-testid={`${testid}-trim`} onClick={trim} disabled={busy}
              title={image.op === "trim" ? "Annulla rifilatura" : "Rifila bordi"} className={btn(image.op === "trim")}>
              {image.op === "trim" ? <Undo2 size={13} /> : <Crop size={13} />}
            </button>
            <button data-testid={`${testid}-remove`} onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="rounded-sm bg-black/60 p-1 text-slate-300 transition-colors hover:bg-red-500 hover:text-white">
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
