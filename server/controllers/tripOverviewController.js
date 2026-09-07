const pool = require('../config/db');

// ============================================
// GET /api/trip-overview/filters
// Companies and drivers that have at least one trip, for the filter
// dropdowns — cheaper than shipping every company/driver ever created.
// ============================================
exports.getFilters = async (req, res) => {
    try {
        const [companies] = await pool.query(`
            SELECT DISTINCT c.id, c.name
            FROM companies c
            JOIN trips t ON t.company_id = c.id
            ORDER BY c.name ASC
        `);

        const [drivers] = await pool.query(`
            SELECT DISTINCT d.id, d.name
            FROM drivers d
            JOIN trips t ON t.driver_id = d.id
            ORDER BY d.name ASC
        `);

        res.json({ success: true, data: { companies, drivers } });
    } catch (error) {
        console.error('Error fetching trip overview filters:', error.message);
        res.status(500).json({ success: false, message: 'Failed to load filters' });
    }
};

// ============================================
// GET /api/trip-overview/trips
// List every trip with what was loaded (company, hens, kg) vs what was
// actually delivered across all its retailer stops, so a shortfall is
// visible from the list itself before opening a trip.
//
// Optional query params:
//   date        - YYYY-MM-DD, restrict to that single day
//   companyId   - restrict to one loading company
//   driverId    - restrict to one driver
//   status      - 'assigned' | 'in_progress' | 'completed'
//   mismatchOnly - 'true' to only show trips where loaded != delivered
// ============================================
exports.getTrips = async (req, res) => {
    try {
        const { date, companyId, driverId, status, mismatchOnly } = req.query;

        console.log('🔍 Trip overview filters received:', { date, companyId, driverId, status, mismatchOnly });

        const conditions = [];
        const params = [];

        if (date) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({ success: false, message: 'date must be in YYYY-MM-DD format' });
            }
            // Cast both sides to DATE explicitly so this can never be thrown
            // off by a DATETIME column, connection timezone settings, or
            // anything else — a pure calendar-day string compared as a
            // calendar day, nothing more.
            conditions.push('DATE(t.date) = ?');
            params.push(date);
        }
        if (companyId) {
            conditions.push('t.company_id = ?');
            params.push(companyId);
        }
        if (driverId) {
            conditions.push('t.driver_id = ?');
            params.push(driverId);
        }
        if (status) {
            conditions.push('t.status = ?');
            params.push(status);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const [trips] = await pool.query(`
            SELECT
                t.id,
                t.trip_number,
                DATE_FORMAT(t.date, '%Y-%m-%d') AS date,
                t.status,
                t.total_hens AS loaded_hens,
                t.total_loaded_kg AS loaded_kg,
                d.name AS driver_name,
                c.name AS company_name,
                COUNT(tos.id) AS retailer_count,
                COALESCE(SUM(tos.hens_delivered), 0) AS delivered_hens,
                COALESCE(SUM(tos.actual_delivered_kg), 0) AS delivered_kg
            FROM trips t
            JOIN drivers d ON t.driver_id = d.id
            LEFT JOIN companies c ON t.company_id = c.id
            LEFT JOIN trip_orders tos ON tos.trip_id = t.id
            ${whereClause}
            GROUP BY t.id, t.trip_number, t.date, t.status, t.total_hens, t.total_loaded_kg, d.name, c.name
            ORDER BY t.date DESC, t.id DESC
        `, params);

        console.log(`📦 Returning ${trips.length} trip(s) after filtering.`);

        let formatted = trips.map((t) => {
            const loadedHens = parseFloat(t.loaded_hens) || 0;
            const loadedKg = parseFloat(t.loaded_kg) || 0;
            const deliveredHens = parseFloat(t.delivered_hens) || 0;
            const deliveredKg = parseFloat(t.delivered_kg) || 0;

            return {
                id: t.id,
                tripNumber: t.trip_number,
                date: t.date, // already a plain 'YYYY-MM-DD' string from DATE_FORMAT
                status: t.status,
                driverName: t.driver_name,
                companyName: t.company_name || 'Not set',
                retailerCount: t.retailer_count,
                loadedHens,
                loadedKg,
                deliveredHens,
                deliveredKg,
                hensDiff: loadedHens - deliveredHens,
                kgDiff: parseFloat((loadedKg - deliveredKg).toFixed(2)),
            };
        });

        // Mismatch filter runs after the SQL aggregation since it depends on
        // the computed diff, not a raw column.
        if (mismatchOnly === 'true') {
            formatted = formatted.filter(
                (t) => Math.abs(t.hensDiff) >= 0.01 || Math.abs(t.kgDiff) >= 0.01
            );
        }

        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('Error fetching trip overview list:', error.message);
        res.status(500).json({ success: false, message: 'Failed to load trip overview' });
    }
};

