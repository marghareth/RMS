"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Download, Users, Heart, Accessibility } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = {
  seniors: { total: 156, byPurok: [
    { purok: "Purok I",   count: 38 },
    { purok: "Purok II",  count: 32 },
    { purok: "Purok III", count: 42 },
    { purok: "Purok IV",  count: 24 },
    { purok: "Purok V",   count: 20 },
  ]},
  pwd: { total: 43, byType: [
    { type: "Visual Impairment",    count: 10 },
    { type: "Hearing Impairment",   count: 8  },
    { type: "Physical Disability",  count: 15 },
    { type: "Intellectual",         count: 5  },
    { type: "Psychosocial",         count: 3  },
    { type: "Other",                count: 2  },
  ], byPurok: [
    { purok: "Purok I",   count: 10 },
    { purok: "Purok II",  count: 9  },
    { purok: "Purok III", count: 12 },
    { purok: "Purok IV",  count: 8  },
    { purok: "Purok V",   count: 4  },
  ]},
  fourPs: { total: 89, households: 24, byPurok: [
    { purok: "Purok I",   count: 22 },
    { purok: "Purok II",  count: 18 },
    { purok: "Purok III", count: 24 },
    { purok: "Purok IV",  count: 16 },
    { purok: "Purok V",   count: 9  },
  ]},
  seniorList: [
    { id: 1,  name: "dela Cruz, Josefa",  age: 72, purok: "Purok I",   sex: "Female" },
    { id: 2,  name: "Santos, Ramon",      age: 68, purok: "Purok II",  sex: "Male"   },
    { id: 3,  name: "Reyes, Natividad",   age: 81, purok: "Purok III", sex: "Female" },
    { id: 4,  name: "Garcia, Domingo",    age: 65, purok: "Purok IV",  sex: "Male"   },
    { id: 5,  name: "Lopez, Milagros",    age: 74, purok: "Purok II",  sex: "Female" },
    { id: 6,  name: "Cruz, Venancio",     age: 79, purok: "Purok III", sex: "Male"   },
  ],
  pwdList: [
    { id: 1, name: "Mendoza, Renato",   disability: "Physical Disability", purok: "Purok I",   sex: "Male"   },
    { id: 2, name: "Flores, Dalisay",   disability: "Visual Impairment",   purok: "Purok II",  sex: "Female" },
    { id: 3, name: "Aquino, Crisanto",  disability: "Hearing Impairment",  purok: "Purok III", sex: "Male"   },
    { id: 4, name: "Ramos, Tessie",     disability: "Intellectual",        purok: "Purok IV",  sex: "Female" },
    { id: 5, name: "Torres, Efren",     disability: "Physical Disability", purok: "Purok I",   sex: "Male"   },
  ],
};

const PUROK_COLORS  = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6"];
const PWD_COLORS    = ["#3B82F6","#0EA5E9","#10B981","#F59E0B","#EF4444","#9CA3AF"];

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-[#E9EAEC] p-5 ${className}`}>
      <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937] mb-4">{title}</p>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E9EAEC] rounded-xl px-3 py-2 shadow-lg text-[11px]">
      <p className="font-bold text-[#1F2937]">{label ?? payload[0]?.name}</p>
      <p className="text-[#3B82F6]">{payload[0]?.value} persons</p>
    </div>
  );
}

