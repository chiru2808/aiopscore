import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  AnimatedBackgroundProps,
  AnimationConfig,
  Particle,
  ThemeColors,
} from './animated-background.types';

const DEFAULT_CONFIG: AnimationConfig = {
  particleCount: 80,
  particleSize: 3,
  particleSpeed: 0.3,
  connectionDistance: 150,
  proximityRadius: 200,
  minOpacity: 0,
  maxOpacity: 1,
};

const LIGHT_THEME_COLORS: ThemeColors = {
  particleColor: 'rgba(100, 100, 100, 1)',
  lineColor: 'rgba(150, 150, 150, 0.6)',
  backgroundColor: '#ffffff',
};

const DARK_THEME_COLORS: ThemeColors = {
  particleColor: 'rgba(140, 140, 140, 1)',
  lineColor: 'rgba(120, 120, 120, 0.6)',
  backgroundColor: '#1a1e23',
};

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  className,
  config: userConfig,
  isDarkMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();
  const mousePositionRef = useRef({ x: -1000, y: -1000 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const config: AnimationConfig = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const colors = isDarkMode ? DARK_THEME_COLORS : LIGHT_THEME_COLORS;

  // Initialize particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateDimensions = () => {
      const rect = canvas.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Create particles when dimensions change
  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return;

    particlesRef.current = Array.from(
      { length: config.particleCount },
      () => ({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        vx: (Math.random() - 0.5) * config.particleSpeed,
        vy: (Math.random() - 0.5) * config.particleSpeed,
        size: config.particleSize,
      }),
    );
  }, [dimensions, config.particleCount, config.particleSpeed, config.particleSize]);

  // Handle mouse movement
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePositionRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mousePositionRef.current = { x: -1000, y: -1000 };
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = colors.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      const mouse = mousePositionRef.current;

      // Update and draw particles
      particles.forEach((particle, i) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Keep particles within bounds
        particle.x = Math.max(0, Math.min(canvas.width, particle.x));
        particle.y = Math.max(0, Math.min(canvas.height, particle.y));

        // Calculate distance from mouse
        const dx = particle.x - mouse.x;
        const dy = particle.y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate opacity based on proximity
        let opacity = config.minOpacity;
        if (distance < config.proximityRadius) {
          opacity =
            config.maxOpacity -
            (distance / config.proximityRadius) * (config.maxOpacity - config.minOpacity);
        }

        // Draw particle
        if (opacity > 0.05) {
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fillStyle = colors.particleColor.replace(/[\d.]+\)$/g, `${opacity})`);
          ctx.fill();
        }

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const other = particles[j];
          const dx2 = particle.x - other.x;
          const dy2 = particle.y - other.y;
          const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);

          if (dist < config.connectionDistance) {
            // Calculate opacity for line based on both particles' proximity to mouse
            const dx1Mouse = particle.x - mouse.x;
            const dy1Mouse = particle.y - mouse.y;
            const dist1 = Math.sqrt(dx1Mouse * dx1Mouse + dy1Mouse * dy1Mouse);

            const dx2Mouse = other.x - mouse.x;
            const dy2Mouse = other.y - mouse.y;
            const dist2 = Math.sqrt(dx2Mouse * dx2Mouse + dy2Mouse * dy2Mouse);

            // Use the minimum opacity of the two particles
            let lineOpacity1 = config.minOpacity;
            if (dist1 < config.proximityRadius) {
              lineOpacity1 =
                config.maxOpacity -
                (dist1 / config.proximityRadius) *
                  (config.maxOpacity - config.minOpacity);
            }

            let lineOpacity2 = config.minOpacity;
            if (dist2 < config.proximityRadius) {
              lineOpacity2 =
                config.maxOpacity -
                (dist2 / config.proximityRadius) *
                  (config.maxOpacity - config.minOpacity);
            }

            const lineOpacity = Math.min(lineOpacity1, lineOpacity2);

            // Fade based on distance between particles
            const connectionOpacity =
              lineOpacity * (1 - dist / config.connectionDistance);

            if (connectionOpacity > 0.05) {
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(other.x, other.y);
              ctx.strokeStyle = colors.lineColor.replace(
                /[\d.]+\)$/g,
                `${connectionOpacity})`,
              );
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dimensions, config, colors]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('absolute inset-0 pointer-events-none', className)}
      style={{ zIndex: 0 }}
    />
  );
};

AnimatedBackground.displayName = 'AnimatedBackground';
