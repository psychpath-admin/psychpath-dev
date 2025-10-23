import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import type { AgendaItem, CreateAgendaItemRequest } from '@/types/supervisionAgenda';
import { getAgendaItems, createAgendaItem, updateAgendaItem, deleteAgendaItem, getSupervisionAgendas } from '@/lib/api';

interface SupervisionAgendaPanelProps {
  onClose?: () => void;
}

export default function SupervisionAgendaPanel({ 
  onClose 
}: SupervisionAgendaPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AgendaItem[]>([]);
  
  // Form states
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [newItem, setNewItem] = useState<CreateAgendaItemRequest>({
    title: '',
    detail: '',
    priority: 'medium',
    source_type: 'FREE',
    agenda: 0 // Will be set when creating
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current week agenda first
      const agenda = await getSupervisionAgendas();
      if (agenda.length > 0) {
        setNewItem(prev => ({ ...prev, agenda: agenda[0].id }));
        // Then get items for this agenda
        const agendaItems = await getAgendaItems();
        setItems(agendaItems);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async () => {
    if (!newItem.title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setError(null);
      const createdItem = await createAgendaItem(newItem);
      setItems(prev => [...prev, createdItem]);
      setNewItem({
        title: '',
        detail: '',
        priority: 'medium',
        source_type: 'FREE',
        agenda: newItem.agenda
      });
      setShowCreateItem(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
    }
  };

  const handleUpdateItem = async (id: number, updates: Partial<AgendaItem>) => {
    try {
      const updatedItem = await updateAgendaItem(id, updates);
      setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await deleteAgendaItem(id);
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading supervision agenda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Item and Close buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Supervision Agenda</h2>
          <p className="text-gray-600">Private agenda items for your supervision sessions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateItem(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Item
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Create Item Form */}
      {showCreateItem && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Agenda Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <Input
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="Enter agenda item title"
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Details
              </label>
              <Textarea
                value={newItem.detail}
                onChange={(e) => setNewItem({ ...newItem, detail: e.target.value })}
                placeholder="Enter additional details"
                rows={3}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <Select
                  value={newItem.priority}
                  onValueChange={(value: 'low' | 'medium' | 'high') => 
                    setNewItem({ ...newItem, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <Select
                  value={newItem.source_type}
                  onValueChange={(value: 'A' | 'B' | 'FREE') => 
                    setNewItem({ ...newItem, source_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE">Free-typed</SelectItem>
                    <SelectItem value="A">Section A</SelectItem>
                    <SelectItem value="B">Section B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateItem} className="flex-1">
                Create Item
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateItem(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      <div className="space-y-4">
        {items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 mb-4">No agenda items yet</p>
              <Button onClick={() => setShowCreateItem(true)}>
                Add your first item
              </Button>
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">{item.title}</h3>
                    {item.detail && (
                      <p className="text-gray-600 text-sm mb-2">{item.detail}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Priority: {item.priority}</span>
                      <span>Status: {item.status}</span>
                      <span>Source: {item.source_type}</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleUpdateItem(item.id, { 
                        status: item.status === 'open' ? 'discussed' : 'open' 
                      })}
                    >
                      {item.status === 'open' ? 'Mark Discussed' : 'Reopen'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}