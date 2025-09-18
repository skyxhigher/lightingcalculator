import React, { useMemo, useState } from "react";

/**
 * Pure pricing engine so it can be unit-tested and reused.
 */
function computeQuote({
  footage,
  kitCosts,
  rateUnder100,
  rateUnder200,
  rate200Plus,
  useLift,
  liftRental,
  liftDays,
  minRule = { enabled: true, thresholdFt: 75, minimum: 2000 },
}) {
  const fmt2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  const f = Math.max(0, Math.min(400, Math.floor(Number(footage) || 0)));

  // Price tier
  let tierRate = rate200Plus;
  let tierLabel = "200 ft+";
  if (f < 100) { tierRate = rateUnder100; tierLabel = "Under 100 ft"; }
  else if (f < 200) { tierRate = rateUnder200; tierLabel = "100–199 ft"; }

  // Choose cheapest kit combo that covers f
  const sizes = Object.keys(kitCosts).map(Number).sort((a,b)=>a-b);
  const maxLen = (sizes[sizes.length-1] || 0) + f;
  const INF = 1e15;
  const dp = Array(maxLen+1).fill(null).map(()=>({ cost: INF, from: -1, kit: -1 }));
  dp[0] = { cost: 0, from: -1, kit: -1 };
  for (let len = 0; len <= maxLen; len++) {
    if (dp[len].cost >= INF) continue;
    for (const s of sizes) {
      const nlen = Math.min(maxLen, len + s);
      const ncost = dp[len].cost + (kitCosts[s] || 0);
      if (ncost < dp[nlen].cost) dp[nlen] = { cost: ncost, from: len, kit: s };
    }
  }
  let bestLen = f;
  for (let len = f; len <= maxLen; len++) if (dp[len].cost < dp[bestLen].cost) bestLen = len;

  const counts = {};
  let cur = bestLen;
  while (cur > 0) {
    const step = dp[cur];
    if (!step || step.kit === -1) break;
    const k = String(step.kit);
    counts[k] = (counts[k] || 0) + 1;
    cur = step.from;
  }

  const materialsCost = dp[bestLen].cost === INF ? 0 : dp[bestLen].cost;
  const totalKitFeet = bestLen || 0;
  const leftover = Math.max(0, totalKitFeet - f);

  // Core revenue + minimum rule
  let coreRevenue = f * tierRate;
  const minApplied = !!(minRule?.enabled && f > 0 && f < (minRule?.thresholdFt ?? 75));
  if (minApplied) coreRevenue = Math.max(coreRevenue, minRule?.minimum ?? 2000);

  const liftTotal = useLift ? (liftRental * liftDays) : 0;
  const customerTotal = coreRevenue + liftTotal; // lift is pass-through

  const depositBase = materialsCost + liftTotal;
  const depositDue = fmt2(depositBase * 1.10);
  const profit = fmt2(coreRevenue - materialsCost); // excludes lift

  return {
    f,
    tierRate,
    tierLabel,
    coreRevenue: fmt2(coreRevenue),
    customerTotal: fmt2(customerTotal),
    materialsCost: fmt2(materialsCost),
    profit,
    depositBase: fmt2(depositBase),
    depositDue,
    liftTotal: fmt2(liftTotal),
    totalKitFeet,
    leftover,
    counts,
    sizes,
    minApplied,
  };
}

