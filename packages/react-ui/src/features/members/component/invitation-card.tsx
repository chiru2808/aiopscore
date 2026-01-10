import { t } from 'i18next';
import { Trash, Send } from 'lucide-react';

import { PermissionNeededTooltip } from '@/components/custom/permission-needed-tooltip';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useAuthorization } from '@/hooks/authorization-hooks';
import {
  Permission,
  UserInvitation,
  InvitationType,
} from '@activepieces/shared';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';

import { ConfirmationDeleteDialog } from '../../../components/delete-dialog';
import { Button } from '../../../components/ui/button';
import { userInvitationApi } from '../lib/user-invitation';
import { userInvitationsHooks } from '../lib/user-invitations-hooks';

export function InvitationCard({ invitation }: { invitation: UserInvitation }) {
  const { refetch } = userInvitationsHooks.useInvitations();
  const { checkAccess } = useAuthorization();
  const userHasPermissionToRemoveInvitation = checkAccess(
    Permission.WRITE_INVITATION
  );
  async function deleteInvitation() {
    await userInvitationApi.delete(invitation.id);
    refetch();
  }

  const { mutate: resend, isPending } = useMutation({
    mutationFn: userInvitationApi.invite,
    onSuccess: () => {
      toast({
        title: t('Success'),
        description: t('Invitation resent successfully'),
      });
    },
    onError: () => {
      toast({
        title: t('Error'),
        description: t('Failed to resend invitation'),
        variant: 'destructive',
      });
    },
  });

  const resendInvitation = () => {
    if (
      invitation.type === InvitationType.PROJECT &&
      invitation.projectId &&
      invitation.projectRole
    ) {
      resend({
        type: InvitationType.PROJECT,
        email: invitation.email,
        projectId: invitation.projectId,
        projectRole: invitation.projectRole.type,
      });
    } else if (
      invitation.type === InvitationType.PLATFORM &&
      invitation.platformRole
    ) {
      resend({
        type: InvitationType.PLATFORM,
        email: invitation.email,
        platformRole: invitation.platformRole,
      });
    }
  };

  return (
    <div
      className="flex items-center justify-between space-x-4"
      key={invitation.id}
    >
      <div className="flex items-center space-x-4">
        <UserAvatar
          name={invitation.email}
          email={invitation.email}
          size={32}
          disableTooltip={true}
        ></UserAvatar>
        <div>
          <p className="text-sm font-medium leading-none">
            {invitation.email} ({invitation.projectRole?.name})
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          className="size-8 p-0"
          onClick={() => resendInvitation()}
          loading={isPending}
        >
          <Send className="size-4" />
        </Button>
        <PermissionNeededTooltip
          hasPermission={userHasPermissionToRemoveInvitation}
        >
          <ConfirmationDeleteDialog
            mutationFn={() => deleteInvitation()}
            entityName={invitation.email}
            title={t('Remove {email}', { email: invitation.email })}
            message={t('Are you sure you want to remove this invitation?')}
          >
            <Button
              disabled={!userHasPermissionToRemoveInvitation}
              variant="ghost"
              className="size-8 p-0"
            >
              <Trash className="text-destructive size-4" />
            </Button>
          </ConfirmationDeleteDialog>
        </PermissionNeededTooltip>
      </div>
    </div>
  );
}
