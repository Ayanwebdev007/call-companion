import { default as makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sessions = new Map(); // userId -> { sock, qr, status }
const authBaseDir = path.join(__dirname, '../auth_info_baileys');

// Ensure base auth directory exists
if (!fs.existsSync(authBaseDir)) {
    fs.mkdirSync(authBaseDir, { recursive: true });
}

async function connectToWhatsApp(userId) {
    if (!userId) return;

    const authPath = path.join(authBaseDir, `user_${userId}`);
    const { state, saveCreds } = await useMultiFileAuthState(authPath);

    let session = sessions.get(userId) || { sock: null, qr: null, status: 'disconnected' };

    // If already connecting or connected, don't start another one unless requested
    if (session.status === 'connected' && session.sock) return;

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
    });

    session.sock = sock;
    session.status = 'connecting';
    sessions.set(userId, session);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            session.qr = await QRCode.toDataURL(qr);
            session.status = 'connecting';
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            session.status = 'disconnected';
            session.qr = null;

            if (shouldReconnect) {
                setTimeout(() => connectToWhatsApp(userId), 10000);
            } else {
                if (fs.existsSync(authPath)) {
                    fs.rmSync(authPath, { recursive: true, force: true });
                }
                sessions.delete(userId);
            }
        } else if (connection === 'open') {
            console.log(`[WhatsApp] Connection opened for user ${userId}`);
            session.status = 'connected';
            session.qr = null;
        }
    });

    return sock;
}

// Note: We don't auto-connect all users on start here. 
// They will connect when they hit the status/connect endpoints or try to send.

export default {
    getStatus: (userId) => {
        const session = sessions.get(userId);
        return session ? { status: session.status, qr: session.qr } : { status: 'disconnected', qr: null };
    },
    connect: connectToWhatsApp,
    sendMessage: async (userId, phone, text, imageBase64) => {
        const session = sessions.get(userId);
        if (!session || !session.sock || session.status !== 'connected') {
            // Try to connect if session exists but disconnected? 
            // Better to throw so UI knows to ask for connection
            throw new Error('WhatsApp not connected for this user');
        }

        const { sock } = session;

        if (!phone || phone === 'N/A' || phone.trim() === '') {
            throw new Error('Invalid phone number: Number is missing or N/A');
        }

        // Ensure phone is formatted (remove +, spaces, ensure suffix)
        let id = phone.replace(/[^0-9]/g, '');
        if (!id) {
            throw new Error('Invalid phone number: No numeric digits found');
        }

        if (!id.endsWith('@s.whatsapp.net')) {
            id += '@s.whatsapp.net';
        }

        if (imageBase64) {
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');

            await sock.sendMessage(id, {
                image: buffer,
                caption: text
            });
        } else {
            await sock.sendMessage(id, { text });
        }
        console.log(`[WhatsApp] Sent from user ${userId} to ${phone}`);
    },
    logout: async (userId) => {
        const session = sessions.get(userId);
        if (!session) return;

        try {
            if (session.sock) {
                await session.sock.logout();
            }
        } catch (err) {
            console.error(`Logout failed for user ${userId}`, err);
        } finally {
            const authPath = path.join(authBaseDir, `user_${userId}`);
            if (fs.existsSync(authPath)) {
                fs.rmSync(authPath, { recursive: true, force: true });
            }
            sessions.delete(userId);
        }
    }
};
