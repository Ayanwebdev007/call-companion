import googleSheetsService from './googleSheetsService.js';
import Customer from '../models/Customer.js';
import Spreadsheet from '../models/Spreadsheet.js';

/**
 * Resolves a field value for a customer, falling back to meta_data for standard fields
 * if the primary field is empty or generic (e.g., "Meta Lead").
 */
const resolveCustomerValue = (customer, fieldName) => {
    // Convert Map to Object if needed for easier access
    const meta = customer.meta_data instanceof Map ? Object.fromEntries(customer.meta_data) : (customer.meta_data || {});

    if (fieldName === 'customer_name') {
        let val = customer.customer_name || '';
        if ((!val || val === 'Meta Lead') && meta) {
            // Priority list for resolving names from Meta Ads
            val = meta.full_name || meta.name || meta.first_name || meta.Customer_Name || val;
        }
        return val;
    }

    if (fieldName === 'phone_number') {
        let val = customer.phone_number || '';
        if ((!val || val === 'N/A' || val.length < 5) && meta) {
            val = meta.phone_number || meta.phone || meta.mobile || meta.contact || val;
        }
        return val;
    }

    if (fieldName === 'company_name') {
        let val = customer.company_name || '';
        if ((!val || val === 'N/A' || val === 'Meta Ads') && meta) {
            val = meta.company_name || meta.company || val;
        }
        return val;
    }

    // Standard fields
    if (customer[fieldName] !== undefined && fieldName !== 'meta_data') {
        return customer[fieldName] || '';
    }

    // If not a standard field, check meta_data directly (for custom headers)
    if (meta[fieldName] !== undefined) {
        return meta[fieldName] || '';
    }

    return '';
};

/**
 * Synchronizes a spreadsheet's data to Google Sheets if realtime sync is enabled.
 * @param {string} spreadsheetId - The ID of the CRM spreadsheet.
 * @param {boolean} force - If true, bypasses the realtime_sync check (for manual sync).
 */
export const syncToGoogleSheets = async (spreadsheetId, force = false) => {
    try {
        // 1. Fetch settings
        const spreadsheet = await Spreadsheet.findById(spreadsheetId);
        if (!spreadsheet || (!force && !spreadsheet.realtime_sync) || !spreadsheet.linked_google_sheet_url) {
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
                return fields.map(field => resolveCustomerValue(c, field));
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
                    resolveCustomerValue(c, 'customer_name'),
                    resolveCustomerValue(c, 'company_name'),
                    resolveCustomerValue(c, 'phone_number'),
                    resolveCustomerValue(c, 'next_call_date'),
                    resolveCustomerValue(c, 'last_call_date'),
                    resolveCustomerValue(c, 'next_call_time'),
                    resolveCustomerValue(c, 'remark')
                ];
                if (spreadsheet.meta_headers) {
                    spreadsheet.meta_headers.forEach(h => {
                        row.push(resolveCustomerValue(c, h));
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
