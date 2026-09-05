import React from "react";

export const PlantCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs animate-pulse flex flex-col h-full">
      <div className="aspect-4/3 bg-slate-200 w-full" />
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-5 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-200 rounded w-1/2" />
          <div className="h-3 bg-slate-200 rounded w-full mt-2" />
          <div className="h-3 bg-slate-200 rounded w-5/6" />
        </div>
        <div className="flex gap-1.5 pt-2">
          <div className="h-4 bg-slate-200 rounded w-12" />
          <div className="h-4 bg-slate-200 rounded w-16" />
        </div>
      </div>
    </div>
  );
};

export const PlantDetailSkeleton: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse space-y-8">
      <div className="h-4 bg-slate-200 rounded w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-4/3 bg-slate-200 rounded-3xl" />
        <div className="space-y-4">
          <div className="h-8 bg-slate-200 rounded w-2/3" />
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-20 bg-slate-200 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-12 bg-slate-200 rounded-xl" />
            <div className="h-12 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
};
