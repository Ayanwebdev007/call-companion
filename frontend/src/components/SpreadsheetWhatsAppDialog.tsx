import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import WhatsAppManager from './WhatsAppManager';
import { Customer, api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';

interface SpreadsheetWhatsAppDialogProps {
    customer: Customer | null;
    isOpen: boolean;
    onClose: () => void;
}

export const SpreadsheetWhatsAppDialog = ({ customer, isOpen, onClose }: SpreadsheetWhatsAppDialogProps) => {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (customer) {
            setMessage(''); // Reset message when customer changes
        }
    }, [customer]);

    if (!customer) return null;

    const handleApplyTemplate = (type: 'lastCall' | 'nextCall' | 'greeting') => {
        const name = customer.customer_name || 'Customer';
        let text = '';

        if (type === 'lastCall') {
            const date = customer.last_call_date
                ? format(parseISO(customer.last_call_date), "dd/MM/yyyy")
                : 'recently';
            text = `Hi ${name}, I called you on ${date} but you didn't receive. Please call back when free.`;
        } else if (type === 'nextCall') {
            const date = customer.next_call_date
                ? format(parseISO(customer.next_call_date), "dd/MM/yyyy")
                : 'tomorrow';
            const time = customer.next_call_time
                ? ` at ${customer.next_call_time}`
                : '';

            text = `Hi ${name}, as discussed we will connect on ${date}${time}.`;
        } else if (type === 'greeting') {
            text = `Hi ${name}, checking in regarding our conversation/project.`;
        }

        setMessage(text);
    };

    const handleSend = async (msg: string) => {
        if (!customer.phone_number) {
            toast({ title: 'No phone number available', variant: 'destructive' });
            return;
        }

        setIsSending(true);
        try {
            const phone = customer.phone_number.replace(/[^0-9]/g, '');
            console.log('Sending WhatsApp message:', { phone, message: msg });
            await api.post('/api/whatsapp/send', {
                phone,
                message: msg
            });
            console.log('WhatsApp API call successful');
            toast({ title: 'Message sent successfully!' });
            onClose();
        } catch (error) {
            console.error(error);
            toast({ title: 'Failed to send message', variant: 'destructive' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Message {customer.customer_name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Templates */}
                    <div className="flex flex-wrap gap-2 mb-2">
                        <Button variant="outline" size="sm" onClick={() => handleApplyTemplate('lastCall')} className="text-xs">
                            Last Call Missed
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleApplyTemplate('nextCall')} className="text-xs">
                            Confirm Next Call
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleApplyTemplate('greeting')} className="text-xs">
                            Greeting
                        </Button>
                    </div>

                    <WhatsAppManager
                        onSend={handleSend}
                        isSending={isSending}
                        value={message}
                        onChange={setMessage}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};
