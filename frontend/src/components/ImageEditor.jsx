import { useEffect, useState } from "react";
import { toast } from "sonner";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Crop, Sparkles, Eraser, Scissors, RotateCcw, Check } from "lucide-react";
import { Slider } from "./ui/slider";
import { trimImage, removeCheckerboard, enhanceImage, applyEdits } from "../lib/image";

const ADJ0 = { brightness: 0, contrast: 0, saturation: 0 };
const SLIDERS = [["brightness", "Luminosità"], ["contrast", "Contrasto"], ["saturation", "Saturazione"]];

const centered = (aspect, imgAspect) => {
  if (!aspect) return { unit: "%", x: 10, y: 10, width: 80, height: 80 };
  const r = aspect / imgAspect;
  const [w, h] = r > 1 ? [90, 90 / r] : [90 * r, 90];
  return { unit: "%", x: (100 - w) / 2, y: (100 - h) / 2, width: w, height: h };
};

export const ImageEditor = ({ image, aspect, testid, onDone }) => {
  const [work, setWork] = useState(image);
  const [crop, setCrop] = useState(null);
  const [lock, setLock] = useState(true);
  const [adj, setAdj] = useState(ADJ0);
  const [busy, setBusy] = useState(false);
  const imgAspect = work.w / work.h;
  useEffect(() => {
    setCrop((c) => (c && lock ? centered(aspect, work.w / work.h) : c));
  }, [aspect]); // eslint-disable-line react-hooks/exhaustive-deps

  const op = (fn, ok, none) => async () => {
    setBusy(true);
    const t = await fn(work);
    setBusy(false);
    if (!t) return toast.info(none);
    setWork(t);
    setCrop(null);
    toast.success(ok(t));
  };
  const toggleCrop = () => setCrop(crop ? null : centered(lock ? aspect : null, imgAspect));
  const setLockMode = (v) => { setLock(v); setCrop(centered(v ? aspect : null, imgAspect)); };
  const reset = () => { setWork(image.orig || image); setCrop(null); setAdj(ADJ0); };
  const done = async () => {
    const touched = crop || adj.brightness || adj.contrast || adj.saturation;
    if (!touched && work === image) return onDone(image);
    setBusy(true);
    const out = touched ? await applyEdits(work, crop, adj) : work;
    setBusy(false);
    onDone({ ...out, orig: image.orig || image });
  };
  const filter = `brightness(${1 + adj.brightness / 100}) contrast(${1 + adj.contrast / 100}) saturate(${1 + adj.saturation / 100})`;
  const tool = (on) => `flex items-center gap-1 rounded-md border px-2 py-1.5 text-[11px] transition-colors disabled:opacity-40 ${on ? "border-[#E6007E] bg-[#E6007E]/20 text-white" : "border-slate-700 text-slate-300 hover:border-slate-400"}`;

  return (
    <div data-testid={`${testid}-editor`} className="rounded-md border border-[#E6007E]/40 bg-[#0B0F17] p-2.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex max-h-72 items-center justify-center overflow-hidden rounded-sm bg-[repeating-conic-gradient(#1f2937_0_25%,#111827_0_50%)] bg-[length:16px_16px]">
        {crop ? (
          <ReactCrop className="max-h-72" crop={crop} onChange={(_, pc) => setCrop(pc)} aspect={lock ? aspect : undefined} keepSelection ruleOfThirds>
            <img data-testid={`${testid}-editor-img`} src={work.url} alt="" className="block" style={{ filter, maxHeight: "18rem", width: "auto", height: "auto", maxWidth: "100%" }} />
          </ReactCrop>
        ) : (
          <img data-testid={`${testid}-editor-img`} src={work.url} alt="" className="max-h-72 w-auto object-contain" style={{ filter }} />
        )}
      </div>
      <p data-testid={`${testid}-info`} className="mt-1 font-mono text-[9px] text-slate-500">{work.w}×{work.h}px</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button data-testid={`${testid}-crop-toggle`} onClick={toggleCrop} className={tool(!!crop)}><Crop size={12} /> Ritaglia</button>
        <button data-testid={`${testid}-enhance`} disabled={busy} onClick={op(enhanceImage, (t) => `Immagine migliorata (${t.w}×${t.h}px)`, "Impossibile migliorare")} className={tool(false)}><Sparkles size={12} /> Migliora</button>
        <button data-testid={`${testid}-clear-bg`} disabled={busy} onClick={op(removeCheckerboard, () => "Sfondo sostituito con bianco", "Nessuno sfondo a quadretti trovato")} className={tool(false)}><Eraser size={12} /> Sfondo</button>
        <button data-testid={`${testid}-trim`} disabled={busy} onClick={op(trimImage, (t) => `Rifilata: ${t.w}×${t.h}px`, "Nessun bordo da rifilare")} className={tool(false)}><Scissors size={12} /> Rifila</button>
        <button data-testid={`${testid}-reset`} onClick={reset} className={tool(false)}><RotateCcw size={12} /> Originale</button>
      </div>
      {crop && (
        <div className="mt-2 flex gap-1.5">
          <button data-testid={`${testid}-crop-format`} onClick={() => setLockMode(true)} className={tool(lock)}>Come formato</button>
          <button data-testid={`${testid}-crop-free`} onClick={() => setLockMode(false)} className={tool(!lock)}>Libero</button>
        </div>
      )}
      <div className="mt-3 space-y-2.5">
        {SLIDERS.map(([k, label]) => (
          <div key={k} className="grid grid-cols-[78px_1fr_30px] items-center gap-2">
            <span className="text-[10px] text-slate-400">{label}</span>
            <Slider className="edit-slider" data-testid={`${testid}-${k}`} min={-100} max={100} step={1} value={[adj[k]]} onValueChange={([v]) => setAdj((a) => ({ ...a, [k]: v }))} />
            <span className="text-right font-mono text-[10px] text-slate-500">{adj[k]}</span>
          </div>
        ))}
      </div>
      <button data-testid={`${testid}-done`} disabled={busy} onClick={done}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-[#E6007E] py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
        <Check size={14} /> Fine
      </button>
    </div>
  );
};
