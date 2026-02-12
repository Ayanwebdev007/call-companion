
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

const API_URL = 'http://localhost:5000/api/mobile';
const TOKEN = 'YOUR_TEST_TOKEN'; // Replace with a valid token for testing

async function testMatchNumber(phoneNumber) {
    try {
        console.log(`Testing match-number for: ${phoneNumber}`);
        const res = await axios.get(`${API_URL}/match-number/${phoneNumber}`, {
            headers: { 'x-auth-token': TOKEN }
        });
        console.log('Match Result:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('Match Error:', err.response?.data || err.message);
    }
}

async function testSyncLogs(logs) {
    try {
        console.log(`Testing sync-logs for ${logs.length} logs`);
        const res = await axios.post(`${API_URL}/sync-logs`, { logs }, {
            headers: { 'x-auth-token': TOKEN }
        });
        console.log('Sync Result:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('Sync Error:', err.response?.data || err.message);
    }
}

// Example usage:
// testMatchNumber('1234567890');
// testSyncLogs([{ phoneNumber: '1234567890', type: 'outgoing', duration: 30, timestamp: Date.now(), status: 'completed' }]);
