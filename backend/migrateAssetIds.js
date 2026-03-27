/**
 * ONE-TIME MIGRATION SCRIPT: Asset ID Format Change
 * 
 * Changes asset IDs from old format (e.g. "0001") to new prefixed format (e.g. "SRV-0001")
 * 
 * HOW TO RUN (from the /backend directory):
 *   node migrateAssetIds.js
 * 
 * WHAT IT DOES:
 *   1. Connects to the master DB to fetch all branches
 *   2. For each branch DB:
 *      a. Fetches all AssetTypes to build a name→code map
 *      b. Finds all assets with old 4-digit numeric IDs
 *      c. Renames each one to CODE-XXXX
 *      d. Updates cross-references: parent_asset_id, SurveillanceAsset.asset_id
 *   3. Prints a full audit log of all changes
 *
 * SAFE TO RE-RUN: Already-migrated IDs (containing a dash) are skipped automatically.
 */

require('dotenv').config();
const mongoose = require('mongoose');

// ── Schema definitions (minimal, for migration only) ─────────────────────────

const AssetTypeSchema = new mongoose.Schema({
    name: String,
    code: String,
}, { strict: false });

const AssetSchema = new mongoose.Schema({
    asset_id: String,
    asset_type: String,
    parent_asset_id: String,
}, { strict: false });

const SurveillanceAssetSchema = new mongoose.Schema({
    asset_id: String,
}, { strict: false });

const BranchSchema = new mongoose.Schema({
    name: String,
    code: String,
    isDeleted: Boolean,
}, { strict: false });

// ── Helpers ───────────────────────────────────────────────────────────────────

const isOldFormat = (id) => /^\d{4}$/.test(id?.trim() ?? '');

// ── Main Migration ─────────────────────────────────────────────────────────────

async function migrateBranch(branchCode, masterUri) {
    const baseUri = masterUri.split('?')[0];
    const uriParts = baseUri.split('/');
    uriParts[uriParts.length - 1] = `gem_itasset_${branchCode.toLowerCase()}`;
    const branchUri = uriParts.join('/') + (masterUri.includes('?') ? '?' + masterUri.split('?')[1] : '');

    console.log(`\n🔌 Connecting to branch: gem_itasset_${branchCode.toLowerCase()}`);
    const conn = await mongoose.createConnection(branchUri).asPromise();

    const AssetType = conn.model('AssetType', AssetTypeSchema);
    const Asset = conn.model('Asset', AssetSchema);
    const SurveillanceAsset = conn.model('SurveillanceAsset', SurveillanceAssetSchema);

    // 1. Build type code map
    const types = await AssetType.find({}).lean();
    const typeCodeMap = {};
    types.forEach(t => {
        typeCodeMap[t.name] = t.code || t.name.slice(0, 3).toUpperCase();
    });
    console.log(`   📋 Found ${types.length} asset types: ${Object.keys(typeCodeMap).join(', ')}`);

    // 2. Find all assets needing migration (plain 4-digit IDs)
    const allAssets = await Asset.find({}).select('asset_id asset_type parent_asset_id').lean();
    const toMigrate = allAssets.filter(a => isOldFormat(a.asset_id));

    console.log(`   📦 Total assets: ${allAssets.length} | Need migration: ${toMigrate.length}`);

    if (toMigrate.length === 0) {
        console.log(`   ✅ Nothing to migrate for this branch.`);
        await conn.close();
        return;
    }

    let migrated = 0;
    let failed = 0;
    const changeLog = [];

    // 3. Migrate each asset
    for (const asset of toMigrate) {
        const typeCode = typeCodeMap[asset.asset_type] || asset.asset_type?.slice(0, 3).toUpperCase() || 'AST';
        const oldId = asset.asset_id;
        const newId = `${typeCode}-${oldId}`;

        try {
            // Update the asset's own ID (bypass unique index by using _id)
            await Asset.updateOne({ _id: asset._id }, { $set: { asset_id: newId } });

            // Update any peripheral assets that reference this as parent
            const parentResult = await Asset.updateMany(
                { parent_asset_id: oldId },
                { $set: { parent_asset_id: newId } }
            );

            // Update any SurveillanceAsset linked to this asset
            const survResult = await SurveillanceAsset.updateMany(
                { asset_id: oldId },
                { $set: { asset_id: newId } }
            );

            const log = {
                type: asset.asset_type,
                old: oldId,
                new: newId,
                peripherals_updated: parentResult.modifiedCount,
                surveillance_updated: survResult.modifiedCount,
            };
            changeLog.push(log);
            migrated++;
            console.log(`   ✅ ${asset.asset_type}: ${oldId} → ${newId}${log.peripherals_updated ? ` (${log.peripherals_updated} peripherals updated)` : ''}${log.surveillance_updated ? ` (${log.surveillance_updated} surveillance links updated)` : ''}`);
        } catch (err) {
            failed++;
            console.error(`   ❌ Failed to migrate ${oldId} (${asset.asset_type}): ${err.message}`);
        }
    }

    console.log(`\n   📊 Branch ${branchCode} Summary: ${migrated} migrated, ${failed} failed`);

    await conn.close();
    return changeLog;
}

async function run() {
    const masterUri = process.env.MONGODB_URI;
    if (!masterUri) {
        console.error('❌ MONGODB_URI not set in .env file. Please check your environment.');
        process.exit(1);
    }

    console.log('🚀 Starting Asset ID Migration...');
    console.log('================================================');

    // Connect to master DB to get branches
    const masterConn = await mongoose.createConnection(masterUri).asPromise();

    const Branch = masterConn.model('Branch', BranchSchema);
    const branches = await Branch.find({ isDeleted: { $ne: true } }).lean();

    console.log(`🏢 Found ${branches.length} branch(es): ${branches.map(b => b.code).join(', ')}`);
    await masterConn.close();

    // Process each branch
    const allChanges = {};
    for (const branch of branches) {
        const changes = await migrateBranch(branch.code, masterUri);
        if (changes) allChanges[branch.code] = changes;
    }

    console.log('\n================================================');
    console.log('✅ Migration Complete!');
    console.log('\n📋 Full Change Log:');
    for (const [branch, changes] of Object.entries(allChanges)) {
        if (changes.length > 0) {
            console.log(`\n  Branch: ${branch}`);
            changes.forEach(c => console.log(`    ${c.type}: ${c.old} → ${c.new}`));
        }
    }

    console.log('\n⚠️  Reminder: Reprint any QR/barcode labels for migrated assets.');
    process.exit(0);
}

run().catch(err => {
    console.error('💥 Migration failed with error:', err);
    process.exit(1);
});
