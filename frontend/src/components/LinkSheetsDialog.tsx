import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSpreadsheets, linkSheets, Spreadsheet } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Link2, Facebook } from 'lucide-react';
import { toast } from 'sonner';

interface LinkSheetsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    unifiedSheet: Spreadsheet;
}

export function LinkSheetsDialog({ isOpen, onClose, unifiedSheet }: LinkSheetsDialogProps) {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>(
        Array.isArray(unifiedSheet.linked_meta_sheets)
            // @ts-ignore - Handle both populated and unpopulated cases
            ? unifiedSheet.linked_meta_sheets.map(s => typeof s === 'string' ? s : s._id)
            : []
    );

    const { data: spreadsheets = [], isLoading } = useQuery({
        queryKey: ['spreadsheets'],
        queryFn: fetchSpreadsheets,
    });

    // Filter for ONLY Meta sheets that are NOT the current sheet
    const metaSheets = useMemo(() => {
        return spreadsheets.filter(s =>
            s.is_meta &&
            !s.is_master &&
            s.id !== unifiedSheet.id
        );
    }, [spreadsheets, unifiedSheet.id]);

    const filteredSheets = useMemo(() => {
        if (!searchQuery) return metaSheets;
        const lowerQ = searchQuery.toLowerCase();
        return metaSheets.filter(s =>
            s.name.toLowerCase().includes(lowerQ) ||
            s.campaign_name?.toLowerCase().includes(lowerQ)
        );
    }, [metaSheets, searchQuery]);

    const linkMutation = useMutation({
        mutationFn: (ids: string[]) => linkSheets(unifiedSheet.id, ids, 'set'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spreadsheets'] });
            toast.success('Linked sheets updated successfully');
            onClose();
        },
        onError: (error: any) => {
            toast.error('Failed to update links: ' + error.message);
        }
    });

    const handleToggle = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(p => p !== id)
                : [...prev, id]
        );
    };

    const handleSave = () => {
        linkMutation.mutate(selectedIds);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border-border">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-primary" />
                        Manage Linked Sources
                    </DialogTitle>
                    <DialogDescription>
                        Select Meta Sheets to automatically feed leads into "{unifiedSheet.name}".
                    </DialogDescription>

                    <div className="relative mt-4">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search campaigns, forms..."
                            className="pl-9 bg-accent/10 border-accent/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6 pt-2">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                        </div>
                    ) : filteredSheets.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            No Meta Sheets found to link.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredSheets.map(sheet => {
                                const isSelected = selectedIds.includes(sheet.id);
                                return (
                                    <div
                                        key={sheet.id}
                                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${isSelected
                                                ? 'bg-primary/5 border-primary/30'
                                                : 'bg-card/50 border-border/50 hover:bg-accent/5'
                                            }`}
                                        onClick={() => handleToggle(sheet.id)}
                                    >
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => handleToggle(sheet.id)}
                                            className="mt-1"
                                        />
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Label className="font-medium cursor-pointer">{sheet.name}</Label>
                                                {sheet.is_meta && <Facebook className="w-3 h-3 text-blue-500" />}
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                {sheet.campaign_name && <Badge variant="outline" className="text-[10px] h-5">{sheet.campaign_name}</Badge>}
                                                {sheet.form_name && <Badge variant="outline" className="text-[10px] h-5">{sheet.form_name}</Badge>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter className="p-4 border-t border-border bg-muted/20">
                    <div className="flex justify-between items-center w-full">
                        <div className="text-sm text-muted-foreground">
                            {selectedIds.length} sheet{selectedIds.length !== 1 && 's'} selected
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button onClick={handleSave} disabled={linkMutation.isPending}>
                                {linkMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
