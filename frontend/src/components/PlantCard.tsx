import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ChevronRight, Leaf } from "lucide-react";
import type { Plant } from "../api";
import { getToken, isGuestFavorite, toggleGuestFavorite, apiFetch, getImageUrl } from "../api";

interface PlantCardProps {
  plant: Plant;
  onFavoriteToggle?: (plantId: number, isFav: boolean) => void;
}

const DEFAULT_PLANT_IMAGE = "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=600&q=80";

export const PlantCard: React.FC<PlantCardProps> = ({ plant, onFavoriteToggle }) => {
  const token = getToken();
  const [imgLoaded, setImgLoaded] = useState(false);
  const rawImg = getImageUrl(plant.image_url);
  const [imgSrc, setImgSrc] = useState(rawImg || DEFAULT_PLANT_IMAGE);
  const [isFav, setIsFav] = useState<boolean>(() => {
    if (plant.is_favorite !== undefined) return plant.is_favorite;
    return isGuestFavorite(plant.id);
  });
  const [favLoading, setFavLoading] = useState(false);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (favLoading) return;
    setFavLoading(true);

    const newFavState = !isFav;
    setIsFav(newFavState);

    if (token) {
      try {
        if (newFavState) {
          await apiFetch(`/api/favorites/${plant.id}`, { method: "POST" });
        } else {
          await apiFetch(`/api/favorites/${plant.id}`, { method: "DELETE" });
        }
      } catch (err) {
        setIsFav(!newFavState); // Revert on failure
      }
    } else {
      toggleGuestFavorite(plant.id);
    }

    setFavLoading(false);
    if (onFavoriteToggle) {
      onFavoriteToggle(plant.id, newFavState);
    }
  };

  const plantSlug = plant.slug || String(plant.id);

  return (
    <div className="group relative bg-white border border-emerald-900/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
      {/* Image container with aspect ratio */}
      <div className="relative aspect-4/3 w-full bg-emerald-50/50 overflow-hidden">
        {!imgLoaded && (
          <div className="absolute inset-0 bg-emerald-100/50 animate-pulse flex items-center justify-center text-emerald-300">
            <Leaf className="w-8 h-8 opacity-40 animate-bounce" />
          </div>
        )}
        <img
          src={imgSrc}
          alt={plant.common_name}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            setImgSrc(DEFAULT_PLANT_IMAGE);
            setImgLoaded(true);
          }}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            imgLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Region / Family Badge */}
        {plant.family && (
          <span className="absolute top-3 left-3 bg-emerald-950/70 backdrop-blur-md text-emerald-100 text-[11px] font-medium px-2.5 py-1 rounded-full border border-emerald-500/20">
            Họ {plant.family}
          </span>
        )}

        {/* Save Favorite Button */}
        <button
          onClick={handleToggleFavorite}
          aria-label={isFav ? "Bỏ lưu cây" : "Lưu cây yêu thích"}
          className={`absolute top-3 right-3 p-2.5 rounded-full transition-all duration-200 shadow-md ${
            isFav
              ? "bg-red-500 text-white hover:bg-red-600 scale-105"
              : "bg-white/80 hover:bg-white text-slate-600 hover:text-red-500 backdrop-blur-md"
          }`}
        >
          <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* Card Content */}
      <div className="p-4 md:p-5 flex-1 flex flex-col justify-between">
        <div>
          <Link to={`/plants/${plantSlug}`} className="block group-hover:text-emerald-700 transition-colors">
            <h3 className="font-bold text-slate-800 text-lg md:text-xl line-clamp-1">
              {plant.common_name}
            </h3>
          </Link>
          {plant.scientific_name && (
            <p className="text-xs text-slate-500 italic mt-0.5 font-serif line-clamp-1">
              {plant.scientific_name}
            </p>
          )}

          {/* Other names or Used parts */}
          {plant.used_parts && (
            <p className="text-xs text-emerald-700 mt-2 font-medium bg-emerald-50 px-2 py-0.5 rounded inline-block">
              Dùng: {plant.used_parts}
            </p>
          )}

          {/* Description snippet */}
          {plant.description && (
            <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
              {plant.description}
            </p>
          )}

          {/* Tags */}
          {plant.tags && plant.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {plant.tags.slice(0, 3).map((t) => (
                <span
                  key={t.id}
                  className="bg-slate-100 text-slate-700 text-[11px] px-2 py-0.5 rounded-md font-medium"
                >
                  #{t.tag_name}
                </span>
              ))}
              {plant.tags.length > 3 && (
                <span className="text-[10px] text-slate-400 self-center font-medium">
                  +{plant.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action link */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Tra cứu dược học</span>
          <Link
            to={`/plants/${plantSlug}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 group-hover:text-emerald-800 group-hover:translate-x-0.5 transition-all"
          >
            <span>Chi tiết</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PlantCard;
