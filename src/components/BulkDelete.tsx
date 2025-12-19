import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Trash2Icon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface BulkDeleteProps {
  selectedCustomerIds: string[];
  onSelectionClear: () => void;
}

export const BulkDelete: React.FC<BulkDeleteProps> = ({ selectedCustomerIds, onSelectionClear }) => {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBulkDelete = async () => {
    if (selectedCustomerIds.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select customers to delete',
        variant: 'destructive'
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedCustomerIds.length} customer(s)? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      // Send array of IDs to delete
      await api.delete('/customers/bulk', { 
        data: { ids: selectedCustomerIds } 
      });
      
      // Clear selection and refresh data
      onSelectionClear();
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      toast({
        title: 'Success',
        description: `${selectedCustomerIds.length} customer(s) deleted successfully`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete customers',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (selectedCustomerIds.length === 0) {
    return null;
  }

  return (
    <Button 
      variant="destructive" 
      onClick={handleBulkDelete}
      disabled={isDeleting}
    >
      <Trash2Icon className="h-4 w-4 mr-2" />
      Delete ({selectedCustomerIds.length})
    </Button>
  );
};