import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Bus,
  Check,
  Clock3,
  Edit3,
  Info,
  KeyRound,
  Plus,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/authContext';

const SETTINGS_KEY = 'transportDashboardSettings';
const defaultSettings = {
  vehicleTypes: ['Bus', 'Minibus', 'Sedan', 'Pick-up', 'Van', 'Truck', 'Motorcycle', 'Other'],
  vehicleStatuses: [
    { name: 'Available', description: 'Ready for assignment' },
    { name: 'Assigned', description: 'Assigned to employee' },
    { name: 'Under Maintenance', description: 'In maintenance' },
    { name: 'Out of Service', description: 'Not in use' },
    { name: 'Retired', description: 'No longer in use' },
  ],
  vehicleConditions: [
    { name: 'Excellent', description: 'In very good condition' },
    { name: 'Good', description: 'Good working condition' },
    { name: 'Fair', description: 'Needs minor repair' },
    { name: 'Damaged', description: 'Needs major repair' },
    { name: 'Critical', description: 'Not operational' },
  ],
  clearance: {
    assignedVehicle: 'Required',
    vehicleReturned: 'Required',
    vehicleCondition: 'Required',
    vehicleKeysReturned: 'Required',
    vehicleDocumentsReturned: 'Optional',
    fuelCardReturned: 'Optional',
    outstandingTransportObligations: 'Optional',
  },
  assignment: {
    assignmentDate: 'Required',
    returnDate: 'Required',
    returnCondition: 'Required',
    handoverRemarks: '',
    vehicleReturnConfirmation: true,
  },
  notifications: {
    newClearanceRequest: true,
    clearanceResubmitted: true,
    clearanceReturned: true,
    vehicleAssignment: true,
    vehicleReturn: true,
  },
  office: {
    officeName: 'Transport Office',
    officerName: '',
    position: 'Transport Officer',
    department: '',
  },
};

const readSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return defaultSettings;
    return {
      ...defaultSettings,
      ...saved,
      clearance: { ...defaultSettings.clearance, ...saved.clearance },
      assignment: { ...defaultSettings.assignment, ...saved.assignment },
      notifications: { ...defaultSettings.notifications, ...saved.notifications },
      office: { ...defaultSettings.office, ...saved.office },
    };
  } catch (error) {
    console.error('Unable to read saved Transport Settings:', error);
    return defaultSettings;
  }
};

