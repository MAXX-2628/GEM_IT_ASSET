const logger = require('../config/logger');

/**
 * Seed a specific branch database with default data if it's empty
 * @param {Object} models - The branch-specific models bound to a connection
 * @param {string} branchName - Name of the branch for logging
 */
const seedBranchDefaults = async (models, branchName) => {
    const { AssetType, Status, Department, Floor } = models;

    try {
        // 1. Seed default types
        const typeCount = await AssetType.countDocuments();
        if (typeCount === 0) {
            const baseFields = [
                { label: 'CPU', key: 'cpu', field_type: 'text', x: 0, y: 0, w: 6, h: 1 },
                { label: 'RAM', key: 'ram', field_type: 'text', x: 6, y: 0, w: 6, h: 1 },
                { label: 'Storage GB/TB', key: 'storage', field_type: 'text', x: 0, y: 1, w: 6, h: 1 },
                { label: 'Storage Type', key: 'storage_type', field_type: 'select', options: ['SSD', 'HDD', 'NVMe', 'Hybrid'], x: 6, y: 1, w: 6, h: 1 },
                { label: 'Operating System', key: 'os', field_type: 'text', x: 0, y: 2, w: 12, h: 1 },
                { label: 'Model', key: 'model', field_type: 'text', x: 0, y: 3, w: 6, h: 1 },
                { label: 'Serial No.', key: 'serial', field_type: 'text', x: 6, y: 3, w: 6, h: 1 }
            ];

            const defaultTypes = [
                { name: 'Server', code: 'SRV', custom_fields: baseFields },
                { name: 'PC', code: 'PC', custom_fields: baseFields },
                { name: 'Laptop', code: 'LAP', custom_fields: baseFields },
                {
                    name: 'Printer', code: 'PRN', custom_fields: [
                        { label: 'Printer Type', key: 'printer_type', field_type: 'select', options: ['Laser', 'Inkjet', 'Thermal', 'Dot Matrix'], x: 0, y: 0, w: 6, h: 1 },
                        { label: 'Tonner/Cartridge Model', key: 'toner', field_type: 'text', x: 6, y: 0, w: 6, h: 1 }
                    ]
                },
                {
                    name: 'Switch', code: 'SW', custom_fields: [
                        { label: 'Ports Count', key: 'ports', field_type: 'number', x: 0, y: 0, w: 6, h: 1 },
                        { label: 'Managed/Unmanaged', key: 'managed', field_type: 'select', options: ['Managed', 'Unmanaged'], x: 6, y: 0, w: 6, h: 1 }
                    ]
                },
                { name: 'Router', code: 'RT' },
                { name: 'UPS', code: 'UPS' },
                { name: 'Monitor', code: 'MON' },
                { name: 'Tablet', code: 'TAB' },
                { name: 'Other', code: 'OTH' }
            ];
            await AssetType.insertMany(defaultTypes);
            logger.info(`✅ Seeded default asset types for ${branchName}`);
        }

        // 2. Seed default statuses
        const statusCount = await Status.countDocuments();
        if (statusCount === 0) {
            const defaultStatuses = [
                { name: 'Active', color: 'success' },
                { name: 'Inactive', color: 'default' },
                { name: 'Under Maintenance', color: 'warning' },
                { name: 'Retired', color: 'purple' },
                { name: 'Offline', color: 'danger' }
            ];
            await Status.insertMany(defaultStatuses);
            logger.info(`✅ Seeded default statuses for ${branchName}`);
        }

        // 3. Seed default floors
        const floorCount = await Floor.countDocuments();
        if (floorCount === 0) {
            const defaultFloors = [
                { name: 'Basement' },
                { name: 'Ground Floor' },
                { name: '1st Floor' },
                { name: '2nd Floor' },
                { name: '3rd Floor' },
                { name: '4th Floor' },
                { name: '5th Floor' },
                { name: 'Terrace' }
            ];
            await Floor.insertMany(defaultFloors);
            logger.info(`✅ Seeded default floors for ${branchName}`);
        }

        // 4. Seed default departments
        const deptCount = await Department.countDocuments();
        if (deptCount === 0) {
            const defaultDepts = [
                { name: 'Operation Theatre', code: 'OT', floor: '1st Floor' },
                { name: 'Intensive Care Unit', code: 'ICU', floor: '1st Floor' },
                { name: 'Information Technology', code: 'IT', floor: 'G Floor' },
                { name: 'Administration', code: 'ADMIN', floor: 'G Floor' },
                { name: 'Radiology', code: 'RAD', floor: 'G Floor' },
                { name: 'Laboratory', code: 'LAB', floor: 'G Floor' },
                { name: 'Outpatient Dept', code: 'OPD', floor: 'G Floor' },
                { name: 'Emergency', code: 'EMRG', floor: 'G Floor' },
                { name: 'Pharmacy', code: 'PHAR', floor: 'G Floor' },
                { name: 'IPD / Wards', code: 'IPD', floor: '2nd Floor' },
                { name: 'CSSD', code: 'CSSD', floor: 'B Floor' },
                { name: 'Other / Misc', code: 'OTHER' }
            ];
            await Department.insertMany(defaultDepts);
            logger.info(`✅ Seeded default departments for ${branchName}`);
        }

    } catch (err) {
        logger.error(`❌ Error seeding defaults for ${branchName}: ${err.message}`);
    }
};

module.exports = { seedBranchDefaults };
