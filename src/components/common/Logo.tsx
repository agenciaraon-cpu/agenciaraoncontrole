import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  collapsed?: boolean;
  customLogoUrl?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  collapsed = false,
  customLogoUrl,
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
  };

  const iconSizes = {
    sm: 28,
    md: 36,
    lg: 48,
  };

  const currentIconSize = iconSizes[size];

  // Use the official uploaded Agência Raon logo as default
  const effectiveSrc = !imgError ? (customLogoUrl || '/assets/aistudio/raon_1c84cc29.png') : null;

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {effectiveSrc ? (
        <img
          src={effectiveSrc}
          alt="Agência Raon"
          onError={() => setImgError(true)}
          className={`${sizeClasses[size]} w-auto max-w-[190px] object-contain transition-all duration-200`}
        />
      ) : (
        <div className="relative flex items-center justify-center shrink-0">
          <svg
            width={currentIconSize}
            height={currentIconSize}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="transform transition-transform hover:scale-105 duration-200"
          >
            <rect width="100" height="100" rx="24" fill="#102B59" />
            <circle cx="50" cy="50" r="38" fill="url(#raonGlow)" opacity="0.4" />
            <path d="M44 64C44 74 50 84 50 84C50 84 56 74 56 64L44 64Z" fill="#FF7817" />
            <path d="M47 64C47 70 50 76 50 76C50 76 53 70 53 64L47 64Z" fill="#FFA84A" />
            <path d="M34 52C34 52 28 58 26 66C32 66 38 62 40 58L34 52Z" fill="#0878D9" />
            <path d="M66 52C66 52 72 58 74 66C68 66 62 62 60 58L66 52Z" fill="#0878D9" />
            <path d="M50 16C42 28 38 42 38 60L62 60C62 42 58 28 50 16Z" fill="#FFFFFF" />
            <path d="M50 16C47 22 45 28 44 32H56C55 28 53 22 50 16Z" fill="#FF7817" />
            <circle cx="50" cy="42" r="6" fill="#0878D9" />
            <circle cx="48.5" cy="40.5" r="2" fill="#FFFFFF" opacity="0.8" />
            <defs>
              <radialGradient id="raonGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(50 50) rotate(90) scale(40)">
                <stop stopColor="#0878D9" />
                <stop offset="1" stopColor="#102B59" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      )}

      {!collapsed && (
        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#FF7817] text-white shadow-xs shrink-0">
          PAINEL
        </span>
      )}
    </div>
  );
};
