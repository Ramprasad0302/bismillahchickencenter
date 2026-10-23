import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  FiShoppingBag,
  FiDollarSign,
  FiPackage,
  FiUsers,
  FiCreditCard,
  FiTruck,
  FiEye,
  FiAlertCircle,
  FiRefreshCw,
  FiArrowUpRight,
  FiSmartphone,
  FiTrendingUp,
} from 'react-icons/fi';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import AnimatedNumber from '../../components/common/AnimatedNumber';
import BrandLoader from '../../components/brand/BrandLoader';
import { useAuth } from '../../context/AuthContext';
import { CAT, inr, inrShort, inrCompact, axisProps, ChartCard, Legend, ChartTooltip } from '../../components/charts/ChartKit';

const STATUS_LABEL = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
const STATUS_BADGE = {
  delivered: 'success',
  out_for_delivery: 'info',
  processing: 'primary',
  pending: 'warning',
  cancelled: 'danger',
};
const PAY_BADGE = { paid: 'success', partial: 'warning', pending: 'default' };
const PAY_LABEL = { paid: 'Paid', partial: 'Partial', pending: 'Pending' };
// Colour follows the entity: the same status is always the same colour.
const PAY_COLOR = { paid: CAT[3], partial: CAT[1], pending: CAT[0] };
const METHOD_LABEL = { cash: 'Cash', upi: 'UPI', credit: 'Credit', bank: 'Bank', other: 'Other' };

const kg = (n) => `${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg`;
const dayLabel = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
const monthLabel = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

// Fallback for a server that hasn't been updated with /reports/dashboard yet:
// derive the same shape from the full orders list.
const buildFromOrders = (orders) => {
  const n = (v) => parseFloat(v) || 0;
  const ymd = (d) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };
  const todayKey = ymd(new Date());
  const daily = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return { date: ymd(d), orders: 0, revenue: 0, collected: 0, kg: 0 };
  });
  const dailyIdx = new Map(daily.map((d, i) => [d.date, i]));
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    return { month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, orders: 0, revenue: 0, collected: 0, kg: 0 };
  });
  const monthIdx = new Map(monthly.map((m, i) => [m.month, i]));
  const methods = {};
  const statuses = {};
  const payStatuses = {};
  const k = { todayOrders: 0, todayRevenue: 0, todayKg: 0, kgOrdered: 0, kgDelivered: 0, cashCollection: 0, upiCollection: 0, outstanding: 0, collected: 0, totalRevenue: 0 };
  const retailers = new Set();
  for (const o of orders) {
    const key = ymd(o.created_at);
    retailers.add(o.retailer_id);
    k.kgOrdered += n(o.kg_ordered);
    k.kgDelivered += n(o.kg_delivered);
    k.totalRevenue += n(o.total_amount);
    k.collected += n(o.paid_amount);
    if (o.order_status !== 'cancelled') k.outstanding += n(o.balance);
    if (o.payment_method === 'cash') k.cashCollection += n(o.paid_amount);
    if (o.payment_method === 'upi') k.upiCollection += n(o.paid_amount);
    if (key === todayKey) {
      k.todayOrders += 1;
      k.todayRevenue += n(o.total_amount);
      k.todayKg += n(o.kg_ordered);
    }
    if (dailyIdx.has(key)) {
      const d = daily[dailyIdx.get(key)];
      d.orders += 1;
      d.revenue += n(o.total_amount);
      d.collected += n(o.paid_amount);
      d.kg += n(o.kg_ordered);
    }
    const mk = key.slice(0, 7);
    if (monthIdx.has(mk)) {
      const m = monthly[monthIdx.get(mk)];
      m.orders += 1;
      m.revenue += n(o.total_amount);
      m.collected += n(o.paid_amount);
    }
    const method = o.payment_method || 'other';
    methods[method] = methods[method] || { method, orders: 0, collected: 0, amount: 0 };
    methods[method].orders += 1;
    methods[method].collected += n(o.paid_amount);
    methods[method].amount += n(o.total_amount);
    statuses[o.order_status] = (statuses[o.order_status] || 0) + 1;
    const ps = o.payment_status || 'pending';
    payStatuses[ps] = payStatuses[ps] || { status: ps, orders: 0, amount: 0, balance: 0 };
    payStatuses[ps].orders += 1;
    payStatuses[ps].amount += n(o.total_amount);
    payStatuses[ps].balance += n(o.balance);
  }
  const s = (x) => statuses[x] || 0;
  return {
    kpis: {
      ...k,
      totalOrders: orders.length,
      activeCustomers: retailers.size,
      totalCustomers: retailers.size,
      pendingDeliveries: s('pending') + s('out_for_delivery') + s('confirmed') + s('processing'),
      completedDeliveries: s('delivered'),
    },
    daily,
    monthly,
    paymentMethods: Object.values(methods),
    orderStatus: Object.entries(statuses).map(([status, count]) => ({ status, orders: count })),
    paymentStatus: Object.values(payStatuses),
    topRetailers: [],
    outstandingRetailers: [],
    recentOrders: [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6),
  };
};

