/**
 * Centralized utility for dynamic Asset ID generation
 * Format: {TYPE_CODE}-{SEQUENCE} (e.g., SRV-0001, NVR-0001)
 * Sequence is independent per asset_type — each type starts from 0001.
 */
const generateNextAssetId = async (Asset, AssetType, Counter, branchCode, assetTypeName, isPreview = false) => {
    try {
        // 1. Get the type code from AssetType model
        const typeInfo = await AssetType.findOne({ name: assetTypeName }).lean();
        const typeCode = typeInfo?.code || assetTypeName?.slice(0, 3).toUpperCase() || 'AST';

        // 2. Get the current sequence
        const counterId = `asset_${assetTypeName.replace(/\s+/g, '_').toUpperCase()}`;
        let seq = 1;

        if (isPreview) {
            const counter = await Counter.findOne({ id: counterId }).lean();
            seq = (counter?.seq || 0) + 1;
        } else {
            const counter = await Counter.findOneAndUpdate(
                { id: counterId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            seq = counter.seq;
        }

        // 3. Zero-pad to 4 digits (e.g., 0001, 0002)
        const sequence = seq.toString().padStart(4, '0');

        // 4. Return combined ID
        return `${typeCode}-${sequence}`;
    } catch (err) {
        console.error('Error in idGenerator:', err);
        return `ERR-${Date.now().toString().slice(-4)}`;
    }
};

module.exports = { generateNextAssetId };

