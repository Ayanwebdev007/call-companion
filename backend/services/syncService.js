import googleSheetsService from './googleSheetsService.js';
import Customer from '../models/Customer.js';
import Spreadsheet from '../models/Spreadsheet.js';

/**
 * Synchronizes a spreadsheet's data to Google Sheets if realtime sync is enabled.
 * @param {string} spreadsheetId - The ID of the CRM spreadsheet.
 */
export const syncToGoogleSheets = async (spreadsheetId) => {
    try {
        // 1. Fetch settings
        const spreadsheet = await Spreadsheet.findById(spreadsheetId);
        if (!spreadsheet || !spreadsheet.realtime_sync || !spreadsheet.linked_google_sheet_url) {
            return;
        }

        console.log(`[SYNC] Starting background sync for: ${spreadsheet.name}`);

        // 2. Fetch all active customers
        const customers = await Customer.find({
            spreadsheet_id: spreadsheetId,
            is_deleted: { $ne: true }
        }).sort({ position: 1 });

        // 3. Format data based on column mapping
        const mapping = spreadsheet.column_mapping;
        let headers = [];
        let dataRows = [];

        if (mapping && Object.keys(mapping).length > 0) {
            // Use custom mapping
            headers = Object.values(mapping);
            const fields = Object.keys(mapping);

            dataRows = customers.map(c => {
                return fields.map(field => {
                    // Handle standard fields
                    if (field === 'customer_name') return c.customer_name || '';
                    if (field === 'company_name') return c.company_name || '';
                    if (field === 'phone_number') return c.phone_number || '';
                    if (field === 'next_call_date') return c.next_call_date || '';
                    if (field === 'next_call_time') return c.next_call_time || '';
                    if (field === 'last_call_date') return c.last_call_date || '';
                    if (field === 'remark') return c.remark || '';
                    if (field === 'status') return c.status || '';

                    // Handle meta data fields
                    if (c.meta_data) {
                        return c.meta_data[field] || '';
                    }
                    return '';
                });
            });
        } else {
            // Fallback to default headers if no mapping (though mapping is expected for sync)
            headers = [
                'Customer Name', 'Company Name', 'Phone Number',
                'Next Call Date', 'Last Call Date', 'Next Call Time', 'Remark'
            ];
            if (spreadsheet.meta_headers) headers.push(...spreadsheet.meta_headers);

            dataRows = customers.map(c => {
                const row = [
                    c.customer_name || '',
                    c.company_name || '',
                    c.phone_number || '',
                    c.next_call_date || '',
                    c.last_call_date || '',
                    c.next_call_time || '',
                    c.remark || ''
                ];
                if (spreadsheet.meta_headers) {
                    spreadsheet.meta_headers.forEach(h => {
                        row.push(c.meta_data ? (c.meta_data[h] || '') : '');
                    });
                }
                return row;
            });
        }

        const finalData = [headers, ...dataRows];

        // 4. Update Google Sheets
        await googleSheetsService.updateSheetData(
            spreadsheet.linked_google_sheet_url,
            finalData,
            spreadsheet.linked_sheet_name
        );

        console.log(`[SYNC] Background sync complete for: ${spreadsheet.name} (${customers.length} rows)`);
    } catch (error) {
        console.error(`[SYNC] Error during background sync for ${spreadsheetId}:`, error.message);
    }
};

export default {
    syncToGoogleSheets
};
