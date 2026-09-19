const pool = require('../config/db');

// ============================================
// 1. GET: Public Current Pricing
// ============================================
exports.getCurrentPricing = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT default_price_per_kg, avg_weight_per_bird, transport_fee_per_hen FROM pricing ORDER BY id DESC LIMIT 1'
        );
        const price = rows[0]?.default_price_per_kg || 188; // Default fallback if table is empty
        const avgWeight = rows[0]?.avg_weight_per_bird ?? null;
        const transportFeePerHen = parseFloat(rows[0]?.transport_fee_per_hen) || 0;
        res.json({
            success: true,
            price,
            avgWeight: avgWeight === null ? null : parseFloat(avgWeight),
            transportFeePerHen,
        });
    } catch (error) {
        console.error('Error fetching current pricing:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ============================================
// 2. GET: Admin Pricing Data (Global + All Retailers + Custom)
// ============================================
exports.getAdminPricingData = async (req, res) => {
    try {
        // 1. Get the latest Global Price
        const [globalRows] = await pool.query(
            'SELECT default_price_per_kg, avg_weight_per_bird, transport_fee_per_hen, updated_at FROM pricing ORDER BY id DESC LIMIT 1'
        );
        const globalPrice = globalRows[0] || { default_price_per_kg: 188, avg_weight_per_bird: null, transport_fee_per_hen: 0 };

        // 2. Get all retailers and join with their custom prices (if they exist)
        const [retailers] = await pool.query(`
            SELECT 
                r.id, 
                r.shop_name, 
                r.owner_name, 
                r.phone,
                COALESCE(rp.custom_price_per_kg, 0) as custom_price,
                rp.custom_transport_fee_per_hen,
                rp.updated_at as custom_price_updated_at
            FROM retailers r
            LEFT JOIN retailer_pricing rp ON r.id = rp.retailer_id
            ORDER BY r.shop_name ASC
        `);

        res.json({
            success: true,
            globalPrice: globalPrice.default_price_per_kg,
            avgWeight:
                globalPrice.avg_weight_per_bird === null ||
                globalPrice.avg_weight_per_bird === undefined
                    ? null
                    : parseFloat(globalPrice.avg_weight_per_bird),
            transportFeePerHen: parseFloat(globalPrice.transport_fee_per_hen) || 0,
            lastUpdated: globalPrice.updated_at,
            retailers: retailers.map((r) => ({
                ...r,
                custom_transport_fee_per_hen:
                    r.custom_transport_fee_per_hen === null || r.custom_transport_fee_per_hen === undefined
                        ? null
                        : parseFloat(r.custom_transport_fee_per_hen),
            })),
        });

    } catch (error) {
        console.error('Error in getAdminPricingData:', error);
        res.status(500).json({ success: false, message: 'Server error fetching pricing data' });
    }
};

// ============================================
// 3. GET: Global Price History
//
// updateGlobalPrice below has always INSERTed a new row rather than
// overwriting the existing one, so every past change is already sitting in
// this table — this was never actually missing data, just a missing
// endpoint to read it back out.
// ============================================
exports.getPriceHistory = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT id, default_price_per_kg, avg_weight_per_bird, transport_fee_per_hen, updated_by, updated_at
            FROM pricing
            ORDER BY id DESC
            LIMIT 100
        `);

        // Pair each row with the one before it (chronologically) so the
        // frontend can show what changed, not just what the value was.
        const chronological = [...rows].reverse();
        const withChanges = chronological.map((row, index) => {
            const previous = index > 0 ? chronological[index - 1] : null;
            const price = parseFloat(row.default_price_per_kg);
            const avgWeight = row.avg_weight_per_bird === null ? null : parseFloat(row.avg_weight_per_bird);
            const transportFeePerHen = parseFloat(row.transport_fee_per_hen) || 0;
            return {
                id: row.id,
                price,
                avgWeight,
                transportFeePerHen,
                updatedBy: row.updated_by || 'Admin',
                updatedAt: row.updated_at,
                priceChanged: previous ? previous.price !== price : true,
                weightChanged: previous ? previous.avgWeight !== avgWeight : true,
                transportFeeChanged: previous ? previous.transportFeePerHen !== transportFeePerHen : true,
            };
        });

        // Most recent first for display.
        res.json({ success: true, data: withChanges.reverse() });
    } catch (error) {
        console.error('Error fetching price history:', error);
        res.status(500).json({ success: false, message: 'Failed to load price history' });
    }
};

// ============================================
// 4. POST: Update Global Price (Admin)
// ============================================
exports.updateGlobalPrice = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
        }

        const { price, avgWeight, transportFeePerHen } = req.body;
        if (!price || price <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid price provided' });
        }

        // avgWeight and transportFeePerHen are optional. When the admin edits
        // only the price we must keep the existing values, because this
        // table is append-only — a new row with these blank would silently
        // wipe them everywhere they're displayed.
        let weightToStore = null;
        let transportFeeToStore = null;

        const [prev] = await pool.query(
            'SELECT avg_weight_per_bird, transport_fee_per_hen FROM pricing ORDER BY id DESC LIMIT 1'
        );

        if (avgWeight !== undefined && avgWeight !== null && avgWeight !== '') {
            const parsed = parseFloat(avgWeight);
            if (Number.isNaN(parsed) || parsed <= 0 || parsed > 999) {
                return res.status(400).json({
                    success: false,
                    message: 'Average weight must be a number greater than 0',
                });
            }
            weightToStore = parsed;
        } else {
            weightToStore = prev[0]?.avg_weight_per_bird ?? null;
        }

        if (transportFeePerHen !== undefined && transportFeePerHen !== null && transportFeePerHen !== '') {
            const parsed = parseFloat(transportFeePerHen);
            if (Number.isNaN(parsed) || parsed < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Transport fee must be a number 0 or greater',
                });
            }
            transportFeeToStore = parsed;
        } else {
            transportFeeToStore = parseFloat(prev[0]?.transport_fee_per_hen) || 0;
        }

        // Insert a new row into pricing table
        await pool.query(
            'INSERT INTO pricing (default_price_per_kg, avg_weight_per_bird, transport_fee_per_hen, updated_by) VALUES (?, ?, ?, ?)',
            [price, weightToStore, transportFeeToStore, req.user.name || 'Admin']
        );

        res.json({ success: true, message: 'Global pricing updated successfully!' });

    } catch (error) {
        console.error('Error updating global price:', error);
        res.status(500).json({ success: false, message: 'Failed to update global price' });
    }
};

// ============================================
// 5. POST: Update Custom Price for Retailer
// ============================================
exports.updateCustomPrice = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
        }

        const { retailer_id, custom_price, custom_transport_fee } = req.body;
        if (!retailer_id || !custom_price || custom_price <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid data provided' });
        }

        // Transport fee override is optional -- null means "use the global
        // rate", a number (including 0) means "always use this rate for
        // this retailer regardless of the global rate".
        let transportFeeValue = null;
        if (custom_transport_fee !== undefined && custom_transport_fee !== null && custom_transport_fee !== '') {
            const parsed = parseFloat(custom_transport_fee);
            if (Number.isNaN(parsed) || parsed < 0) {
                return res.status(400).json({ success: false, message: 'Custom transport fee must be a number 0 or greater' });
            }
            transportFeeValue = parsed;
        }

        // Check if a custom price already exists for this retailer
        const [existing] = await pool.query(
            'SELECT id FROM retailer_pricing WHERE retailer_id = ?',
            [retailer_id]
        );

        if (existing.length > 0) {
            // Update existing
            await pool.query(
                'UPDATE retailer_pricing SET custom_price_per_kg = ?, custom_transport_fee_per_hen = ?, updated_by = ?, updated_at = NOW() WHERE retailer_id = ?',
                [custom_price, transportFeeValue, req.user.name || 'Admin', retailer_id]
            );
        } else {
            // Insert new
            await pool.query(
                'INSERT INTO retailer_pricing (retailer_id, custom_price_per_kg, custom_transport_fee_per_hen, updated_by) VALUES (?, ?, ?, ?)',
                [retailer_id, custom_price, transportFeeValue, req.user.name || 'Admin']
            );
        }

        res.json({ success: true, message: 'Custom price updated successfully!' });

    } catch (error) {
        console.error('Error updating custom price:', error);
        res.status(500).json({ success: false, message: 'Failed to update custom price' });
    }
};

// ============================================
// 6. DELETE: Revert Custom Price to Default
// Reverts both custom price and custom transport fee -- they live on the
// same row, "custom pricing" for this retailer is an all-or-nothing concept.
// ============================================
exports.deleteCustomPrice = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
        }

        const { retailerId } = req.params;
        await pool.query('DELETE FROM retailer_pricing WHERE retailer_id = ?', [retailerId]);

        res.json({ success: true, message: 'Reverted to global default price.' });

    } catch (error) {
        console.error('Error deleting custom price:', error);
        res.status(500).json({ success: false, message: 'Failed to revert custom price' });
    }
};

// ============================================
// 7. GET: Specific Price for Logged-in Retailer
// ============================================
exports.getRetailerPrice = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Get the retailer ID associated with this user
        const [retailer] = await pool.query('SELECT id FROM retailers WHERE user_id = ?', [userId]);
        if (retailer.length === 0) {
            return res.status(404).json({ success: false, message: 'Retailer profile not found' });
        }
        const retailerId = retailer[0].id;

        // 2. Get latest global price
        const [globalRow] = await pool.query(
            'SELECT default_price_per_kg, avg_weight_per_bird, transport_fee_per_hen FROM pricing ORDER BY id DESC LIMIT 1'
        );
        const globalPrice = globalRow[0]?.default_price_per_kg || 188;
        const avgWeight = globalRow[0]?.avg_weight_per_bird ?? null;
        const globalTransportFee = parseFloat(globalRow[0]?.transport_fee_per_hen) || 0;

        // 3. Check if this specific retailer has a custom price / transport fee
        const [customRow] = await pool.query(
            'SELECT custom_price_per_kg, custom_transport_fee_per_hen FROM retailer_pricing WHERE retailer_id = ?',
            [retailerId]
        );

        // 4. Return either custom or global
        const finalPrice = customRow.length > 0 ? parseFloat(customRow[0].custom_price_per_kg) : parseFloat(globalPrice);
        const finalTransportFee =
            customRow.length > 0 && customRow[0].custom_transport_fee_per_hen !== null
                ? parseFloat(customRow[0].custom_transport_fee_per_hen)
                : globalTransportFee;

        res.json({
            success: true,
            price: finalPrice,
            avgWeight: avgWeight === null ? null : parseFloat(avgWeight),
            transportFeePerHen: finalTransportFee,
            isCustom: customRow.length > 0
        });

    } catch (error) {
        console.error('Error fetching retailer price:', error);
        res.status(500).json({ success: false, message: 'Server error fetching price' });
    }
};