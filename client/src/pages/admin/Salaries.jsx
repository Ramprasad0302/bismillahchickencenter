import { useState, useEffect } from 'react';
import {
  FiUser,
  FiTruck,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiLoader,
  FiAlertCircle,
  FiEdit2,
  FiCheck,
  FiX,
  FiPlus,
} from 'react-icons/fi';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const Salaries = () => {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selected, setSelected] = useState(null); // { refType, refId }
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryInput, setSalaryInput] = useState('');
  const [savingSalary, setSavingSalary] = useState(false);

  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [advanceNote, setAdvanceNote] = useState('');
  const [savingAdvance, setSavingAdvance] = useState(false);
  const [advanceError, setAdvanceError] = useState(null);

  const fetchSummary = async (m) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/salaries/summary', { params: { month: m } });
      if (res.data.success) {
        setEmployees(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching salary summary:', err);
      setError('Failed to load salary data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(month);
  }, [month]);

  const openEmployee = async (refType, refId) => {
    setSelected({ refType, refId });
    setDetail(null);
    setDetailError(null);
    setEditingSalary(false);
    setAdvanceAmount('');
    setAdvanceNote('');
    setAdvanceDate(new Date().toISOString().slice(0, 10));
    setAdvanceError(null);
    await loadDetail(refType, refId, month);
  };

  const loadDetail = async (refType, refId, m) => {
    setDetailLoading(true);
    try {
      const res = await api.get('/salaries/detail', { params: { refType, refId, month: m } });
      if (res.data.success) {
        setDetail(res.data.data);
        setSalaryInput(res.data.data.employee.dailySalary);
      } else {
        setDetailError('Could not load this employee.');
      }
    } catch (err) {
      console.error('Error fetching salary detail:', err);
      setDetailError(err.response?.data?.message || 'Could not load this employee.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    setSelected(null);
    setDetail(null);
  };

  const saveDailySalary = async () => {
    const value = parseFloat(salaryInput);
    if (Number.isNaN(value) || value < 0) return;
    setSavingSalary(true);
    try {
      await api.put('/salaries/daily-salary', {
        refType: selected.refType,
        refId: selected.refId,
        dailySalary: value,
      });
      setEditingSalary(false);
      await loadDetail(selected.refType, selected.refId, month);
      await fetchSummary(month);
    } catch (err) {
      console.error('Error updating daily salary:', err);
      alert(err.response?.data?.message || 'Failed to update daily salary.');
    } finally {
      setSavingSalary(false);
    }
  };

  const submitAdvance = async (e) => {
    e.preventDefault();
    setAdvanceError(null);
    const amount = parseFloat(advanceAmount);
    if (!amount || amount <= 0) {
      setAdvanceError('Enter a valid amount.');
      return;
    }
    if (!advanceDate) {
      setAdvanceError('Pick a date.');
      return;
    }
    setSavingAdvance(true);
    try {
      await api.post('/salaries/advance', {
        refType: selected.refType,
        refId: selected.refId,
        amount,
        date: advanceDate,
        note: advanceNote || null,
      });
      setAdvanceAmount('');
      setAdvanceNote('');
      await loadDetail(selected.refType, selected.refId, month);
      await fetchSummary(month);
    } catch (err) {
      console.error('Error recording advance:', err);
      setAdvanceError(err.response?.data?.message || 'Failed to record advance.');
    } finally {
      setSavingAdvance(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FiLoader className="w-10 h-10 animate-spin text-[#16834B]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#FDEEEE] border border-[#D14343]/20 rounded-xl p-8 text-center max-w-md mx-auto">
        <FiAlertCircle className="w-12 h-12 text-[#D14343] mx-auto mb-3" />
        <p className="text-[#D14343] font-medium mb-4">{error}</p>
        <button onClick={() => fetchSummary(month)} className="px-4 py-2 bg-[#151A17] text-white rounded-lg text-sm">
          Retry
        </button>
      </div>
    );
  }

  const totalBase = employees.reduce((s, e) => s + e.baseEarned, 0);
  const totalAdvances = employees.reduce((s, e) => s + e.advancesTaken, 0);
  const totalRemaining = employees.reduce((s, e) => s + e.remaining, 0);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#151A17]">Salaries</h1>
          <p className="text-sm text-[#6B716D] mt-1">
            Driver and staff pay, based on days worked this month.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-[#E5E8E6] rounded-lg px-2 py-1.5">
          <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="p-1.5 hover:bg-[#F6F7F6] rounded-md">
            <FiChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-[#151A17] px-2 min-w-[140px] text-center">
            {monthLabel(month)}
          </span>
          <button onClick={() => setMonth((m) => shiftMonth(m, 1))} className="p-1.5 hover:bg-[#F6F7F6] rounded-md">
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month totals */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4">
          <p className="text-xs text-[#6B716D]">Base Salary Earned</p>
          <p className="text-xl font-semibold text-[#151A17] mt-1">{formatCurrency(totalBase)}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4">
          <p className="text-xs text-[#6B716D]">Advances Paid</p>
          <p className="text-xl font-semibold text-[#151A17] mt-1">{formatCurrency(totalAdvances)}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E8E6] p-4">
          <p className="text-xs text-[#6B716D]">Remaining to Pay</p>
          <p className="text-xl font-semibold text-[#151A17] mt-1">{formatCurrency(totalRemaining)}</p>
        </div>
      </div>

      {employees.length === 0 ? (
        <EmptyState
          icon={FiUser}
          title="No drivers or staff yet"
          description="Add drivers and staff to start tracking their salaries here."
        />
      ) : (
        <div className="space-y-3">
          {employees.map((emp) => (
            <button
              key={`${emp.refType}-${emp.refId}`}
              onClick={() => openEmployee(emp.refType, emp.refId)}
              className="w-full text-left bg-white rounded-xl border border-[#E5E8E6] p-5 hover:border-[#151A17] hover:shadow-sm transition"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#F6F7F6] flex items-center justify-center">
                    {emp.refType === 'driver' ? (
                      <FiTruck className="w-5 h-5 text-[#151A17]" />
                    ) : (
                      <FiUser className="w-5 h-5 text-[#151A17]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[#151A17]">{emp.name}</h3>
                      <Badge variant={emp.status === 'active' || emp.status === 'available' ? 'success' : 'default'}>
                        {emp.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#6B716D] mt-1">
                      {emp.daysWorked} {emp.daysWorked === 1 ? 'day' : 'days'} worked
                      {emp.tripsCount !== emp.daysWorked ? ` (${emp.tripsCount} trips)` : ''} ·{' '}
                      {formatCurrency(emp.dailySalary)}/day
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-xs text-[#6B716D]">Earned</p>
                    <p className="font-semibold text-[#151A17]">{formatCurrency(emp.baseEarned)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B716D]">Advance</p>
                    <p className="font-semibold text-[#B25E00]">{formatCurrency(emp.advancesTaken)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B716D]">Remaining</p>
                    <p className={`font-semibold ${emp.remaining < 0 ? 'text-[#D14343]' : 'text-[#16834B]'}`}>
                      {formatCurrency(emp.remaining)}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Employee detail modal */}
      <Modal isOpen={!!selected} onClose={closeModal} title="Salary Detail" size="lg">
        {detailLoading && (
          <div className="flex items-center justify-center py-16">
            <FiLoader className="w-8 h-8 animate-spin text-[#16834B]" />
          </div>
        )}

        {detailError && (
          <div className="text-center py-10">
            <FiAlertCircle className="w-10 h-10 text-[#D14343] mx-auto mb-2" />
            <p className="text-[#D14343] text-sm">{detailError}</p>
          </div>
        )}

        {!detailLoading && !detailError && detail && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#151A17]">{detail.employee.name}</h3>
                <p className="text-sm text-[#6B716D]">
                  {detail.employee.role} · {detail.employee.phone} · {monthLabel(detail.month)}
                </p>
              </div>

              {editingSalary ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={salaryInput}
                    onChange={(e) => setSalaryInput(e.target.value)}
                    className="w-24 px-2 py-1.5 border border-[#E5E8E6] rounded-lg text-sm"
                    min="0"
                    step="1"
                  />
                  <button onClick={saveDailySalary} disabled={savingSalary} className="p-1.5 text-[#16834B] hover:bg-[#EAF6EF] rounded-md">
                    <FiCheck className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingSalary(false)} className="p-1.5 text-[#6B716D] hover:bg-[#F6F7F6] rounded-md">
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingSalary(true)}
                  className="flex items-center gap-1.5 text-sm text-[#16834B] hover:underline"
                >
                  <FiEdit2 className="w-3.5 h-3.5" />
                  {formatCurrency(detail.employee.dailySalary)}/day
                </button>
              )}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#F6F7F6] rounded-xl">
              <div>
                <p className="text-xs text-[#6B716D]">Days Worked</p>
                <p className="font-semibold text-[#151A17]">{detail.daysWorked}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B716D]">Trips</p>
                <p className="font-semibold text-[#151A17]">{detail.tripsCount}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B716D]">Earned</p>
                <p className="font-semibold text-[#151A17]">{formatCurrency(detail.baseEarned)}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B716D]">Remaining</p>
                <p className={`font-semibold ${detail.remaining < 0 ? 'text-[#D14343]' : 'text-[#16834B]'}`}>
                  {formatCurrency(detail.remaining)}
                </p>
              </div>
            </div>

            {/* Trips worked */}
            <div>
              <p className="text-xs font-medium text-[#6B716D] mb-2">TRIPS THIS MONTH</p>
              {detail.trips.length === 0 ? (
                <p className="text-sm text-[#6B716D] py-3">No trips this month.</p>
              ) : (
                <div className="space-y-2">
                  {detail.trips.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-white border border-[#E5E8E6] rounded-lg text-sm">
                      <span className="font-medium text-[#151A17]">{t.tripNumber}</span>
                      <span className="text-[#6B716D]">{formatDate(t.date)}</span>
                      <Badge variant={t.status === 'completed' ? 'success' : 'info'}>{t.status.replace('_', ' ')}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Advances */}
            <div>
              <p className="text-xs font-medium text-[#6B716D] mb-2">ADVANCES TAKEN</p>
              {detail.advances.length === 0 ? (
                <p className="text-sm text-[#6B716D] py-3">No advances recorded this month.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {detail.advances.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-3 bg-white border border-[#E5E8E6] rounded-lg text-sm">
                      <div>
                        <span className="font-medium text-[#151A17]">{formatCurrency(a.amount)}</span>
                        {a.note && <span className="text-[#6B716D] ml-2">— {a.note}</span>}
                      </div>
                      <span className="text-[#6B716D]">
                        {formatDate(a.date)} · {a.recordedBy}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add advance form */}
              <form onSubmit={submitAdvance} className="flex items-end gap-2 flex-wrap p-3 bg-[#F6F7F6] rounded-lg">
                <div>
                  <label className="block text-xs text-[#6B716D] mb-1">Amount</label>
                  <input
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    placeholder="e.g. 10000"
                    className="w-32 px-3 py-2 border border-[#E5E8E6] rounded-lg text-sm"
                    min="0"
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#6B716D] mb-1">Date</label>
                  <input
                    type="date"
                    value={advanceDate}
                    onChange={(e) => setAdvanceDate(e.target.value)}
                    className="px-3 py-2 border border-[#E5E8E6] rounded-lg text-sm"
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs text-[#6B716D] mb-1">Note (optional)</label>
                  <input
                    type="text"
                    value={advanceNote}
                    onChange={(e) => setAdvanceNote(e.target.value)}
                    placeholder="e.g. Diwali advance"
                    className="w-full px-3 py-2 border border-[#E5E8E6] rounded-lg text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingAdvance}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#151A17] text-white rounded-lg text-sm disabled:opacity-50"
                >
                  <FiPlus className="w-4 h-4" />
                  {savingAdvance ? 'Adding...' : 'Add'}
                </button>
              </form>
              {advanceError && <p className="text-xs text-[#D14343] mt-2">{advanceError}</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Salaries;