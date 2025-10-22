import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar, Clock, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { 
  MySupervisionAgenda, 
  AgendaItem, 
  CreateAgendaItemRequest 
} from '@/types/supervisionAgenda';
import { 
  getSupervisionAgendas, 
  createSupervisionAgenda, 
  getAgendaItems, 
  createAgendaItem, 
  updateAgendaItem, 
  deleteAgendaItem 
} from '@/lib/api';

interface SupervisionAgendaPanelProps {
  onClose?: () => void;
  onImportToSectionC?: (items: AgendaItem[]) => void;
}

export default function SupervisionAgendaPanel({ 
  onClose, 
  onImportToSectionC 
}: SupervisionAgendaPanelProps) {
  const [agendas, setAgendas] = useState<MySupervisionAgenda[]>([]);
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [newItem, setNewItem] = useState<CreateAgendaItemRequest>({
    title: '',
    detail: '',
    priority: 'medium',
    source_type: 'FREE'
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [agendasData, itemsData] = await Promise.all([
        getSupervisionAgendas(),
        getAgendaItems()
      ]);
      
      setAgendas(agendasData);
      setItems(itemsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agenda data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async () => {
    try {
      if (!newItem.title.trim()) {
        setError('Title is required');
        return;
      }

      // Find the current week's agenda or create one
      let currentAgenda = agendas.find(agenda => 
        agenda.week_starting === new Date().toISOString().split('T')[0]
      );

      if (!currentAgenda) {
        currentAgenda = await createSupervisionAgenda({
          week_starting: new Date().toISOString().split('T')[0]
        });
        setAgendas(prev => [...prev, currentAgenda!]);
      }

      const createdItem = await createAgendaItem({
        ...newItem,
        agenda: currentAgenda.id
      });

      setItems(prev => [...prev, createdItem]);
      setNewItem({
        title: '',
        detail: '',
        priority: 'medium',
        source_type: 'FREE'
      });
      setShowCreateItem(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agenda item');
    }
  };

  const handleUpdateItem = async (id: number, updates: Partial<AgendaItem>) => {
    try {
      const updatedItem = await updateAgendaItem(id, updates);
      setItems(prev => prev.map(item => 
        item.id === id ? updatedItem : item
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agenda item');
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await deleteAgendaItem(id);
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agenda item');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'discussed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'carried': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'discarded': return <Circle className="w-4 h-4 text-gray-400" />;
      default: return <Circle className="w-4 h-4 text-blue-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading agenda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Supervision Agenda</h2>
          <p className="text-gray-600">Private agenda items for your supervision sessions</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCreateItem(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Item
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
                onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                placeholder="What do you want to discuss?"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Details
              </label>
              <Textarea
                value={newItem.detail}
                onChange={(e) => setNewItem(prev => ({ ...prev, detail: e.target.value }))}
                placeholder="Additional context or notes..."
                rows={3}
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
                    setNewItem(prev => ({ ...prev, priority: value }))
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
                    setNewItem(prev => ({ ...prev, source_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE">Free-typed</SelectItem>
                    <SelectItem value="A">From Section A</SelectItem>
                    <SelectItem value="B">From Section B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateItem}>
                Add Item
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateItem(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agenda Items List */}
      <div className="space-y-4">
        {items.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No agenda items yet</h3>
              <p className="text-gray-600 mb-4">
                Add items you want to discuss in your next supervision session
              </p>
              <Button onClick={() => setShowCreateItem(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(item.status)}
                      <h3 className="font-medium text-gray-900">{item.title}</h3>
                      <Badge className={getPriorityColor(item.priority)}>
                        {item.priority}
                      </Badge>
                    </div>
                    
                    {item.detail && (
                      <p className="text-gray-600 text-sm mb-2">{item.detail}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.source_type}
                      </span>
                      <span>
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
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
