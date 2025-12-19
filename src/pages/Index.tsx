import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon, PlusIcon, UploadIcon, DownloadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResizableTable, ResizableTableBody, ResizableTableCell, ResizableTableHead, ResizableTableHeader, ResizableTableRow } from '@/components/ui/resizable-table';
import { BulkImportDialog } from '@/components/BulkImportDialog';
import { BulkDelete } from '@/components/BulkDelete';
import { useCustomerSelection } from '@/components/CustomerSelectionManager';
import { toast } from '@/hooks/use-toast';
import { DatePicker } from '@/components/ui/date-picker';
import api from '@/lib/api';

interface Customer {
  id?: string;
  customer_name: string;
  company_name: string;
  phone_number: string;
  next_call_date: string;
  next_call_time: string;
  remark: string;
}

const Index: React.FC = () => {
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<'date' | 'all'>('date');
  const [newCustomer, setNewCustomer] = useState<Customer>({
    customer_name: '',
    company_name: '',
    phone_number: '',
    next_call_date: format(new Date(), 'yyyy-MM-dd'),
    next_call_time: '',
    remark: ''
  });

  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get('/customers');
      return res.data;
    }
  });

  // Use the customer selection hook
  const { 
    selectedCustomerIds, 
    toggleCustomerSelection, 
    selectAllCustomers, 
    clearSelection, 
    isSelected,
    isAllSelected
  } = useCustomerSelection(customers);

  const filteredCustomers = view === 'date' 
    ? customers.filter(customer => 
        customer.next_call_date === format(date, 'yyyy-MM-dd')
      )
    : customers;

  const mutation = useQueryClient();

  const addCustomer = async () => {
    if (!newCustomer.customer_name.trim() || !newCustomer.company_name.trim() || !newCustomer.phone_number.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill Customer Name, Company Name, and Phone No.',
        variant: 'destructive'
      });
      return;
    }

    try {
      await api.post('/customers', newCustomer);
      mutation.invalidateQueries({ queryKey: ['customers'] });
      setNewCustomer({
        customer_name: '',
        company_name: '',
        phone_number: '',
        next_call_date: format(new Date(), 'yyyy-MM-dd'),
        next_call_time: '',
        remark: ''
      });
      toast({
        title: 'Success',
        description: 'Customer added successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add customer',
        variant: 'destructive'
      });
    }
  };

  const updateCustomer = async (id: string, field: keyof Customer, value: string) => {
    try {
      await api.put(`/customers/${id}`, { [field]: value });
      mutation.invalidateQueries({ queryKey: ['customers'] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update customer',
        variant: 'destructive'
      });
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      await api.delete(`/customers/${id}`);
      mutation.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: 'Success',
        description: 'Customer deleted successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete customer',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">Error loading customers</div>;

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Call Management</CardTitle>
          <div className="flex gap-2">
            <BulkDelete 
              selectedCustomerIds={selectedCustomerIds} 
              onSelectionClear={clearSelection} 
            />
            <BulkImportDialog onImportSuccess={() => mutation.invalidateQueries({ queryKey: ['customers'] })} />
            <Button variant="outline" size="sm">
              <DownloadIcon className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-card border-b border-border px-4 py-2 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button 
                variant={view === 'date' ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => {
                  setView('date');
                  setDate(new Date());
                }}
              >
                Today
              </Button>
              <DatePicker 
                date={date} 
                onDateChange={setDate} 
                placeholder="Select date" 
              />
            </div>
            <div className="h-6 w-px bg-border"></div>
            <Button 
              variant={view === 'all' ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setView('all')}
            >
              All Customers ({customers.length})
            </Button>
          </div>
          
          <div className="flex-1 overflow-auto">
            <ResizableTable>
              <ResizableTableHeader>
                <ResizableTableRow>
                  {/* Checkbox Header */}
                  <ResizableTableCell className="border border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-12">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={selectAllCustomers}
                      className="h-4 w-4"
                    />
                  </ResizableTableCell>
                  
                  <ResizableTableCell className="border border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-10" resizable={false}>
                    #
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[150px]">
                    Customer Name
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[150px]">
                    Company Name
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[120px]">
                    Phone No.
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[130px]">
                    Next Call Date
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[100px]">
                    Time
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[200px]">
                    Remark
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border px-3 py-2 text-center text-xs font-semibold text-muted-foreground w-12" resizable={false}>
                    WP
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border px-3 py-2 text-center text-xs font-semibold text-muted-foreground w-12" resizable={false}>
                    Actions
                  </ResizableTableCell>
                </ResizableTableRow>
              </ResizableTableHeader>
              
              <ResizableTableBody>
                {filteredCustomers.map((customer, index) => (
                  <ResizableTableRow key={customer.id} className="hover:bg-muted/50">
                    {/* Checkbox Cell */}
                    <ResizableTableCell className="border border-border px-3 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected(customer.id || '')}
                        onChange={() => toggleCustomerSelection(customer.id || '')}
                        className="h-4 w-4"
                      />
                    </ResizableTableCell>
                    
                    <ResizableTableCell className="border border-border px-3 py-1 text-xs text-muted-foreground text-center">
                      {index + 1}
                    </ResizableTableCell>
                    <ResizableTableCell className="border border-border p-0">
                      <Input
                        defaultValue={customer.customer_name}
                        onBlur={(e) => updateCustomer(customer.id!, 'customer_name', e.target.value)}
                        className="border-0 rounded-none h-8 text-sm focus-visible:ring-1 focus-visible:ring-inset"
                      />
                    </ResizableTableCell>
                    <ResizableTableCell className="border border-border p-0">
                      <Input
                        defaultValue={customer.company_name}
                        onBlur={(e) => updateCustomer(customer.id!, 'company_name', e.target.value)}
                        className="border-0 rounded-none h-8 text-sm focus-visible:ring-1 focus-visible:ring-inset"
                      />
                    </ResizableTableCell>
                    <ResizableTableCell className="border border-border p-0">
                      <Input
                        defaultValue={customer.phone_number}
                        onBlur={(e) => updateCustomer(customer.id!, 'phone_number', e.target.value)}
                        className="border-0 rounded-none h-8 text-sm focus-visible:ring-1 focus-visible:ring-inset"
                      />
                    </ResizableTableCell>
                    <ResizableTableCell className="border border-border p-0">
                      <DatePicker 
                        date={customer.next_call_date ? new Date(customer.next_call_date) : undefined}
                        onDateChange={(date) => updateCustomer(customer.id!, 'next_call_date', format(date, 'yyyy-MM-dd'))}
                      />
                    </ResizableTableCell>
                    <ResizableTableCell className="border border-border p-0">
                      <Input
                        type="time"
                        defaultValue={customer.next_call_time || ''}
                        onBlur={(e) => updateCustomer(customer.id!, 'next_call_time', e.target.value)}
                        className="border-0 rounded-none h-8 text-sm focus-visible:ring-1 focus-visible:ring-inset"
                      />
                    </ResizableTableCell>
                    <ResizableTableCell className="border border-border p-0">
                      <Input
                        defaultValue={customer.remark || ''}
                        onBlur={(e) => updateCustomer(customer.id!, 'remark', e.target.value)}
                        className="border-0 rounded-none h-8 text-sm focus-visible:ring-1 focus-visible:ring-inset"
                      />
                    </ResizableTableCell>
                    <ResizableTableCell className="border border-border p-1 text-center">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          const phoneNumber = customer.phone_number.replace(/[^0-9]/g, '');
                          window.open(`https://wa.me/${phoneNumber}`, '_blank');
                        }}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-green-600"
                      >
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </Button>
                    </ResizableTableCell>
                    <ResizableTableCell className="border border-border p-1 text-center">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteCustomer(customer.id!)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </ResizableTableCell>
                  </ResizableTableRow>
                ))}
                
                <ResizableTableRow className="bg-primary/5">
                  {/* Empty cell for new row checkbox */}
                  <ResizableTableCell className="border border-border px-3 py-1 text-center"></ResizableTableCell>
                  
                  <ResizableTableCell className="border border-border px-3 py-1 text-xs text-primary font-medium text-center">
                    NEW
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border p-0">
                    <Input
                      value={newCustomer.customer_name}
                      onChange={(e) => setNewCustomer({...newCustomer, customer_name: e.target.value})}
                      className="border-0 rounded-none h-9 text-sm bg-transparent focus-visible:ring-1 focus-visible:ring-inset"
                      placeholder="Enter customer name..."
                    />
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border p-0">
                    <Input
                      value={newCustomer.company_name}
                      onChange={(e) => setNewCustomer({...newCustomer, company_name: e.target.value})}
                      className="border-0 rounded-none h-9 text-sm bg-transparent focus-visible:ring-1 focus-visible:ring-inset"
                      placeholder="Enter company..."
                    />
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border p-0">
                    <Input
                      value={newCustomer.phone_number}
                      onChange={(e) => setNewCustomer({...newCustomer, phone_number: e.target.value})}
                      className="border-0 rounded-none h-9 text-sm bg-transparent focus-visible:ring-1 focus-visible:ring-inset"
                      placeholder="Enter phone..."
                    />
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border p-0">
                    <DatePicker 
                      date={newCustomer.next_call_date ? new Date(newCustomer.next_call_date) : undefined}
                      onDateChange={(date) => setNewCustomer({...newCustomer, next_call_date: format(date, 'yyyy-MM-dd')})}
                    />
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border p-0">
                    <Input
                      type="time"
                      value={newCustomer.next_call_time}
                      onChange={(e) => setNewCustomer({...newCustomer, next_call_time: e.target.value})}
                      className="border-0 rounded-none h-9 text-sm bg-transparent focus-visible:ring-1 focus-visible:ring-inset"
                    />
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border p-0">
                    <Input
                      value={newCustomer.remark}
                      onChange={(e) => setNewCustomer({...newCustomer, remark: e.target.value})}
                      className="border-0 rounded-none h-9 text-sm bg-transparent focus-visible:ring-1 focus-visible:ring-inset"
                      placeholder="Enter remark..."
                    />
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border p-1 text-center"></ResizableTableCell>
                  <ResizableTableCell className="border border-border p-1 text-center">
                    <Button 
                      size="sm" 
                      onClick={addCustomer}
                      disabled={!newCustomer.customer_name.trim() || !newCustomer.company_name.trim() || !newCustomer.phone_number.trim()}
                      className="h-7 px-3 text-xs"
                    >
                      <PlusIcon className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </ResizableTableCell>
                </ResizableTableRow>
              </ResizableTableBody>
            </ResizableTable>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;