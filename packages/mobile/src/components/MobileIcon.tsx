import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

export type MobileIconName =
  | 'settings'
  | 'globe'
  | 'moon'
  | 'sun'
  | 'share'
  | 'edit'
  | 'plus'
  | 'back'
  | 'check'
  | 'trash'
  | 'receipt'
  | 'users'
  | 'balance'
  | 'close'
  | 'open';

interface MobileIconProps {
  name: MobileIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function MobileIcon({
  name,
  size = 20,
  color = '#0a0f0e',
  strokeWidth = 2,
}: MobileIconProps) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'settings' && (
        <>
          <Circle cx="12" cy="12" r="3" {...common} />
          <Path
            d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6.9Z"
            {...common}
          />
        </>
      )}
      {name === 'globe' && (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" {...common} />
        </>
      )}
      {name === 'moon' && <Path d="M21 14.6A8.5 8.5 0 0 1 9.4 3 7 7 0 1 0 21 14.6Z" {...common} />}
      {name === 'sun' && (
        <>
          <Circle cx="12" cy="12" r="4" {...common} />
          <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...common} />
        </>
      )}
      {name === 'share' && (
        <>
          <Circle cx="18" cy="5" r="3" {...common} />
          <Circle cx="6" cy="12" r="3" {...common} />
          <Circle cx="18" cy="19" r="3" {...common} />
          <Path d="M8.6 10.6 15.4 6.4M8.6 13.4l6.8 4.2" {...common} />
        </>
      )}
      {name === 'edit' && (
        <>
          <Path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" {...common} />
          <Path d="m14 8 2 2" {...common} />
        </>
      )}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...common} />}
      {name === 'back' && <Path d="M15 18 9 12l6-6" {...common} />}
      {name === 'check' && <Path d="m5 12 4 4L19 6" {...common} />}
      {name === 'trash' && (
        <>
          <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" {...common} />
        </>
      )}
      {name === 'receipt' && (
        <>
          <Path d="M7 3h10v18l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3V3Z" {...common} />
          <Line x1="9" y1="8" x2="15" y2="8" {...common} />
          <Line x1="9" y1="12" x2="15" y2="12" {...common} />
          <Line x1="9" y1="16" x2="13" y2="16" {...common} />
        </>
      )}
      {name === 'users' && (
        <>
          <Circle cx="9" cy="8" r="3" {...common} />
          <Path d="M3.5 19a5.5 5.5 0 0 1 11 0" {...common} />
          <Path d="M16 11a3 3 0 0 0 0-6M17 14a5 5 0 0 1 3.5 5" {...common} />
        </>
      )}
      {name === 'balance' && (
        <>
          <Path d="M12 3v18M5 6h14M7 6l-4 7h8L7 6ZM17 6l-4 7h8l-4-7Z" {...common} />
        </>
      )}
      {name === 'close' && <Path d="M6 6l12 12M18 6 6 18" {...common} />}
      {name === 'open' && (
        <>
          <Rect x="5" y="5" width="14" height="14" rx="2" {...common} />
          <Path d="M10 14 15 9M11 9h4v4" {...common} />
        </>
      )}
    </Svg>
  );
}
