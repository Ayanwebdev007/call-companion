import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spreadsheet, mergeSpreadsheets } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Merge, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface MergeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    spreadsheets: Spreadsheet[];
}

interface MergeGroup {
    key: string;
    pageName: string;
    formName: string;
    spreadsheets: Spreadsheet[];
}

export const MergeDialog = ({ open, onOpenChange, spreadsheets }: MergeDialogProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [mergingGroupKey, setMergingGroupKey] = useState<string | null>(null);

    // 1. Identify Merge Candidates
    // Group by "PageName::FormName". Only groups with > 1 items are candidates.
    const mergeCandidates = useMemo<MergeGroup[]>(() => {
        const groups: Record<string, MergeGroup> = {};

        spreadsheets.forEach((sheet) => {
            // Only consider Meta spreadsheets with valid page/form names
            if (!sheet.is_meta || !sheet.page_name || !sheet.form_name) return;

            const key = `${sheet.page_name}::${sheet.form_name}`;

            if (!groups[key]) {
                groups[key] = {
                    key,
                    pageName: sheet.page_name,
                    formName: sheet.form_name,
                    spreadsheets: []
                };
            }

            groups[key].spreadsheets.push(sheet);
        });

        // Filter for groups with at least 2 spreadsheets
        return Object.values(groups).filter(group => group.spreadsheets.length > 1);
    }, [spreadsheets]);

    const handleMerge = async (group: MergeGroup) => {
        setMergingGroupKey(group.key);
        try {
            const ids = group.spreadsheets.map(s => s.id);
            await mergeSpreadsheets(ids, `Merged: ${group.formName} - ${group.pageName} (${new Date().toLocaleDateString()})`);

            toast({
                title: "Spreadsheets merged successfully!",
                description: `A new spreadsheet has been created containing data from ${group.spreadsheets.length} source sheets.`,
            });

            // Refresh data
            queryClient.invalidateQueries({ queryKey: ["spreadsheets"] });

        } catch (error: any) {
            toast({
                title: "Merge failed",
                description: error.message || "Could not merge spreadsheets.",
                variant: "destructive"
            });
        } finally {
            setMergingGroupKey(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-card border-border/50 shadow-2xl backdrop-blur-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Merge className="h-5 w-5 text-primary" />
                        Merge Duplicates
                    </DialogTitle>
                    <DialogDescription>
                        Found {mergeCandidates.length} groups of spreadsheets that share the same Form and Page.
                        Merge them to consolidate your data into a single new spreadsheet.
                        Original spreadsheets will be preserved.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {mergeCandidates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
                            <CheckCircle2 className="h-10 w-10 mb-2 opacity-50" />
                            <p>No mergeable duplicates found.</p>
                            <p className="text-xs opacity-75">Only Meta spreadsheets with matching Page and Form names can be merged.</p>
                        </div>
                    ) : (
                        mergeCandidates.map((group) => (
                            <div key={group.key} className="bg-secondary/20 border border-border/50 rounded-xl p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-semibold text-lg">{group.formName}</h4>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Badge variant="outline" className="text-xs font-normal">Page: {group.pageName}</Badge>
                                            <span>•</span>
                                            <span>{group.spreadsheets.length} spreadsheets found</span>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handleMerge(group)}
                                        disabled={!!mergingGroupKey}
                                        size="sm"
                                        className="gap-2"
                                    >
                                        {mergingGroupKey === group.key ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Merging...
                                            </>
                                        ) : (
                                            <>
                                                <Merge className="h-4 w-4" />
                                                Merge All
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {/* List of sheets in this group */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                    {group.spreadsheets.map(sheet => (
                                        <div key={sheet.id} className="text-xs bg-background/50 p-2 rounded border border-border/30 flex items-center justify-between">
                                            <span className="truncate flex-1 font-medium">{sheet.name}</span>
                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-2">
                                                <span className="truncate max-w-[80px]">{sheet.campaign_name || 'No Campaign'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
