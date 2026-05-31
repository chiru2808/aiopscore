import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ShieldAlert, 
  Sparkles, 
  Eye, 
  EyeOff 
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

export function ApiKeyOnboardingModal() {
  const { t } = useTranslation();
  const projectId = authenticationSession.getProjectId() ?? '';
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

  // Input states
  const [openaiKey, setOpenaiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [oodexKey, setOodexKey] = useState('');

  // Fetch connections to see if we have 0 connections
  const { data: connections, isLoading: queryLoading } = appConnectionsQueries.useAppConnections({
    request: {
      projectId,
      limit: 10,
    },
    extraKeys: [projectId],
    enabled: !!projectId
  });

  useEffect(() => {
    if (!queryLoading && connections && connections.data.length === 0) {
      setOpen(true);
    }
  }, [connections, queryLoading]);

  const toggleShowSecret = (key: string) => {
    setShowSecret(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const connectionsToUpsert = [
        { key: openaiKey, name: 'OpenAI Connection', piece: '@activepieces/piece-openai' },
        { key: claudeKey, name: 'Anthropic Connection', piece: '@activepieces/piece-claude' },
        { key: geminiKey, name: 'Gemini Connection', piece: '@activepieces/piece-google-gemini' },
        { key: oodexKey, name: 'Oodex Connection', piece: '@activepieces/piece-oodex' },
      ];

      for (const item of connectionsToUpsert) {
        if (item.key.trim()) {
          await appConnectionsApi.upsert({
            displayName: item.name,
            pieceName: item.piece,
            projectId,
            value: {
              type: 'SECRET_TEXT' as any,
              secret_text: item.key.trim()
            }
          });
        }
      }
      setOpen(false);
      // Reload page to activate agents instantly
      window.location.reload();
    } catch (err) {
      console.error('Error saving onboard connections:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent 
        onInteractOutside={(e) => e.preventDefault()}
        className="max-w-[550px] bg-[#030710] border border-white/10 rounded-[32px] text-white p-8 max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-white italic">
            <Sparkles className="text-[#7FC8FF]" /> Commander Agent Provisioning
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-xs font-medium uppercase tracking-widest mt-2">
            First-Time Setup: Configure your Master API keys
          </DialogDescription>
        </DialogHeader>

        <div className="my-6 bg-[#070E1B] border border-white/5 rounded-2xl p-5 flex items-start gap-4">
          <div className="p-2 bg-[#7FC8FF]/10 rounded-lg text-[#7FC8FF]"><ShieldAlert size={20} /></div>
          <div>
            <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Provisioning Required</h4>
            <p className="text-[10px] text-gray-500 leading-relaxed uppercase font-bold">
              Your agents (CEO, SDR, Campaign Monitor, etc.) are pre-configured but require API credentials to run autonomously. Enter your keys below.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* OpenAI Key */}
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2">OpenAI API Key (sk-...)</label>
            <div className="relative">
              <input 
                type={showSecret['openai'] ? 'text' : 'password'}
                placeholder="Enter OpenAI key"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-[#7FC8FF]/50 outline-none transition-all pr-12"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <button 
                onClick={() => toggleShowSecret('openai')}
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
              >
                {showSecret['openai'] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Anthropic Key */}
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2">Anthropic Claude Key (sk-ant-...)</label>
            <div className="relative">
              <input 
                type={showSecret['claude'] ? 'text' : 'password'}
                placeholder="Enter Anthropic key"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-[#7FC8FF]/50 outline-none transition-all pr-12"
                value={claudeKey}
                onChange={(e) => setClaudeKey(e.target.value)}
              />
              <button 
                onClick={() => toggleShowSecret('claude')}
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
              >
                {showSecret['claude'] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Gemini Key */}
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2">Google Gemini Key</label>
            <div className="relative">
              <input 
                type={showSecret['gemini'] ? 'text' : 'password'}
                placeholder="Enter Gemini key"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-[#7FC8FF]/50 outline-none transition-all pr-12"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
              />
              <button 
                onClick={() => toggleShowSecret('gemini')}
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
              >
                {showSecret['gemini'] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Oodex Key */}
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2">Oodex API Key</label>
            <div className="relative">
              <input 
                type={showSecret['oodex'] ? 'text' : 'password'}
                placeholder="Enter Oodex key"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-[#7FC8FF]/50 outline-none transition-all pr-12"
                value={oodexKey}
                onChange={(e) => setOodexKey(e.target.value)}
              />
              <button 
                onClick={() => toggleShowSecret('oodex')}
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
              >
                {showSecret['oodex'] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-8">
          <Button 
            onClick={handleSave}
            disabled={loading || (!openaiKey.trim() && !claudeKey.trim() && !geminiKey.trim() && !oodexKey.trim())}
            className="w-full bg-[#7FC8FF] hover:bg-[#a8d8ff] text-[#030710] py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            {loading ? 'Activating Agency...' : 'Save & Activate Agent Fleet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
