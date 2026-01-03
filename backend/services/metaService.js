import axios from 'axios';

class MetaService {
    constructor() {
        this.baseUrl = 'https://graph.facebook.com/v19.0';
    }

    async getLeadDetails(leadId, pageAccessToken) {
        try {
            if (!pageAccessToken) {
                throw new Error('Meta Page Access Token is missing. Please check your settings.');
            }

            const response = await axios.get(`${this.baseUrl}/${leadId}`, {
                params: {
                    access_token: pageAccessToken
                }
            });

            // Lead data mapping
            const fieldData = response.data.field_data || [];
            const lead = {
                metaLeadId: leadId,
                createdTime: response.data.created_time,
                rawData: response.data,
                customerName: this.extractFieldValue(fieldData, ['full_name', 'name', 'first_name']),
                email: this.extractFieldValue(fieldData, ['email']),
                phoneNumber: this.extractFieldValue(fieldData, ['phone_number', 'phone']),
                companyName: this.extractFieldValue(fieldData, ['company_name', 'company', 'organization'])
            };

            return lead;
        } catch (error) {
            console.error('Error fetching Meta lead details:', error.response?.data || error.message);
            throw new Error(`Failed to fetch lead details: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    extractFieldValue(fieldData, possibleKeys) {
        const field = fieldData.find(f =>
            possibleKeys.some(key => f.name.toLowerCase().includes(key.toLowerCase()))
        );

        if (field && field.values && field.values.length > 0) {
            return field.values[0];
        }
        return '';
    }
}

export default new MetaService();
