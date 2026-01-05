import React, { useState, useEffect, useRef } from 'react';
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Download, Upload,
  FileJson, Settings, Plus, Trash2, Monitor
} from 'lucide-react';
import JapaneseHolidays from 'japanese-holidays';
import { BarChart, Bar, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- Utility Functions ---
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const calculateDuration = (start, end, breakMinutes) => {
  if (!start || !end) return 0;
  let startMin = timeToMinutes(start);
  let endMin = timeToMinutes(end);
  if (endMin < startMin) endMin += 24 * 60;
  const diffMin = endMin - startMin - breakMinutes;
  const duration = Math.max(0, diffMin / 60);
  return parseFloat(duration.toFixed(2));
};

const generateCSV = (logs, currentMonth, accountName) => {
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  let csvContent = `案件名: ${accountName}\n`;
  csvContent += "日付,曜日,開始時間,終了時間,休憩(分),実働時間(h),出社,祝日\n";
  days.forEach(day => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const log = logs[dateKey];
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][day.getDay()];
    const holiday = JapaneseHolidays.isHoliday(day) || "";
    const row = [
      format(day, 'yyyy/MM/dd'), dayOfWeek,
      log?.start || "", log?.end || "", log?.breakTime || "", log?.duration || "",
      log?.isOffice ? "〇" : "", holiday
    ].join(",");
    csvContent += row + "\n";
  });
  return csvContent;
};