export default function PermanentLightingLanding() {
  // ------- Business inputs -------
  const [kitCosts, setKitCosts] = useState({
    100: 1488.24,
    150: 2039.04,
    200: 2514.24,
    400: 4713.12,
  });
  const [rateUnder100, setRateUnder100] = useState(27);
  const [rateUnder200, setRateUnder200] = useState(25);
  const [rate200Plus, setRate200Plus] = useState(23);
  const [liftRental, setLiftRental] = useState(489);
  const [liftDays, setLiftDays] = useState(1);
  const [useLift, setUseLift] = useState(true);

  const [footage, setFootage] = useState(159);
  const [logoOk, setLogoOk] = useState(true);

  const fmt = (n) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

  // Use the pure engine
  const calc = useMemo(() => computeQuote({
    footage,
    kitCosts,
    rateUnder100,
    rateUnder200,
    rate200Plus,
    useLift,
    liftRental,
    liftDays,
    minRule: { enabled: true, thresholdFt: 75, minimum: 2000 },
  }), [footage, kitCosts, rateUnder100, rateUnder200, rate200Plus, useLift, liftRental, liftDays]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-900 via-sky-800 to-sky-900 text-white">
      {/* Header */}
      <header className="shadow-lg">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col md:flex-row items-center gap-6">
          <div className="bg-white p-2 rounded-xl shadow min-h-[6rem] min-w-[6rem] flex items-center justify-center">
            {logoOk ? (
              <img src="/LOGO.png" alt="Clean Defense Force Logo" className="h-24 w-auto" onError={() => setLogoOk(false)} />
            ) : (
              <div className="px-3 py-1 text-sky-900 font-bold">CLEAN DEFENSE FORCE</div>
            )}
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold">Permanent Holiday Lighting</h1>
            <p className="text-sky-100 mt-2">Pricing & kit planner</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="bg-sky-50 text-neutral-900">
        <div className="mx-auto max-w-6xl px-6 py-10 grid md:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="md:col-span-1 space-y-6">
            {/* Calculator */}
            <div className="bg-white rounded-2xl p-6 shadow ring-2 ring-sky-200">
              <h2 className="text-lg font-semibold text-sky-900">Calculator</h2>
              <div className="mt-4">
                <label className="block text-sm font-medium">Customer footage</label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="number"
                    className="w-full rounded-xl border border-sky-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
                    min={0}
                    max={400}
                    value={footage}
                    onChange={(e)=>setFootage(parseInt(e.target.value||"0",10))}
                  />
                  <span className="text-sm text-neutral-500">ft</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={400}
                  value={Math.min(Math.max(footage,0),400)}
                  onChange={(e)=>setFootage(parseInt(e.target.value||"0",10))}
                  className="mt-3 w-full accent-sky-600"
                />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <NumberField label="Rate <100" value={rateUnder100} onChange={setRateUnder100} step={1} min={1} suffix="/ft" />
                <NumberField label="100–199" value={rateUnder200} onChange={setRateUnder200} step={1} min={1} suffix="/ft" />
                <NumberField label="200+" value={rate200Plus} onChange={setRate200Plus} step={1} min={1} suffix="/ft" />
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-neutral-700">Edit kit costs (tax+shipping)</summary>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {Object.keys(kitCosts).map((k)=> (
                    <NumberField key={k} label={`Kit ${k}ft`} value={kitCosts[Number(k)]}
                      onChange={(v)=>setKitCosts(prev=>({...prev,[Number(k)]:v}))} step={0.01} min={0} prefix="$" />
                  ))}
                </div>
              </details>
            </div>

            {/* Lift rental */}
            <div className="bg-white rounded-2xl p-6 shadow ring-2 ring-sky-200">
              <h3 className="text-lg font-semibold text-sky-900">Lift rental</h3>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-neutral-700">Include lift</span>
                <button
                  type="button"
                  onClick={()=>setUseLift(!useLift)}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition ${useLift? 'bg-sky-600':'bg-neutral-300'}`}
                  aria-pressed={useLift}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${useLift? 'translate-x-8':'translate-x-2'}`}></span>
                  <span className="sr-only">Toggle lift</span>
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <NumberField label="Cost/day" value={liftRental} onChange={setLiftRental} step={1} min={0} prefix="$" />
                <NumberField label="Days" value={liftDays} onChange={setLiftDays} step={1} min={1} />
              </div>
              <p className="text-sm text-neutral-600 mt-2">Lift is paid by the customer and included in deposit.</p>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl p-6 shadow ring-2 ring-sky-200 flex gap-3 flex-wrap">
              <button
                className="px-4 py-2 rounded-xl bg-white text-sky-700 ring-1 ring-sky-300 hover:bg-sky-50"
                onClick={()=>{ setFootage(159); setRateUnder100(27); setRateUnder200(25); setRate200Plus(23); setLiftRental(489); setLiftDays(1); setUseLift(true); }}
              >Reset defaults</button>
            </div>
          </div>

          {/* Right column */}
          <div className="md:col-span-2 grid gap-6">
            <div className="bg-white rounded-2xl p-6 shadow ring-2 ring-sky-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-sky-900">Results</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge>{calc.tierLabel}</Badge>
                    {calc.minApplied && <Badge intent="warn">$2,000 minimum applied</Badge>}
                    <Badge intent={useLift? 'ok':'muted'}>Lift: {useLift? `${liftDays} day(s)` : 'Off'}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-neutral-500">Deposit (kits{useLift? ' + lift':''} × 1.10)</div>
                  <div className="text-xl font-bold">{fmt(calc.depositDue)}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <Stat label="Requested footage" value={`${calc.f} ft`} />
                <Stat label="Applied rate" value={`${fmt(calc.tierRate)}/ft`} />
                <Stat label="Core revenue" value={fmt(calc.coreRevenue)} />
                <Stat label="Customer total" value={fmt(calc.customerTotal)} highlight />
                <Stat label="Materials cost" value={fmt(calc.materialsCost)} />
                <Stat label="Profit (excl. lift)" value={fmt(calc.profit)} />
                <Stat label="Total kit footage" value={`${calc.totalKitFeet} ft`} />
                <Stat label="Leftover inventory" value={`${calc.leftover} ft`} />
                <Stat label="Lift total" value={fmt(calc.liftTotal)} />
              </div>
            </div>
          </div>
        </div>
      </main>

      <section className="bg-sky-900 py-10 text-center">
        <div className="bg-white inline-block p-2 rounded-xl shadow min-h-[5.5rem] min-w-[5.5rem] flex items-center justify-center">
          {logoOk ? (
            <img src="/LOGO.png" alt="Clean Defense Force Logo" className="h-20 mx-auto" onError={() => setLogoOk(false)} />
          ) : (
            <div className="px-3 py-1 text-sky-900 font-bold">CLEAN DEFENSE FORCE</div>
          )}
        </div>
        <h2 className="mt-4 text-2xl font-bold">Clean Defense Force</h2>
        <p className="mt-2 text-sky-200">Permanent Holiday Lighting Pricing Calculator</p>
      </section>
    </div>
  );
}

