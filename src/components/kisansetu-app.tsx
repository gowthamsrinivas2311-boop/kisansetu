"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { IconArrowLeft, IconBuildingStore, IconCalculator, IconChartBar, IconChevronRight, IconCircleCheck, IconHome, IconLogout, IconMapPin, IconMessage, IconMinus, IconPlant2, IconPlus, IconSend, IconSparkles, IconTrendingDown, IconTrendingUp, IconUserCircle } from "@tabler/icons-react";
import { CROPS } from "@/lib/demo-data";
import { getTranslation, AppLanguage } from "@/lib/i18n";
import type { Language, Listing, PriceSnapshot } from "@/lib/types";
import { createContext, useContext } from "react";
const LanguageContext = createContext<AppLanguage>("english");
const useT = () => getTranslation(useContext(LanguageContext));


type View = "home" | "prices" | "market" | "sms" | "calculator" | "advisor" | "profile";
type Chat = { role: "user" | "assistant"; content: string };
type Profile = { name: string; village: string; taluka: string; district: string; preferred_language: Language };

const money = (amount: number) => `Rs ${Math.round(amount || 0).toLocaleString("en-IN")}`;
const cropLooks: Record<string, { mark: string; bg: string; fg: string; line: string }> = {
  Onion: { mark: "ON", bg: "#f7ede2", fg: "#8a4b19", line: "#c9792d" },
  Tomato: { mark: "TO", bg: "#fde8e7", fg: "#b42318", line: "#e5483f" },
  Wheat: { mark: "WH", bg: "#fff2cc", fg: "#8a6200", line: "#d49b16" },
  Cotton: { mark: "CT", bg: "#eaf2ff", fg: "#2457a6", line: "#5b8def" },
  Soybean: { mark: "SO", bg: "#eaf7df", fg: "#357a28", line: "#70ad47" },
  Potato: { mark: "PO", bg: "#f0eadf", fg: "#6e5132", line: "#9a734c" },
};

const buyerDemand = [
  { buyer: "Sahyadri Fresh Foods", crop: "Tomato", quantity: "60 qtl", offer: 3180, location: "Pune collection centre" },
  { buyer: "Deccan Agro Traders", crop: "Onion", quantity: "100 qtl", offer: 4050, location: "Nashik APMC" },
  { buyer: "Vidarbha Cotton Co-op", crop: "Cotton", quantity: "80 qtl", offer: 7420, location: "Nagpur APMC" },
];

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-[#dbe3d5] bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${className}`}>{children}</section>;
}

function CropBadge({ crop, size = "normal" }: { crop: string; size?: "normal" | "small" }) {
  const look = cropLooks[crop] ?? { mark: crop.slice(0, 2).toUpperCase(), bg: "#ecf7ee", fg: "#26733b", line: "#4b9b5a" };
  const dimensions = size === "small" ? "h-8 w-8 text-[10px]" : "h-12 w-12 text-xs";
  return <span className={`relative flex ${dimensions} shrink-0 items-center justify-center overflow-hidden rounded-lg font-bold`} style={{ background: look.bg, color: look.fg }}><span className="absolute -bottom-2 h-6 w-10 rounded-[50%] opacity-20" style={{ background: look.line }} /><span className="relative">{look.mark}</span><span className="sr-only">{crop}</span></span>;
}

function Trend({ value }: { value: number }) {
  if (value === 0) return <span className="inline-flex items-center gap-1 text-xs font-medium text-[#7a8178]"><IconMinus size={15} />0.0%</span>;
  const up = value > 0;
  return <span className={`inline-flex items-center gap-1 text-xs font-medium ${up ? "text-[#19733d]" : "text-[#b42318]"}`}>{up ? <IconTrendingUp size={15} /> : <IconTrendingDown size={15} />}{Math.abs(value).toFixed(1)}%</span>;
}

