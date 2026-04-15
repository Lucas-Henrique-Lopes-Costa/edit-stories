"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SearchSelect } from "@/components/SearchSelect";

interface AdsSettings {
  accessToken: string;
  adAccountId: string;
  pageId: string;
  pixelId: string;
  websiteUrl: string;
  ctaType: string;
  caption: string;
}

interface MetaItem {
  id: string;
  name: string;
  sub?: string;
}

type LogEntry = { text: string; type: "info" | "error" | "success" };

const GENDER_OPTIONS = [
  { label: "Todos", value: [] },
  { label: "Mulher", value: [2] },
  { label: "Homem", value: [1] },
  { label: "Mulher + Homem", value: [1, 2] },
];

const CTA_OPTIONS = [
  { label: "Comprar agora", value: "SHOP_NOW" },
  { label: "Saiba mais", value: "LEARN_MORE" },
  { label: "Inscrever-se", value: "SUBSCRIBE" },
  { label: "Obter oferta", value: "GET_OFFER" },
  { label: "Ver mais", value: "SEE_MORE" },
  { label: "Sem CTA", value: "NO_BUTTON" },
];

const DEFAULT_SETTINGS: AdsSettings = {
  accessToken: "",
  adAccountId: "",
  pageId: "",
  pixelId: "",
  websiteUrl: "",
  ctaType: "SHOP_NOW",
  caption: "",
};

async function streamSSE(
  url: string,
  body: unknown,
  onLog: (entry: LogEntry) => void
) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.body) throw new Error("Sem resposta do servidor.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const parsed = JSON.parse(line.slice(6));
      if (parsed.error) {
        onLog({ text: parsed.error, type: "error" });
      } else if (parsed.message) {
        const isSuccess =
          parsed.message.includes("criado") ||
          parsed.message.includes("Concluido") ||
          parsed.message.includes("OK");
        onLog({ text: parsed.message, type: isSuccess ? "success" : "info" });
      }
    }
  }
}

