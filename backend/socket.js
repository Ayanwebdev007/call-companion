import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

// Store connected mobile clients by user_id
const mobileClients = new Map(); // user_id -> socket.id

export function initializeSocketIO(server) {
    io = new Server(server, {
        cors: {
            origin: [
                'http://localhost:8080',
                'http://localhost:8081',
                'http://localhost:5173',
                'http://192.168.31.210:8081',
                'https://call-companion-frontend.onrender.com',
                'https://digityzeinternational.online',
                process.env.FRONTEND_URL
            ].filter(Boolean),
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('[WebSocket] Client connected:', socket.id);

        // Mobile app authentication
        socket.on('mobile:authenticate', (token) => {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.id; // Corrected structure

                // Store this socket for the user
                mobileClients.set(userId, socket.id);
                socket.userId = userId;

                socket.emit('mobile:authenticated', { success: true, userId });
                console.log(`[WebSocket] Mobile authenticated: userId=${userId}, socketId=${socket.id}`);
            } catch (err) {
                console.error('[WebSocket] Authentication failed:', err.message);
                socket.emit('mobile:auth_error', { error: 'Invalid token' });
            }
        });

        socket.on('disconnect', () => {
            if (socket.userId) {
                mobileClients.delete(socket.userId);
                console.log(`[WebSocket] Mobile disconnected: userId=${socket.userId}`);
            }
        });
    });

    console.log('[WebSocket] Socket.IO initialized');
    return io;
}

export function getIO() {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
}

// Send call request to specific user's mobile device
export function sendCallRequestToMobile(userId, callRequest) {
    const socketId = mobileClients.get(userId.toString());

    if (socketId) {
        io.to(socketId).emit('call:request', {
            request_id: callRequest._id,
            customer_id: callRequest.customer_id,
            customer_name: callRequest.customer_name,
            phone_number: callRequest.phone_number,
            requested_at: callRequest.requested_at
        });
        console.log(`[WebSocket] Call request sent to mobile: userId=${userId}, socketId=${socketId}`);
        return true;
    } else {
        console.log(`[WebSocket] Mobile not connected: userId=${userId}. Active clients:`, Array.from(mobileClients.keys()));
        return false;
    }
}
