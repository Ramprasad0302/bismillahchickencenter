const pool = require('../config/db');

// Default to the current month (YYYY-MM) when the caller doesn't specify one.
const currentMonth = () => new Date().toISOString().slice(0, 7);

// ============================================
// GET /api/salaries/summary?month=YYYY-MM
// One row per driver and per staff member (cleaners/helpers), each with
// days worked, trips done, base salary earned, advances taken, and what's
// left to pay for the given month.
//
// "Days worked" counts DISTINCT dates, not trip count — a driver run two
// trips in one day is one day's pay, matching a daily-wage arrangement.
// tripsCount is also returned in case that assumption needs revisiting.
// ============================================
exports.getSalarySummary = async (req, res) => {
    try {
        const month = req.query.month || currentMonth();

        const [drivers] = await pool.query(
            `SELECT id, name, phone, daily_salary, status FROM drivers ORDER BY name`
        );

        // Staff table's role enum includes 'driver', but real trip drivers
        // live in the drivers table above — a staff row with role='driver'
        // would be a duplicate, unassignable entry, so it's excluded here.
        const [staffRows] = await pool.query(
            `SELECT id, name, phone, role, daily_salary, status
             FROM staff WHERE role IN ('cleaner', 'helper') ORDER BY name`
        );

        const employees = [];

        for (const d of drivers) {
            const [[days]] = await pool.query(
                `SELECT COUNT(DISTINCT date) AS c FROM trips
                 WHERE driver_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?`,
                [d.id, month]
            );
            const [[tripsRow]] = await pool.query(
                `SELECT COUNT(*) AS c FROM trips
                 WHERE driver_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?`,
                [d.id, month]
            );
            const [[advanceRow]] = await pool.query(
                `SELECT COALESCE(SUM(amount), 0) AS s FROM salary_advances
                 WHERE staff_type = 'driver' AND staff_ref_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?`,
                [d.id, month]
            );

            const daysWorked = days.c;
            const dailySalary = parseFloat(d.daily_salary) || 0;
            const baseEarned = daysWorked * dailySalary;
            const advancesTaken = parseFloat(advanceRow.s) || 0;

            employees.push({
                refType: 'driver',
                refId: d.id,
                name: d.name,
                phone: d.phone,
                role: 'Driver',
                status: d.status,
                dailySalary,
                daysWorked,
                tripsCount: tripsRow.c,
                baseEarned,
                advancesTaken,
                remaining: baseEarned - advancesTaken,
            });
        }

        for (const s of staffRows) {
            const [[days]] = await pool.query(
                `SELECT COUNT(DISTINCT date) AS c FROM staff_trips
                 WHERE staff_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?`,
                [s.id, month]
            );
            const [[tripsRow]] = await pool.query(
                `SELECT COUNT(*) AS c FROM staff_trips
                 WHERE staff_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?`,
                [s.id, month]
            );
            const [[advanceRow]] = await pool.query(
                `SELECT COALESCE(SUM(amount), 0) AS s FROM salary_advances
                 WHERE staff_type = 'staff' AND staff_ref_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?`,
                [s.id, month]
            );

            const daysWorked = days.c;
            const dailySalary = parseFloat(s.daily_salary) || 0;
            const baseEarned = daysWorked * dailySalary;
            const advancesTaken = parseFloat(advanceRow.s) || 0;

            employees.push({
                refType: 'staff',
                refId: s.id,
                name: s.name,
                phone: s.phone,
                role: s.role.charAt(0).toUpperCase() + s.role.slice(1),
                status: s.status,
                dailySalary,
                daysWorked,
                tripsCount: tripsRow.c,
                baseEarned,
                advancesTaken,
                remaining: baseEarned - advancesTaken,
            });
        }

        employees.sort((a, b) => a.name.localeCompare(b.name));

        res.json({ success: true, month, data: employees });
    } catch (error) {
        console.error('❌ Error fetching salary summary:', error.message);
        res.status(500).json({ success: false, message: 'Failed to load salary summary' });
    }
};

