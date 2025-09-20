import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, Calendar, Award } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

interface Endorsement {
  id?: number;
  endorsement: string;
  endorsement_date: string;
  endorsement_body: string;
  is_active: boolean;
  created_at?: string;
}

interface EndorsementManagementModalProps {
  trigger: React.ReactNode;
  onEndorsementsChange?: () => void;
}

const ENDORSEMENT_OPTIONS = [
  { value: 'CLINICAL', label: 'Clinical Psychology' },
  { value: 'COUNSELLING', label: 'Counselling Psychology' },
  { value: 'EDUCATIONAL', label: 'Educational Psychology' },
  { value: 'FORENSIC', label: 'Forensic Psychology' },
  { value: 'HEALTH', label: 'Health Psychology' },
  { value: 'NEUROPSYCHOLOGY', label: 'Neuropsychology' },
  { value: 'ORGANISATIONAL', label: 'Organisational Psychology' },
  { value: 'SPORT', label: 'Sport Psychology' },
  { value: 'COMMUNITY', label: 'Community Psychology' },
];

const ENDORSEMENT_BODIES = [
  { value: 'AHPRA', label: 'AHPRA (Australian Health Practitioner Regulation Agency)' },
  { value: 'APS', label: 'APS (Australian Psychological Society)' },
  { value: 'OTHER', label: 'Other Professional Body' },
];

export const EndorsementManagementModal: React.FC<EndorsementManagementModalProps> = ({
  trigger,
  onEndorsementsChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEndorsement, setEditingEndorsement] = useState<Endorsement | null>(null);
  const [formData, setFormData] = useState({
    endorsement: '',
    endorsement_date: '',
    endorsement_body: '',
    is_active: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch endorsements when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchEndorsements();
    }
  }, [isOpen]);

  // Fetch endorsements on modal open
  const fetchEndorsements = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/supervisor-endorsements/');

      if (response.ok) {
        const data = await response.json();
        setEndorsements(data);
      } else {
        toast.error('Failed to fetch endorsements');
      }
    } catch (error) {
      console.error('Error fetching endorsements:', error);
      toast.error('Error fetching endorsements');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission (add or edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.endorsement) newErrors.endorsement = 'Endorsement type is required';
    if (!formData.endorsement_date) newErrors.endorsement_date = 'Endorsement date is required';
    if (!formData.endorsement_body) newErrors.endorsement_body = 'Endorsement body is required';

    // Check if date is in the future
    const selectedDate = new Date(formData.endorsement_date);
    const today = new Date();
    if (selectedDate > today) {
      newErrors.endorsement_date = 'Endorsement date cannot be in the future';
    }

    // Check for duplicate endorsements (excluding current editing one)
    const isDuplicate = endorsements.some(endorsement => 
      endorsement.endorsement === formData.endorsement && 
      endorsement.id !== editingEndorsement?.id
    );
    if (isDuplicate) {
      newErrors.endorsement = 'You already have this endorsement type';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const url = editingEndorsement 
        ? `/api/supervisor-endorsements/${editingEndorsement.id}/`
        : '/api/supervisor-endorsements/';
      
      const method = editingEndorsement ? 'PATCH' : 'POST';
      
      const response = await apiFetch(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingEndorsement ? 'Endorsement updated successfully' : 'Endorsement added successfully');
        await fetchEndorsements();
        resetForm();
        onEndorsementsChange?.();
      } else {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          
          // Handle validation errors (400 Bad Request)
          if (response.status === 400 && errorData.endorsement) {
            toast.error(errorData.endorsement[0] || 'Validation error');
          } else {
            toast.error(errorData.error || 'Failed to save endorsement');
          }
        } catch (parseError) {
          toast.error(`Failed to save endorsement: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Error saving endorsement:', error);
      toast.error('Error saving endorsement');
    } finally {
      setLoading(false);
    }
  };

  // Handle endorsement deletion
  const handleDelete = async (endorsementId: number) => {
    if (!confirm('Are you sure you want to delete this endorsement?')) return;

    setLoading(true);
    try {
      const response = await apiFetch(`/api/supervisor-endorsements/${endorsementId}/`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Endorsement deleted successfully');
        await fetchEndorsements();
        onEndorsementsChange?.();
      } else {
        toast.error('Failed to delete endorsement');
      }
    } catch (error) {
      console.error('Error deleting endorsement:', error);
      toast.error('Error deleting endorsement');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      endorsement: '',
      endorsement_date: '',
      endorsement_body: '',
      is_active: true
    });
    setEditingEndorsement(null);
    setShowAddForm(false);
    setErrors({});
  };

  // Start editing an endorsement
  const startEdit = (endorsement: Endorsement) => {
    setFormData({
      endorsement: endorsement.endorsement,
      endorsement_date: endorsement.endorsement_date,
      endorsement_body: endorsement.endorsement_body,
      is_active: endorsement.is_active
    });
    setEditingEndorsement(endorsement);
    setShowAddForm(true);
  };

  // Get endorsement label
  const getEndorsementLabel = (value: string) => {
    return ENDORSEMENT_OPTIONS.find(opt => opt.value === value)?.label || value;
  };

  // Get endorsement body label
  const getEndorsementBodyLabel = (value: string) => {
    return ENDORSEMENT_BODIES.find(opt => opt.value === value)?.label || value;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Manage Professional Endorsements
          </DialogTitle>
          <DialogDescription>
            Add, edit, and manage your professional endorsements. These determine which registrars you can supervise.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Endorsements */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Current Endorsements</h3>
              <Button 
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Endorsement
              </Button>
            </div>

            {loading && endorsements.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading endorsements...</p>
              </div>
            ) : endorsements.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No endorsements added yet</p>
                  <Button 
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Endorsement
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {endorsements.map((endorsement) => (
                  <Card key={endorsement.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={endorsement.is_active ? "default" : "secondary"}>
                              {getEndorsementLabel(endorsement.endorsement)}
                            </Badge>
                            {!endorsement.is_active && (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Issued by:</strong> {getEndorsementBodyLabel(endorsement.endorsement_body)}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <strong>Date:</strong> {new Date(endorsement.endorsement_date).toLocaleDateString('en-AU')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(endorsement)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(endorsement.id!)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Add/Edit Form */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingEndorsement ? 'Edit Endorsement' : 'Add New Endorsement'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="endorsement">Endorsement Type *</Label>
                      <Select
                        value={formData.endorsement}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, endorsement: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select endorsement type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ENDORSEMENT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.endorsement && (
                        <p className="text-sm text-red-500 mt-1">{errors.endorsement}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="endorsement_date">Endorsement Date *</Label>
                      <Input
                        id="endorsement_date"
                        type="date"
                        value={formData.endorsement_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, endorsement_date: e.target.value }))}
                        max={new Date().toISOString().split('T')[0]} // Prevent future dates
                      />
                      {errors.endorsement_date && (
                        <p className="text-sm text-red-500 mt-1">{errors.endorsement_date}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="endorsement_body">Issuing Body *</Label>
                    <Select
                      value={formData.endorsement_body}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, endorsement_body: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select issuing body" />
                      </SelectTrigger>
                      <SelectContent>
                        {ENDORSEMENT_BODIES.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.endorsement_body && (
                      <p className="text-sm text-red-500 mt-1">{errors.endorsement_body}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="is_active">Active endorsement</Label>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? 'Saving...' : (editingEndorsement ? 'Update Endorsement' : 'Add Endorsement')}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={resetForm}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EndorsementManagementModal;
