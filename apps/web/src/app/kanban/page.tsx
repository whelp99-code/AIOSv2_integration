'use client'

import dynamic from 'next/dynamic'

const KanbanBoard = dynamic(
  () => import('@/components/kanban/kanban-board').then(mod => ({ default: mod.KanbanBoard })),
  { ssr: false }
)

export default function KanbanPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Kanban Board</h1>
          <KanbanBoard />
        </div>
      </main>
    </div>
  )
}
