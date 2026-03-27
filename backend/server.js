require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const os = require('os');
const fs = require('fs');

const db = require('./src/config/db');
const modelInjector = require('./src/middleware/modelInjector');
const logger = require('./src/config/logger');
const errorHandler = require('./src/middleware/errorHandler');
const { runScheduler } = require('./src/services/scheduler');
const { seedBranchDefaults } = require('./src/services/seedService');
const { getBranchConnection, getBranchModels } = require('./src/config/tenantManager');


// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Routes
const authRoutes = require('./src/routes/auth');
const assetRoutes = require('./src/routes/assets');
const departmentRoutes = require('./src/routes/departments');
const licenseRoutes = require('./src/routes/licenses');
const ticketRoutes = require('./src/routes/tickets');
const dashboardRoutes = require('./src/routes/dashboard');
const reportRoutes = require('./src/routes/reports');
const agentRoutes = require('./src/routes/agent');
const typeRoutes = require('./src/routes/types');
const statusRoutes = require('./src/routes/statuses');
const floorRoutes = require('./src/routes/floors');
const communicationRoutes = require('./src/routes/communications');
const pmRoutes = require('./src/routes/pmRoutes');
const branchRoutes = require('./src/routes/branchRoutes');
const vendorRoutes = require('./src/routes/vendors');
const surveillanceRoutes = require('./src/routes/surveillance');
const storageTypeRoutes = require('./src/routes/storageTypeRoutes');
const handoverRoutes = require('./src/routes/handoverRoutes');
const activityRoutes = require('./src/routes/activityRoutes');
const formTemplateRoutes = require('./src/routes/formTemplates');
const stockRoutes = require('./src/routes/stock');
const stockConfigRoutes = require('./src/routes/stockConfig');
const userRoutes = require('./src/routes/users');
const settingsRoutes = require('./src/routes/settings');

const app = express();

// ─── Security & Middleware ───────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// ─── Static Uploads ──────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API Routes ───────────────────────────────────────────────────────
// Inject branch models based on branch header
app.use(modelInjector);

const backupRoutes = require('./src/routes/backupRoutes');

app.use('/api/branches', branchRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/types', typeRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/floors', floorRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/pm', pmRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/surveillance', surveillanceRoutes);
app.use('/api/storage-types', storageTypeRoutes);
app.use('/api/handovers', handoverRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/form-templates', formTemplateRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/stock-config', stockConfigRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);

// ─── Production Frontend Serving ──────────────────────────────────────
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(frontendDist, 'index.html'));
        }
    });
}

// ─── Health Check ─────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), system: 'GEM Hospital IT Asset System' });
});

// ─── 404 Handler ──────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

// ─── Global Error Handler ─────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

// Detect local IP
function getLocalIP() {
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
        for (const iface of ifaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return 'localhost';
}

const startServer = async () => {
    await db.connectDB();

    const localIP = getLocalIP();
    const useHTTPS = process.env.USE_HTTPS === 'true';
    const protocol = useHTTPS ? 'https' : 'http';

    if (useHTTPS) {
        const https = require('https');
        const keyPath = path.resolve(process.env.SSL_KEY_PATH || './ssl/server.key');
        const certPath = path.resolve(process.env.SSL_CERT_PATH || './ssl/server.cert');

        if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
            logger.error('❌ SSL cert/key files not found. Run: node scripts/generate-ssl.js');
            process.exit(1);
        }

        const httpsOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
        };

        https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
            logger.info(`🔒 GEM IT Asset Server (HTTPS) running on:`);
            logger.info(`   - Local:   https://localhost:${PORT}`);
            logger.info(`   - Network: https://${localIP}:${PORT}`);
            logger.info(`📋 Health: https://${localIP}:${PORT}/api/health`);
        });
    } else {
        app.listen(PORT, '0.0.0.0', () => {
            logger.info(`🚀 GEM IT Asset Server running on:`);
            logger.info(`   - Local:   http://localhost:${PORT}`);
            logger.info(`   - Network: http://${localIP}:${PORT}`);
            logger.info(`📋 Health: http://${localIP}:${PORT}/api/health`);
        });
    }

    // Seed default branches if empty
    const branchCount = await db.Branch.countDocuments();
    if (branchCount === 0) {
        await db.Branch.create({ name: 'Chennai', code: 'CHN' });
        logger.info('✅ Seeded default branch (Chennai)');
    }

    // Seed/Initialize all active branches
    const activeBranches = await db.Branch.find({ status: 'Active' });
    for (const b of activeBranches) {
        try {
            const conn = await getBranchConnection(b.code);
            const models = getBranchModels(conn);
            await seedBranchDefaults(models, b.name);
        } catch (err) {
            logger.error(`Failed to initialize branch ${b.name}: ${err.message}`);
        }
    }

    // Start background scheduler
    runScheduler();
};

startServer();
