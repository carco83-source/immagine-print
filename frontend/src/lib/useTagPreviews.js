import { useEffect, useState } from "react";
import { composeSide, isComposed } from "./deco";
import { tileSize } from "./layout";

export function useTagPreviews(items, p) {
  const [urls, setUrls] = useState({});
  const list = items.filter(isComposed);
  const key = JSON.stringify(list.map((it) => [it.id, it.front?.url, it.back?.url, it.tag, it.frontTxt, it.backTxt, it.deco, it.fit, ...tileSize(it, p)]));
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const out = {};
      for (const it of list) {
        const [w, h] = tileSize(it, p);
        if (w <= 0 || h <= 0) continue;
        const [f, b] = await Promise.all([composeSide(it, "front", w, h, 120), composeSide(it, "back", w, h, 120)]);
        out[it.id] = { front: f.toDataURL(), back: b.toDataURL() };
      }
      if (alive) setUrls(out);
    }, 120);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
}