// ============================================
// GET /api/salaries/detail?refType=driver|staff&refId=5&month=YYYY-MM
// Full detail for one employee: their info, every trip they worked that
// month, every advance they took that month, and the same totals as the
// summary row.
// ============================================
exports.getSalaryDetail = async (req, res) => {
    try {
        const { refType, refId } = req.query;
        const month = req.query.month || currentMonth();

        if (!['driver', 'staff'].includes(refType)) {
            return res.status(400).json({ success: false, message: 'Invalid refType' });
        }

        let employee;
        let trips;

        if (refType === 'driver') {
            const [rows] = await pool.query(
                `SELECT id, name, phone, daily_salary, status FROM drivers WHERE id = ?`,
                [refId]
            );
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Driver not found' });
            }
            employee = { ...rows[0], role: 'Driver' };

            const [tripRows] = await pool.query(
                `SELECT id, trip_number, date, status, total_hens
                 FROM trips WHERE driver_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?
                 ORDER BY date ASC`,
                [refId, month]
            );
            trips = tripRows;
        } else {
            const [rows] = await pool.query(
                `SELECT id, name, phone, role, daily_salary, status FROM staff WHERE id = ?`,
                [refId]
            );
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Staff member not found' });
            }
            employee = { ...rows[0], role: rows[0].role.charAt(0).toUpperCase() + rows[0].role.slice(1) };

            const [tripRows] = await pool.query(
                `SELECT t.id, t.trip_number, st.date, t.status, t.total_hens
                 FROM staff_trips st
                 JOIN trips t ON st.trip_id = t.id
                 WHERE st.staff_id = ? AND DATE_FORMAT(st.date, '%Y-%m') = ?
                 ORDER BY st.date ASC`,
                [refId, month]
            );
            trips = tripRows;
        }

        const [advances] = await pool.query(
            `SELECT id, amount, date, note, recorded_by, created_at
             FROM salary_advances
             WHERE staff_type = ? AND staff_ref_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?
             ORDER BY date ASC`,
            [refType, refId, month]
        );

        const daysWorked = new Set(trips.map((t) => new Date(t.date).toISOString().slice(0, 10))).size;
        const dailySalary = parseFloat(employee.daily_salary) || 0;
        const baseEarned = daysWorked * dailySalary;
        const advancesTaken = advances.reduce((sum, a) => sum + parseFloat(a.amount), 0);

        res.json({
            success: true,
            data: {
                employee: {
                    refType,
                    refId: employee.id,
                    name: employee.name,
                    phone: employee.phone,
                    role: employee.role,
                    status: employee.status,
                    dailySalary,
                },
                month,
                daysWorked,
                tripsCount: trips.length,
                baseEarned,
                advancesTaken,
                remaining: baseEarned - advancesTaken,
                trips: trips.map((t) => ({
                    id: t.id,
                    tripNumber: t.trip_number,
                    date: t.date,
                    status: t.status,
                    totalHens: parseFloat(t.total_hens) || 0,
                })),
                advances: advances.map((a) => ({
                    id: a.id,
                    amount: parseFloat(a.amount),
                    date: a.date,
                    note: a.note,
                    recordedBy: a.recorded_by,
                })),
            },
        });
    } catch (error) {
        console.error('❌ Error fetching salary detail:', error.message);
        res.status(500).json({ success: false, message: 'Failed to load salary detail' });
    }
};

// ============================================
// POST /api/salaries/advance
// Record a mid-month payment to a driver or staff member.
// body: { refType, refId, amount, date, note }
// ============================================
exports.addAdvance = async (req, res) => {
    try {
        const { refType, refId, amount, date, note } = req.body;

        if (!['driver', 'staff'].includes(refType)) {
            return res.status(400).json({ success: false, message: 'Invalid refType' });
        }
        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || parsedAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Enter a valid amount' });
        }
        if (!date) {
            return res.status(400).json({ success: false, message: 'Date is required' });
        }

        const table = refType === 'driver' ? 'drivers' : 'staff';
        const [existing] = await pool.query(`SELECT id FROM ${table} WHERE id = ?`, [refId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        const [result] = await pool.query(
            `INSERT INTO salary_advances (staff_type, staff_ref_id, amount, date, note, recorded_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [refType, refId, parsedAmount, date, note || null, req.user.name || 'Admin']
        );

        res.json({ success: true, message: 'Advance recorded', id: result.insertId });
    } catch (error) {
        console.error('❌ Error recording advance:', error.message);
        res.status(500).json({ success: false, message: 'Failed to record advance' });
    }
};

// ============================================
// PUT /api/salaries/daily-salary
// Set (or correct) a driver's or staff member's daily wage.
// body: { refType, refId, dailySalary }
//
// Staff already have an edit path via the Staff page; drivers previously
// had none anywhere in the app, so this is the only place a driver's daily
// salary can be set.
// ============================================
exports.updateDailySalary = async (req, res) => {
    try {
        const { refType, refId, dailySalary } = req.body;

        if (!['driver', 'staff'].includes(refType)) {
            return res.status(400).json({ success: false, message: 'Invalid refType' });
        }
        const parsedSalary = parseFloat(dailySalary);
        if (Number.isNaN(parsedSalary) || parsedSalary < 0) {
            return res.status(400).json({ success: false, message: 'Enter a valid daily salary' });
        }

        const table = refType === 'driver' ? 'drivers' : 'staff';
        const [result] = await pool.query(
            `UPDATE ${table} SET daily_salary = ? WHERE id = ?`,
            [parsedSalary, refId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        res.json({ success: true, message: 'Daily salary updated' });
    } catch (error) {
        console.error('❌ Error updating daily salary:', error.message);
        res.status(500).json({ success: false, message: 'Failed to update daily salary' });
    }
};
