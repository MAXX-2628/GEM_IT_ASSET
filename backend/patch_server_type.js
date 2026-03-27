const mongoose = require('mongoose');

async function patchServerTypeProperly() {
    try {
        await mongoose.connect('mongodb://localhost:27017/gem_itasset_chn');
        console.log('Connected to gem_itasset_chn');

        const typeSchema = new mongoose.Schema({
            name: String,
            custom_fields: Array
        }, { collection: 'assettypes' });

        const AssetType = mongoose.model('AssetType', typeSchema);

        // Standard system fields 
        // Marking them isSystem: true will trigger the Unified Layout in the frontend
        // For hardware specs, we use the 'specs.' prefix to match the Asset model
        const baseFields = [
            { label: 'Asset ID', key: 'asset_id', field_type: 'text', x: 0, y: 0, w: 6, h: 1, required: true, isSystem: true, locked: true },
            { label: 'Asset Type', key: 'asset_type', field_type: 'select', x: 6, y: 0, w: 6, h: 1, required: true, isSystem: true, locked: true },
            { label: 'Department', key: 'department', field_type: 'select', x: 0, y: 1, w: 6, h: 1, required: true, isSystem: true, locked: true },
            { label: 'Status', key: 'status', field_type: 'select', x: 6, y: 1, w: 6, h: 1, required: true, isSystem: true, locked: true },
            { label: 'MAC Address', key: 'mac_address', field_type: 'text', x: 0, y: 2, w: 6, h: 1, required: true, isSystem: true, locked: true },
            { label: 'Hostname', key: 'hostname', field_type: 'text', x: 6, y: 2, w: 6, h: 1, isSystem: true, locked: true },
            { label: 'IP Address', key: 'ip_address', field_type: 'text', x: 0, y: 3, w: 6, h: 1, isSystem: true, locked: true },
            { label: 'IP Address 2', key: 'ip_address_2', field_type: 'text', x: 6, y: 3, w: 6, h: 1, isSystem: false },
            { label: 'Floor', key: 'location', field_type: 'select', x: 0, y: 4, w: 6, h: 1, isSystem: true, locked: true },
            { label: 'Vlan ID', key: 'vlan_id', field_type: 'text', x: 6, y: 4, w: 6, h: 1, isSystem: false },
            { label: 'Assigned User', key: 'assigned_user', field_type: 'text', x: 0, y: 5, w: 12, h: 1, isSystem: true, locked: true },
            { label: 'Notes', key: 'notes', field_type: 'textarea', x: 0, y: 6, w: 12, h: 2, isSystem: true, locked: true },

            { label: 'Server Specifications', key: 'sec_hard', field_type: 'section', x: 0, y: 8, w: 12, h: 1, isSystem: false },
            { label: 'CPU', key: 'specs.cpu', field_type: 'text', x: 0, y: 9, w: 6, h: 1, isSystem: true },
            { label: 'RAM', key: 'specs.ram', field_type: 'text', x: 6, y: 9, w: 6, h: 1, isSystem: true },
            { label: 'Storage GB/TB', key: 'specs.storage', field_type: 'text', x: 0, y: 10, w: 6, h: 1, isSystem: true },
            { label: 'Storage Type', key: 'specs.storage_type', field_type: 'select', options: ['SSD', 'HDD', 'NVMe', 'Hybrid'], x: 6, y: 10, w: 6, h: 1, isSystem: true },
            { label: 'Operating System', key: 'specs.os', field_type: 'text', x: 0, y: 11, w: 12, h: 1, isSystem: true },
            { label: 'Model', key: 'specs.model', field_type: 'text', x: 0, y: 12, w: 6, h: 1, isSystem: true },
            { label: 'Serial No.', key: 'specs.serial_number', field_type: 'text', x: 6, y: 12, w: 6, h: 1, isSystem: true }
        ];

        const res = await AssetType.updateOne(
            { name: 'Server' },
            { $set: { custom_fields: baseFields } }
        );

        console.log('Update result:', res);
        process.exit(0);
    } catch (err) {
        console.error('Update failed:', err);
        process.exit(1);
    }
}

patchServerTypeProperly();
