import React, { useState } from 'react';

interface CustomerSelectionManagerProps {
  customers: any[];
}

export const useCustomerSelection = (customers: any[]) => {
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());

  const toggleCustomerSelection = (customerId: string) => {
    const newSelected = new Set(selectedCustomerIds);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomerIds(newSelected);
  };

  const selectAllCustomers = () => {
    if (selectedCustomerIds.size === customers.length && customers.length > 0) {
      setSelectedCustomerIds(new Set());
    } else {
      setSelectedCustomerIds(new Set(customers.map(c => c.id || '')));
    }
  };

  const clearSelection = () => {
    setSelectedCustomerIds(new Set());
  };

  const isSelected = (customerId: string) => {
    return selectedCustomerIds.has(customerId);
  };

  const selectedIdsArray = Array.from(selectedCustomerIds);

  return {
    selectedCustomerIds: selectedIdsArray,
    toggleCustomerSelection,
    selectAllCustomers,
    clearSelection,
    isSelected,
    isAllSelected: selectedCustomerIds.size === customers.length && customers.length > 0
  };
};