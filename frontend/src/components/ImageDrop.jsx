import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";

export const ImageDrop = ({ label, image, onChange, testid, accent }) => {
  const ref = useRef(null);
  const handle = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => onChange({ file, url, w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  };
  return (
    <div
      data-testid={`${testid}-dropzone`}
      onClick={() => ref.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); handle(e.dataTransfer.files[0]); }}
      className="drop group relative flex h-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-700 bg-[#0B0F17] transition-colors duration-200 hover:border-slate-400"
    >
      <input ref={ref} type="file" accept="image/*" hidden data-testid={`${testid}-input`}
        onChange={(e) => { handle(e.target.files[0]); e.target.value = ""; }} />
      <span className="absolute left-2 top-2 z-10 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-white" style={{ background: accent }}>
        {label}
      </span>
      {image ? (
        <>
          <img src={image.url} alt={label} className="h-full w-full object-contain p-2" />
          <span data-testid={`${testid}-info`} className="absolute bottom-1.5 left-2 font-mono text-[10px] text-slate-400">{image.w}×{image.h}px</span>
          <button
            data-testid={`${testid}-remove`}
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="absolute right-2 top-2 rounded-sm bg-black/60 p-1 text-slate-300 transition-colors hover:bg-red-500 hover:text-white"
          >
            <X size={14} />
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-1.5 text-slate-500 transition-colors group-hover:text-slate-300">
          <ImagePlus size={22} strokeWidth={1.5} />
          <span className="text-xs">Trascina o clicca</span>
        </div>
      )}
    </div>
  );
};
