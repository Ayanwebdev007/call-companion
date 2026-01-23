import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSpreadsheet } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AutoResizeTextarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Layers, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UnifiedSheetDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function UnifiedSheetDialog({ isOpen, onClose }: UnifiedSheetDialogProps) {
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const createMutation = useMutation({
        mutationFn: () => createSpreadsheet({
            name,
            description,
            is_unified: true,
            // Default to empty link list
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spreadsheets'] });
            toast.success('Unified Smart List created successfully');
            onClose();
            setName('');
            setDescription('');
        },
        onError: (error: any) => {
            toast.error('Failed to create sheet: ' + error.message);
        }
    });

    const handleSubmit = () => {
        if (!name.trim()) {
            toast.error('Please enter a name');
            return;
        }
        createMutation.mutate();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-purple-500" />
                        Create Unified Smart List
                    </DialogTitle>
                    <DialogDescription>
                        Create a master sheet that aggregates leads from multiple Meta campaigns automatically.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Smart List Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. John's Daily Leads"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <AutoResizeTextarea
                            id="description"
                            placeholder="Describe the purpose of this list..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={createMutation.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
                        {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Create List
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