// ============================================
// GET /api/trip-overview/trips/:tripId
// Full reconciliation for one trip: company + loaded totals, every
// retailer delivery (hens + kg), and the loaded-vs-delivered difference.
// ============================================
exports.getTripDetail = async (req, res) => {
    try {
        const { tripId } = req.params;

        const [tripRows] = await pool.query(`
            SELECT
                t.id, t.trip_number, DATE_FORMAT(t.date, '%Y-%m-%d') AS date, t.status,
                t.total_hens AS loaded_hens, t.total_loaded_kg AS loaded_kg,
                d.name AS driver_name,
                c.name AS company_name
            FROM trips t
            JOIN drivers d ON t.driver_id = d.id
            LEFT JOIN companies c ON t.company_id = c.id
            WHERE t.id = ?
        `, [tripId]);

        if (tripRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Trip not found' });
        }
        const trip = tripRows[0];

        const [deliveries] = await pool.query(`
            SELECT
                r.shop_name AS retailer,
                o.order_number,
                COALESCE(tos.hens_delivered, 0) AS hens_delivered,
                COALESCE(tos.actual_delivered_kg, 0) AS kg_delivered,
                tos.delivered_status
            FROM trip_orders tos
            JOIN orders o ON tos.order_id = o.id
            JOIN retailers r ON o.retailer_id = r.id
            WHERE tos.trip_id = ?
            ORDER BY r.shop_name ASC
        `, [tripId]);

        const loadedHens = parseFloat(trip.loaded_hens) || 0;
        const loadedKg = parseFloat(trip.loaded_kg) || 0;

        const deliveredList = deliveries.map((d) => ({
            retailer: d.retailer,
            orderNumber: d.order_number,
            hensDelivered: parseFloat(d.hens_delivered) || 0,
            kgDelivered: parseFloat(d.kg_delivered) || 0,
            status: d.delivered_status,
        }));

        const totalDeliveredHens = deliveredList.reduce((sum, d) => sum + d.hensDelivered, 0);
        const totalDeliveredKg = deliveredList.reduce((sum, d) => sum + d.kgDelivered, 0);

        res.json({
            success: true,
            data: {
                trip: {
                    id: trip.id,
                    tripNumber: trip.trip_number,
                    date: trip.date,
                    status: trip.status,
                    driverName: trip.driver_name,
                    companyName: trip.company_name || 'Not set',
                    loadedHens,
                    loadedKg,
                },
                deliveries: deliveredList,
                totals: {
                    loadedHens,
                    loadedKg,
                    deliveredHens: totalDeliveredHens,
                    deliveredKg: parseFloat(totalDeliveredKg.toFixed(2)),
                    hensDiff: loadedHens - totalDeliveredHens,
                    kgDiff: parseFloat((loadedKg - totalDeliveredKg).toFixed(2)),
                },
            },
        });
    } catch (error) {
        console.error('Error fetching trip overview detail:', error.message);
        res.status(500).json({ success: false, message: 'Failed to load trip detail' });
    }
};