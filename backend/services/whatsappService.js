import { default as makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let sock;
let qrCodeData = null;
let connectionStatus = 'disconnected'; // disconnected, connecting, connected
const authPath = path.join(__dirname, '../auth_info_baileys');

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(authPath);

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }), // Hide noisy logs
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            // Generate QR code as Data URL
            qrCodeData = await QRCode.toDataURL(qr);
            connectionStatus = 'connecting';
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            connectionStatus = 'disconnected';
            qrCodeData = null;
            if (shouldReconnect) {
                // Throttle reconnection to avoid log flooding
                setTimeout(connectToWhatsApp, 10000);
            } else {
                // Clean up auth folder if logged out
                if (fs.existsSync(authPath)) {
                    fs.rmSync(authPath, { recursive: true, force: true });
                }
            }
        } else if (connection === 'open') {
            console.log('[WhatsApp] Connection opened');
            connectionStatus = 'connected';
            qrCodeData = null;
        }
    });
}

// Initial connection attempt
connectToWhatsApp();

export default {
    getStatus: () => ({ status: connectionStatus, qr: qrCodeData }),
    connect: connectToWhatsApp,
    sendMessage: async (phone, text, imageBase64) => {
        if (!sock || connectionStatus !== 'connected') {
            throw new Error('WhatsApp not connected');
        }

        // Ensure phone is formatted (remove +, spaces, ensure suffix)
        let id = phone.replace(/[^0-9]/g, '');
        if (!id.endsWith('@s.whatsapp.net')) {
            id += '@s.whatsapp.net';
        }

        if (imageBase64) {
            // Convert base64 to buffer (remove prefix if present)
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');

            await sock.sendMessage(id, {
                image: buffer,
                caption: text
            });
        } else {
            await sock.sendMessage(id, { text });
        }
        console.log(`[WhatsApp] Sent to ${phone}`);
    },
    logout: async () => {
        try {
            if (sock) {
                await sock.logout();
            }
        } catch (err) {
            console.error("Logout failed or already logged out", err);
        } finally {
            // Force cleanup
            if (fs.existsSync(authPath)) {
                fs.rmSync(authPath, { recursive: true, force: true });
            }
            connectionStatus = 'disconnected';
            qrCodeData = null;
            connectToWhatsApp(); // Restart to allow new login
        }
    }
};
