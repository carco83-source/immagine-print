const open = () =>
  new Promise((res, rej) => {
    const r = indexedDB.open("impagina", 2);
    r.onupgradeneeded = () => {
      const names = r.result.objectStoreNames;
      if (!names.contains("templates")) r.result.createObjectStore("templates", { keyPath: "id", autoIncrement: true });
      if (!names.contains("fonts")) r.result.createObjectStore("fonts", { keyPath: "name" });
      if (!names.contains("works")) r.result.createObjectStore("works", { keyPath: "id", autoIncrement: true });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });

const run = async (store, mode, fn) => {
  const db = await open();
  return new Promise((res, rej) => {
    const req = fn(db.transaction(store, mode).objectStore(store));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
};

export const listTemplates = () => run("templates", "readonly", (s) => s.getAll());
export const saveTemplate = (tpl) => run("templates", "readwrite", (s) => s.add(tpl));
export const deleteTemplate = (id) => run("templates", "readwrite", (s) => s.delete(id));
export const saveFont = (name, blob) => run("fonts", "readwrite", (s) => s.put({ name, blob }));
export const getFont = (name) => run("fonts", "readonly", (s) => s.get(name));
export const listWorks = () => run("works", "readonly", (s) => s.getAll());
export const saveWork = (w) => run("works", "readwrite", (s) => s.add(w));
export const deleteWork = (id) => run("works", "readwrite", (s) => s.delete(id));
