const pool = require('../config/db');
const ExcelJS = require('exceljs');

// ============================================
// 1. GET JSON DATA FOR FRONTEND DISPLAY
// ============================================
exports.getReportData = async (req, res) => {
    try {
        const { range } = req.query; // 'today', 'week', 'month'
        let dateFilter = '';

        // ✅ FIXED: Added 'o.' in front of created_at so MySQL knows it belongs to the orders table
        if (range === 'today') dateFilter = 'WHERE DATE(o.created_at) = CURDATE()';
        else if (range === 'yesterday') dateFilter = 'WHERE DATE(o.created_at) = CURDATE() - INTERVAL 1 DAY';
        else if (range === 'week') dateFilter = 'WHERE YEARWEEK(o.created_at, 1) = YEARWEEK(CURDATE(), 1)';
        else if (range === 'month') dateFilter = 'WHERE MONTH(o.created_at) = MONTH(CURDATE()) AND YEAR(o.created_at) = YEAR(CURDATE())';

        // 1. Fetch Orders Stats
        const [salesData] = await pool.query(`
            SELECT 
                COUNT(*) as total_orders,
                COALESCE(SUM(total_amount), 0) as total_sales,
                COALESCE(SUM(balance), 0) as total_outstanding
            FROM orders o
            ${dateFilter}
        `);

        const stats = salesData[0];
        const avgOrderValue = stats.total_orders > 0 ? (stats.total_sales / stats.total_orders) : 0;

        // 2. Fetch Retailers with outstanding
        const [retailers] = await pool.query(`
            SELECT id, shop_name, owner_name, phone, outstanding 
            FROM retailers 
            WHERE outstanding > 0
        `);

        // 3. Fetch Recent Orders for the table
        const [orders] = await pool.query(`
            SELECT 
                o.order_number, 
                r.shop_name, 
                o.kg_ordered, 
                o.total_amount, 
                o.balance, 
                o.payment_status,
                o.created_at
            FROM orders o
            JOIN retailers r ON o.retailer_id = r.id
            ${dateFilter}
            ORDER BY o.created_at DESC
            LIMIT 100
        `);

        res.json({
            success: true,
            data: {
                stats: {
                    totalSales: stats.total_sales,
                    totalOrders: stats.total_orders,
                    avgOrderValue: avgOrderValue,
                    outstanding: stats.total_outstanding
                },
                retailers: retailers,
                orders: orders
            }
        });

    } catch (error) {
        console.error('❌ Error generating report:', error.message);
        res.status(500).json({ 
            success: false, 
            message: `Database Error: ${error.message}` 
        });
    }
};