function NumberField({ label, value, onChange, step = 1, min = 0, prefix, suffix }) {
  return (
    <label className="block text-sm text-sky-900">
      <span className="font-medium">{label}</span>
      <div className="mt-2 flex items-center gap-2">
        {prefix ? <span className="text-neutral-500">{prefix}</span> : null}
        <input
          type="number"
          value={value}
          min={min}
          step={step}
          onChange={(e)=> onChange(parseFloat(e.target.value || "0"))}
          className="w-full rounded-xl border border-sky-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
        />
        {suffix ? <span className="text-neutral-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

// Small UI atoms
function Stat({ label, value, highlight }) {
  const cls = highlight ? "border-sky-600 bg-sky-50 text-sky-900" : "border-neutral-200 bg-neutral-50 text-neutral-900";
  return (
    <div className={`rounded-xl p-4 border ${cls}`}>
      <div className="text-neutral-600 text-xs">{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}

function Badge({ children, intent = "ok" }) {
  const styles = {
    ok: "bg-emerald-100 text-emerald-800 border-emerald-300",
    warn: "bg-amber-100 text-amber-800 border-amber-300",
    muted: "bg-neutral-100 text-neutral-700 border-neutral-300",
  };
  const cls = styles[intent] || styles.ok;
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>{children}</span>;
}
