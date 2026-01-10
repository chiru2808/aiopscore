import { useNavigate, useParams } from 'react-router-dom';
import { ProjectSettingsDialog } from '@/app/components/project-settings';
import { authenticationSession } from '@/lib/authentication-session';

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { section } = useParams();

  const handleClose = () => {
    navigate(authenticationSession.appendProjectRoutePrefix('/flows'));
  };

  return (
    <ProjectSettingsDialog
      open={true}
      onClose={handleClose}
      initialTab={(section as any) || 'general'}
    />
  );
};
