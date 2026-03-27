const mongoose = require('mongoose');
const logger = require('./logger');

const connections = {}; // Cache for branch connections
const schemas = {}; // Cache for compiled models per connection

/**
 * Get or create a connection for a specific branch
 * @param {string} branchCode - The unique code for the branch (e.g., 'CHN', 'MDU')
 */
const getBranchConnection = async (branchCode) => {
    if (!branchCode) {
        throw new Error('Branch code is required for database connection.');
    }

    const dbName = `gem_itasset_${branchCode.toLowerCase()}`;

    if (connections[dbName]) {
        return connections[dbName];
    }

    const baseUri = process.env.MONGODB_URI.split('?')[0];
    const uriParts = baseUri.split('/');
    uriParts[uriParts.length - 1] = dbName;
    const branchUri = uriParts.join('/') + (process.env.MONGODB_URI.includes('?') ? '?' + process.env.MONGODB_URI.split('?')[1] : '');

    logger.info(`🔌 Opening branch connection: ${dbName}`);

    const conn = mongoose.createConnection(branchUri);

    conn.on('connected', () => logger.info(`✅ Branch DB Connected: ${dbName}`));
    conn.on('error', (err) => logger.error(`❌ Branch DB Error (${dbName}): ${err.message}`));

    connections[dbName] = conn;
    return conn;
};

/**
 * Get branch-specific models for a connection
 * @param {Object} connection - Mongoose connection object
 */
const getBranchModels = (connection) => {
    const dbName = connection.name;
    if (schemas[dbName]) return schemas[dbName];

    // Import Schemas
    const AssetSchema = require('../models/Asset').schema;
    const AssetTypeSchema = require('../models/AssetType').schema;
    const DepartmentSchema = require('../models/Department').schema;
    const FloorSchema = require('../models/Floor').schema;
    const PMRecordSchema = require('../models/PMRecord').schema;
    const PMScheduleSchema = require('../models/PMSchedule').schema;
    const PMTemplateSchema = require('../models/PMTemplate').schema;
    const SoftwareLicenseSchema = require('../models/SoftwareLicense').schema;
    const StatusSchema = require('../models/Status').schema;
    const TicketSchema = require('../models/Ticket').schema;
    const CommunicationAssetSchema = require('../models/CommunicationAsset').schema;
    const VendorSchema = require('../models/Vendor').schema;
    const SurveillanceAssetSchema = require('../models/SurveillanceAsset').schema;
    const StorageTypeSchema = require('../models/StorageType').schema;
    const HandoverSchema = require('../models/Handover').schema;
    const ActivityLogSchema = require('../models/ActivityLog').schema;
    const ImportBatchSchema = require('../models/ImportBatch').schema;
    const CounterSchema = require('../models/Counter').schema;
    const StockItemSchema = require('../models/StockItem').schema;
    const StockTransactionSchema = require('../models/StockTransaction').schema;
    const StockConfigSchema = require('../models/StockConfig').schema;

    const models = {
        Asset: connection.model('Asset', AssetSchema),
        AssetType: connection.model('AssetType', AssetTypeSchema),
        Department: connection.model('Department', DepartmentSchema),
        Floor: connection.model('Floor', FloorSchema),
        PMRecord: connection.model('PMRecord', PMRecordSchema),
        PMSchedule: connection.model('PMSchedule', PMScheduleSchema),
        PMTemplate: connection.model('PMTemplate', PMTemplateSchema),
        SoftwareLicense: connection.model('SoftwareLicense', SoftwareLicenseSchema),
        Status: connection.model('Status', StatusSchema),
        Ticket: connection.model('Ticket', TicketSchema),
        CommunicationAsset: connection.model('CommunicationAsset', CommunicationAssetSchema),
        Vendor: connection.model('Vendor', VendorSchema),
        SurveillanceAsset: connection.model('SurveillanceAsset', SurveillanceAssetSchema),
        StorageType: connection.model('StorageType', StorageTypeSchema),
        Handover: connection.model('Handover', HandoverSchema),
        ActivityLog: connection.model('ActivityLog', ActivityLogSchema),
        ImportBatch: connection.model('ImportBatch', ImportBatchSchema),
        Counter: connection.model('Counter', CounterSchema),
        StockItem: connection.model('StockItem', StockItemSchema),
        StockTransaction: connection.model('StockTransaction', StockTransactionSchema),
        StockConfig: connection.model('StockConfig', StockConfigSchema),
    };

    schemas[dbName] = models;

    // Sync indexes for Asset model to drop the old asset_id unique index
    // and create the new compound {asset_type, asset_id} unique index
    models.Asset.syncIndexes().catch(err => {
        logger.error(`⚠️ Failed to sync Asset indexes for ${dbName}: ${err.message}`);
    });

    return models;
};

module.exports = {
    getBranchConnection,
    getBranchModels
};
