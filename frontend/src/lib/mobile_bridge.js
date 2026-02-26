/**
 * Mobile Bridge Helper
 * This helper allows the Web CRM to detect if it's running inside the Call Companion Flutter App
 * and trigger native actions like making phone calls with automatic tracking.
 */

const MobileBridge = {
    /**
     * Check if the app is running inside the Flutter WebView
     */
    isNative: () => {
        return typeof window.FlutterChannel !== 'undefined';
    },

    /**
     * Initiate a call through the native Flutter layer
     * @param {string} phoneNumber - The number to dial
     * @param {string} customerName - The name of the customer (for logging)
     */
    makeCall: (phoneNumber, customerName) => {
        if (MobileBridge.isNative()) {
            console.log(`[MobileBridge] Triggering native call to ${phoneNumber}`);
            window.FlutterChannel.postMessage(JSON.stringify({
                action: 'call',
                phoneNumber: phoneNumber,
                customerName: customerName || 'Unknown'
            }));
            return true;
        }
        console.warn('[MobileBridge] Not running in native app. Use standard tel: link fallback.');
        return false;
    }
};

export default MobileBridge;
