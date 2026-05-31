import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Pencil,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { appConnectionsApi } from '@/features/connections/lib/api/app-connections';
import { appConnectionsQueries } from '@/features/connections/lib/app-connections-hooks';
import { authenticationSession } from '@/lib/authentication-session';
import { AppConnectionType, AppConnectionWithoutSensitiveData } from '@activepieces/shared';

// ─── Canonical Adapter Definitions ────────────────────────────────────────────
const ADAPTERS = [
  {
    id: 'openai',
    label: 'OpenAI',
    hint: 'sk-...',
    placeholder: 'Paste your OpenAI API key',
    pieceName: '@activepieces/piece-openai',
    connectionName: 'OpenAI Connection',
    gradient: 'from-emerald-500/20 to-teal-500/10',
    border: 'border-emerald-500/30',
    accent: '#10B981',
    logo: '🤖',
    matchDisplayNames: ['openai connection', 'openai', 'openai api'],
  },
  {
    id: 'claude',
    label: 'Anthropic Claude',
    hint: 'sk-ant-...',
    placeholder: 'Paste your Anthropic API key',
    pieceName: '@activepieces/piece-claude',
    connectionName: 'Anthropic Connection',
    gradient: 'from-orange-500/20 to-amber-500/10',
    border: 'border-orange-500/30',
    accent: '#F97316',
    logo: '🧠',
    matchDisplayNames: ['anthropic connection', 'claude', 'anthropic'],
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    hint: 'AIza...',
    placeholder: 'Paste your Gemini API key',
    pieceName: '@activepieces/piece-google-gemini',
    connectionName: 'Gemini Connection',
    gradient: 'from-blue-500/20 to-indigo-500/10',
    border: 'border-blue-500/30',
    accent: '#3B82F6',
    logo: '✨',
    matchDisplayNames: ['gemini connection', 'gemini', 'google gemini'],
  },
  {
    id: 'cursor',
    label: 'Cursor',
    hint: 'cursor-...',
    placeholder: 'Paste your Cursor API key',
    pieceName: '@activepieces/piece-cursor',
    connectionName: 'Cursor Connection',
    gradient: 'from-violet-500/20 to-purple-500/10',
    border: 'border-violet-500/30',
    accent: '#8B5CF6',
    logo: '⚡',
    matchDisplayNames: ['cursor connection', 'cursor'],
  },
] as const;

type AdapterId = (typeof ADAPTERS)[number]['id'];

type KeyState = {
  value: string;
  existingId: string | null;
  existingName: string | null;
  confirmed: boolean; // already present in vault
  editing: boolean;
};

function makeEmptyState(): Record<AdapterId, KeyState> {
  return Object.fromEntries(
    ADAPTERS.map((a) => [
      a.id,
      { value: '', existingId: null, existingName: null, confirmed: false, editing: false },
    ]),
  ) as Record<AdapterId, KeyState>;
}

