import { UserInvitation } from '@activepieces/shared';
import { useMutation } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { LoadingSpinner } from '@/components/ui/spinner';
import { INTERNAL_ERROR_TOAST, toast } from '@/components/ui/use-toast';

import { api } from '../../../lib/api';
import { userInvitationApi } from '../lib/user-invitation';

type AcceptInvitationResponse = UserInvitation & {
  registered: boolean;
  projectName?: string;
};

const AcceptInvitation = () => {
  const [isInvitationLinkValid, setIsInvitationLinkValid] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mutate, isPending } = useMutation({
    mutationFn: async (token: string) => {
      const response = await userInvitationApi.accept(token);
      return response;
    },
    onSuccess: (response: AcceptInvitationResponse) => {
      console.log('Accept Invitation Response:', response);
      setIsInvitationLinkValid(true);
      const registered = response.registered;
      if (!registered) {
        const email = searchParams.get('email');
        const companyName = response.projectName;
        const platformId = response.platformId;
        console.log('Redirecting to sign-up with:', {
          email,
          companyName,
          platformId,
        });
        navigate(
          `/sign-up?email=${email}&companyName=${encodeURIComponent(
            companyName || ''
          )}&platformId=${platformId}`
        );
      } else {
        navigate('/sign-in');
      }
    },

    onError: (error) => {
      setIsInvitationLinkValid(false);
      if (api.isError(error)) {
        switch (error.response?.status) {
          case HttpStatusCode.InternalServerError: {
            console.log(error);
            toast(INTERNAL_ERROR_TOAST);
            break;
          }
          default: {
            break;
          }
        }
      }
    },
  });
  useEffect(() => {
    const invitationToken = searchParams.get('token');
    if (!invitationToken) {
      setIsInvitationLinkValid(false);
      return;
    }
    mutate(invitationToken);
  }, [mutate, searchParams]);

  return isPending ? (
    <div className="w-screen h-screen flex justify-center items-center">
      <LoadingSpinner isLarge={true}></LoadingSpinner>
    </div>
  ) : (
    <div className="container mx-auto mt-10 max-w-md">
      {isInvitationLinkValid ? (
        <>
          <p className="text-2xl font-bold text-center">
            {t('Team Invitation Accepted')}
          </p>
          <p className="mt-4 text-lg text-center text-gray-700">
            {t('Thank you for accepting the invitation.')}
          </p>
        </>
      ) : (
        <p className="mt-4 text-lg text-center text-red-500">
          {t('Invalid invitation token. Please try again.')}
        </p>
      )}
    </div>
  );
};
AcceptInvitation.displayName = 'AcceptInvitation';
export { AcceptInvitation };
