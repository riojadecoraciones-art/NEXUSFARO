import React, { useState } from 'react';
import { Package, Coffee, Wine, Sparkles, Cigarette, ShoppingBag } from 'lucide-react';
import { ProductCategory } from '../types';

interface ProductImageProps {
  src?: string;
  alt: string;
  category?: ProductCategory;
  className?: string;
  fallbackClassName?: string;
  iconSize?: 'sm' | 'md' | 'lg';
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  category = '',
  className = 'w-full h-full object-contain',
  fallbackClassName = 'w-full h-full flex flex-col items-center justify-center bg-slate-100/90 text-slate-400 p-2',
  iconSize = 'md',
}) => {
  const [hasError, setHasError] = useState<boolean>(false);

  // Return fallback if no source, error loading, or whitespace
  if (!src || !src.trim() || hasError) {
    const sizeMap = {
      sm: 'w-4 h-4',
      md: 'w-8 h-8',
      lg: 'w-12 h-12',
    };
    const iconClass = sizeMap[iconSize] || 'w-8 h-8';

    // Category styling color hints
    const catLower = category.toLowerCase();
    let bgTint = 'bg-slate-100 text-slate-400';
    let CatIcon = Package;

    if (catLower.includes('bebida') || catLower.includes('drink')) {
      bgTint = 'bg-blue-50 text-blue-400';
      CatIcon = Wine;
    } else if (catLower.includes('café') || catLower.includes('cafe') || catLower.includes('panad') || catLower.includes('bakery')) {
      bgTint = 'bg-amber-50 text-amber-500';
      CatIcon = Coffee;
    } else if (catLower.includes('snack') || catLower.includes('aperitivo')) {
      bgTint = 'bg-orange-50 text-orange-400';
      CatIcon = Sparkles;
    } else if (catLower.includes('cigar') || catLower.includes('tabaco')) {
      bgTint = 'bg-stone-100 text-stone-500';
      CatIcon = Cigarette;
    }

    return (
      <div className={`${fallbackClassName} ${bgTint} select-none transition-colors`}>
        <CatIcon className={`${iconClass} opacity-80`} />
        {iconSize !== 'sm' && (
          <span className="text-[10px] font-semibold text-slate-500 text-center uppercase tracking-tight line-clamp-1 mt-1">
            {category || 'Sin foto'}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
      loading="lazy"
    />
  );
};
