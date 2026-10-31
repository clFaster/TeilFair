/**
 * TeilFair Logo Icon
 * Uses the actual TeilFair logo SVG
 */

interface LogoIconProps {
  size?: number;
  className?: string;
  /** Hide from assistive tech when the app name is already shown next to it. */
  decorative?: boolean;
}

export function LogoIcon({ size = 32, className, decorative = false }: Readonly<LogoIconProps>) {
  return (
    <img
      src="/teilfair-logo.svg"
      alt={decorative ? '' : 'TeilFair'}
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}
