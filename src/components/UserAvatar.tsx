import React, { useState } from 'react';

interface UserAvatarProps {
  avatarUrl?: string;
  name: string;
  initials?: string;
  /** Tamaño, forma, borde y sombra — se aplica tanto a la foto como al respaldo de iniciales. */
  className: string;
  /** Color de fondo/texto y tamaño de letra del respaldo (cuando no hay foto o la que había dejó de cargar). */
  fallbackClassName?: string;
}

/**
 * Avatar de usuario con respaldo automático a iniciales. Sin esto, una URL
 * de foto rota (link viejo, servicio caído) hace que el navegador muestre su
 * ícono nativo de "imagen rota" — daba la sensación de un sistema
 * descuidado. Mismo patrón que ya usa ProductImage.tsx para fotos de
 * producto: se intenta cargar, y si falla se cae al respaldo, sin
 * depender de ningún servicio externo de terceros.
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  name,
  initials,
  className,
  fallbackClassName = 'bg-slate-900 text-white',
}) => {
  const [hasError, setHasError] = useState(false);
  const trimmedUrl = avatarUrl?.trim();

  if (trimmedUrl && !hasError) {
    return (
      <img
        src={trimmedUrl}
        alt={name}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setHasError(true)}
        className={`${className} object-cover`}
      />
    );
  }

  const label = (initials || name || 'U').trim().slice(0, 2).toUpperCase() || 'U';
  return (
    <div className={`${className} ${fallbackClassName} font-black flex items-center justify-center select-none`}>
      {label}
    </div>
  );
};