function Sparkline({ item }: { item: PriceSnapshot }) {
  const look = cropLooks[item.crop] ?? cropLooks.Onion;
  const seed = item.crop.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const values = Array.from({ length: 7 }, (_, index) => item.price * (1 + Math.sin(seed + index) * 0.018 + (item.trend / 100) * ((index - 3) / 7)));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const points = values.map((value, index) => `${(index / 6) * 100},${34 - ((value - min) / spread) * 28}`).join(" ");
  return <svg aria-label={`${item.crop} 7 day trend`} viewBox="0 0 100 38" className="h-10 w-full overflow-visible"><polyline fill="none" stroke={look.line} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} /><line x1="0" y1="36" x2="100" y2="36" stroke="#e8eee6" strokeWidth="1" /></svg>;
}

function PriceCard({ item }: { item: PriceSnapshot }) { const t = useT();
  return <Panel><div className="flex items-start gap-3"><CropBadge crop={item.crop} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#18251b]">{item.crop}</p><p className="mt-1 truncate text-xs text-[#6d7b70]">{item.market}</p></div><Trend value={item.trend} /></div><div className="mt-4"><p className="text-[11px] uppercase tracking-[0.08em] text-[#7a857b]">{t("per_quintal")}</p><p className="mt-1 font-mono text-3xl font-bold tabular-nums text-[#102016]">{money(item.price)}</p></div><div className="mt-2"><Sparkline item={item} /></div></Panel>;
}

export function KisanSetuApp() {
  const [view, setView] = useState<View>("home");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [prices, setPrices] = useState<PriceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem("kisansetu-profile");
    if (saved) setProfile(JSON.parse(saved) as Profile);
    setProfileReady(true);
  }, []);

  useEffect(() => { fetch("/api/prices").then((r) => r.json()).then((rows) => setPrices(toCropPrices(Array.isArray(rows) ? rows : []))).catch(() => undefined).finally(() => setLoading(false)); }, []);

  const leader = useMemo(() => [...prices].sort((a, b) => b.trend - a.trend)[0], [prices]);
  const language = profile?.preferred_language ?? "english"; const t = getTranslation(language);

  if (!profileReady) return <main className="flex min-h-screen items-center justify-center bg-[#f5f2ea] text-sm text-[#536155]">{getTranslation("english")("opening")}</main>;
  if (!profile) return <Landing onLogin={setProfile} />;

  return <LanguageContext.Provider value={language}><main className="min-h-screen bg-[#f5f2ea] text-[#18251b]">
    <div className="h-1.5 bg-[#16351f]" aria-hidden="true" />
    <div className="mx-auto flex min-h-[calc(100vh-6px)] w-full max-w-[1440px] lg:px-6">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-[#d7decf] bg-[#fcfbf7] px-4 py-5 lg:block">
        <Brand />
        <nav className="mt-8 space-y-2">{(["home", "prices", "market", "sms"] as View[]).map((item) => <SideNav key={item} view={item} active={view === item} onClick={() => setView(item)} />)}</nav>
      </aside>
      <div className="min-w-0 flex-1 pb-24 lg:pb-10">
        <Header profile={profile} setView={setView} />
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
          {view === "home" && <Home prices={prices} loading={loading} leader={leader} go={setView} />}
          {view === "prices" && <Prices prices={prices} loading={loading} />}
          {view === "market" && <Market />}
          {view === "sms" && <Sms prices={prices} />}
          {view === "calculator" && <Calculator prices={prices} onBack={() => setView("home")} />}
          {view === "advisor" && <Advisor prices={prices} language={language} onBack={() => setView("home")} />}
          {view === "profile" && <ProfileScreen profile={profile} onSave={setProfile} onLogout={() => { window.localStorage.removeItem("kisansetu-profile"); setProfile(null); setView("home"); }} />}
        </div>
      </div>
    </div>
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#cbd8ca] bg-white lg:hidden"><div className="mx-auto grid max-w-xl grid-cols-4"><Nav label={t("home")} active={view === "home"} icon={<IconHome size={20} />} onClick={() => setView("home")} /><Nav label={t("prices")} active={view === "prices"} icon={<IconChartBar size={20} />} onClick={() => setView("prices")} /><Nav label={t("market")} active={view === "market"} icon={<IconBuildingStore size={20} />} onClick={() => setView("market")} /><Nav label={t("sms")} active={view === "sms"} icon={<IconMessage size={20} />} onClick={() => setView("sms")} /></div></nav>
  </main></LanguageContext.Provider>;
}

