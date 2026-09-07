const pool = require('../config/db');

// ============================================
// GET /api/expenses/trips?month=YYYY-MM
// List every trip that has expenses recorded against it, with a summed
// total per category so the admin can scan the list before drilling in.
//
// `month` is optional — pass e.g. "2026-09" to restrict the list to that
// calendar month (1st through the last day, whatever the month length is).
// Omit it to get every trip, same as before.
// ============================================
exports.getTripsWithExpenses = async (req, res) => {
    try {
        const { month } = req.query;

        let dateFilter = '';
        const params = [];
        if (month) {
            if (!/^\d{4}-\d{2}$/.test(month)) {
                return res.status(400).json({
                    success: false,
                    message: 'month must be in YYYY-MM format',
                });
            }
            dateFilter = 'WHERE t.date >= ? AND t.date < DATE_ADD(?, INTERVAL 1 MONTH)';
            params.push(`${month}-01`, `${month}-01`);
        }

        const [trips] = await pool.query(`
            SELECT
                t.id,
                t.trip_number,
                t.date,
                t.status,
                t.total_hens,
                d.name AS driver_name,
                COALESCE(SUM(e.amount), 0) AS total_expenses,
                COALESCE(SUM(CASE WHEN e.category = 'loading' THEN e.amount ELSE 0 END), 0) AS loading_total,
                COALESCE(SUM(CASE WHEN e.category = 'food' THEN e.amount ELSE 0 END), 0) AS food_total,
                COALESCE(SUM(CASE WHEN e.category = 'diesel' THEN e.amount ELSE 0 END), 0) AS diesel_total,
                COUNT(e.id) AS expense_count
            FROM trips t
            JOIN drivers d ON t.driver_id = d.id
            LEFT JOIN expenses e ON e.trip_id = t.id
            ${dateFilter}
            GROUP BY t.id, t.trip_number, t.date, t.status, t.total_hens, d.name
            ORDER BY t.date DESC, t.id DESC
        `, params);

        const formatted = trips.map((t) => ({
            id: t.id,
            tripNumber: t.trip_number,
            date: t.date,
            status: t.status,
            driverName: t.driver_name,
            totalHens: parseFloat(t.total_hens) || 0,
            totalExpenses: parseFloat(t.total_expenses) || 0,
            loadingTotal: parseFloat(t.loading_total) || 0,
            foodTotal: parseFloat(t.food_total) || 0,
            dieselTotal: parseFloat(t.diesel_total) || 0,
            expenseCount: t.expense_count,
        }));

        // Category totals for the whole (filtered) list, so the client
        // doesn't have to re-sum the list itself.
        const summary = formatted.reduce(
            (acc, t) => {
                acc.total += t.totalExpenses;
                acc.loading += t.loadingTotal;
                acc.food += t.foodTotal;
                acc.diesel += t.dieselTotal;
                return acc;
            },
            { total: 0, loading: 0, food: 0, diesel: 0 }
        );

        res.json({ success: true, data: formatted, summary, month: month || null });
    } catch (error) {
        console.error('Error fetching trips with expenses:', error.message);
        res.status(500).json({ success: false, message: 'Failed to load trip expenses' });
    }
};

// ============================================
// GET /api/expenses/trips/:tripId
// Full expense detail for one trip: trip/driver/staff info plus every
// expense row, including the bill photo URL where one was uploaded.
// ============================================
exports.getTripExpenseDetail = async (req, res) => {
    try {
        const { tripId } = req.params;

        const [tripRows] = await pool.query(`
            SELECT t.id, t.trip_number, t.date, t.status, t.total_hens, t.total_kg,
                   t.diesel_amount, t.diesel_photo, d.name AS driver_name, d.phone AS driver_phone
            FROM trips t
            JOIN drivers d ON t.driver_id = d.id
            WHERE t.id = ?
        `, [tripId]);

        if (tripRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Trip not found' });
        }

        const trip = tripRows[0];

        const [staff] = await pool.query(`
            SELECT s.id, s.name, st.role
            FROM staff_trips st
            JOIN staff s ON st.staff_id = s.id
            WHERE st.trip_id = ?
        `, [tripId]);

        const [expenses] = await pool.query(`
            SELECT id, category, description, amount, photo_url, date, recorded_by, created_at
            FROM expenses
            WHERE trip_id = ?
            ORDER BY created_at ASC
        `, [tripId]);

        const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

        res.json({
            success: true,
            data: {
                trip: {
                    id: trip.id,
                    tripNumber: trip.trip_number,
                    date: trip.date,
                    status: trip.status,
                    totalHens: parseFloat(trip.total_hens) || 0,
                    totalKg: parseFloat(trip.total_kg) || 0,
                    driverName: trip.driver_name,
                    driverPhone: trip.driver_phone,
                },
                staff: staff.map((s) => ({ id: s.id, name: s.name, role: s.role })),
                expenses: expenses.map((e) => ({
                    id: e.id,
                    category: e.category,
                    description: e.description,
                    amount: parseFloat(e.amount),
                    photoUrl: e.photo_url || null,
                    date: e.date,
                    recordedBy: e.recorded_by,
                    createdAt: e.created_at,
                })),
                totalExpenses,
            },
        });
    } catch (error) {
        console.error('Error fetching trip expense detail:', error.message);
        res.status(500).json({ success: false, message: 'Failed to load trip detail' });
    }
};