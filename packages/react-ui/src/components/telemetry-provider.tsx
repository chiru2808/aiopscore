import React from 'react';

import { TelemetryEvent } from '@activepieces/shared';

// CE: Telemetry disabled - all tracking functions are no-ops

interface TelemetryProviderProps {
  children: React.ReactNode;
}

const TelemetryProvider = ({ children }: TelemetryProviderProps) => {
  // CE: No telemetry tracking
  const capture = () => {};
  const reset = () => {};

  return (
    <TelemetryContext.Provider value={{ capture, reset }}>
      {children}
    </TelemetryContext.Provider>
  );
};

interface TelemetryContextType {
  capture: (event: TelemetryEvent) => void;
  reset: () => void;
}

const TelemetryContext = React.createContext<TelemetryContextType>({
  capture: () => {},
  reset: () => {},
});

export const useTelemetry = () => React.useContext(TelemetryContext);

export default TelemetryProvider;
