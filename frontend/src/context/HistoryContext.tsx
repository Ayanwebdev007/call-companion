import React, { createContext, useContext, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface HistoryAction {
    type: string;
    description: string;
    undo: () => Promise<void>;
    redo: () => Promise<void>;
}

interface HistoryContextType {
    pushAction: (action: HistoryAction) => void;
    undo: () => Promise<void>;
    redo: () => Promise<void>;
    canUndo: boolean;
    canRedo: boolean;
    isProcessing: boolean;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
    const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const pushAction = useCallback((action: HistoryAction) => {
        setUndoStack(prev => [...prev, action]);
        setRedoStack([]); // Clear redo stack on new action
    }, []);

    const undo = useCallback(async () => {
        if (undoStack.length === 0 || isProcessing) return;

        setIsProcessing(true);
        const action = undoStack[undoStack.length - 1];

        try {
            await action.undo();
            setUndoStack(prev => prev.slice(0, -1));
            setRedoStack(prev => [...prev, action]);
            toast({
                title: "Action Undone",
                description: action.description,
            });
        } catch (error: any) {
            toast({
                title: "Undo Failed",
                description: error.message || "Failed to revert changes",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    }, [undoStack, isProcessing, toast]);

    const redo = useCallback(async () => {
        if (redoStack.length === 0 || isProcessing) return;

        setIsProcessing(true);
        const action = redoStack[redoStack.length - 1];

        try {
            await action.redo();
            setRedoStack(prev => prev.slice(0, -1));
            setUndoStack(prev => [...prev, action]);
            toast({
                title: "Action Redone",
                description: action.description,
            });
        } catch (error: any) {
            toast({
                title: "Redo Failed",
                description: error.message || "Failed to re-apply changes",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    }, [redoStack, isProcessing, toast]);

    return (
        <HistoryContext.Provider value={{
            pushAction,
            undo,
            redo,
            canUndo: undoStack.length > 0,
            canRedo: redoStack.length > 0,
            isProcessing
        }}>
            {children}
        </HistoryContext.Provider>
    );
};

export const useHistory = () => {
    const context = useContext(HistoryContext);
    if (context === undefined) {
        throw new Error('useHistory must be used within a HistoryProvider');
    }
    return context;
};
