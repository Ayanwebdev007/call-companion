import axios from 'axios';

class MetaService {
    constructor() {
        this.baseUrl = 'https://graph.facebook.com/v19.0';
    }

    async getPageDetails(pageId, pageAccessToken) {
        try {
            const response = await axios.get(`${this.baseUrl}/${pageId}`, {
                params: {
                    access_token: pageAccessToken,
                    fields: 'name'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching Meta page details:', error.response?.data || error.message);
            return { name: pageId }; // Fallback to ID
        }
    }

    async getAdDetails(adId, pageAccessToken) {
        try {
            const response = await axios.get(`${this.baseUrl}/${adId}`, {
                params: {
                    access_token: pageAccessToken,
                    fields: 'campaign{id,name}'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching Meta ad details:', error.response?.data || error.message);
            return null;
        }
    }

    async getFormDetails(formId, pageAccessToken) {
        try {
            const response = await axios.get(`${this.baseUrl}/${formId}`, {
                params: {
                    access_token: pageAccessToken,
                    fields: 'name'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching Meta form details:', error.response?.data || error.message);
            return { name: 'Meta Ads Leads' }; // Fallback
        }
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
