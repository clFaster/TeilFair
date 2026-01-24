/**
 * TeilFair Logo Icon
 * Uses the actual TeilFair logo SVG
 */

interface LogoIconProps {
  size?: number;
  className?: string;
}

export function LogoIcon({ size = 32, className }: Readonly<LogoIconProps>) {
  return (
    <img
      src="/teilfair-logo.svg"
      alt="TeilFair"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}
