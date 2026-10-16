import { useEffect, useState } from "react";
import { composeTag } from "./tag";
import { tileSize } from "./layout";

export function useTagPreviews(items, p) {
  const [urls, setUrls] = useState({});
  const tags = items.filter((it) => it.tag);
  const key = JSON.stringify(tags.map((it) => [it.id, it.front?.url, it.text, it.font, it.color, it.fit, ...tileSize(it, p)]));
  useEffect(() => {
    let alive = true;
    (async () => {
      const out = {};
      for (const it of tags) {
        const [w, h] = tileSize(it, p);
        if (w <= 0 || h <= 0) continue;
        const [f, b] = await Promise.all([composeTag(it, "front", w, h, 120), composeTag(it, "back", w, h, 120)]);
        out[it.id] = { front: f.toDataURL(), back: b.toDataURL() };
      }
      if (alive) setUrls(out);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
}
