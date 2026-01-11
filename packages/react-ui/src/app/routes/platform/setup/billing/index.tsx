import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { CreditCard, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { billingApi } from '@/lib/billing-api';
import { authenticationSession } from '@/lib/authentication-session';
import { platformHooks } from '@/hooks/platform-hooks';

export const BillingPage = () => {
  const { toast } = useToast();
  const { platform } = platformHooks.useCurrentPlatform();
  
  const { mutate: createCheckoutSession, isPending } = useMutation({
    mutationFn: () => {
        const projectId = authenticationSession.getProjectId();
        if (!projectId) {
            throw new Error("No Project ID found");
        }
        return billingApi.createCheckoutSession(projectId);
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (error) => {
      toast({
        title: t('Error'),
        description: t('Failed to start checkout session'),
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="container py-8 max-w-5xl">
       <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('Billing & Plans')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('Manage your subscription and billing details.')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Plan Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Current Plan')}</CardTitle>
            <CardDescription>{t('You are currently on the Free plan.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>{t('500 Tasks / month')}</span>
             </div>
             <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>{t('Community Support')}</span>
             </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" disabled>{t('Current Plan')}</Button>
          </CardFooter>
        </Card>

        {/* Pro Plan Card */}
        <Card className="border-primary shadow-md">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
                {t('Pro Plan')}
                <span className="text-xl font-bold">$29<span className="text-sm font-normal text-muted-foreground">/mo</span></span>
            </CardTitle>
            <CardDescription>{t('For scaling teams and advanced features.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>{t('Unlimited Tasks')}</span>
             </div>
             <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>{t('Priority Support')}</span>
             </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>{t('Advanced Analytics')}</span>
             </div>
          </CardContent>
          <CardFooter>
            <Button 
                onClick={() => createCheckoutSession()} 
                loading={isPending}
                className="w-full"
            >
                <CreditCard className="mr-2 h-4 w-4" />
                {t('Upgrade to Pro')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
