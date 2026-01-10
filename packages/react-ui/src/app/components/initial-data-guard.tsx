import { useQuery } from '@tanstack/react-query';
import { Suspense } from 'react';

import { useEmbedding } from '@/components/embed-provider';
import { flagsApi } from '@/lib/flags-api';

import { LoadingScreen } from '../../components/ui/loading-screen';

const BackendHealthCheck = ({ children }: { children: React.ReactNode }) => {
  const { isError, isPending, data } = useQuery({
    queryKey: ['flags'],
    queryFn: flagsApi.getAll,
    retry: true,
    retryDelay: 2000,
  });

  const { embedState } = useEmbedding();

  if (isPending || isError || !data) {
    return (
      <LoadingScreen
        brightSpinner={embedState.useDarkBackground}
      ></LoadingScreen>
    );
  }
  return children;
};

type InitialDataGuardProps = {
  children: React.ReactNode;
};
export const InitialDataGuard = ({ children }: InitialDataGuardProps) => {
  return (
    <BackendHealthCheck>
      <Suspense fallback={<></>}>{children}</Suspense>
    </BackendHealthCheck>
  );
};
