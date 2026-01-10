import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { authenticationSession } from '@/lib/authentication-session';
import { NEW_FLOW_QUERY_PARAM } from '@/lib/utils';
import {
  FlowOperationType,
  FlowTemplate,
  UncategorizedFolderId,
} from '@activepieces/shared';

import { foldersApi } from '../../folders/lib/folders-api';

import { flowsApi } from '../lib/flows-api';

type GenerateFlowWithAIDialogProps = {
  children: React.ReactNode;
  folderId: string;
};

export const GenerateFlowWithAIDialog = ({
  children,
  folderId,
}: GenerateFlowWithAIDialogProps) => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const navigate = useNavigate();

  const { mutate: generateFlow, isPending } = useMutation<
    FlowTemplate,
    Error,
    string
  >({
    mutationFn: async (desc: string) => {
      return flowsApi.generateWithAI({
        description: desc,
        folderId: folderId !== UncategorizedFolderId ? folderId : undefined,
      });
    },
    onSuccess: async (flowTemplate) => {
      // Create a new flow and import the AI-generated template
      const folder =
        folderId !== UncategorizedFolderId
          ? await foldersApi.get(folderId)
          : undefined;

      const flow = await flowsApi.create({
        projectId: authenticationSession.getProjectId()!,
        displayName: flowTemplate.name || t('AI Generated Flow'),
        folderName: folder?.displayName,
      });

      // Import the generated template into the flow
      await flowsApi.update(flow.id, {
        type: FlowOperationType.IMPORT_FLOW,
        request: flowTemplate.template,
      });

      toast({
        title: t('Flow Generated Successfully'),
        description: t('Your AI-generated workflow is ready to configure.'),
        duration: 3000,
      });

      setOpen(false);
      setDescription('');
      navigate(`/flows/${flow.id}?${NEW_FLOW_QUERY_PARAM}=true`);
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.params?.message ||
        t('Failed to generate workflow. Please try again.');

      toast({
        title: t('Generation Failed'),
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
    },
  });

  const handleGenerate = () => {
    if (description.trim().length < 10) {
      toast({
        title: t('Description Too Short'),
        description: t(
          'Please provide a more detailed description (at least 10 characters).'
        ),
        variant: 'destructive',
      });
      return;
    }

    generateFlow(description.trim());
  };

  const examples = [
    'Send a Slack notification when a new row is added to Google Sheets',
    'Create a GitHub issue when a webhook receives customer feedback',
    'Send a daily summary email of new Trello cards',
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('Generate Flow with AI')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'Describe what you want your workflow to do, and AI will generate it for you.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">{t('Workflow Description')}</Label>
            <Textarea
              id="description"
              placeholder={t(
                'Example: Send an email notification when a webhook receives data from a contact form'
              )}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={isPending}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              {t('Examples')}:
            </Label>
            <div className="space-y-1">
              {examples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setDescription(example)}
                  disabled={isPending}
                  className="block w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded hover:bg-accent"
                >
                  • {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            {t('Cancel')}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isPending || description.trim().length < 10}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('Generating...')}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {t('Generate Flow')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