// --- Sub-Window Modal Component ---
const WindowModal = ({ title, onClose, children, danger = false }) => (
  <div className="modal-overlay" onClick={onClose} style={{ zIndex: danger ? 1100 : 1000 }}>
    <div className="modal" onClick={e => e.stopPropagation()} style={danger ? { borderColor: '#fca5a5' } : {}}>
      <div className="modal-title-bar">
        <div className="window-controls">
          <div className="control-dot dot-red" onClick={onClose} style={{ cursor: 'pointer' }} />
          <div className="control-dot dot-yellow" />
          <div className="control-dot dot-green" />
        </div>
        <span style={{ fontSize: '0.9rem', flex: 1, textAlign: 'center', color: danger ? '#ef4444' : 'inherit', fontWeight: 700 }}>{title}</span>
        <div style={{ width: '40px' }}></div>
      </div>
      <div className="modal-content">
        {children}
      </div>
    </div>
  </div>
);

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');

  const [accounts, setAccounts] = useState(() => {
    const saved = localStorage.getItem('work-time-accounts');
    if (saved) return JSON.parse(saved);
    return [{ id: 'default', name: 'メイン案件' }];
  });

  const [currentAccountId, setCurrentAccountId] = useState(() => accounts[0]?.id || '');
  const [workLogs, setWorkLogs] = useState({});
  const [settings, setSettings] = useState({
    defaultStart: '09:00', defaultEnd: '18:00', defaultBreak: 60, minHours: 140, maxHours: 180, themeColor: '#6366f1'
  });

  // --- Initial Sync: File System (Electron) -> App State ---
  useEffect(() => {
    const initData = async () => {
      if (window.electronAPI) {
        const fileAccounts = await window.electronAPI.loadData('accounts');
        if (fileAccounts) setAccounts(fileAccounts);

        const initialId = (fileAccounts && fileAccounts[0]?.id) || currentAccountId;
        if (initialId) {
          const fileLogs = await window.electronAPI.loadData(`logs-${initialId}`);
          if (fileLogs) setWorkLogs(fileLogs);
          const fileSettings = await window.electronAPI.loadData(`settings-${initialId}`);
          if (fileSettings) setSettings(prev => ({ ...prev, ...fileSettings }));
        }
      }
    };
    initData();
  }, []);

  // --- Account Switch Sync ---
  useEffect(() => {
    if (!currentAccountId) return;
    const sync = async () => {
      // Load from LocalStorage first (instant)
      const locLogs = localStorage.getItem(`work-time-logs-${currentAccountId}`);
      const locStgs = localStorage.getItem(`work-time-settings-${currentAccountId}`);
      if (locLogs) setWorkLogs(JSON.parse(locLogs));
      if (locStgs) setSettings(prev => ({ ...prev, ...JSON.parse(locStgs) }));

      // Merge/Override from File (persistent)
      if (window.electronAPI) {
        const fileLogs = await window.electronAPI.loadData(`logs-${currentAccountId}`);
        if (fileLogs) setWorkLogs(fileLogs);
        const fileStgs = await window.electronAPI.loadData(`settings-${currentAccountId}`);
        if (fileStgs) setSettings(prev => ({ ...prev, ...fileStgs }));
      }
    };
    sync();
  }, [currentAccountId]);

  // --- Theme Color Apply ---
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', settings.themeColor);
  }, [settings.themeColor]);

  // --- Auto-Save Sync ---
  useEffect(() => {
    localStorage.setItem('work-time-accounts', JSON.stringify(accounts));
    if (window.electronAPI) window.electronAPI.saveData('accounts', accounts);
  }, [accounts]);

  useEffect(() => {
    if (!currentAccountId) return;
    localStorage.setItem(`work-time-logs-${currentAccountId}`, JSON.stringify(workLogs));
    if (window.electronAPI) {
      window.electronAPI.saveData(`logs-${currentAccountId}`, workLogs);

      // Auto-save CSV for human-readable record
      const currentAccountName = accounts.find(a => a.id === currentAccountId)?.name || 'Account';
      const csv = generateCSV(workLogs, currentDate, currentAccountName);
      window.electronAPI.saveData(`backup-${currentAccountId}.csv`, csv, true); // true indicates raw string
    }
  }, [workLogs, currentAccountId, currentDate, accounts]);

  useEffect(() => {
    if (!currentAccountId) return;
    localStorage.setItem(`work-time-settings-${currentAccountId}`, JSON.stringify(settings));
    if (window.electronAPI) window.electronAPI.saveData(`settings-${currentAccountId}`, settings);
  }, [settings, currentAccountId]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState(null);
  const [editingLog, setEditingLog] = useState({ start: '', end: '', breakTime: 60, isOffice: false });
  const [newAccountName, setNewAccountName] = useState('');
  const fileInputRef = useRef(null);

  const handleAddAccount = () => {
    if (!newAccountName.trim()) return;
    const newId = Date.now().toString();
    setAccounts([...accounts, { id: newId, name: newAccountName }]);
    setCurrentAccountId(newId);
    setNewAccountName('');
    setIsAccountModalOpen(false);
  };

  const executeDeleteAccount = () => {
    const remaining = accounts.filter(a => a.id !== currentAccountId);
    setAccounts(remaining);
    setCurrentAccountId(remaining[0].id);
    setIsDeleteConfirmOpen(false);
    setIsSettingsOpen(false);
  };

  let calendarDays = [];
  let monthStart = startOfMonth(currentDate);

  if (viewMode === 'month') {
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  } else {
    const startDate = startOfWeek(currentDate);
    const endDate = endOfWeek(currentDate);
    calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
    monthStart = startOfMonth(currentDate);
  }

  const currentMonthLogs = Object.entries(workLogs).filter(([key]) => key.startsWith(format(monthStart, 'yyyy-MM')));
  const totalDuration = currentMonthLogs.reduce((acc, [_, log]) => acc + (log.duration || 0), 0);
  const officeDays = currentMonthLogs.filter(([_, log]) => log.isOffice).length;
  const loggedDaysCount = currentMonthLogs.length;

  let progressPercent = 0;
  if (settings.maxHours > 0) progressPercent = Math.min(100, (totalDuration / settings.maxHours) * 100);

  const handleDayClick = (day) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    setSelectedDate(day);
    const existing = workLogs[dateKey];
    setEditingLog(existing || { start: settings.defaultStart, end: settings.defaultEnd, breakTime: settings.defaultBreak, isOffice: false });
    setIsModalOpen(true);
  };

  const handleSaveLog = () => {
    if (!selectedDate) return;
    const duration = calculateDuration(editingLog.start, editingLog.end, Number(editingLog.breakTime));
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    setWorkLogs(prev => ({ ...prev, [dateKey]: { ...editingLog, duration, breakTime: Number(editingLog.breakTime) } }));
    setIsModalOpen(false);
  };

  const handleDeleteLog = () => {
    if (!selectedDate) return;
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    setWorkLogs(prev => { const next = { ...prev }; delete next[dateKey]; return next; });
    setIsModalOpen(false);
  };

  const downloadCSV = () => {
    const currentAccountName = accounts.find(a => a.id === currentAccountId)?.name || 'Unknown';
    const csvContent = generateCSV(workLogs, currentDate, currentAccountName);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `work_log_${currentAccountName}_${format(currentDate, 'yyyyMM')}.csv`;
    link.click();
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.logs) setWorkLogs(data.logs);
        if (data.settings) setSettings(data.settings);
        alert('Data Restored');
      } catch (err) { alert('Failed to Import'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const daysInMonth = eachDayOfInterval({ start: monthStart, end: endOfMonth(monthStart) });
  const graphData = daysInMonth.map(day => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const log = workLogs[dateKey];
    return {
      date: format(day, 'd'),
      hours: log?.duration || 0,
    };
  });

  return (
    <div className="bento-container">
      {/* Calendar Card */}
      <div className="calendar-card">
        <div className="calendar-header-top">
          <div className="account-selector">
            <select value={currentAccountId} onChange={(e) => setCurrentAccountId(e.target.value)}>
              {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
            <button className="icon-btn" onClick={() => setIsAccountModalOpen(true)} title="New Project"><Plus size={16} /></button>
          </div>
          <div className="view-controls">
            <div className="segmented-control">
              <button className={viewMode === 'month' ? 'active' : ''} onClick={() => setViewMode('month')}>Month</button>
              <button className={viewMode === 'week' ? 'active' : ''} onClick={() => setViewMode('week')}>Week</button>
            </div>
            <button className="icon-btn" onClick={() => setIsSettingsOpen(true)}><Settings size={20} /></button>
          </div>
        </div>

        <div className="calendar-nav-bar">
          <button onClick={() => viewMode === 'month' ? setCurrentDate(subMonths(currentDate, 1)) : setCurrentDate(subWeeks(currentDate, 1))} className="icon-btn">
            <ChevronLeft size={24} />
          </button>
          <h2 className="calendar-title">
            {viewMode === 'month' ? format(currentDate, 'yyyy MMMM') : `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d')}`}
          </h2>
          <button onClick={() => viewMode === 'month' ? setCurrentDate(addMonths(currentDate, 1)) : setCurrentDate(addWeeks(currentDate, 1))} className="icon-btn">
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
            <div key={d} className={`weekday-header ${i === 0 ? 'text-red' : i === 6 ? 'text-blue' : ''}`}>{d}</div>
          ))}
          {calendarDays.map((day, idx) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const log = workLogs[dateKey];
            const isCurrent = viewMode === 'month' ? isSameMonth(day, monthStart) : true;
            const holiday = JapaneseHolidays.isHoliday(day);
            const isSunday = day.getDay() === 0;
            const isSaturday = day.getDay() === 6;

            let dayColorClass = '';
            if (holiday || isSunday) dayColorClass = 'day-sunday';
            else if (isSaturday) dayColorClass = 'day-saturday';

            return (
              <div
                key={idx}
                className={`day-cell ${!isCurrent ? 'other-month' : ''} ${isToday(day) ? 'today' : ''} ${dayColorClass}`}
                onClick={() => handleDayClick(day)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="day-number">{format(day, 'd')}</span>
                  {log?.isOffice && <Monitor size={14} color="#06b6d4" />}
                </div>
                {holiday && <div className="holiday-label">{holiday}</div>}
                {log && <div className="log-pill">{log.duration} h</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar Stats */}
      <div className="sidebar-stack">
        <div className="stat-box">
          <div className="stat-title">Total Hours ({format(monthStart, 'MMMM')})</div>
          <div className="stat-highlight">{totalDuration.toFixed(2)}h</div>
          <div className="stat-sub">Target: {settings.minHours}h - {settings.maxHours}h</div>
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
            {settings.minHours && <div className="limit-marker" style={{ left: `${(settings.minHours / settings.maxHours) * 100}%` }}></div>}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-title">Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div><div style={{ fontSize: '1.8rem', fontWeight: '800' }}>{loggedDaysCount}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Days</div></div>
            <div><div style={{ fontSize: '1.8rem', fontWeight: '800' }}>{officeDays}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Office Days</div></div>
          </div>
        </div>

        <div className="stat-box" style={{ minHeight: '180px' }}>
          <div className="stat-title">Trend</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={graphData}>
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
              <Bar dataKey="hours" radius={[3, 3, 3, 3]}>
                {graphData.map((_, i) => <Cell key={i} fill={settings.themeColor} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="tools-grid">
          <button className="tool-btn" onClick={downloadCSV}><Download size={20} color="var(--primary)" /><span>CSV</span></button>
          <button className="tool-btn" onClick={() => {
            const str = JSON.stringify({ logs: workLogs, settings, accountId: currentAccountId }, null, 2);
            const blob = new Blob([str], { type: 'application/json' });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `backup_${format(new Date(), 'yyyyMMdd')}.json`;
            a.click();
          }}><FileJson size={20} color="var(--primary)" /><span>JSON</span></button>
          <button className="tool-btn" onClick={() => fileInputRef.current?.click()}><Upload size={20} color="var(--primary)" /><span>Import</span></button>
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleImportJSON} style={{ display: 'none' }} />
        </div>
      </div>

      {/* --- Sub-Windows (Modals) --- */}
      {isSettingsOpen && (
        <WindowModal title="Preferences" onClose={() => setIsSettingsOpen(false)}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Theme Color</label>
            <input type="color" value={settings.themeColor} onChange={e => setSettings({ ...settings, themeColor: e.target.value })} style={{ height: '40px' }} />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}><label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Start</label><input type="time" value={settings.defaultStart} onChange={e => setSettings({ ...settings, defaultStart: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>End</label><input type="time" value={settings.defaultEnd} onChange={e => setSettings({ ...settings, defaultEnd: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <div style={{ flex: 1 }}><label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Min h</label><input type="number" value={settings.minHours} onChange={e => setSettings({ ...settings, minHours: Number(e.target.value) })} /></div>
            <div style={{ flex: 1 }}><label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Max h</label><input type="number" value={settings.maxHours} onChange={e => setSettings({ ...settings, maxHours: Number(e.target.value) })} /></div>
          </div>
          <button className="danger" onClick={() => setIsDeleteConfirmOpen(true)} style={{ width: '100%' }}>Delete Project</button>
        </WindowModal>
      )}

      {isAccountModalOpen && (
        <WindowModal title="New Project" onClose={() => setIsAccountModalOpen(false)}>
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Project Name</label>
            <input type="text" value={newAccountName} onChange={e => setNewAccountName(e.target.value)} autoFocus />
          </div>
          <button className="primary" onClick={handleAddAccount} disabled={!newAccountName.trim()} style={{ width: '100%' }}>Create</button>
        </WindowModal>
      )}

      {isModalOpen && (
        <WindowModal title={selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Entry'} onClose={() => setIsModalOpen(false)}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}><label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Start</label><input type="time" value={editingLog.start} onChange={e => setEditingLog({ ...editingLog, start: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>End</label><input type="time" value={editingLog.end} onChange={e => setEditingLog({ ...editingLog, end: e.target.value })} /></div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Break (min)</label>
            <input type="number" value={editingLog.breakTime} onChange={e => setEditingLog({ ...editingLog, breakTime: e.target.value })} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
            <input type="checkbox" checked={editingLog.isOffice} onChange={e => setEditingLog({ ...editingLog, isOffice: e.target.checked })} style={{ width: 20, height: 20 }} />
            <span>Office Attendance</span>
          </label>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="danger" onClick={handleDeleteLog}><Trash2 size={16} /></button>
            <button className="primary" onClick={handleSaveLog} style={{ flex: 1, marginLeft: 12 }}>Save</button>
          </div>
        </WindowModal>
      )}

      {isDeleteConfirmOpen && (
        <WindowModal title="WARNING" danger onClose={() => setIsDeleteConfirmOpen(false)}>
          <p style={{ marginBottom: '24px' }}>Delete <strong>{accounts.find(a => a.id === currentAccountId)?.name}</strong>?<br />This cannot be undone.</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</button>
            <button className="danger" onClick={executeDeleteAccount}>Delete</button>
          </div>
        </WindowModal>
      )}
    </div>
  );
}

export default App;
