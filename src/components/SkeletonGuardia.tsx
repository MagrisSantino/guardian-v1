export default function SkeletonGuardia() {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between animate-pulse h-[280px]">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-1/2">
            <div className="h-4 bg-slate-200 rounded mb-2 w-3/4"></div>
            <div className="h-3 bg-slate-100 rounded w-1/2"></div>
          </div>
          <div className="h-6 bg-slate-200 rounded w-1/4"></div>
        </div>
        
        <div className="h-6 bg-slate-200 rounded mb-4 w-5/6 mt-6"></div>
        
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="h-4 bg-slate-100 rounded w-2/3"></div>
          <div className="h-4 bg-slate-100 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  )
}