function Section({ title, icon: Icon, children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
      <header className="flex min-h-10 items-center gap-2 border-b border-blue-100 bg-blue-50/80 px-3 py-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
          <Icon size={12} />
        </span>
        <h2 className="text-xs font-bold text-slate-800">{title}</h2>
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

function Catalog({ title, items, onAdd, onEdit, onDelete }) {
  return (
    <Section title={title} icon={Info}>
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {items.map((item, index) => {
          const name = typeof item === 'string' ? item : item.name;
          const description = typeof item === 'string' ? '' : item.description;
          return (
            <div key={`${name}-${index}`} className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-slate-100 py-1.5 last:border-0">
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold text-slate-700">{name}</p>
                {description && <p className="truncate text-[9px] text-slate-500">{description}</p>}
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => onEdit(index)} aria-label={`Edit ${name}`} className="rounded bg-blue-600 p-1.5 text-white hover:bg-blue-700"><Edit3 size={11} /></button>
                <button type="button" onClick={() => onDelete(index)} aria-label={`Delete ${name}`} className="rounded bg-rose-600 p-1.5 text-white hover:bg-rose-700"><Trash2 size={11} /></button>
              </div>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={onAdd} className="mt-2 inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-blue-700">
        <Plus size={12} />Add {title === 'Vehicle Types' ? 'Vehicle Type' : title === 'Vehicle Status' ? 'Status' : 'Condition'}
      </button>
    </Section>
  );
}

function SettingSelect({ label, value, onChange }) {
  return (
    <label className="grid grid-cols-[1fr_42%] items-center gap-2 border-b border-slate-100 py-1.5 last:border-0">
      <span className="text-[9px] leading-4 text-slate-600">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 rounded border border-slate-200 bg-white px-1.5 py-1 text-[9px] text-slate-700 outline-none focus:border-blue-500">
        <option>Required</option>
        <option>Optional</option>
        <option>Not Required</option>
      </select>
    </label>
  );
}

function SettingToggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 border-b border-slate-100 py-2 last:border-0">
      <span className="text-[9px] text-slate-700">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-3.5 w-3.5 accent-blue-600" />
    </label>
  );
}

export default function TransportDashboardSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(readSettings);
  const [editor, setEditor] = useState(null);
  const [saved, setSaved] = useState(false);
  const [storageError, setStorageError] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      setSaved(true);
      setStorageError('');
      const timeout = window.setTimeout(() => setSaved(false), 1800);
      return () => window.clearTimeout(timeout);
    } catch (error) {
      console.error('Unable to save Transport Settings in this browser:', error);
      setStorageError('Could not save settings in this browser. Check available storage and try again.');
      setSaved(false);
    }
  }, [settings]);

  const updateGroup = (group, key, value) => {
    setSettings((current) => ({ ...current, [group]: { ...current[group], [key]: value } }));
  };

  const openEditor = (group, index = -1) => {
    const current = settings[group][index];
    setEditor({
      group,
      index,
      name: typeof current === 'string' ? current : current?.name || '',
      description: typeof current === 'string' ? '' : current?.description || '',
    });
  };

  const saveCatalogItem = (event) => {
    event.preventDefault();
    const name = editor.name.trim();
    if (!name) return;
    setSettings((current) => {
      const next = [...current[editor.group]];
      const item = editor.group === 'vehicleTypes'
        ? name
        : { name, description: editor.description.trim() };
      if (editor.index < 0) next.push(item);
      else next[editor.index] = item;
      return { ...current, [editor.group]: next };
    });
    setEditor(null);
  };

  const deleteCatalogItem = (group, index) => {
    const entry = settings[group][index];
    const label = typeof entry === 'string' ? entry : entry.name;
    if (!window.confirm(`Remove "${label}" from this browser's Transport Settings?`)) return;
    setSettings((current) => ({
      ...current,
      [group]: current[group].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const displayName = user?.name || user?.fullName || user?.username || '';
  const email = user?.email || '';

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-100 px-3 py-4 text-slate-800 sm:px-5">
      <div className="mx-auto max-w-7xl space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Settings</h1>
            <p className="text-[10px] text-slate-500">Manage your account, vehicle data, clearance workflow, and transport office preferences.</p>
          </div>
          <span role="status" className="inline-flex items-center gap-1 text-[10px] text-emerald-700">
            <Check size={12} />{saved ? 'Saved in this browser' : 'Browser-local settings'}
          </span>
        </header>

        {storageError && <p role="alert" className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{storageError}</p>}

        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Section title="Account Settings" icon={Info}>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-[9px] font-semibold text-slate-600">Full Name<input readOnly value={displayName} className="mt-1 w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-normal text-slate-700" /></label>
              <label className="text-[9px] font-semibold text-slate-600">Email<input readOnly value={email} className="mt-1 w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-normal text-slate-700" /></label>
              <label className="text-[9px] font-semibold text-slate-600">Username<input readOnly value={user?.username || user?.email || ''} className="mt-1 w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-normal text-slate-700" /></label>
              <Link to="/transport-office/change-password" className="mt-auto inline-flex items-center justify-center gap-1 rounded bg-blue-600 px-2 py-2 text-[10px] font-semibold text-white hover:bg-blue-700"><KeyRound size={12} />Change Password</Link>
            </div>
          </Section>

          <Catalog title="Vehicle Types" items={settings.vehicleTypes} onAdd={() => openEditor('vehicleTypes')} onEdit={(index) => openEditor('vehicleTypes', index)} onDelete={(index) => deleteCatalogItem('vehicleTypes', index)} />
          <Catalog title="Vehicle Status" items={settings.vehicleStatuses} onAdd={() => openEditor('vehicleStatuses')} onEdit={(index) => openEditor('vehicleStatuses', index)} onDelete={(index) => deleteCatalogItem('vehicleStatuses', index)} />

          <Catalog title="Vehicle Condition" items={settings.vehicleConditions} onAdd={() => openEditor('vehicleConditions')} onEdit={(index) => openEditor('vehicleConditions', index)} onDelete={(index) => deleteCatalogItem('vehicleConditions', index)} />

          <Section title="Transport Clearance Settings" icon={Bus} className="xl:col-span-2">
            {Object.entries({
              assignedVehicle: 'Assigned Vehicle',
              vehicleReturned: 'Vehicle Returned',
              vehicleCondition: 'Vehicle Condition',
              vehicleKeysReturned: 'Vehicle Keys Returned',
              vehicleDocumentsReturned: 'Vehicle Documents Returned',
              fuelCardReturned: 'Fuel Card Returned',
              outstandingTransportObligations: 'Outstanding Transport Obligations',
            }).map(([key, label]) => (
              <SettingSelect key={key} label={label} value={settings.clearance[key]} onChange={(value) => updateGroup('clearance', key, value)} />
            ))}
          </Section>

          <Section title="Assignment / Return Settings" icon={Clock3} className="xl:col-span-2">
            <SettingSelect label="Vehicle Assignment Date" value={settings.assignment.assignmentDate} onChange={(value) => updateGroup('assignment', 'assignmentDate', value)} />
            <SettingSelect label="Vehicle Return Date" value={settings.assignment.returnDate} onChange={(value) => updateGroup('assignment', 'returnDate', value)} />
            <SettingSelect label="Return Condition" value={settings.assignment.returnCondition} onChange={(value) => updateGroup('assignment', 'returnCondition', value)} />
            <label className="mt-2 block text-[9px] font-semibold text-slate-600">Handover/Return Remarks<textarea value={settings.assignment.handoverRemarks} onChange={(event) => updateGroup('assignment', 'handoverRemarks', event.target.value)} rows={2} className="mt-1 w-full resize-y rounded border border-slate-200 px-2 py-1.5 text-[10px] font-normal outline-none focus:border-blue-500" placeholder="Enter optional remarks" /></label>
            <SettingToggle label="Vehicle Return Confirmation" checked={settings.assignment.vehicleReturnConfirmation} onChange={(value) => updateGroup('assignment', 'vehicleReturnConfirmation', value)} />
          </Section>

          <Section title="Notification Settings" icon={Bell} className="xl:col-span-2">
            {Object.entries({
              newClearanceRequest: 'New Transport Clearance Request',
              clearanceResubmitted: 'Clearance Resubmitted',
              clearanceReturned: 'Clearance Returned',
              vehicleAssignment: 'Vehicle Assignment Notification',
              vehicleReturn: 'Vehicle Return Notification',
            }).map(([key, label]) => (
              <SettingToggle key={key} label={label} checked={settings.notifications[key]} onChange={(value) => updateGroup('notifications', key, value)} />
            ))}
          </Section>

          <Section title="Transport Office Information" icon={Info} className="xl:col-span-2">
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries({
                officeName: 'Office Name',
                officerName: 'Officer Name',
                position: 'Position',
                department: 'Department/Office',
              }).map(([key, label]) => (
                <label key={key} className="text-[9px] font-semibold text-slate-600">{label}<input value={settings.office[key]} onChange={(event) => updateGroup('office', key, event.target.value)} className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-[10px] font-normal outline-none focus:border-blue-500" /></label>
              ))}
            </div>
          </Section>

          <Section title="Security" icon={Shield} className="xl:col-span-2">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded-md bg-slate-50 p-2">
                <Clock3 size={15} className="text-blue-600" />
                <div><p className="text-[9px] font-semibold">Last Login</p><p className="text-[9px] text-slate-500">Current session</p></div>
              </div>
              <Link to="/transport-office/change-password" className="flex items-center gap-2 rounded-md bg-slate-50 p-2 text-[9px] font-semibold text-blue-700 hover:bg-blue-50"><KeyRound size={15} />Change Password</Link>
              <div className="flex items-center gap-2 rounded-md bg-slate-50 p-2 text-[9px] text-slate-500"><Shield size={15} className="text-emerald-600" />Account protected</div>
            </div>
          </Section>
        </div>
      </div>

      {editor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditor(null); }}>
          <form onSubmit={saveCatalogItem} className="w-full max-w-md space-y-4 rounded-xl bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="transport-catalog-title">
            <div className="flex items-center justify-between">
              <h2 id="transport-catalog-title" className="font-semibold text-slate-900">{editor.index < 0 ? 'Add' : 'Edit'} {editor.group === 'vehicleTypes' ? 'Vehicle Type' : editor.group === 'vehicleStatuses' ? 'Vehicle Status' : 'Vehicle Condition'}</h2>
              <button type="button" onClick={() => setEditor(null)} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <label className="block text-xs font-medium text-slate-700">Name<input autoFocus required maxLength={50} value={editor.name} onChange={(event) => setEditor((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" /></label>
            {editor.group !== 'vehicleTypes' && <label className="block text-xs font-medium text-slate-700">Description<input maxLength={100} value={editor.description} onChange={(event) => setEditor((current) => ({ ...current, description: event.target.value }))} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" /></label>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditor(null)} className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" className="rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">{editor.index < 0 ? 'Add' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