export function ApiKeyOnboardingModal() {
  const projectId = authenticationSession.getProjectId() ?? '';
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [keys, setKeys] = useState<Record<AdapterId, KeyState>>(makeEmptyState);
  const [saveError, setSaveError] = useState('');

  // Fetch existing connections
  const { data: connections, isLoading: queryLoading } =
    appConnectionsQueries.useAppConnections({
      request: { projectId, limit: 50 },
      extraKeys: [projectId],
      enabled: !!projectId,
    });

  // Determine which keys are already saved
  useEffect(() => {
    if (queryLoading || !connections) return;

    const existing = connections.data as AppConnectionWithoutSensitiveData[];

    const newKeys = makeEmptyState();
    for (const adapter of ADAPTERS) {
      const match = existing.find((c) => {
        const lower: string = c.displayName.toLowerCase();
        return (adapter.matchDisplayNames as readonly string[]).includes(lower);
      });
      if (match) {
        newKeys[adapter.id] = {
          value: '',            // never revealed — masked
          existingId: match.id,
          existingName: match.displayName,
          confirmed: true,
          editing: false,
        };
      }
    }
    setKeys(newKeys);

    // Open wizard only if at least one key is missing
    const anyMissing = ADAPTERS.some((a) => !newKeys[a.id].confirmed);
    if (anyMissing) setOpen(true);
  }, [connections, queryLoading]);

  const toggleShow = (id: string) =>
    setShowSecret((prev) => ({ ...prev, [id]: !prev[id] }));

  const startEdit = (id: AdapterId) =>
    setKeys((prev) => ({
      ...prev,
      [id]: { ...prev[id], editing: true, value: '' },
    }));

  const cancelEdit = (id: AdapterId) =>
    setKeys((prev) => ({
      ...prev,
      [id]: { ...prev[id], editing: false, value: '' },
    }));

  const updateValue = (id: AdapterId, val: string) =>
    setKeys((prev) => ({ ...prev, [id]: { ...prev[id], value: val } }));

  const handleSave = async () => {
    setLoading(true);
    setSaveError('');
    try {
      for (const adapter of ADAPTERS) {
        const state = keys[adapter.id];
        const newKey = state.value.trim();

        if (!newKey) continue; // skip untouched/confirmed keys

        await appConnectionsApi.upsert({
          displayName: adapter.connectionName,
          pieceName: adapter.pieceName,
          projectId,
          type: AppConnectionType.SECRET_TEXT,
          value: {
            type: AppConnectionType.SECRET_TEXT,
            secret_text: newKey,
          },
        } as any);
      }
      setOpen(false);
      window.location.reload();
    } catch (err: any) {
      console.error('[ApiKeyOnboardingModal] save error:', err);
      setSaveError('Failed to save one or more keys. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const anyNewKey = ADAPTERS.some((a) => keys[a.id].value.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className="max-w-[560px] bg-[#07091A] border border-white/10 rounded-[28px] text-white p-0 overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <DialogHeader className="px-8 pt-8 pb-0 shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-[#7FC8FF]/10 text-[#7FC8FF]">
              <Sparkles size={18} />
            </div>
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-white">
              Agent Provisioning
            </DialogTitle>
          </div>
          <DialogDescription className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
            Configure your master API keys — agents will not run without them
          </DialogDescription>
        </DialogHeader>

        {/* ── Info banner ─────────────────────────────────────────────── */}
        <div className="mx-8 mt-5 bg-[#0D1526] border border-white/5 rounded-2xl p-4 flex items-start gap-3 shrink-0">
          <ShieldCheck size={16} className="text-[#7FC8FF] mt-0.5 shrink-0" />
          <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">
            Keys already saved in your Sovereign Vault are shown as{' '}
            <span className="text-emerald-400">verified</span>. You can still
            edit &amp; override them here at any time.
          </p>
        </div>

        {/* ── Key cards ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-8 pt-5 pb-2 space-y-4">
          {ADAPTERS.map((adapter) => {
            const state = keys[adapter.id];
            const isConfirmed = state.confirmed && !state.editing;
            const isEditing = state.editing;

            return (
              <div
                key={adapter.id}
                className={`relative rounded-2xl bg-gradient-to-br ${adapter.gradient} border ${adapter.border} p-4 transition-all`}
              >
                {/* Card header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{adapter.logo}</span>
                    <div>
                      <p className="text-[11px] font-black text-white uppercase tracking-wider">
                        {adapter.label}
                      </p>
                      <p className="text-[9px] text-gray-500 font-semibold uppercase">
                        Key format: {adapter.hint}
                      </p>
                    </div>
                  </div>

                  {/* Status badge */}
                  {isConfirmed ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                        Verified
                      </span>
                      <button
                        onClick={() => startEdit(adapter.id)}
                        className="ml-2 p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Edit key"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-amber-400" />
                      <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
                        {isEditing ? 'Editing' : 'Required'}
                      </span>
                      {isEditing && state.existingId && (
                        <button
                          onClick={() => cancelEdit(adapter.id)}
                          className="ml-2 p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                          title="Cancel edit"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Input — hidden if confirmed & not editing */}
                {(!isConfirmed || isEditing) && (
                  <div className="relative">
                    <input
                      type={showSecret[adapter.id] ? 'text' : 'password'}
                      placeholder={adapter.placeholder}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white placeholder-gray-600 focus:border-white/30 outline-none transition-all pr-12"
                      value={state.value}
                      onChange={(e) => updateValue(adapter.id, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => toggleShow(adapter.id)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                    >
                      {showSecret[adapter.id] ? (
                        <EyeOff size={14} />
                      ) : (
                        <Eye size={14} />
                      )}
                    </button>
                  </div>
                )}

                {/* Confirmed mask */}
                {isConfirmed && (
                  <div className="flex items-center gap-2 bg-black/20 border border-white/5 rounded-xl px-4 py-3">
                    <span className="text-xs font-black text-gray-500 tracking-widest">
                      ••••••••••••••••••••••••••••••••
                    </span>
                    <span className="ml-auto text-[9px] text-gray-600 font-bold uppercase">
                      {state.existingName}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <DialogFooter className="px-8 pt-4 pb-8 shrink-0 flex-col gap-3">
          {saveError && (
            <p className="text-[10px] text-red-400 font-bold text-center">
              {saveError}
            </p>
          )}
          <Button
            onClick={handleSave}
            disabled={loading || !anyNewKey}
            className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            style={{
              background: anyNewKey
                ? 'linear-gradient(135deg, #7FC8FF, #5B8DEF)'
                : undefined,
              color: anyNewKey ? '#07091A' : undefined,
            }}
          >
            {loading ? 'Saving & Activating…' : 'Save & Activate Agent Fleet'}
          </Button>
          <button
            onClick={() => setOpen(false)}
            className="w-full text-center text-[9px] font-bold text-gray-600 hover:text-gray-400 uppercase tracking-widest transition-colors py-1"
          >
            Skip for now — I'll add keys later
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
