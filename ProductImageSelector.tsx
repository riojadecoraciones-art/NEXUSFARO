import React, { useRef, useState } from 'react';
import { Upload, Link as LinkIcon, Trash2, Image as ImageIcon, Check } from 'lucide-react';
import { ProductImage } from './ProductImage';

interface ProductImageSelectorProps {
  imageUrl: string;
  onChange: (url: string) => void;
  category: string;
  productName?: string;
}

export const ProductImageSelector: React.FC<ProductImageSelectorProps> = ({
  imageUrl,
  onChange,
  category,
  productName = 'Producto',
}) => {
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState<string>(imageUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es demasiado grande. Por favor selecciona una imagen menor a 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onChange(dataUrl);
        setUrlInput(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    onChange(urlInput.trim());
  };

  const handleRemoveImage = () => {
    onChange('');
    setUrlInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
          <span>Imagen del Producto</span>
        </label>
        
        {/* Toggle tabs between Local Upload and URL */}
        <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              tab === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Subir Archivo
          </button>
          <button
            type="button"
            onClick={() => setTab('url')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              tab === 'url' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Enlace / URL
          </button>
        </div>
      </div>

      {/* Preview and Controls Area */}
      <div className="flex items-center gap-4">
        {/* Live Visual Preview */}
        <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 p-1.5 shrink-0 overflow-hidden shadow-2xs relative group">
          <ProductImage
            src={imageUrl}
            alt={productName}
            category={category}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Dynamic Controls based on tab */}
        <div className="flex-1 min-w-0 space-y-2">
          {tab === 'upload' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="product-image-file-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 shadow-2xs hover:border-slate-400 transition-all"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Elegir foto de mi biblioteca / dispositivo</span>
              </button>
              <p className="text-[10px] text-slate-400 mt-1">Soporta JPG, PNG, WEBP (hasta 5MB)</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://ejemplo.com/foto.jpg"
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Remove image button if one is set */}
          {imageUrl && (
            <button
              type="button"
              onClick={handleRemoveImage}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Quitar imagen y usar ícono de categoría</span>
            </button>
          )}
        </div>
      </div>

      {/* Informational reassurance badge */}
      <div className="p-2 bg-blue-50/70 border border-blue-200/60 rounded-xl text-[11px] text-blue-900">
        {!imageUrl ? (
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            <span>
              <strong>Sin foto elegida:</strong> El producto se identificará con el ícono y color de <em>{category}</em>. No se asignará ninguna imagen ajena.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 font-medium text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Foto personalizada lista y asignada al producto.</span>
          </div>
        )}
      </div>
    </div>
  );
};