function Brand() { const t = useT(); return <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1f6b38] text-white"><IconPlant2 size={19} /></span><div><p className="text-sm font-bold">{t("app_name")}</p><p className="text-[11px] text-[#72806f]">{t("app_desc")}</p></div></div>; }
function Header({ profile, setView }: { profile: Profile; setView: (view: View) => void }) { const t = useT(); const location = [profile.village, profile.taluka, profile.district].filter(Boolean).join(", ") || t("set_location"); return <header className="border-b border-[#d7decf] bg-[#fcfbf7]"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"><div className="lg:hidden"><Brand /></div><div className="hidden lg:block"><p className="text-xs text-[#72806f]">{t("good_morning")}</p><h1 className="text-2xl font-semibold">{profile.name}</h1><p className="mt-1 flex items-center gap-1 text-sm text-[#61705f]"><IconMapPin size={15} />{location}</p></div><button onClick={() => setView("profile")} className="flex items-center gap-2 rounded-full border border-[#d7decf] bg-white p-1 pr-3 text-sm transition hover:border-[#d49b16] hover:shadow-sm"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f4e7] text-[#1f6b38]"><IconUserCircle size={24} /></span><span className="hidden sm:inline">{t("account")}</span></button></div><div className="px-4 pb-4 sm:px-6 lg:hidden"><p className="text-xs text-[#72806f]">{t("good_morning")}</p><h1 className="text-xl font-semibold">{profile.name}</h1><p className="mt-1 flex items-center gap-1 text-xs text-[#61705f]"><IconMapPin size={14} />{location}</p></div></header>; }
function Nav({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) { return <button onClick={onClick} className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] ${active ? "text-[#1f6b38]" : "text-[#7a857b]"}`}>{icon}<span className={active ? "font-medium" : ""}>{label}</span></button>; }
function SideNav({ view, active, onClick }: { view: View; active: boolean; onClick: () => void }) { const t = useT(); const icons = { home: <IconHome size={19} />, prices: <IconChartBar size={19} />, market: <IconBuildingStore size={19} />, sms: <IconMessage size={19} /> } as Record<string, React.ReactNode>; return <button onClick={onClick} className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium capitalize transition ${active ? "bg-[#1f6b38] text-white shadow-sm" : "text-[#59665b] hover:bg-[#eef3ea]"}`}>{icons[view]}{t(view as keyof typeof t)}</button>; }
function Title({ title, detail, back }: { title: string; detail: string; back?: () => void }) { return <div className="mb-4 flex items-start gap-3">{back && <button aria-label="Back" onClick={back} className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-[#cbd8ca] bg-white"><IconArrowLeft size={18} /></button>}<div><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-xs text-[#6d7b70]">{detail}</p></div></div>; }

function Landing({ onLogin }: { onLogin: (profile: Profile) => void }) { const t = getTranslation("english"); const [name, setName] = useState(""); function submit(event: FormEvent) { event.preventDefault(); const profile = { name: name.trim(), village: "", taluka: "", district: "", preferred_language: "english" as Language }; window.localStorage.setItem("kisansetu-profile", JSON.stringify(profile)); onLogin(profile); } return <main className="min-h-screen bg-[#f5f2ea] text-[#18251b]"><div className="h-1.5 bg-[#16351f]" /><section className="mx-auto grid min-h-[calc(100vh-6px)] max-w-6xl items-center gap-8 px-5 py-10 lg:grid-cols-[1fr_0.9fr]"><div><Brand /><h1 className="mt-10 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">{t("landing_title")}</h1><p className="mt-4 max-w-xl text-base leading-7 text-[#59665b]">{t("landing_subtitle")}</p><form onSubmit={submit} className="mt-8 max-w-sm space-y-3"><Field label={t("your_name")}><input required value={name} onChange={(event) => setName(event.target.value)} placeholder={t("name_placeholder")} /></Field><button className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1f6b38] px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#18562e]"><IconUserCircle size={20} />{t("continue")}</button></form></div><div className="rounded-lg border border-[#d7decf] bg-[#fcfbf7] p-4 shadow-lg"><PriceCard item={{ crop: "Onion", market: "Nashik APMC", price: 4043, unit: "quintal", date: "", source: "", previousPrice: 3980, trend: 1.6 }} /><div className="mt-3 rounded-lg bg-[#fff6db] p-4 text-sm text-[#765313]"><IconSparkles size={18} className="mb-2" />{t("no_login_needed")}</div></div></section></main>; }

function ProfileScreen({ profile, onSave, onLogout }: { profile: Profile; onSave: (profile: Profile) => void; onLogout: () => void }) { const t = useT(); const [form, setForm] = useState(profile); const [saved, setSaved] = useState(false); function save(event: FormEvent) { event.preventDefault(); window.localStorage.setItem("kisansetu-profile", JSON.stringify(form)); onSave(form); setSaved(true); } return <div className="max-w-2xl"><Title title={t("profile")} detail={t("manage_prof")} /><Panel><form onSubmit={save} className="space-y-4"><div className="flex items-center gap-3"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f4e7] text-[#1f6b38]"><IconUserCircle size={36} /></span><div><p className="text-sm font-semibold">{profile.name}</p><p className="text-xs text-[#6d7b70]">{t("proto_prof")}</p></div></div><Field label={t("name")}><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><div className="grid gap-3 sm:grid-cols-3"><Field label={t("village")}><input value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} /></Field><Field label={t("taluka")}><input value={form.taluka} onChange={(e) => setForm({ ...form, taluka: e.target.value })} /></Field><Field label={t("district")}><input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></Field></div><Field label={t("language")}><LanguageSelect value={form.preferred_language} onChange={(preferred_language) => setForm({ ...form, preferred_language })} /></Field><div className="flex flex-wrap gap-2"><button className="h-10 rounded-lg bg-[#1f6b38] px-4 text-sm font-semibold text-white">{t("save_prof")}</button><button type="button" onClick={onLogout} className="flex h-10 items-center gap-2 rounded-lg border border-[#d7decf] px-4 text-sm font-semibold text-[#59665b]"><IconLogout size={17} />{t("logout")}</button>{saved && <span className="self-center text-sm text-[#19733d]">{t("saved")}</span>}</div></form></Panel></div>; }

function LanguageSelect({ value, onChange }: { value: Language; onChange: (value: Language) => void }) { const t = useT(); return <div className="grid grid-cols-3 gap-2">{(["english", "hindi", "marathi"] as Language[]).map((item) => <button type="button" key={item} onClick={() => onChange(item)} className={`h-10 rounded-md border text-sm capitalize ${value === item ? "border-[#1f6b38] bg-[#e8f4e7] font-semibold text-[#155c2f]" : "border-[#d7decf] bg-white text-[#59665b]"}`}>{t(item as keyof typeof t)}</button>)}</div>; }

function Home({ prices, loading, leader, go }: { prices: PriceSnapshot[]; loading: boolean; leader?: PriceSnapshot; go: (view: View) => void }) { const t = useT(); return <div className="space-y-5"><div className="grid grid-cols-3 gap-2 lg:gap-4"><Status label={t("market_records")} value={loading ? "..." : `${prices.length} ${t("crops_count")}`} /><Status label={t("buyer_requests")} value={`12 ${t("open")}`} /><Status label={t("verified_sellers")} value={`48 ${t("active")}`} /></div><Panel className="border-[#d49b16] bg-[#fff8df]"><div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#9a6b00]"><IconSparkles size={20} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{t("market_assistant")}</p><p className="mt-1 text-sm leading-5 text-[#665b42]">{leader ? `${leader.crop} ${t("assistant_intro_trend")} ${Math.abs(leader.trend).toFixed(1)}%. ${t("assistant_intro_ask")}` : t("assistant_intro_ask")}</p><button onClick={() => go("advisor")} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#155c2f]">{t("talk_to_assistant")} <IconChevronRight size={16} /></button></div></div></Panel><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">{t("today_prices")}</h2><p className="mt-1 text-xs text-[#6d7b70]">{t("mh_average")}</p></div><button onClick={() => go("prices")} className="text-sm font-semibold text-[#1f6b38]">{t("all_prices")}</button></div>{loading ? <Panel><p className="text-sm text-[#6d7b70]">{t("loading_prices")}</p></Panel> : <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{prices.slice(0, 6).map((item) => <PriceCard key={item.crop} item={item} />)}</div>}<div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><ActionButton onClick={() => go("market")} icon={<IconBuildingStore size={21} />} title={t("find_buyer")} text={t("live_demand")} /><ActionButton onClick={() => go("calculator")} icon={<IconCalculator size={21} />} title={t("net_return")} text={t("calc_travel")} /></div></div>; }
function Status({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-[#d9e0d7] bg-white p-3 shadow-sm"><p className="text-[11px] leading-4 text-[#6d7b70]">{label}</p><p className="mt-1 text-sm font-semibold text-[#18251b]">{value}</p></div>; }
function ActionButton({ onClick, icon, title, text }: { onClick: () => void; icon: React.ReactNode; title: string; text: string }) { return <button onClick={onClick} className="rounded-lg border border-[#cbd8ca] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#d49b16] hover:shadow-md"><span className="text-[#1f6b38]">{icon}</span><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-4 text-[#6d7b70]">{text}</p></button>; }
function Prices({ prices, loading }: { prices: PriceSnapshot[]; loading: boolean }) { const t = useT(); return <><Title title={t("mandi_board")} detail={t("daily_avg")} />{loading ? <Panel>{t("loading_records")}</Panel> : <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{prices.map((item) => <PriceCard key={item.crop} item={item} />)}</div>}</>; }

function Calculator({ prices, onBack }: { prices: PriceSnapshot[]; onBack: () => void }) { const t = useT();
  const [crop, setCrop] = useState("Onion"); const [quantity, setQuantity] = useState(10); const [distance, setDistance] = useState(25);
  const chosen = prices.find((item) => item.crop === crop); const gross = (chosen?.price ?? 0) * quantity; const transport = distance * 8; const packing = gross * 0.05; const net = gross - transport - packing;
  return <div className="max-w-3xl space-y-4"><Title title={t("calc_title")} detail={t("calc_detail")} back={onBack} /><Panel><div className="space-y-4"><Field label={t("crop")}><select value={crop} onChange={(e) => setCrop(e.target.value)}>{CROPS.map((item) => <option key={item}>{item}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label={t("qty_qtl")}><input type="number" min="0" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></Field><Field label={t("dist_km")}><input type="number" min="0" value={distance} onChange={(e) => setDistance(Number(e.target.value))} /></Field></div></div></Panel><Panel className="border-[#a9cda9]"><p className="text-xs text-[#6d7b70]">{t("est_return")} {chosen ? money(chosen.price) : t("current_price")}</p><div className="mt-4 space-y-3 text-sm"><Row label={t("gross_value")} value={money(gross)} /><Row label={t("transport")} value={`-${money(transport)}`} /><Row label={t("packing")} value={`-${money(packing)}`} /><div className="flex justify-between border-t border-[#dce7db] pt-3 text-base font-semibold"><span>{t("expected_net")}</span><span className="text-[#19733d]">{money(net)}</span></div></div></Panel></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm text-[#304133]"><span className="mb-1.5 block">{label}</span><span className="block [&_input]:h-11 [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-[#cbd8ca] [&_input]:bg-white [&_input]:px-3 [&_select]:h-11 [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-[#cbd8ca] [&_select]:bg-white [&_select]:px-3">{children}</span></label>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between text-[#566457]"><span>{label}</span><span>{value}</span></div>; }

function Advisor({ prices, language, onBack }: { prices: PriceSnapshot[]; language: Language; onBack: () => void }) { const t = useT();
  const [crop, setCrop] = useState("Onion"); const [question, setQuestion] = useState(""); const [waiting, setWaiting] = useState(false);
  const [messages, setMessages] = useState<Chat[]>([{ role: "assistant", content: t("advisor_greet") }]);
  const selected = prices.find((item) => item.crop === crop) ?? prices[0];
  async function send(text = question) {
    const clean = text.trim();
    if (!clean || !selected || waiting) return;
    const next = [...messages, { role: "user" as const, content: clean }];
    setMessages(next);
    setQuestion("");
    setWaiting(true);
    try {
      const response = await fetch("/api/advise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: getAdvisorSessionId(), crop, price: selected.price, trend: selected.trend, language, question: clean }),
      });
      const data = await response.json();
      setMessages((current) => [...current, { role: "assistant", content: data.advice ?? t("advisor_err") }]);
    } finally {
      setWaiting(false);
    }
  }
  const quick = [t("q1"), t("q2"), t("q3")];
  return <div className="max-w-3xl space-y-4"><Title title={t("market_assistant")} detail={t("advisor_detail")} back={onBack} /><Panel className="p-3"><div className="flex items-center gap-3"><CropBadge crop={crop} size="small" /><select value={crop} onChange={(e) => setCrop(e.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-[#cbd8ca] bg-white px-3 text-sm">{CROPS.map((item) => <option key={item}>{item}</option>)}</select>{selected && <span className="text-right text-xs font-semibold text-[#19733d]">{money(selected.price)}<br />/qtl</span>}</div></Panel><ChatMessages messages={messages} waiting={waiting} /><div className="flex flex-wrap gap-2">{quick.map((item) => <button key={item} onClick={() => send(item)} className="rounded-md border border-[#cbd8ca] bg-white px-2.5 py-2 text-xs text-[#356642] transition hover:border-[#d49b16]">{item}</button>)}</div><div className="flex gap-2 border-t border-[#dfe6dd] pt-4"><input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder={t("ask_q")} className="h-11 min-w-0 flex-1 rounded-md border border-[#cbd8ca] bg-white px-3 text-sm" /><button onClick={() => send()} aria-label={t("ask_q")} className="flex h-11 w-11 items-center justify-center rounded-md border border-[#1f6b38] bg-[#1f6b38] text-white"><IconSend size={18} /></button></div><p className="text-[11px] leading-4 text-[#748176]">{t("advice_info")}</p></div>;
}

function getAdvisorSessionId() {
  const key = "kisansetu-advisor-session";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(key, created);
  return created;
}
function ChatMessages({ messages, waiting }: { messages: Chat[]; waiting?: boolean }) { const t = useT(); return <div className="rounded-lg border border-[#dbe3d5] bg-[#fbfaf6] p-3"><div className="space-y-3">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl border px-3 py-2.5 text-sm leading-5 shadow-sm ${message.role === "user" ? "rounded-br-sm border-[#b9d7ba] bg-[#e8f4e7] text-[#203b26]" : "rounded-bl-sm border-[#d9e0d7] bg-white text-[#354239]"}`}>{message.content}</div></div>)}{waiting && <div className="flex"><div className="rounded-2xl rounded-bl-sm border border-[#d9e0d7] bg-white px-3 py-2.5 text-sm text-[#6d7b70]">{t("checking_ctx")}</div></div>}</div></div>; }

function Market() { const t = useT();
  const [mode, setMode] = useState<"buyers" | "sellers" | "list">("buyers"); const [listings, setListings] = useState<Listing[]>([]); const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ farmer_name: "", crop: "Onion", quantity: "", price: "", location: "", phone: "" });
  useEffect(() => { fetch("/api/listings").then((r) => r.json()).then((data) => setListings(data.listings ?? [])).catch(() => setNotice("Marketplace data is temporarily unavailable.")); }, []);
  async function submit(event: FormEvent) { event.preventDefault(); const response = await fetch("/api/listings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) { setNotice(data.error ?? t("list_error")); return; } setListings((current) => [data.listing, ...current]); setForm({ farmer_name: "", crop: "Onion", quantity: "", price: "", location: "", phone: "" }); setNotice(t("list_success")); setMode("sellers"); }
  return <div className="space-y-4"><Title title={t("market_linkage")} detail={t("verified_demand")} /><div className="grid grid-cols-3 rounded-lg border border-[#cbd8ca] bg-white p-1"><Tab active={mode === "buyers"} onClick={() => setMode("buyers")}>{t("buyer_demand")}</Tab><Tab active={mode === "sellers"} onClick={() => setMode("sellers")}>{t("farmer_supply")}</Tab><Tab active={mode === "list"} onClick={() => setMode("list")}>{t("list_crop")}</Tab></div>{notice && <p className="text-sm text-[#19733d]">{notice}</p>}{mode === "buyers" && <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{buyerDemand.map((demand) => <Panel key={demand.buyer}><div className="flex items-start gap-3"><CropBadge crop={demand.crop} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold">{demand.buyer}</p><p className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#fff2cc] px-2 py-1 text-xs font-semibold text-[#8a6200]"><IconCircleCheck size={13} />{t("verified_buyer")}</p></div><p className="text-right font-mono text-lg font-bold">{money(demand.offer)}<span className="block font-sans text-[11px] font-normal text-[#6d7b70]">{t("offer_qtl")}</span></p></div><div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#edf0ec] pt-3 text-xs text-[#657366]"><span>{demand.crop} / {demand.quantity}</span><span className="text-right">{demand.location}</span></div><button className="mt-3 h-9 w-full rounded-md bg-[#d49b16] text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#b88310] active:translate-y-0">{t("req_contact")}</button></div></div></Panel>)}</div>}{mode === "sellers" && <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{listings.map((listing) => <Panel key={listing.id}><div className="flex gap-3"><CropBadge crop={listing.crop} /><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><div><p className="text-sm font-semibold">{listing.crop} {t("from")} {listing.farmer_name}</p><p className="mt-1 text-xs text-[#6d7b70]">{listing.quantity} qtl / {listing.location}</p></div><p className="text-right text-sm font-semibold">{money(listing.price)}<span className="block text-[11px] font-normal text-[#6d7b70]">{t("per_qtl")}</span></p></div><a href={`https://wa.me/${listing.phone}`} target="_blank" rel="noreferrer" className="mt-3 flex h-9 items-center justify-center gap-2 rounded-md border border-[#1f6b38] text-sm font-semibold text-[#1f6b38]"><IconMessage size={16} />{t("contact_farmer")}</a></div></div></Panel>)}</div>}{mode === "list" && <Panel><form className="space-y-4" onSubmit={submit}><p className="text-sm leading-5 text-[#59665b]">{t("publish_avail")}</p><Field label={t("farmer_name")}><input value={form.farmer_name} onChange={(e) => setForm({ ...form, farmer_name: e.target.value })} /></Field><Field label={t("crop")}><select value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })}>{CROPS.map((item) => <option key={item}>{item}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label={t("qty_qtl")}><input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field><Field label={t("exp_rs_qtl")}><input type="number" min="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field></div><Field label={t("village_dist")}><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field><Field label={t("whatsapp_no")}><input inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field><button className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#1f6b38] bg-[#1f6b38] text-sm font-semibold text-white"><IconPlus size={17} />{t("publish_listing")}</button></form></Panel>}</div>;
}
function Tab({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) { return <button onClick={onClick} className={`min-w-0 rounded-md px-1 py-2 text-[11px] transition ${active ? "bg-[#1f6b38] font-semibold text-white" : "text-[#59665b] hover:bg-[#eef3ea]"}`}>{children}</button>; }
function Sms({ prices }: { prices: PriceSnapshot[] }) { const t = useT(); const [query, setQuery] = useState("ONION"); const [sent, setSent] = useState(false); const found = prices.find((item) => item.crop.toUpperCase() === query.trim().toUpperCase()); const messages: Chat[] = [{ role: "user", content: "ONION" }, { role: "assistant", content: `ONION: ${prices[0] ? `${money(prices.find((item) => item.crop === "Onion")?.price ?? 0)}/quintal. ${t("reply_other")}` : t("load_latest")}` }, ...(sent ? [{ role: "user" as const, content: query }, { role: "assistant" as const, content: found ? `${found.crop}: ${money(found.price)}/quintal, ${found.trend > 0 ? t("up") : found.trend < 0 ? t("down") : t("flat")} ${Math.abs(found.trend).toFixed(1)}%.` : t("no_record") }] : [])]; return <div className="max-w-3xl space-y-4"><Title title={t("sms_service")} detail={t("sms_detail")} /><Panel><ChatMessages messages={messages} /><div className="mt-4 flex gap-2 border-t border-[#edf0ec] pt-4"><input value={query} onChange={(e) => setQuery(e.target.value.toUpperCase())} className="h-11 min-w-0 flex-1 rounded-md border border-[#cbd8ca] px-3 text-sm" /><button onClick={() => setSent(true)} className="flex h-11 w-11 items-center justify-center rounded-md border border-[#1f6b38] bg-[#1f6b38] text-white"><IconSend size={18} /></button></div></Panel><Panel><p className="text-sm font-semibold">{t("sms_active")}</p><p className="mt-1 text-sm leading-5 text-[#59665b]">{t("twilio_hook")}</p></Panel></div>; }

function toCropPrices(rows: Array<Record<string, unknown>>): PriceSnapshot[] { const groups = new Map<string, Array<Record<string, unknown>>>(); for (const row of rows) { const crop = String(row.crop); groups.set(crop, [...(groups.get(crop) ?? []), row]); } return [...groups.entries()].map(([crop, records]) => { const dayMap = new Map<string, Array<Record<string, unknown>>>(); for (const row of records) { const date = String(row.date); dayMap.set(date, [...(dayMap.get(date) ?? []), row]); } const [latest, previous] = [...dayMap.keys()].sort((a, b) => b.localeCompare(a)); const mean = (items: Array<Record<string, unknown>>) => items.reduce((total, item) => total + Number(item.price), 0) / items.length; const currentRows = dayMap.get(latest) ?? []; const priorRows = previous ? dayMap.get(previous) ?? [] : []; const price = mean(currentRows); const previousPrice = priorRows.length ? mean(priorRows) : null; return { crop, market: "Maharashtra market average", price, unit: String(currentRows[0]?.unit ?? "quintal"), date: latest, source: String(currentRows[0]?.source ?? "data.gov.in"), previousPrice, trend: previousPrice ? Number((((price - previousPrice) / previousPrice) * 100).toFixed(1)) : 0 }; }); }
