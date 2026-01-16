/**
 * TeilFair Logo Icon for React Native
 * Replicates the actual TeilFair logo design
 */

import Svg, {
  Defs,
  LinearGradient,
  Rect,
  Stop,
  Circle,
  Path,
  G,
} from 'react-native-svg';

interface LogoIconProps {
  size?: number;
}

export function LogoIcon({ size = 32 }: LogoIconProps) {
  // Original viewBox is 1000x1000, we scale down
  const scale = size / 48;
  
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
    >
      <Defs>
        {/* Main gradient from the original logo */}
        <LinearGradient
          id="logo-bg-gradient"
          x1="24"
          y1="0"
          x2="24"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#36cdb2" />
          <Stop offset="1" stopColor="#2e61b3" />
        </LinearGradient>
      </Defs>

      {/* Background - same as original */}
      <Rect x="0" y="0" width="48" height="48" rx="8" fill="url(#logo-bg-gradient)" />
      
      {/* Left document (pink/red) - tilted left */}
      <G transform="translate(6, 12) rotate(-14.56, 10, 14)">
        <Rect x="0" y="0" width="16" height="22" rx="2" fill="#f2bdc1" />
        <Path 
          d="M3,6 L13,6 M3,10 L10,10" 
          stroke="#e96474" 
          strokeWidth="1.5" 
          strokeLinecap="round"
        />
        <Circle cx="8" cy="16" r="3.5" fill="#f2bdc1" stroke="#e96474" strokeWidth="1" />
      </G>

      {/* Center document (white/teal) - front */}
      <G transform="translate(14, 8)">
        <Rect x="0" y="0" width="18" height="24" rx="2" fill="#fefefe" />
        <Path 
          d="M3,6 L15,6 M3,10 L12,10" 
          stroke="#5fd9d2" 
          strokeWidth="1.5" 
          strokeLinecap="round"
        />
        <Circle cx="9" cy="17" r="4" fill="#5fd9d2" />
      </G>

      {/* Right document (yellow/gold) - tilted right */}
      <G transform="translate(26, 14) rotate(8, 8, 12)">
        <Rect x="0" y="0" width="14" height="20" rx="2" fill="#fdd827" />
        <Circle cx="7" cy="7" r="3" fill="#ff931e" />
        <Path
          d="M3,14 L7,11 L11,14"
          stroke="#ff931e"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>

      {/* Coin at bottom - split symbol */}
      <G transform="translate(14, 36)">
        <Circle cx="10" cy="5" r="6" fill="#fdd827" stroke="#e39e1e" strokeWidth="0.8" />
        <Path
          d="M10,2 L10,8 M7,5 L13,5"
          stroke="#ff931e"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}