// ============================================
// 2. EXPORT DATA TO EXCEL / CSV
// ============================================
exports.exportReport = async (req, res) => {
    try {
        const { range, type } = req.query; // type = 'excel' or 'csv'
        let dateFilter = '';

        // ✅ FIXED: Added 'o.' in front of created_at here too
        if (range === 'today') dateFilter = 'WHERE DATE(o.created_at) = CURDATE()';
        else if (range === 'yesterday') dateFilter = 'WHERE DATE(o.created_at) = CURDATE() - INTERVAL 1 DAY';
        else if (range === 'week') dateFilter = 'WHERE YEARWEEK(o.created_at, 1) = YEARWEEK(CURDATE(), 1)';
        else if (range === 'month') dateFilter = 'WHERE MONTH(o.created_at) = MONTH(CURDATE()) AND YEAR(o.created_at) = YEAR(CURDATE())';

        const [orders] = await pool.query(`
            SELECT 
                o.order_number, 
                r.shop_name as retailer, 
                o.kg_ordered, 
                o.total_amount, 
                o.balance, 
                o.payment_status,
                o.created_at as date
            FROM orders o
            JOIN retailers r ON o.retailer_id = r.id
            ${dateFilter}
            ORDER BY o.created_at DESC
        `);

        // Generate Excel File
        if (type === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');

            // Add Headers
            worksheet.columns = [
                { header: 'Order Number', key: 'order_number', width: 20 },
                { header: 'Retailer', key: 'retailer', width: 25 },
                { header: 'Kg Ordered', key: 'kg_ordered', width: 15 },
                { header: 'Total Amount', key: 'total_amount', width: 15 },
                { header: 'Balance', key: 'balance', width: 15 },
                { header: 'Status', key: 'payment_status', width: 15 },
                { header: 'Date', key: 'date', width: 20 },
            ];

            // Add Rows
            orders.forEach(order => {
                worksheet.addRow({
                    ...order,
                    total_amount: parseFloat(order.total_amount),
                    balance: parseFloat(order.balance)
                });
            });

            // Set response headers
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Sales_Report_${range}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();
        } 
        
        // Generate CSV File
        else if (type === 'csv') {
            let csv = 'Order Number,Retailer,Kg Ordered,Total Amount,Balance,Status,Date\n';
            orders.forEach(order => {
                csv += `${order.order_number},${order.retailer},${order.kg_ordered},${order.total_amount},${order.balance},${order.payment_status},${order.date}\n`;
            });

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=Sales_Report_${range}.csv`);
            res.send(csv);
        } else {
            res.status(400).json({ success: false, message: 'Invalid export type' });
        }

    } catch (error) {
        console.error('❌ Error exporting report:', error.message);
        res.status(500).json({ success: false, message: `Export Error: ${error.message}` });
    }
};

// ============================================
// 3. ADMIN DASHBOARD — every KPI and chart series in one round trip
// ============================================
// The dashboard used to download the ENTIRE orders table and add it up in
// the browser, so it got slower with every order ever placed. These
// aggregates run in MySQL (in parallel) and return a few KB no matter how
// much history there is.
const LIVE_ORDERS = `NOT (o.order_status = 'cancelled' AND o.payment_method = 'upi' AND o.paid_amount = 0)`;
const EFFECTIVE_STATUS = `CASE WHEN EXISTS (
        SELECT 1 FROM trip_orders tx WHERE tx.order_id = o.id AND tx.delivered_status = 'delivered'
    ) THEN 'delivered' ELSE o.order_status END`;

exports.getDashboard = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
        }

        const q = (sql, params = []) => pool.query(sql, params).then(([rows]) => rows);

        const [
            [totals],
            [today],
            [delivered],
            [customers],
            dailyRows,
            monthlyRows,
            methodRows,
            statusRows,
            paymentStatusRows,
            topRetailers,
            outstandingRetailers,
            recentOrders,
        ] = await Promise.all([
            q(`SELECT
                    COUNT(*) AS orders,
                    COALESCE(SUM(o.total_amount), 0) AS revenue,
                    COALESCE(SUM(o.kg_ordered), 0) AS kg_ordered,
                    COALESCE(SUM(CASE WHEN o.order_status != 'cancelled' THEN o.balance ELSE 0 END), 0) AS outstanding,
                    COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.paid_amount ELSE 0 END), 0) AS cash_collected,
                    COALESCE(SUM(CASE WHEN o.payment_method = 'upi' THEN o.paid_amount ELSE 0 END), 0) AS upi_collected,
                    COALESCE(SUM(o.paid_amount), 0) AS collected
               FROM orders o WHERE ${LIVE_ORDERS}`),
            q(`SELECT COUNT(*) AS orders,
                      COALESCE(SUM(o.total_amount), 0) AS revenue,
                      COALESCE(SUM(o.kg_ordered), 0) AS kg
                 FROM orders o
                WHERE ${LIVE_ORDERS} AND o.created_at >= CURDATE() AND o.created_at < CURDATE() + INTERVAL 1 DAY`),
            q(`SELECT COALESCE(SUM(COALESCE(t.kg, CASE WHEN o.order_status = 'delivered' THEN o.kg_ordered ELSE 0 END)), 0) AS kg_delivered
                 FROM orders o
                 LEFT JOIN (SELECT order_id, SUM(actual_delivered_kg) AS kg FROM trip_orders GROUP BY order_id) t
                   ON t.order_id = o.id
                WHERE ${LIVE_ORDERS}`),
            q(`SELECT COUNT(DISTINCT o.retailer_id) AS active,
                      (SELECT COUNT(*) FROM retailers) AS total
                 FROM orders o WHERE ${LIVE_ORDERS}`),
            q(`SELECT DATE(o.created_at) AS day,
                      COUNT(*) AS orders,
                      COALESCE(SUM(o.total_amount), 0) AS revenue,
                      COALESCE(SUM(o.paid_amount), 0) AS collected,
                      COALESCE(SUM(o.kg_ordered), 0) AS kg
                 FROM orders o
                WHERE ${LIVE_ORDERS} AND o.created_at >= CURDATE() - INTERVAL 13 DAY
                GROUP BY DATE(o.created_at)`),
            q(`SELECT DATE_FORMAT(o.created_at, '%Y-%m') AS month,
                      COUNT(*) AS orders,
                      COALESCE(SUM(o.total_amount), 0) AS revenue,
                      COALESCE(SUM(o.paid_amount), 0) AS collected,
                      COALESCE(SUM(o.kg_ordered), 0) AS kg
                 FROM orders o
                WHERE ${LIVE_ORDERS}
                  AND o.created_at >= DATE_FORMAT(CURDATE() - INTERVAL 5 MONTH, '%Y-%m-01')
                GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')`),
            q(`SELECT COALESCE(o.payment_method, 'other') AS method,
                      COUNT(*) AS orders,
                      COALESCE(SUM(o.paid_amount), 0) AS collected,
                      COALESCE(SUM(o.total_amount), 0) AS amount
                 FROM orders o WHERE ${LIVE_ORDERS}
                GROUP BY COALESCE(o.payment_method, 'other')`),
            q(`SELECT ${EFFECTIVE_STATUS} AS status, COUNT(*) AS orders
                 FROM orders o WHERE ${LIVE_ORDERS}
                GROUP BY status`),
            q(`SELECT o.payment_status AS status, COUNT(*) AS orders,
                      COALESCE(SUM(o.total_amount), 0) AS amount,
                      COALESCE(SUM(o.balance), 0) AS balance
                 FROM orders o WHERE ${LIVE_ORDERS}
                GROUP BY o.payment_status`),
            q(`SELECT r.id, r.shop_name, r.owner_name,
                      COUNT(*) AS orders,
                      COALESCE(SUM(o.total_amount), 0) AS revenue,
                      COALESCE(SUM(o.kg_ordered), 0) AS kg
                 FROM orders o JOIN retailers r ON r.id = o.retailer_id
                WHERE ${LIVE_ORDERS} AND o.created_at >= CURDATE() - INTERVAL 29 DAY
                GROUP BY r.id, r.shop_name, r.owner_name
                ORDER BY revenue DESC LIMIT 6`),
            q(`SELECT id, shop_name, owner_name, phone, outstanding
                 FROM retailers WHERE outstanding > 0
                ORDER BY outstanding DESC LIMIT 6`),
            q(`SELECT o.id, o.order_number, o.retailer_id, o.kg_ordered, o.total_amount, o.paid_amount,
                      o.balance, o.payment_method, o.payment_status, o.created_at,
                      ${EFFECTIVE_STATUS} AS order_status,
                      r.shop_name, r.phone AS retailer_phone
                 FROM orders o JOIN retailers r ON r.id = o.retailer_id
                WHERE ${LIVE_ORDERS}
                ORDER BY o.created_at DESC LIMIT 6`),
        ]);

        const num = (v) => parseFloat(v) || 0;
        const ymd = (d) => {
            const x = new Date(d);
            return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
        };

        // Fill gaps so the charts always show a continuous axis.
        const dailyMap = new Map(dailyRows.map((r) => [ymd(r.day), r]));
        const daily = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const r = dailyMap.get(ymd(d));
            daily.push({
                date: ymd(d),
                orders: r ? Number(r.orders) : 0,
                revenue: r ? num(r.revenue) : 0,
                collected: r ? num(r.collected) : 0,
                kg: r ? num(r.kg) : 0,
            });
        }

        const monthlyMap = new Map(monthlyRows.map((r) => [r.month, r]));
        const monthly = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setDate(1);
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const r = monthlyMap.get(key);
            monthly.push({
                month: key,
                orders: r ? Number(r.orders) : 0,
                revenue: r ? num(r.revenue) : 0,
                collected: r ? num(r.collected) : 0,
                kg: r ? num(r.kg) : 0,
            });
        }

        const statusCount = (s) => Number(statusRows.find((r) => r.status === s)?.orders || 0);

        res.json({
            success: true,
            data: {
                kpis: {
                    todayOrders: Number(today.orders),
                    todayRevenue: num(today.revenue),
                    todayKg: num(today.kg),
                    totalOrders: Number(totals.orders),
                    totalRevenue: num(totals.revenue),
                    kgOrdered: num(totals.kg_ordered),
                    kgDelivered: num(delivered.kg_delivered),
                    activeCustomers: Number(customers.active),
                    totalCustomers: Number(customers.total),
                    cashCollection: num(totals.cash_collected),
                    upiCollection: num(totals.upi_collected),
                    collected: num(totals.collected),
                    outstanding: num(totals.outstanding),
                    pendingDeliveries: statusCount('pending') + statusCount('out_for_delivery') + statusCount('confirmed') + statusCount('processing'),
                    completedDeliveries: statusCount('delivered'),
                },
                daily,
                monthly,
                paymentMethods: methodRows.map((r) => ({
                    method: r.method,
                    orders: Number(r.orders),
                    collected: num(r.collected),
                    amount: num(r.amount),
                })),
                orderStatus: statusRows.map((r) => ({ status: r.status, orders: Number(r.orders) })),
                paymentStatus: paymentStatusRows.map((r) => ({
                    status: r.status,
                    orders: Number(r.orders),
                    amount: num(r.amount),
                    balance: num(r.balance),
                })),
                topRetailers: topRetailers.map((r) => ({ ...r, orders: Number(r.orders), revenue: num(r.revenue), kg: num(r.kg) })),
                outstandingRetailers: outstandingRetailers.map((r) => ({ ...r, outstanding: num(r.outstanding) })),
                recentOrders,
            },
        });
    } catch (error) {
        console.error('❌ Error building dashboard:', error.message);
        res.status(500).json({ success: false, message: 'Failed to load dashboard data' });
    }
};
