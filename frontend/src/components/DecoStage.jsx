import { useEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import { composeSide } from "../lib/deco";

const H = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const POS = { nw: [0, 0], n: [50, 0], ne: [100, 0], e: [100, 50], se: [100, 100], s: [50, 100], sw: [0, 100], w: [0, 50] };
const CUR = { nw: "nwse", se: "nwse", ne: "nesw", sw: "nesw", n: "ns", s: "ns", e: "ew", w: "ew" };
const MIN = 3;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function resize(mode, o, dx, dy, W, Hh) {
  const { x, y, w, h } = o;
  if (mode === "move") return { x: clamp(x + dx, -w + 15, 85), y: clamp(y + dy, -h + 15, 85) };
  if (mode.length === 2) {
    const sx = mode.includes("e") ? 1 : -1, sy = mode.includes("s") ? 1 : -1;
    const k = Math.max(MIN / Math.min(w, h), ((w + sx * dx) * W) / (w * W), ((h + sy * dy) * Hh) / (h * Hh));
    const nw = w * k, nh = h * k;
    return { w: nw, h: nh, x: sx < 0 ? x + w - nw : x, y: sy < 0 ? y + h - nh : y };
  }
  if (mode === "e") return { w: Math.max(MIN, w + dx) };
  if (mode === "s") return { h: Math.max(MIN, h + dy) };
  if (mode === "w") { const nw = Math.max(MIN, w - dx); return { w: nw, x: x + w - nw }; }
  const nh = Math.max(MIN, h - dy);
  return { h: nh, y: y + h - nh };
}

// Single-tile canvas where layers are moved and resized with mouse or finger.
export const DecoStage = ({ item, side, wcm, hcm, layers, sel, onSelect, onChange, testid }) => {
  const ref = useRef(null);
  const drag = useRef(null);
  const [url, setUrl] = useState(null);
  const key = JSON.stringify([item.front?.url, item.back?.url, item.fit, item.tag, item.frontTxt, item.backTxt, item.deco, wcm, hcm, side]);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      if (wcm <= 0 || hcm <= 0) return;
      const cv = await composeSide(item, side, wcm, hcm, Math.min(200, (700 * 2.54) / wcm));
      if (alive) setUrl(cv.toDataURL());
    }, 40);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const move = (e) => {
      const d = drag.current;
      if (!d) return;
      const r = ref.current.getBoundingClientRect();
      if (d.mode === "rot") {
        const cx = r.left + ((d.o.x + d.o.w / 2) / 100) * r.width, cy = r.top + ((d.o.y + d.o.h / 2) / 100) * r.height;
        let a = Math.round((Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90);
        if (a > 180) a -= 360;
        const snap = Math.round(a / 45) * 45;
        onChange(d.id, { rot: Math.abs(a - snap) <= 4 ? snap : a });
        return;
      }
      let px = e.clientX - d.px, py = e.clientY - d.py;
      if (d.mode !== "move" && d.rot) {
        const t = (-d.rot * Math.PI) / 180;
        [px, py] = [px * Math.cos(t) - py * Math.sin(t), px * Math.sin(t) + py * Math.cos(t)];
      }
      const dx = (px / r.width) * 100, dy = (py / r.height) * 100;
      const patch = resize(d.mode, d.o, dx, dy, r.width, r.height);
      onChange(d.id, Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, Math.round(v * 10) / 10])));
    };
    const up = () => { drag.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [onChange]);

  const start = (e, l, mode) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(l.id);
    drag.current = { id: l.id, mode, rot: l.rot || 0, px: e.clientX, py: e.clientY, o: { x: l.x, y: l.y, w: l.w, h: l.h } };
  };

  return (
    <div ref={ref} data-testid={testid} onPointerDown={() => onSelect(null)}
      className="relative mx-auto my-3 touch-none select-none rounded-sm bg-white shadow-[0_0_0_1px_#334155]"
      style={{ aspectRatio: `${wcm} / ${hcm}`, width: `min(100%, ${Math.round((320 * wcm) / hcm)}px)` }}>
      {url && <img src={url} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full" />}
      {layers.map((l, k) => {
        const on = sel === l.id;
        return (
          <div key={l.id} data-testid={`${testid}-box-${k}`} onPointerDown={(e) => start(e, l, "move")}
            className={`absolute cursor-move ${on ? "z-10 outline outline-2 outline-[#00A8E8]" : "outline-dashed outline-1 outline-[#00A8E8]/60 hover:outline-[#00A8E8]"}`}
            style={{ left: `${l.x}%`, top: `${l.y}%`, width: `${l.w}%`, height: `${l.h}%`, transform: `rotate(${l.rot || 0}deg)` }}>
            {!on && <span className="absolute -left-px -top-4 rounded-sm bg-[#00A8E8]/80 px-1 font-mono text-[9px] text-white">{k + 1}</span>}
            {on && (
              <>
                <span className="pointer-events-none absolute left-1/2 top-0 h-6 w-px -translate-y-full bg-[#00A8E8]" />
                <span data-testid={`${testid}-box-${k}-rot`} onPointerDown={(e) => start(e, l, "rot")} title="Ruota"
                  className="absolute left-1/2 top-0 flex h-5 w-5 -translate-x-1/2 -translate-y-[38px] cursor-grab items-center justify-center rounded-full border border-[#00A8E8] bg-[#0B0F17] text-[#00A8E8] before:absolute before:-inset-2 before:content-['']">
                  <RotateCw size={11} />
                </span>
                {!!l.rot && <span className="pointer-events-none absolute left-1/2 top-0 -translate-y-[60px] translate-x-3 rounded-sm bg-[#00A8E8] px-1 font-mono text-[9px] text-white">{l.rot}°</span>}
              </>
            )}
            {on && H.map((m) => (
              <span key={m} data-testid={`${testid}-box-${k}-${m}`} onPointerDown={(e) => start(e, l, m)}
                className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 border border-[#00A8E8] before:absolute before:-inset-2 before:content-[''] ${m.length === 2 ? "rounded-full bg-white" : "rounded-[2px] bg-[#00A8E8]"}`}
                style={{ left: `${POS[m][0]}%`, top: `${POS[m][1]}%`, cursor: `${CUR[m]}-resize` }} />
            ))}
          </div>
        );
      })}
    </div>
  );
};
