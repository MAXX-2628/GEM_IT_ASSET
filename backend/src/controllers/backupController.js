const AdmZip = require('adm-zip');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');

exports.createBackup = async (req, res) => {
    try {
        const branchCode = req.branchCode || 'CHN';
        const { models } = req;
        const zip = new AdmZip();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupMeta = {
            version: '1.0',
            timestamp: new Date(),
            branchCode,
            branchName: req.branch || 'Unknown',
            collections: []
        };

        // 1. Backup Branch Data
        for (const modelName in req.models) {
            const Model = req.models[modelName];
            let query = Model.find({});
            if (modelName === 'Asset') query = query.select('+credentials');
            const data = await query.lean();
            if (data.length > 0) {
                zip.addFile(`branch_${modelName.toLowerCase()}.json`, Buffer.from(JSON.stringify(data, null, 2)));
                backupMeta.collections.push({ name: modelName, count: data.length, type: 'branch' });
            }
        }

        // 2. Backup Master Data (optional or limited depending on role)
        // For now, allow full backup of User and Branch for admin use
        const users = await db.User.find({}).select('+password').lean();
        zip.addFile('master_users.json', Buffer.from(JSON.stringify(users, null, 2)));
        backupMeta.collections.push({ name: 'User', count: users.length, type: 'master' });

        const branches = await db.Branch.find({}).lean();
        zip.addFile('master_branches.json', Buffer.from(JSON.stringify(branches, null, 2)));
        backupMeta.collections.push({ name: 'Branch', count: branches.length, type: 'master' });

        // 3. Add Metadata
        zip.addFile('metadata.json', Buffer.from(JSON.stringify(backupMeta, null, 2)));

        const zipBuffer = zip.toBuffer();

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="GEM_IT_Backup_${branchCode}_${timestamp}.zip"`);
        res.send(zipBuffer);

    } catch (err) {
        console.error('Backup creation failed:', err);
        res.status(500).json({ success: false, message: 'Backup creation failed: ' + err.message });
    }
};

exports.restoreBackup = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload a backup zip file' });
    }

    try {
        const zip = new AdmZip(req.file.buffer);
        const zipEntries = zip.getEntries();

        const metadataEntry = zipEntries.find(e => e.entryName === 'metadata.json');
        if (!metadataEntry) {
            return res.status(400).json({ success: false, message: 'Invalid backup file: metadata.json missing' });
        }

        const metadata = JSON.parse(metadataEntry.getData().toString('utf8'));

        // Safety check: ensure branch matches or allow cross-branch restore with warning?
        // For now, let's just proceed but log it.

        console.log(`🚀 Starting restore for branch ${req.branch || 'Unknown'} from backup ${metadata.timestamp}`);

        for (const entry of zipEntries) {
            if (entry.entryName === 'metadata.json') continue;

            const data = JSON.parse(entry.getData().toString('utf8'));

            if (entry.entryName.startsWith('branch_')) {
                const modelName = entry.entryName.replace('branch_', '').replace('.json', '');
                // Capitalize first letter to match model name (e.g. asset -> Asset)
                const actualModelName = Object.keys(req.models).find(m => m.toLowerCase() === modelName);

                if (actualModelName) {
                    const Model = req.models[actualModelName];
                    
                    let dataToInsert = data;
                    if (actualModelName === 'Asset') {
                        const existingAssets = await Model.find({}).select('+credentials').lean();
                        dataToInsert = data.map(asset => {
                            if (!asset.credentials) {
                                const existing = existingAssets.find(ex => ex.asset_id === asset.asset_id);
                                if (existing && existing.credentials) {
                                    asset.credentials = existing.credentials;
                                }
                            }
                            return asset;
                        });
                    }

                    await Model.deleteMany({});
                    if (dataToInsert.length > 0) {
                        try {
                            await Model.insertMany(dataToInsert);
                        } catch (err) {
                            console.error(`Error restoring ${actualModelName}:`, err);
                            throw new Error(`Failed to restore ${actualModelName}: ${err.message}`);
                        }
                    }
                }
            } else if (entry.entryName === 'master_users.json') {
                const existingUsers = await db.User.find({}).select('+password').lean();
                const usersToInsert = await Promise.all(data.map(async u => {
                    if (!u.password) {
                        const existing = existingUsers.find(ex => ex.username === u.username || ex.email === u.email);
                        if (existing) {
                            u.password = existing.password;
                        } else {
                            const bcrypt = require('bcryptjs');
                            u.password = await bcrypt.hash('Fallback@123', 10);
                        }
                    }
                    return u;
                }));

                await db.User.deleteMany({});
                await db.User.insertMany(usersToInsert);
            } else if (entry.entryName === 'master_branches.json') {
                await db.Branch.deleteMany({});
                await db.Branch.insertMany(data);
            }
        }

        res.status(200).json({ success: true, message: 'System restored successfully' });

    } catch (err) {
        console.error('Restore failed:', err);
        res.status(500).json({ success: false, message: 'Restore failed: ' + err.message });
    }
};
