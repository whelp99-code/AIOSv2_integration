'use client'

import { useState } from 'react'

interface KanbanCard {
  id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee?: string
}

interface KanbanColumn {
  id: string
  title: string
  cards: KanbanCard[]
}

const initialColumns: KanbanColumn[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    cards: [
      { id: '1', title: 'Setup database', priority: 'high' },
      { id: '2', title: 'Create API endpoints', priority: 'medium' },
    ],
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    cards: [
      { id: '3', title: 'Implement auth', priority: 'high', assignee: 'John' },
    ],
  },
  {
    id: 'review',
    title: 'Review',
    cards: [
      { id: '4', title: 'Add tests', priority: 'medium', assignee: 'Jane' },
    ],
  },
  {
    id: 'done',
    title: 'Done',
    cards: [
      { id: '5', title: 'Setup monorepo', priority: 'low' },
    ],
  },
]

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800',
}

function KanbanCardComponent({ card }: { card: KanbanCard }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900">{card.title}</h4>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[card.priority]}`}>
          {card.priority}
        </span>
      </div>
      {card.description && (
        <p className="text-xs text-gray-500 mb-2">{card.description}</p>
      )}
      {card.assignee && (
        <div className="flex items-center">
          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs">
            {card.assignee[0]}
          </div>
          <span className="ml-2 text-xs text-gray-500">{card.assignee}</span>
        </div>
      )}
    </div>
  )
}

export function KanbanBoard() {
  const [columns] = useState<KanbanColumn[]>(initialColumns)

  return (
    <div className="flex space-x-4 overflow-x-auto p-4">
      {columns.map((column) => (
        <div key={column.id} className="flex-shrink-0 w-72">
          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              {column.title}
              <span className="ml-2 text-xs text-gray-500">({column.cards.length})</span>
            </h3>
            <div>
              {column.cards.map((card) => (
                <KanbanCardComponent key={card.id} card={card} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
