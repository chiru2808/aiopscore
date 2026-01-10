import { cn } from '../lib/utils';

type ShowPoweredByProps = {
  show: boolean;
  position?: 'sticky' | 'absolute' | 'static';
};
const ShowPoweredBy = ({ show, position = 'sticky' }: ShowPoweredByProps) => {
  // Watermark removed for AIOps branding
  return null;
};

ShowPoweredBy.displayName = 'ShowPoweredBy';
export { ShowPoweredBy };