export default function AdsPage() {
  const [settings, setSettings] = useState<AdsSettings>(DEFAULT_SETTINGS);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Folders
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);

  // --- New Campaign ---
  const [campaignName, setCampaignName] = useState("");
  const [adSetName, setAdSetName] = useState("");
  const [dailyBudget, setDailyBudget] = useState("250");
  const [ageMin, setAgeMin] = useState("35");
  const [ageMax, setAgeMax] = useState("54");
  const [genderIdx, setGenderIdx] = useState(1);
  const [countries, setCountries] = useState("BR");
  const [newCampaignFolder, setNewCampaignFolder] = useState("");
  const [newCampaignFiles, setNewCampaignFiles] = useState<{ name: string }[]>([]);
  const [creating, setCreating] = useState(false);

  // --- Upload to existing ---
  const [campaigns, setCampaigns] = useState<MetaItem[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [adSets, setAdSets] = useState<MetaItem[]>([]);
  const [adSetsLoading, setAdSetsLoading] = useState(false);
  const [selectedAdSetId, setSelectedAdSetId] = useState("");
  const [uploadFolder, setUploadFolder] = useState("");
  const [uploadFiles, setUploadFiles] = useState<{ name: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  // Shared logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Load settings
  useEffect(() => {
    fetch("/api/ads/settings")
      .then((r) => r.json())
      .then((data) => setSettings((prev) => ({ ...prev, ...data })));
  }, []);

  // Load folders
  useEffect(() => {
    fetch("/api/ads/folders")
      .then((r) => r.json())
      .then((data) => setFolders(data.folders ?? []));
  }, []);

  // Load files for new campaign folder
  useEffect(() => {
    if (!newCampaignFolder) { setNewCampaignFiles([]); return; }
    fetch(`/api/ads/folders?path=${encodeURIComponent(newCampaignFolder)}`)
      .then((r) => r.json())
      .then((data) => setNewCampaignFiles(data.files ?? []));
  }, [newCampaignFolder]);

  // Load files for upload folder
  useEffect(() => {
    if (!uploadFolder) { setUploadFiles([]); return; }
    fetch(`/api/ads/folders?path=${encodeURIComponent(uploadFolder)}`)
      .then((r) => r.json())
      .then((data) => setUploadFiles(data.files ?? []));
  }, [uploadFolder]);

  // Load ad sets when campaign selected
  useEffect(() => {
    if (!selectedCampaignId) { setAdSets([]); setSelectedAdSetId(""); return; }
    setAdSetsLoading(true);
    setSelectedAdSetId("");
    fetch(`/api/ads/adsets?campaignId=${selectedCampaignId}`)
      .then((r) => r.json())
      .then((data) => {
        setAdSets(
          (data.adsets ?? []).map((a: { id: string; name: string; status: string }) => ({
            id: a.id,
            name: a.name,
            sub: a.status,
          }))
        );
      })
      .finally(() => setAdSetsLoading(false));
  }, [selectedCampaignId]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => [...prev, entry]);
  }, []);

  const saveSettings = useCallback(async () => {
    await fetch("/api/ads/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  }, [settings]);

  const loadCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    setCampaignsLoaded(false);
    try {
      const res = await fetch("/api/ads/campaigns");
      const data = await res.json();
      if (data.error) {
        addLog({ text: `Erro ao carregar campanhas: ${data.error}`, type: "error" });
      } else {
        setCampaigns(
          (data.campaigns ?? []).map((c: { id: string; name: string; status: string }) => ({
            id: c.id,
            name: c.name,
            sub: c.status,
          }))
        );
        setCampaignsLoaded(true);
      }
    } finally {
      setCampaignsLoading(false);
    }
  }, [addLog]);

  const handleCreate = useCallback(async () => {
    if (!settings.accessToken || !settings.adAccountId || !settings.pageId) {
      alert("Preencha o Access Token, Ad Account ID e Page ID nas configurações.");
      return;
    }
    if (!campaignName || !adSetName) {
      alert("Preencha o nome da campanha e do conjunto de anúncios.");
      return;
    }
    if (!newCampaignFolder) {
      alert("Selecione uma pasta de criativos.");
      return;
    }

    setCreating(true);
    setLogs([]);

    try {
      await streamSSE(
        "/api/ads/create",
        {
          accessToken: settings.accessToken,
          adAccountId: settings.adAccountId,
          pageId: settings.pageId,
          pixelId: settings.pixelId || undefined,
          websiteUrl: settings.websiteUrl,
          ctaType: settings.ctaType,
          caption: settings.caption,
          campaignName,
          adSetName,
          dailyBudget: parseFloat(dailyBudget) || 250,
          ageMin: parseInt(ageMin) || 35,
          ageMax: parseInt(ageMax) || 54,
          genders: GENDER_OPTIONS[genderIdx].value,
          countries: countries.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean),
          folderPath: newCampaignFolder,
        },
        addLog
      );
    } catch (err) {
      addLog({ text: `Erro: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    } finally {
      setCreating(false);
    }
  }, [settings, campaignName, adSetName, dailyBudget, ageMin, ageMax, genderIdx, countries, newCampaignFolder, addLog]);

  const handleUpload = useCallback(async () => {
    if (!selectedAdSetId) {
      alert("Selecione um conjunto de anúncios.");
      return;
    }
    if (!uploadFolder) {
      alert("Selecione uma pasta de criativos.");
      return;
    }

    setUploading(true);
    setLogs([]);

    try {
      await streamSSE(
        "/api/ads/upload",
        { adSetId: selectedAdSetId, folderPath: uploadFolder },
        addLog
      );
    } catch (err) {
      addLog({ text: `Erro: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
    } finally {
      setUploading(false);
    }
  }, [selectedAdSetId, uploadFolder, addLog]);

  const busy = creating || uploading;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Meta Ads</h1>
          <p className="text-xs text-zinc-500">Criação automática de campanhas</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-zinc-400 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded text-xs">
            Vídeos
          </a>
          <a href="/analytics" className="text-zinc-400 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded text-xs">
            Analytics
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* ── Credentials ── */}
        <section className="border border-zinc-800 rounded-lg bg-zinc-900 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-200">Credenciais Meta</h2>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Access Token</label>
              <div className="flex gap-2">
                <input
                  type={showToken ? "text" : "password"}
                  value={settings.accessToken}
                  onChange={(e) => setSettings((s) => ({ ...s, accessToken: e.target.value }))}
                  placeholder="EAA..."
                  className="flex-1 text-xs bg-zinc-800 text-white px-3 py-2 rounded border border-zinc-700 focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  onClick={() => setShowToken((v) => !v)}
                  className="text-xs px-3 py-2 bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-400 rounded transition-colors"
                >
                  {showToken ? "Ocultar" : "Ver"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Ad Account ID</label>
                <input
                  type="text"
                  value={settings.adAccountId}
                  onChange={(e) => setSettings((s) => ({ ...s, adAccountId: e.target.value }))}
                  placeholder="act_123456 ou 123456"
                  className="text-xs bg-zinc-800 text-white px-3 py-2 rounded border border-zinc-700 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Page ID</label>
                <input
                  type="text"
                  value={settings.pageId}
                  onChange={(e) => setSettings((s) => ({ ...s, pageId: e.target.value }))}
                  placeholder="123456789"
                  className="text-xs bg-zinc-800 text-white px-3 py-2 rounded border border-zinc-700 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Pixel ID <span className="text-zinc-600">(opcional)</span></label>
                <input
                  type="text"
                  value={settings.pixelId}
                  onChange={(e) => setSettings((s) => ({ ...s, pixelId: e.target.value }))}
                  placeholder="123456789"
                  className="text-xs bg-zinc-800 text-white px-3 py-2 rounded border border-zinc-700 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">URL do site (destino do anúncio)</label>
              <input
                type="url"
                value={settings.websiteUrl}
                onChange={(e) => setSettings((s) => ({ ...s, websiteUrl: e.target.value }))}
                placeholder="https://seusite.com.br"
                className="text-xs bg-zinc-800 text-white px-3 py-2 rounded border border-zinc-700 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Botão CTA</label>
                <select
                  value={settings.ctaType}
                  onChange={(e) => setSettings((s) => ({ ...s, ctaType: e.target.value }))}
                  className="text-xs bg-zinc-800 text-white px-3 py-2 rounded border border-zinc-700 focus:outline-none focus:border-blue-500"
                >
                  {CTA_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Legenda / Texto do anúncio</label>
                <input
                  type="text"
                  value={settings.caption}
                  onChange={(e) => setSettings((s) => ({ ...s, caption: e.target.value }))}
                  placeholder="Texto opcional..."
                  className="text-xs bg-zinc-800 text-white px-3 py-2 rounded border border-zinc-700 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <button
            onClick={saveSettings}
            className={`self-end text-xs px-4 py-2 rounded transition-colors ${
              settingsSaved ? "bg-green-700 text-white" : "bg-zinc-700 hover:bg-zinc-600 text-white"
            }`}
          >
            {settingsSaved ? "Salvo!" : "Salvar credenciais"}
          </button>
        </section>

        {/* ── Upload to existing campaign ── */}
        <section className="border border-zinc-800 rounded-lg bg-zinc-900 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">Subir anúncios em campanha existente</h2>
            <button
              onClick={loadCampaigns}
              disabled={campaignsLoading || busy}
              className="text-xs px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors disabled:opacity-50"
            >
              {campaignsLoading ? "Carregando..." : campaignsLoaded ? "Atualizar" : "Carregar campanhas"}
            </button>
          </div>

          {campaignsLoaded && (
            <>
              <div className="flex flex-col gap-3">
                {/* Campaign select */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-400">Campanha</label>
                  <SearchSelect
                    options={campaigns}
                    value={selectedCampaignId}
                    onChange={setSelectedCampaignId}
                    placeholder="Selecionar campanha..."
                    disabled={busy}
                    loading={campaignsLoading}
                  />
                </div>

                {/* Ad Set select */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-400">Conjunto de anúncios</label>
                  <SearchSelect
                    options={adSets}
                    value={selectedAdSetId}
                    onChange={setSelectedAdSetId}
                    placeholder={selectedCampaignId ? "Selecionar conjunto..." : "Selecione a campanha primeiro"}
                    disabled={!selectedCampaignId || busy}
                    loading={adSetsLoading}
                  />
                </div>
              </div>

              {/* Folder for upload */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Pasta de criativos</label>
                <SearchSelect
                  options={folders}
                  value={uploadFolder}
                  onChange={setUploadFolder}
                  placeholder="Selecionar pasta..."
                  disabled={busy}
                />
                {uploadFiles.length > 0 && (
                  <div className="mt-1.5 flex flex-col gap-0.5">
                    <p className="text-xs text-zinc-500">{uploadFiles.length} vídeo(s):</p>
                    {uploadFiles.map((f) => (
                      <p key={f.name} className="text-xs text-zinc-400 pl-2">• {f.name}</p>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleUpload}
                disabled={busy || !selectedAdSetId || !uploadFolder}
                className={`w-full py-2.5 rounded text-sm font-medium transition-colors ${
                  busy || !selectedAdSetId || !uploadFolder
                    ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                }`}
              >
                {uploading ? "Subindo anúncios..." : "Subir anúncios"}
              </button>
            </>
          )}

          {!campaignsLoaded && !campaignsLoading && (
            <p className="text-xs text-zinc-600">Clique em "Carregar campanhas" para buscar suas campanhas existentes.</p>
          )}
        </section>

        {/* ── New Campaign ── */}
        <section className="border border-zinc-800 rounded-lg bg-zinc-900 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-200">Nova Campanha</h2>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Nome da campanha</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="[DALLAS]_[VENDAS]_[FB_ADS]_[AUTO]_[FRIO]_[ESCALA]_[V2]_[SITE] [PRODUTO]"
              className="text-xs bg-zinc-800 text-white px-3 py-2 rounded border border-zinc-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Nome do conjunto de anúncios</label>
              <input
                type="text"
                value={adSetName}
                onChange={(e) => setAdSetName(e.target.value)}
                placeholder="00_ABERTO"
                className="text-xs bg-zinc-800 text-white px-3 py-2 rounded border border-zinc-700 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Orçamento diário (R$)</label>
              <input
                type="number"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
                min="1"
                step="0.01"
                className="text-xs bg-zinc-800 text-white px-3 py-2 rounded border border-zinc-700 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-zinc-400 mb-2">Segmentação <span className="text-zinc-600">(Advantage+ desativado)</span></p>
            <div className="grid grid-cols-4 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Idade mín.</label>
                <input type="number" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} min="18" max="65"
                  className="text-xs bg-zinc-800 text-white px-3 py-2 rounded border border-zinc-700 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Idade máx.</label>
                <input type="number" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} min="18" max="65"
                  className="text-xs bg-zinc-800 text-white px-3 py-2 rounded border border-zinc-700 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Gênero</label>
                <select value={genderIdx} onChange={(e) => setGenderIdx(Number(e.target.value))}
                  className="text-xs bg-zinc-800 text-white px-3 py-2 rounded border border-zinc-700 focus:outline-none focus:border-blue-500">
                  {GENDER_OPTIONS.map((g, i) => <option key={i} value={i}>{g.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Países</label>
                <input type="text" value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="BR"
                  className="text-xs bg-zinc-800 text-white px-3 py-2 rounded border border-zinc-700 focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Pasta de criativos</label>
            <SearchSelect
              options={folders}
              value={newCampaignFolder}
              onChange={setNewCampaignFolder}
              placeholder="Selecionar pasta..."
              disabled={busy}
            />
            {newCampaignFiles.length > 0 && (
              <div className="mt-1.5 flex flex-col gap-0.5">
                <p className="text-xs text-zinc-500">{newCampaignFiles.length} vídeo(s):</p>
                {newCampaignFiles.map((f) => (
                  <p key={f.name} className="text-xs text-zinc-400 pl-2">• {f.name}</p>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleCreate}
            disabled={busy}
            className={`w-full py-2.5 rounded text-sm font-medium transition-colors ${
              busy ? "bg-zinc-700 text-zinc-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            {creating ? "Criando campanha..." : "Criar campanha"}
          </button>
        </section>

        {/* ── Logs ── */}
        {logs.length > 0 && (
          <section className="border border-zinc-800 rounded-lg bg-zinc-900 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-zinc-400">Progresso</h2>
              {!busy && (
                <button onClick={() => setLogs([])} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                  Limpar
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
              {logs.map((log, i) => (
                <p key={i} className={`text-xs font-mono ${
                  log.type === "error" ? "text-red-400" : log.type === "success" ? "text-green-400" : "text-zinc-300"
                }`}>
                  {log.type === "error" ? "✗ " : log.type === "success" ? "✓ " : "  "}
                  {log.text}
                </p>
              ))}
              <div ref={logsEndRef} />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
