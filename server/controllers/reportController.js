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