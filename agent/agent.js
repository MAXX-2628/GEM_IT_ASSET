/**
 * GEM Hospital IT Asset - PC Auto-Discovery Agent
 * Deploy on each hospital PC/server endpoint.
 * Sends a heartbeat every 5 minutes to the IT Asset API.
 * The API matches by MAC address and updates the asset record.
 */

const si = require('systeminformation');
const axios = require('axios');
const cron = require('node-cron');

// ─── Config ──────────────────────────────────────────────
const API_URL = 'http://192.168.1.34:5000'; // Change to your server IP
const INTERVAL = '*/5 * * * *';              // Every 5 minutes
// ─────────────────────────────────────────────────────────

async function collectSystemInfo() {
    const [osInfo, cpu, mem, networkIfaces, system, diskLayout] = await Promise.all([
        si.osInfo(),
        si.cpu(),
        si.mem(),
        si.networkInterfaces(),
        si.system(),
        si.diskLayout()
    ]);

    // Pick the first non-virtual, non-loopback ethernet/wifi interface
    const iface = networkIfaces.find(n => !n.virtual && n.mac && n.mac !== '00:00:00:00:00:00');

    const totalStorageGb = diskLayout.reduce((acc, disk) => acc + (disk.size || 0), 0) / 1073741824;

    return {
        hostname: osInfo.hostname,
        mac_address: iface?.mac || '',
        ip_address: iface?.ip4 || '',
        os: `${osInfo.platform} ${osInfo.distro} ${osInfo.release}`.trim(),
        cpu: `${cpu.manufacturer} ${cpu.brand} (${cpu.cores} cores)`.trim(),
        ram: `${Math.round(mem.total / 1073741824)} GB`,
        storage: totalStorageGb > 0 ? `${Math.round(totalStorageGb)} GB` : '',
        model: `${system.manufacturer} ${system.model}`.trim(),
        serial_number: system.serial || system.uuid || ''
    };
}

async function sendHeartbeat() {
    try {
        const info = await collectSystemInfo();
        if (!info.mac_address) {
            console.warn('[Agent] No MAC address found, skipping heartbeat.');
            return;
        }

        const res = await axios.post(`${API_URL}/api/agent/heartbeat`, info, { timeout: 10000 });
        const now = new Date().toLocaleTimeString();

        if (res.data.registered) {
            console.log(`[${now}] ✅ Heartbeat sent — Asset: ${res.data.asset_id}`);
        } else {
            console.warn(`[${now}] ⚠️  Device not registered: MAC=${info.mac_address}, Hostname=${info.hostname}`);
        }
    } catch (err) {
        console.error(`[Agent] ❌ Heartbeat failed: ${err.message}`);
    }
}

// Send immediately on start
sendHeartbeat();

// Then every 5 minutes
cron.schedule(INTERVAL, sendHeartbeat);
console.log(`🚀 GEM PC Agent started. Reporting to: ${API_URL} every 5 minutes.`);
