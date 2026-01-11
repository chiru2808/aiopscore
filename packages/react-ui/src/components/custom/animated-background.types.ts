export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

export interface AnimationConfig {
  particleCount: number;
  particleSize: number;
  particleSpeed: number;
  connectionDistance: number;
  proximityRadius: number;
  minOpacity: number;
  maxOpacity: number;
}

export interface ThemeColors {
  particleColor: string;
  lineColor: string;
  backgroundColor: string;
}

export interface AnimatedBackgroundProps {
  className?: string;
  config?: Partial<AnimationConfig>;
  isDarkMode?: boolean;
}