const Donut = ({ data, total, centerLabel, valueFormat }) => (
  <div className="relative h-[200px]">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="64%"
          outerRadius="92%"
          paddingAngle={data.length > 1 ? 2 : 0}
          cornerRadius={4}
          stroke="#fff"
          strokeWidth={2}
          animationDuration={1100}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip valueFormat={valueFormat} />} />
      </PieChart>
    </ResponsiveContainer>
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-xl font-bold text-ink">{total}</span>
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted">{centerLabel}</span>
    </div>
  </div>
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      try {
        const res = await api.get('/reports/dashboard', isRefresh ? { params: { t: Date.now() } } : undefined);
        if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load dashboard');
        setData(res.data.data);
      } catch (err) {
        if (err.response?.status !== 404) throw err;
        const res = await api.get('/orders');
        setData(buildFromOrders(res.data?.data || []));
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.request ? 'No response from server. Please check your connection.' : 'Failed to load dashboard data')
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const charts = useMemo(() => {
    if (!data) return null;
    const payStatus = (data.paymentStatus || [])
      .filter((p) => p.orders > 0)
      .map((p) => ({
        name: PAY_LABEL[p.status] || p.status,
        value: p.orders,
        amount: p.amount,
        color: PAY_COLOR[p.status] || '#a99d8f',
      }));
    const methodOrder = ['cash', 'upi', 'credit', 'bank'];
    const methods = [...(data.paymentMethods || [])]
      .sort((a, b) => {
        const ia = methodOrder.indexOf(a.method);
        const ib = methodOrder.indexOf(b.method);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .filter((m) => m.orders > 0);
    // At most four categorical slots; anything beyond folds into "Other".
    const methodSlices = methods.slice(0, 3).map((m, i) => ({
      name: METHOD_LABEL[m.method] || m.method,
      value: m.amount,
      color: CAT[i],
    }));
    if (methods.length > 3) {
      methodSlices.push({
        name: 'Other',
        value: methods.slice(3).reduce((s, m) => s + m.amount, 0),
        color: CAT[3],
      });
    }
    return { payStatus, methodSlices };
  }, [data]);

  if (loading) return <BrandLoader label="Loading dashboard" />;

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-danger-soft flex items-center justify-center">
          <FiAlertCircle className="w-8 h-8 text-danger" />
        </div>
        <p className="mt-4 text-danger font-medium">{error}</p>
        <Button variant="outline" className="mt-4" icon={FiRefreshCw} onClick={() => load()}>
          Try Again
        </Button>
      </div>
    );
  }

  const k = data.kpis;
  const deliveryRate = k.kgOrdered > 0 ? Math.min(100, (k.kgDelivered / k.kgOrdered) * 100) : 0;
  const collectionRate = k.totalRevenue > 0 ? Math.min(100, (k.collected / k.totalRevenue) * 100) : 0;
  const maxTop = Math.max(1, ...(data.topRetailers || []).map((r) => r.revenue));
  const totalPayOrders = charts.payStatus.reduce((s, p) => s + p.value, 0);
  const totalMethodAmount = charts.methodSlices.reduce((s, p) => s + p.value, 0);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-coal-3 via-coal-2 to-coal text-white p-6 sm:p-8 shadow-[0_30px_60px_-30px_rgba(21,17,14,0.8)]"
      >
        <div className="pointer-events-none absolute inset-0 bg-pattern opacity-30" />
        <div className="pointer-events-none absolute -right-16 -top-16 w-80 h-80 rounded-full bg-gold/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 w-64 h-64 rounded-full bg-brand/25 blur-3xl" />
        <motion.img
          src="/logo.png"
          alt=""
          className="pointer-events-none absolute -right-8 -bottom-10 w-56 h-56 sm:w-72 sm:h-72 rounded-full opacity-[0.08]"
          animate={{ rotate: [0, 4, 0, -4, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-gold-light/80 font-semibold">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold">
              {greeting()}, <span className="text-gold-gradient">{user?.name || 'Admin'}</span>
            </h1>
            <p className="mt-2 text-sm text-white/60 max-w-lg">
              Here&apos;s how Bismillah Chicken Center is performing today.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link to="/admin/orders" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold">
                <FiShoppingBag className="w-4 h-4" /> Orders
              </Link>
              <Link to="/admin/deliveries" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-sm font-semibold hover:bg-white/15 transition">
                <FiTruck className="w-4 h-4" /> Deliveries
              </Link>
              <Link to="/admin/reports" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-sm font-semibold hover:bg-white/15 transition">
                <FiTrendingUp className="w-4 h-4" /> Reports
              </Link>
              <button
                onClick={() => load(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-gold/30 text-gold-light text-sm font-semibold hover:bg-gold/10 transition disabled:opacity-60"
              >
                <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:min-w-[420px]">
            {[
              { label: "Today's Revenue", value: k.todayRevenue, fmt: inrCompact },
              { label: "Today's Orders", value: k.todayOrders },
              { label: "Today's Volume", value: k.todayKg, fmt: kg },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur px-3.5 py-3 sm:px-4 sm:py-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">{m.label}</p>
                <p className="mt-1.5 text-base sm:text-2xl font-bold text-gold-light truncate">
                  <AnimatedNumber value={m.value} format={m.fmt} />
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        <StatCard title="Total Revenue" value={k.totalRevenue} format={inrCompact} icon={FiDollarSign} accent="brand" subtitle={`${k.totalOrders.toLocaleString('en-IN')} orders all time`} delay={0.05} />
        <StatCard title="Outstanding" value={k.outstanding} format={inrCompact} icon={FiAlertCircle} accent="coal" subtitle="Pending payments" delay={0.1} />
        <StatCard title="Cash Collection" value={k.cashCollection} format={inrCompact} icon={FiCreditCard} accent="gold" subtitle="Collected on cash orders" delay={0.15} />
        <StatCard title="UPI Collection" value={k.upiCollection} format={inrCompact} icon={FiSmartphone} accent="success" subtitle="Collected on UPI orders" delay={0.2} />
        <StatCard title="KG Ordered" value={k.kgOrdered} format={kg} icon={FiPackage} accent="gold" subtitle={`${kg(k.kgDelivered)} delivered`} delay={0.25} />
        <StatCard title="Active Customers" value={k.activeCustomers} icon={FiUsers} accent="brand" subtitle={`of ${k.totalCustomers} retailers`} delay={0.3} />
        <StatCard title="Pending Deliveries" value={k.pendingDeliveries} icon={FiTruck} accent="coal" subtitle={`${k.completedDeliveries} completed`} delay={0.35} />
        <StatCard title="Collected" value={k.collected} format={inrCompact} icon={FiShoppingBag} accent="success" subtitle={`${collectionRate.toFixed(0)}% of billed`} delay={0.4} />
      </div>

      {/* Trend + payment status */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <ChartCard
          className="xl:col-span-2"
          title="Revenue — last 14 days"
          subtitle="Billed vs. collected per day"
          action={<Legend items={[{ label: 'Billed', color: CAT[0] }, { label: 'Collected', color: CAT[1] }]} />}
          delay={0.1}
        >
          <div className="h-[280px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CAT[0]} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={CAT[0]} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CAT[1]} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={CAT[1]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f0e8db" vertical={false} />
                <XAxis dataKey="date" tickFormatter={dayLabel} {...axisProps} minTickGap={18} />
                <YAxis tickFormatter={inrShort} {...axisProps} width={56} />
                <Tooltip
                  content={<ChartTooltip labelFormat={dayLabel} />}
                  cursor={{ stroke: '#c9973f', strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="revenue" name="Billed" stroke={CAT[0]} strokeWidth={2} fill="url(#gRevenue)" activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} animationDuration={1200} />
                <Area type="monotone" dataKey="collected" name="Collected" stroke={CAT[1]} strokeWidth={2} fill="url(#gCollected)" activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} animationDuration={1400} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Payment status" subtitle="Share of orders" delay={0.15}>
          {charts.payStatus.length ? (
            <>
              <Donut data={charts.payStatus} total={totalPayOrders.toLocaleString('en-IN')} centerLabel="orders" valueFormat={(v) => `${v} orders`} />
              <div className="mt-4 space-y-2">
                {charts.payStatus.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 text-muted">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
                      {p.name}
                    </span>
                    <span className="font-semibold text-ink">
                      {p.value} <span className="text-muted font-normal">· {((p.value / totalPayOrders) * 100).toFixed(0)}%</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted py-16 text-center">No orders yet</p>
          )}
        </ChartCard>
      </div>

      {/* Monthly + methods */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <ChartCard
          className="xl:col-span-2"
          title="Monthly performance"
          subtitle="Last 6 months"
          action={<Legend items={[{ label: 'Billed', color: CAT[0] }, { label: 'Collected', color: CAT[1] }]} />}
          delay={0.1}
        >
          <div className="h-[260px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#f0e8db" vertical={false} />
                <XAxis dataKey="month" tickFormatter={monthLabel} {...axisProps} />
                <YAxis tickFormatter={inrShort} {...axisProps} width={56} />
                <Tooltip content={<ChartTooltip labelFormat={monthLabel} />} cursor={{ fill: 'rgba(201,151,63,0.08)' }} />
                <Bar dataKey="revenue" name="Billed" fill={CAT[0]} radius={[4, 4, 0, 0]} maxBarSize={28} animationDuration={1100} />
                <Bar dataKey="collected" name="Collected" fill={CAT[1]} radius={[4, 4, 0, 0]} maxBarSize={28} animationDuration={1300} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Payment methods" subtitle="Billed value by method" delay={0.15}>
          {charts.methodSlices.length ? (
            <>
              <Donut data={charts.methodSlices} total={inrShort(totalMethodAmount)} centerLabel="billed" />
              <div className="mt-4 space-y-2">
                {charts.methodSlices.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 text-muted">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
                      {p.name}
                    </span>
                    <span className="font-semibold text-ink">{inr(p.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted py-16 text-center">No payments yet</p>
          )}
        </ChartCard>
      </div>

      {/* Retailers + delivery progress */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <ChartCard title="Top retailers" subtitle="Billed in the last 30 days" delay={0.1}>
          {data.topRetailers?.length ? (
            <div className="space-y-3.5">
              {data.topRetailers.map((r, i) => (
                <div key={r.id}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-gold-soft text-gold-dark text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="font-medium text-ink truncate">{r.shop_name}</span>
                    </span>
                    <span className="font-semibold text-ink">{inr(r.revenue)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-cream overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: CAT[0] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(r.revenue / maxTop) * 100}%` }}
                      transition={{ duration: 1, delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted py-12 text-center">No orders in the last 30 days</p>
          )}
        </ChartCard>

        <ChartCard
          title="Highest outstanding"
          subtitle="Retailers with pending dues"
          action={
            <Link to="/admin/ledgers" className="text-xs font-semibold text-brand hover:text-brand-dark inline-flex items-center gap-1">
              Ledgers <FiArrowUpRight />
            </Link>
          }
          delay={0.15}
        >
          {data.outstandingRetailers?.length ? (
            <ul className="divide-y divide-line">
              {data.outstandingRetailers.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-light to-brand-dark text-white text-sm font-bold flex items-center justify-center">
                      {r.shop_name?.[0]?.toUpperCase() || 'R'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{r.shop_name}</p>
                      <p className="text-xs text-muted truncate">{r.owner_name || r.phone}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-danger">{inr(r.outstanding)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted py-12 text-center">No outstanding dues 🎉</p>
          )}
        </ChartCard>

        <ChartCard title="Fulfilment" subtitle="Delivery and collection progress" delay={0.2}>
          <div className="space-y-6">
            {[
              { label: 'KG delivered', pct: deliveryRate, detail: `${kg(k.kgDelivered)} of ${kg(k.kgOrdered)}`, color: CAT[3] },
              { label: 'Amount collected', pct: collectionRate, detail: `${inr(k.collected)} of ${inr(k.totalRevenue)}`, color: CAT[1] },
              {
                label: 'Deliveries completed',
                pct: k.completedDeliveries + k.pendingDeliveries > 0 ? (k.completedDeliveries / (k.completedDeliveries + k.pendingDeliveries)) * 100 : 0,
                detail: `${k.completedDeliveries} done · ${k.pendingDeliveries} pending`,
                color: CAT[2],
              },
            ].map((row, i) => (
              <div key={row.label}>
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-ink">{row.label}</p>
                    <p className="text-xs text-muted">{row.detail}</p>
                  </div>
                  <span className="text-lg font-bold text-ink">{row.pct.toFixed(0)}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-cream overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: row.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${row.pct}%` }}
                    transition={{ duration: 1.2, delay: 0.3 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Recent orders */}
      <ChartCard
        title="Recent orders"
        subtitle="Latest orders from your retailers"
        action={
          <Link to="/admin/orders">
            <Button variant="secondary" size="sm" icon={FiArrowUpRight} iconPosition="right">
              View all
            </Button>
          </Link>
        }
        className="!p-0 overflow-hidden [&>div:first-child]:px-6 [&>div:first-child]:pt-5"
        delay={0.1}
      >
        {data.recentOrders?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Order', 'Retailer', 'Amount', 'Payment', 'Status', ''].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 text-sm font-semibold text-ink">{order.order_number}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-ink">{order.shop_name || 'Unknown'}</p>
                      <p className="text-xs text-muted">{order.retailer_phone || ''}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-ink">{inr(parseFloat(order.total_amount))}</td>
                    <td className="px-6 py-4">
                      <Badge variant={PAY_BADGE[order.payment_status] || 'default'}>
                        {PAY_LABEL[order.payment_status] || order.payment_status || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={STATUS_BADGE[order.order_status] || 'default'}>
                        {STATUS_LABEL[order.order_status] || order.order_status || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/admin/orders/${order.id}`}>
                        <Button variant="ghost" size="sm" icon={FiEye}>
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FiPackage className="w-12 h-12 mx-auto text-line mb-3" />
            <p className="text-sm text-muted">No orders yet</p>
          </div>
        )}
      </ChartCard>
    </div>
  );
};

export default AdminDashboard;
