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
            console.log(`[META-SERVICE] Fetching details for Ad: ${adId}`);
            const response = await axios.get(`${this.baseUrl}/${adId}`, {
                params: {
                    access_token: pageAccessToken,
                    fields: 'name,campaign{id,name},adset{id,name}'
                }
            });
            return response.data;
        } catch (error) {
            console.error(`[META-SERVICE] ERROR fetching Ad ${adId}:`, error.response?.data || error.message);

            // If the nested object fetch fails (permissions), try fetching just the Ad Name
            if (error.response?.data?.error?.code === 100 || error.response?.data?.error?.code === 200) {
                try {
                    console.log(`[META-SERVICE] Attempting fallback fetch for Ad Name only: ${adId}`);
                    const fallback = await axios.get(`${this.baseUrl}/${adId}`, {
                        params: {
                            access_token: pageAccessToken,
                            fields: 'name'
                        }
                    });
                    return fallback.data;
                } catch (fallbackError) {
                    console.error('[META-SERVICE] Fallback fetch also failed:', fallbackError.message);
                }
            }
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
                    access_token: pageAccessToken,
                    fields: 'created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id'
                }
            });

            // Lead data mapping
            const fieldData = response.data.field_data || [];

            // Create a comprehensive map of all fields
            const fieldMap = {};
            fieldData.forEach(f => {
                if (f.name && f.values && f.values.length > 0) {
                    fieldMap[f.name] = f.values[0];
                }
            });

            const lead = {
                metaLeadId: leadId,
                createdTime: response.data.created_time,
                rawData: response.data,
                fieldMap: fieldMap,
                customerName: this.extractFieldValue(fieldData, ['full_name', 'name', 'first_name']),
                email: this.extractFieldValue(fieldData, ['email']),
                phoneNumber: this.extractFieldValue(fieldData, ['phone_number', 'phone', 'mobile', 'contact', 'tel', 'whatsapp']),
                companyName: this.extractFieldValue(fieldData, ['company_name', 'company', 'organization', 'business', 'firm']),
                // Direct metadata from Lead object - use multiple possible field names
                campaignName: response.data.campaign_name || response.data.campaign?.name || '',
                adSetName: response.data.adset_name || response.data.adset?.name || '',
                adName: response.data.ad_name || response.data.ad?.name || '',
                campaignId: response.data.campaign_id || response.data.campaign?.id || '',
                adSetId: response.data.adset_id || response.data.adset?.id || '',
                adId: response.data.ad_id || response.data.ad?.id || ''
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

    async getCampaigns(pageId, pageAccessToken) {
        try {
            const response = await axios.get(`${this.baseUrl}/${pageId}/campaigns`, {
                params: {
                    access_token: pageAccessToken,
                    fields: 'name,id',
                    limit: 100
                }
            });
            return response.data.data;
        } catch (error) {
            console.error('[META-SERVICE] Error fetching campaigns:', error.response?.data || error.message);
            return [];
        }
    }

    async getAdsInCampaign(campaignId, pageAccessToken) {
        try {
            const response = await axios.get(`${this.baseUrl}/${campaignId}/ads`, {
                params: {
                    access_token: pageAccessToken,
                    fields: 'name,id,adset{name,id}',
                    limit: 100
                }
            });
            return response.data.data;
        } catch (error) {
            console.error('[META-SERVICE] Error fetching ads:', error.response?.data || error.message);
            return [];
        }
    }

    async getAdLeads(adId, pageAccessToken, dateRange = {}) {
        try {
            let allLeads = [];
            let url = `${this.baseUrl}/${adId}/leads`;

            const params = {
                access_token: pageAccessToken,
                fields: 'created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id',
                limit: 100
            };

            if (dateRange.since) params.since = Math.floor(new Date(dateRange.since).getTime() / 1000);
            if (dateRange.until) params.until = Math.floor(new Date(dateRange.until).getTime() / 1000);

            let hasNext = true;
            while (hasNext) {
                const response = await axios.get(url, { params: url.includes('?') ? {} : params });
                const leads = response.data.data || [];

                // Map the leads immediately
                const mappedLeads = leads.map(l => {
                    const fieldMap = {};
                    (l.field_data || []).forEach(f => {
                        if (f.name && f.values && f.values.length > 0) fieldMap[f.name] = f.values[0];
                    });
                    return {
                        ...l,
                        fieldMap,
                        customerName: this.extractFieldValue(l.field_data || [], ['full_name', 'name', 'first_name']),
                        email: this.extractFieldValue(l.field_data || [], ['email']),
                        phoneNumber: this.extractFieldValue(l.field_data || [], ['phone_number', 'phone', 'mobile', 'contact', 'tel', 'whatsapp']),
                        companyName: this.extractFieldValue(l.field_data || [], ['company_name', 'company']),
                        metaLeadId: l.id
                    };
                });

                allLeads = allLeads.concat(mappedLeads);

                if (response.data.paging?.next) {
                    url = response.data.paging.next;
                } else {
                    hasNext = false;
                }
            }
            return allLeads;
        } catch (error) {
            console.error(`[META-SERVICE] Error fetching leads for Ad ${adId}:`, error.response?.data || error.message);
            return [];
        }
    }
}

export default new MetaService();