type Tab = "seniors" | "pwd" | "fourps";

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function RegistriesReportPage() {
  const router = useRouter();
  const [tab,  setTab]  = useState<Tab>("seniors");
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const [data, setData] = useState<typeof MOCK | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // ── Reset state when `year` changes, during render (not in an effect) ──
  // This is React's documented pattern for "adjusting state when a prop
  // changes" and avoids the react-hooks/set-state-in-effect warning that
  // comes from calling setState synchronously at the top of an effect.
  const [prevYear, setPrevYear] = useState(year);
  if (year !== prevYear) {
    setPrevYear(year);
    setData(null);
    setLoading(true);
    setError(false);
  }

  useEffect(() => {
    let ignore = false;

    fetch(`/api/reports?type=registries&year=${year}`)
      .then(r => r.json())
      .then(json => {
        if (ignore) return;
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        if (ignore) return;
        setError(true);
        setLoading(false);
      });

    return () => { ignore = true; };
  }, [year]);

  // ── Guard: narrows `data` to non-null for everything below ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[13px] text-[#9CA3AF]">
        Loading registries…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-[13px] text-red-500">
        Failed to load registry data. Please try again.
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: any; count: number; color: string; bg: string }[] = [
    { key: "seniors", label: "Senior Citizens", icon: Users,         count: data.seniors.total, color: "text-amber-600", bg: "bg-amber-50"  },
    { key: "pwd",     label: "PWD",             icon: Accessibility, count: data.pwd.total,     color: "text-[#3B82F6]", bg: "bg-blue-50"   },
    { key: "fourps",  label: "4Ps Beneficiaries",icon: Heart,        count: data.fourPs.total,  color: "text-green-600", bg: "bg-green-50"  },
  ];

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/reports")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] transition">
            <ArrowLeft size={18} className="text-[#6B7280]" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <BookOpen size={18} className="text-teal-600" />
            </div>
            <div>
              <h1 className="text-[17px] font-black text-[#1F2937] uppercase tracking-wide">Special Registries</h1>
              <p className="text-[11px] text-[#9CA3AF]">Senior citizens, PWD, and 4Ps per purok</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(e.target.value)}
            className="text-[12px] border border-[#E9EAEC] rounded-xl px-3 py-2 focus:outline-none focus:border-[#3B82F6] bg-white text-[#1F2937]">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {/* Real PDF generation (disabled until API/DB is wired up):
              window.open(`/api/pdf/report/${reportType}?${params}`, "_blank")
              — hits the not-yet-implemented /api/pdf/report/[type] route. */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B82F6] text-white text-[12px] font-bold hover:bg-[#2563EB] transition print:hidden"
          >
            <Download size={13} /> Export PDF
          </button>
        </div>
      </div>

      {/* ── Registry summary cards ── */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-xl border-2 px-5 py-4 text-left transition-all
                ${tab === t.key ? "border-[#3B82F6] bg-[#EFF6FF]" : "border-[#E9EAEC] bg-white hover:border-[#D1D5DB]"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.bg}`}>
                  <Icon size={14} className={t.color} />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wide ${tab === t.key ? "text-[#3B82F6]" : "text-[#9CA3AF]"}`}>{t.label}</span>
              </div>
              <p className={`text-[32px] font-black leading-none ${tab === t.key ? t.color : "text-[#1F2937]"}`}>{t.count}</p>
            </button>
          );
        })}
      </div>

      {/* ── SENIORS TAB ── */}
      {tab === "seniors" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <ChartCard title="Senior Citizens by Purok">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.seniors.byPurok} barSize={28}>
                  <XAxis dataKey="purok" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                    {data.seniors.byPurok.map((_, i) => <Cell key={i} fill={PUROK_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Distribution">
              <div className="space-y-3 pt-2">
                {data.seniors.byPurok.map((p, i) => (
                  <div key={p.purok} className="flex items-center gap-3">
                    <span className="text-[11px] text-[#6B7280] min-w-20">{p.purok}</span>
                    <div className="flex-1 h-2 bg-[#F4F5F7] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(p.count / data.seniors.total) * 100}%`, background: PUROK_COLORS[i] }} />
                    </div>
                    <span className="text-[12px] font-bold text-[#1F2937] min-w-7 text-right">{p.count}</span>
                    <span className="text-[10px] text-[#9CA3AF] min-w-9">{((p.count / data.seniors.total) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* Senior list */}
          <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937]">Senior Citizen Registry (Sample)</p>
            </div>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-5 py-2.5 bg-[#F4F5F7] border-b border-[#E9EAEC]">
              {["Name", "Age", "Purok", "Sex"].map(h => <span key={h} className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">{h}</span>)}
            </div>
            {data.seniorList.map((s, i) => (
              <div key={s.id} className={`grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[#F4F5F7] items-center ${i % 2 !== 0 ? "bg-[#FAFAFA]" : ""}`}>
                <span className="text-[12px] font-semibold text-[#1F2937]">{s.name}</span>
                <span className="text-[12px] text-[#374151]">{s.age}</span>
                <span className="text-[11px] text-[#6B7280]">{s.purok}</span>
                <span className="text-[11px] text-[#6B7280]">{s.sex}</span>
              </div>
            ))}
            <div className="px-5 py-3 text-center">
              <span className="text-[11px] text-[#9CA3AF]">Showing 6 of {data.seniors.total} · Export PDF for full list</span>
            </div>
          </div>
        </div>
      )}

      {/* ── PWD TAB ── */}
      {tab === "pwd" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <ChartCard title="PWD by Disability Type">
              <div className="flex items-center gap-3">
                <ResponsiveContainer width="50%" height={150}>
                  <PieChart>
                    <Pie data={data.pwd.byType} dataKey="count" cx="50%" cy="50%" outerRadius={60} paddingAngle={2}>
                      {data.pwd.byType.map((_, i) => <Cell key={i} fill={PWD_COLORS[i % PWD_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {data.pwd.byType.map((t, i) => (
                    <div key={t.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PWD_COLORS[i % PWD_COLORS.length] }} />
                        <span className="text-[10px] text-[#6B7280]">{t.type}</span>
                      </div>
                      <span className="text-[11px] font-bold text-[#1F2937]">{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
            <ChartCard title="PWD by Purok">
              <div className="space-y-3 pt-2">
                {data.pwd.byPurok.map((p, i) => (
                  <div key={p.purok} className="flex items-center gap-3">
                    <span className="text-[11px] text-[#6B7280] min-w-20">{p.purok}</span>
                    <div className="flex-1 h-2 bg-[#F4F5F7] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(p.count / data.pwd.total) * 100}%`, background: PUROK_COLORS[i] }} />
                    </div>
                    <span className="text-[12px] font-bold text-[#1F2937] min-w-7 text-right">{p.count}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* PWD list */}
          <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E9EAEC] bg-[#F9FAFB]">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937]">PWD Registry (Sample)</p>
            </div>
            <div className="grid grid-cols-[2fr_2fr_1fr_1fr] gap-4 px-5 py-2.5 bg-[#F4F5F7] border-b border-[#E9EAEC]">
              {["Name", "Disability Type", "Purok", "Sex"].map(h => <span key={h} className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">{h}</span>)}
            </div>
            {data.pwdList.map((p, i) => (
              <div key={p.id} className={`grid grid-cols-[2fr_2fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[#F4F5F7] items-center ${i % 2 !== 0 ? "bg-[#FAFAFA]" : ""}`}>
                <span className="text-[12px] font-semibold text-[#1F2937]">{p.name}</span>
                <span className="text-[11px] text-[#6B7280]">{p.disability}</span>
                <span className="text-[11px] text-[#6B7280]">{p.purok}</span>
                <span className="text-[11px] text-[#6B7280]">{p.sex}</span>
              </div>
            ))}
            <div className="px-5 py-3 text-center">
              <span className="text-[11px] text-[#9CA3AF]">Showing 5 of {data.pwd.total} · Export PDF for full list</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 4PS TAB ── */}
      {tab === "fourps" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 mb-2">
            {[
              { label: "Total Beneficiaries", value: data.fourPs.total,      color: "text-green-600" },
              { label: "Registered Households",value: data.fourPs.households, color: "text-[#3B82F6]" },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-[#E9EAEC] px-5 py-4">
                <p className={`text-[30px] font-black leading-none ${c.color}`}>{c.value}</p>
                <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest mt-1">{c.label}</p>
              </div>
            ))}
          </div>

          <ChartCard title="4Ps Beneficiaries by Purok">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.fourPs.byPurok} barSize={32}>
                <XAxis dataKey="purok" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {data.fourPs.byPurok.map((_, i) => <Cell key={i} fill={PUROK_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2.5">
              {data.fourPs.byPurok.map((p, i) => (
                <div key={p.purok} className="flex items-center gap-3">
                  <span className="text-[11px] text-[#6B7280] min-w-20">{p.purok}</span>
                  <div className="flex-1 h-2 bg-[#F4F5F7] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(p.count / data.fourPs.total) * 100}%`, background: PUROK_COLORS[i] }} />
                  </div>
                  <span className="text-[12px] font-bold text-[#1F2937] min-w-7 text-right">{p.count}</span>
                  <span className="text-[10px] text-[#9CA3AF] min-w-9">{((p.count / data.fourPs.total) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  );
}