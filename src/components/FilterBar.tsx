'use client'

import { CalendarDays, Filter, LayoutGrid, List, Search } from 'lucide-react'
import React from 'react'

type ViewMode = 'grid' | 'list'
type SortBy = 'recent' | 'price_high' | 'price_low'

interface FilterBarProps {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  filterFromDate?: string
  setFilterFromDate?: (value: string) => void

  searchTerm?: string
  setSearchTerm?: (value: string) => void

  selectedSpecialty?: string
  setSelectedSpecialty?: (value: string) => void

  sortBy?: SortBy
  setSortBy?: (value: SortBy) => void

  uniqueSpecialties?: string[]
}

export function FilterBar({
  viewMode,
  setViewMode,
  filterFromDate = '',
  setFilterFromDate,
  searchTerm = '',
  setSearchTerm,
  selectedSpecialty = 'Todas',
  setSelectedSpecialty,
  sortBy = 'recent',
  setSortBy,
  uniqueSpecialties = ['Todas'],
}: FilterBarProps) {
  const handleDateChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (setFilterFromDate) setFilterFromDate(e.target.value)
  }

  const handleSearchChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (setSearchTerm) setSearchTerm(e.target.value)
  }

  const handleSpecialtyChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    if (setSelectedSpecialty) setSelectedSpecialty(e.target.value)
  }

  const handleSortChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    if (setSortBy) setSortBy(e.target.value as SortBy)
  }

  return (
    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          {/* Desde fecha */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">Desde fecha</label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={filterFromDate}
                onChange={handleDateChange}
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-700 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-blue-500 sm:w-[150px]"
              />
            </div>
          </div>

          {/* Buscar */}
          <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">Buscar</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por título o institución..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-700 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Especialidad */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">Especialidad</label>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedSpecialty}
                onChange={handleSpecialtyChange}
                className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm font-medium text-slate-700 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-blue-500 sm:w-[170px]"
              >
                {uniqueSpecialties.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                ▾
              </span>
            </div>
          </div>

          {/* Ordenar */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">Ordenar</label>
            <div className="relative">
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-blue-500 sm:w-[190px]"
              >
                <option value="recent">Más recientes primero</option>
                <option value="price_low">Menor precio</option>
                <option value="price_high">Mayor precio</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                ▾
              </span>
            </div>
          </div>
        </div>

        {/* Toggle de vista */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Vista</label>
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex h-8 flex-1 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              aria-label="Vista grilla"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`ml-1 flex h-8 flex-1 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              aria-label="Vista lista"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

