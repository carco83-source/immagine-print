export const Section = ({ n, title, children, right }) => (
  <section className="border-b border-slate-800 px-6 py-6">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-baseline gap-2.5 text-sm font-semibold tracking-tight text-slate-100">
        <span className="font-mono text-[11px] text-[#00A8E8]">{String(n).padStart(2, "0")}</span>
        {title}
      </h2>
      {right}
    </div>
    {children}
  </section>
);

export const NumField = ({ label, value, onChange, testid, step = 0.1, min = 0, unit = "cm" }) => (
  <label className="block">
    <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
    <div className="flex items-center rounded-md border border-slate-700 bg-[#0B0F17] transition-colors focus-within:border-[#00A8E8]">
      <input
        type="number"
        data-testid={testid}
        value={Number.isNaN(value) ? "" : value}
        step={step}
        min={min}
        onChange={(e) => onChange(e.target.value === "" ? NaN : parseFloat(e.target.value))}
        className="w-full bg-transparent px-3 py-2 font-mono text-sm text-slate-100 outline-none"
      />
      {unit && <span className="pr-3 font-mono text-[11px] text-slate-500">{unit}</span>}
    </div>
  </label>
);

export const Segmented = ({ options, value, onChange, testid }) => (
  <div className="grid gap-1 rounded-md border border-slate-800 bg-[#0B0F17] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
    {options.map((o) => (
      <button
        key={o.value}
        data-testid={`${testid}-${o.value}`}
        onClick={() => onChange(o.value)}
        className={`rounded-[4px] px-2 py-2 text-xs font-medium transition-colors duration-150 ${
          value === o.value ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
        }`}
      >
        {o.label}
        {o.sub && <span className={`block font-mono text-[9px] ${value === o.value ? "text-slate-500" : "text-slate-600"}`}>{o.sub}</span>}
      </button>
    ))}
  </div>
);

export const FitSelect = ({ testid, value, onChange }) => (
  <div className="mt-3">
    <Segmented testid={testid} value={value} onChange={onChange}
      options={[{ value: "cover", label: "Riempi" }, { value: "contain", label: "Adatta" }, { value: "stretch", label: "Deforma" }]} />
  </div>
);
