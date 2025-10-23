import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import type { AgendaItem, CreateAgendaItemRequest } from '@/types/supervisionAgenda';
import { getAgendaItems, createAgendaItem, updateAgendaItem, deleteAgendaItem, getSupervisionAgendas, importAgendaItemsToSectionC } from '@/lib/api';

interface SupervisionAgendaPanelProps {
  onClose?: () => void;
  sectionCUuid?: string; // For importing to Section C
  onImport?: (importedText: string) => void; // Callback when items are imported
}

export default function SupervisionAgendaPanel({ 
  onClose,
  sectionCUuid,
  onImport
}: SupervisionAgendaPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [agendas, setAgendas] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Form states
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [newItem, setNewItem] = useState<CreateAgendaItemRequest>({
    title: '',
    detail: '',
    priority: 'medium',
    source_type: 'FREE',
    agenda: 0 // Will be set when creating
  });

  // Import states
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all agendas first
      const agendaList = await getSupervisionAgendas();
      setAgendas(agendaList);
      
      if (agendaList.length > 0) {
        // Calculate next week's Monday (current week + 7 days)
        const today = new Date()
        const currentWeekStart = new Date(today)
        currentWeekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))
        const nextWeekStart = new Date(currentWeekStart)
        nextWeekStart.setDate(currentWeekStart.getDate() + 7)
        
        // Look for next week's agenda first, fallback to first available
        let defaultAgenda = agendaList.find(agenda => 
          agenda.week_starting === nextWeekStart.toISOString().split('T')[0]
        ) || agendaList[0];
        
        setNewItem(prev => ({ ...prev, agenda: defaultAgenda.id }));
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
      await createAgendaItem(newItem);
      
      // Refresh all data to ensure we have the latest items and agendas
      await loadData();
      
      // Set the selected week to match the agenda of the created item
      const createdAgenda = agendas.find(agenda => agenda.id === newItem.agenda);
      if (createdAgenda) {
        setSelectedWeek(createdAgenda.week_starting);
      }
      
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

  const handleItemSelection = (itemId: number, selected: boolean) => {
    if (selected) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleImportToSectionC = async () => {
    if (!sectionCUuid || selectedItems.length === 0) return;

    try {
      setImporting(true);
      const result = await importAgendaItemsToSectionC({
        section_c_uuid: sectionCUuid,
        item_ids: selectedItems,
        entry_type: 'comment'
      });

      // Combine imported text from the new response format
      const importedText = result.imported_items.join('\n\n');
      
      // Call the callback to add text to Section C
      if (onImport) {
        onImport(importedText);
      }

      // Refresh items to show updated status
      await loadData();
      setSelectedItems([]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import items');
    } finally {
      setImporting(false);
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
      {/* Header with Week Selector, Add Item and Close buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Supervision Agenda</h2>
          <p className="text-gray-600">Private agenda items for your supervision sessions</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedWeek || 'all'} onValueChange={(val) => setSelectedWeek(val === 'all' ? null : val)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All weeks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All weeks</SelectItem>
              {agendas.map(agenda => (
                <SelectItem key={agenda.id} value={agenda.week_starting}>
                  Week of {agenda.week_starting_display}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button 
              variant={statusFilter === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            <Button 
              variant={statusFilter === 'open' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setStatusFilter('open')}
            >
              Open
            </Button>
            <Button 
              variant={statusFilter === 'discussed' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setStatusFilter('discussed')}
            >
              Discussed
            </Button>
            <Button 
              variant={statusFilter === 'carried' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setStatusFilter('carried')}
            >
              Carried
            </Button>
          </div>
          <div className="flex gap-2">
          {sectionCUuid && selectedItems.length > 0 && (
            <Button 
              onClick={handleImportToSectionC}
              disabled={importing}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              {importing ? 'Importing...' : `Import ${selectedItems.length} Item${selectedItems.length > 1 ? 's' : ''}`}
            </Button>
          )}
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
        {(() => {
          // Filter items based on selected week and status
          let filteredItems = selectedWeek 
            ? items.filter(item => {
                // Find the agenda for this item and check if it matches selected week
                const itemAgenda = agendas.find(agenda => agenda.id === item.agenda);
                return itemAgenda && itemAgenda.week_starting === selectedWeek;
              })
            : items;
          
          // Apply status filter
          if (statusFilter !== 'all') {
            filteredItems = filteredItems.filter(item => item.status === statusFilter);
          }
          
          if (filteredItems.length === 0) {
            // Generate context-aware empty state message
            let emptyMessage = '';
            const hasWeekFilter = selectedWeek !== null;
            const hasStatusFilter = statusFilter !== 'all';
            
            if (hasWeekFilter && hasStatusFilter) {
              const weekDisplay = agendas.find(a => a.week_starting === selectedWeek)?.week_starting_display || selectedWeek;
              emptyMessage = `No ${statusFilter} items for the week of ${weekDisplay}`;
            } else if (hasWeekFilter) {
              const weekDisplay = agendas.find(a => a.week_starting === selectedWeek)?.week_starting_display || selectedWeek;
              emptyMessage = `No items for the week of ${weekDisplay}`;
            } else if (hasStatusFilter) {
              emptyMessage = `No ${statusFilter} items found`;
            } else {
              emptyMessage = 'No agenda items yet';
            }
            
            return (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500 mb-4">{emptyMessage}</p>
                  {!hasWeekFilter && !hasStatusFilter && (
                    <Button onClick={() => setShowCreateItem(true)}>
                      Add your first item
                    </Button>
                  )}
                  {(hasWeekFilter || hasStatusFilter) && (
                    <p className="text-gray-400 text-sm">
                      Try adjusting your filters or <button onClick={() => setShowCreateItem(true)} className="text-blue-600 hover:underline">add a new item</button>
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          }
          
          return filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {sectionCUuid && item.status === 'open' && (
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => handleItemSelection(item.id, e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">{item.title}</h3>
                        <Badge 
                          variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'secondary' : 'outline'}
                          className={`text-xs font-medium ${
                            item.priority === 'high' 
                              ? 'bg-red-100 text-red-800 border-red-200' 
                              : item.priority === 'medium' 
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {item.priority.toUpperCase()}
                        </Badge>
                      </div>
                      {item.detail && (
                        <p className="text-gray-600 text-sm mb-2">{item.detail}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Status: {item.status}</span>
                        <span>Source: {item.source_type}</span>
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select 
                      value={item.status} 
                      onValueChange={(newStatus) => handleUpdateItem(item.id, { status: newStatus })}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="discussed">Discussed</SelectItem>
                        <SelectItem value="carried">Carried Forward</SelectItem>
                        <SelectItem value="discarded">Discarded</SelectItem>
                      </SelectContent>
                    </Select>
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
          ));
        })()}
      </div>
    </div>
  );
}