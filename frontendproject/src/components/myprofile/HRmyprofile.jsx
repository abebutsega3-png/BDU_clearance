import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { changeMyPassword, fetchMyProfile, updateMyProfile } from '../../until/MyprofileHelper';
import EmployeeNavbar from '../employeedashboared/employeenavbar';
import EmployeeSidebar from '../employeedashboared/employeesidbar';
import { 
  User, Briefcase, ShieldCheck, Lock, Clock, Edit, 
  Upload, Bell, ChevronRight, CheckCircle2 
} from 'lucide-react';

export default function UserProfile() {
  const { user, login } = useAuth();
  const { pathname } = useLocation();
  const isEmployeeProfile = pathname === '/employee/profile';
  const [activeTab, setActiveTab] = useState('personal');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoSaving, setPhotoSaving] = useState(false);

  const defaultProfile = {
    fullName: "Meseret Alemu",
    employeeId: "BDU-HR-0007",
    gender: "Female",
    dateOfBirth: "April 16, 1992",
    phoneNumber: "+251 91 234 5678",
    email: "hr.officer@bdu.edu.et",
    department: "Human Resources",
    position: "HR Officer",
    jobGrade: "Grade 8",
    employmentType: "Full Time",
    hireDate: "January 15, 2021",
    campus: "Main Campus",
    sectionTeam: "HR Operations",
    employeeStatus: "Active",
    workEmail: "hr.officer@bdu.edu.et",
    officeLocation: "HR Office, Room 203",
    aboutMe: "Dedicated HR professional with strong experience in employee relations, HR operations, and organizational development. Committed to supporting the university's mission by fostering a positive and productive work environment.",
    role: "HR Officer",
    accountStatus: "Active",
    lastLogin: "May 24, 2024 10:30 AM",
    accountCreated: "January 15, 2021"
  };
  const [userData, setUserData] = useState(defaultProfile);

  useEffect(() => {
    if (!user?._id) return;
    fetchMyProfile(user._id).then((profile) => {
      setUserData((current) => ({ ...current, ...profile, fullName: profile.name || profile.fullName || current.fullName, email: profile.email || current.email, role: profile.role || current.role }));
      setPhotoPreview(profile.profileImage || profile.avatar || '');
    }).catch(() => setMessage('Unable to load profile data.'));
  }, [user?._id]);

  const updateField = (field, value) => setUserData((current) => ({ ...current, [field]: value }));
  const saveProfile = async () => {
    if (!user?._id) return;
    setSaving(true);
    try {
      const response = await updateMyProfile(user._id, { name: userData.fullName, email: userData.email, department: userData.department });
      const updated = response.data || response;
      setUserData((current) => ({ ...current, ...updated, fullName: updated.name || updated.fullName || current.fullName }));
      login({ ...user, ...updated, name: updated.name || userData.fullName });
      setEditing(false);
      setMessage('Profile updated successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      setMessage('Please choose a JPG, PNG, or GIF image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage('The profile image must be smaller than 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const image = String(reader.result);
      setPhotoPreview(image);
      setPhotoSaving(true);
      setMessage('');
      try {
        const response = await updateMyProfile(user._id, { profileImage: image });
        const updated = response.data || response;
        setUserData((current) => ({ ...current, ...updated }));
        login({ ...user, ...updated, profileImage: image });
        setMessage('Profile photo updated successfully.');
      } catch (error) {
        setMessage(error.response?.data?.message || 'Unable to update profile photo.');
      } finally {
        setPhotoSaving(false);
      }
    };
    reader.onerror = () => setMessage('Unable to read the selected image.');
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 text-xs font-sans pb-10">
      {isEmployeeProfile && <>
        <div className="hidden lg:block"><EmployeeSidebar /></div>
        {menuOpen && <><button type="button" aria-label="Close menu" className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={() => setMenuOpen(false)} /><div className="relative z-50 lg:hidden"><EmployeeSidebar onNavigate={() => setMenuOpen(false)} /></div></>}
        <EmployeeNavbar onMenuClick={() => setMenuOpen(true)} />
      </>}
      
      {/* HEADER */}
      {!isEmployeeProfile && <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-800">My Profile</h1>
          <p className="text-[10px] text-slate-400">Home &gt; My Profile</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative cursor-pointer">
            <Bell size={18} className="text-slate-600" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">8</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-[10px]">HR</div>
            <div>
              <p className="font-semibold text-xs leading-none">HR Officer</p>
              <p className="text-[10px] text-slate-400">hr.officer@bdu.edu.et</p>
            </div>
          </div>
        </div>
      </header>}

      {/* NAVIGATION TABS */}
      <div className="bg-white border-b border-slate-200 px-6 flex space-x-8 text-slate-600">
        <TabButton icon={<User size={14} />} label="Personal Information" active={activeTab === 'personal'} onClick={() => setActiveTab('personal')} />
        <TabButton icon={<Briefcase size={14} />} label="Employment Information" active={activeTab === 'employment'} onClick={() => setActiveTab('employment')} />
        <TabButton icon={<ShieldCheck size={14} />} label="Account Information" active={activeTab === 'account'} onClick={() => setActiveTab('account')} />
        <TabButton icon={<Lock size={14} />} label="Change Password" active={activeTab === 'password'} onClick={() => setActiveTab('password')} />
        <TabButton icon={<Clock size={14} />} label="Activity" active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} />
      </div>

      {activeTab === 'account' && <div className="mx-6 mt-5 rounded-lg border border-slate-200 bg-white p-5 text-[11px] shadow-sm"><h2 className="mb-3 font-bold text-slate-800">Account Information</h2><div className="grid grid-cols-2 gap-3"><InfoRow label="Username" value={userData.email} /><InfoRow label="Role" value={userData.role} /><InfoRow label="Status" value={userData.accountStatus} /><InfoRow label="Account Created" value={userData.accountCreated} /></div></div>}
      {activeTab === 'password' && <PasswordPanel />}
      {activeTab === 'activity' && <div className="mx-6 mt-5 rounded-lg border border-slate-200 bg-white p-5 text-[11px] shadow-sm"><h2 className="mb-3 font-bold text-slate-800">Activity History</h2><p className="text-slate-600">Recent profile and account activity is shown in the Recent Activity panel.</p></div>}

      {/* MAIN CONTENT */}
      <div className={`grid grid-cols-12 gap-6 p-6 ${isEmployeeProfile ? 'lg:ml-72' : ''}`}>
        
        {/* LEFT COLUMN (Details) */}
        <div className="col-span-8 space-y-6">
          
          {/* Personal Information Card */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                <User size={14} className="text-blue-600" /> Personal Information
              </h2>
              {editing ? <div className="flex gap-2"><button type="button" onClick={saveProfile} disabled={saving} className="bg-blue-600 text-white px-3 py-1 rounded font-medium text-[10px] disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button><button type="button" onClick={() => setEditing(false)} className="border border-slate-300 text-slate-600 px-3 py-1 rounded font-medium text-[10px]">Cancel</button></div> : <button type="button" onClick={() => setEditing(true)} className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded flex items-center gap-1 font-medium text-[10px]"><Edit size={10} /> Edit</button>}
            </div>

            <div className="flex gap-6 items-start">
              {/* Profile Image */}
              <div className="flex flex-col items-center space-y-2">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-200">
                  <img src={photoPreview || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <label className={`border border-slate-300 text-slate-600 hover:bg-slate-50 px-2.5 py-1 rounded flex items-center gap-1 text-[10px] cursor-pointer ${photoSaving ? 'pointer-events-none opacity-60' : ''}`}>
                  <Upload size={10} /> {photoSaving ? 'Uploading...' : 'Change Photo'}
                  <input type="file" accept="image/jpeg,image/png,image/gif" onChange={handlePhotoChange} className="sr-only" disabled={photoSaving} />
                </label>
                <p className="text-[9px] text-slate-400">JPG, PNG or GIF. Max size 2MB</p>
              </div>

              {/* Grid Info */}
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 flex-1 text-[11px] pt-2">
                <ProfileField label="Full Name" value={userData.fullName} editing={editing} onChange={(value) => updateField('fullName', value)} />
                  <InfoRow label="Employee ID" value={userData.employeeId} />
                  <InfoRow label="Gender" value={userData.gender} />
                  <InfoRow label="Date of Birth" value={userData.dateOfBirth} />
                  <ProfileField label="Phone Number" value={userData.phoneNumber} editing={editing} onChange={(value) => updateField('phoneNumber', value)} />
                  <ProfileField label="Email Address" value={userData.email} editing={editing} onChange={(value) => updateField('email', value)} />
              </div>
            </div>
          </div>

          {/* Employment Information Card */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                <Briefcase size={14} className="text-blue-600" /> Employment Information
              </h2>
              <button type="button" onClick={() => setEditing(true)} className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded flex items-center gap-1 font-medium text-[10px]"><Edit size={10} /> Edit</button>
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-[11px]">
              <ProfileField label="Department" value={userData.department} editing={editing} onChange={(value) => updateField('department', value)} />
              <ProfileField label="Campus" value={userData.campus} editing={editing} onChange={(value) => updateField('campus', value)} />
              <ProfileField label="Position" value={userData.position} editing={editing} onChange={(value) => updateField('position', value)} />
              <InfoRow label="Job Grade" value={userData.jobGrade} />
                <InfoRow label="Employee Status" value={
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-medium">Active</span>
              } />
              <InfoRow label="Employment Type" value={userData.employmentType} />
              <ProfileField label="Work Email" value={userData.workEmail} editing={editing} onChange={(value) => updateField('workEmail', value)} />
              <InfoRow label="Hire Date" value={userData.hireDate} />
              <ProfileField label="Office Location" value={userData.officeLocation} editing={editing} onChange={(value) => updateField('officeLocation', value)} />
            </div>
          </div>

          {/* About Me Card */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-3">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                <User size={14} className="text-blue-600" /> About Me
              </h2>
            </div>
            {editing ? <textarea value={userData.aboutMe} onChange={(event) => updateField('aboutMe', event.target.value)} className="w-full min-h-24 rounded border border-slate-300 p-2 text-[11px] text-slate-700 outline-none focus:border-blue-500" /> : <p className="text-slate-600 text-[11px] leading-relaxed">{userData.aboutMe}</p>}
          </div>

        </div>

        {/* RIGHT COLUMN (Sidebar Stats) */}
        <div className="col-span-4 space-y-6">
          
          {/* Profile Summary Card */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm text-center">
            <h3 className="font-bold text-slate-700 text-xs text-left mb-4">Profile Summary</h3>
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center font-bold mb-2">
              <User size={32} />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">{userData.fullName}</h4>
            <p className="text-slate-500 text-[11px] mb-3">{userData.position}</p>
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
            </span>
          </div>

          {/* Account Information Card */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2 border-b border-slate-100 pb-2">
              <ShieldCheck size={14} className="text-blue-600" /> Account Information
            </h3>
            <div className="space-y-2 text-[11px]">
              <SidebarRow label="Username" value={userData.email} />
              <SidebarRow label="Role" value={<span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium text-[10px]">HR Officer</span>} />
              <SidebarRow label="Account Status" value={<span className="text-emerald-600 font-medium">Active</span>} />
              <SidebarRow label="Last Login" value={userData.lastLogin} />
              <SidebarRow label="Account Created" value={userData.accountCreated} />
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2 border-b border-slate-100 pb-2">
              <Clock size={14} className="text-blue-600" /> Recent Activity
            </h3>
            
            <div className="space-y-3 text-[10px] pl-2 border-l-2 border-blue-500">
              <div>
                <p className="font-semibold text-slate-700">Profile updated</p>
                <p className="text-slate-400">May 20, 2024 02:15 PM</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Password changed</p>
                <p className="text-slate-400">April 10, 2024 11:20 AM</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Logged in</p>
                <p className="text-slate-400">May 24, 2024 10:30 AM</p>
              </div>
            </div>

            <button className="w-full border border-slate-300 text-slate-600 hover:bg-slate-50 py-1.5 rounded font-medium text-[10px]">
              View All Activity
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

function TabButton({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`py-3 flex items-center gap-2 border-b-2 font-medium transition-colors ${
        active 
          ? 'border-blue-600 text-blue-600' 
          : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex">
      <span className="w-32 text-slate-400 shrink-0">{label}</span>
      <span className="text-slate-400 mr-2">:</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

function SidebarRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

function ProfileField({ label, value, editing, onChange }) {
  return (
    <div className="flex items-center">
      <span className="w-32 text-slate-400 shrink-0">{label}</span>
      <span className="text-slate-400 mr-2">:</span>
      {editing ? <input value={value || ''} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 font-medium text-slate-800 outline-none focus:border-blue-500" /> : <span className="font-medium text-slate-800">{value || '-'}</span>}
    </div>
  );
}

function PasswordPanel() {
  const { user } = useAuth();
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (values.newPassword !== values.confirmPassword) return setMessage('New passwords do not match.');
    setSaving(true);
    try {
      const result = await changeMyPassword(user?._id, { currentPassword: values.currentPassword, newPassword: values.newPassword });
      setMessage(result.message || 'Password changed successfully.');
      setValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to change password.');
    } finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="mx-6 mt-5 max-w-xl rounded-lg border border-slate-200 bg-white p-5 text-[11px] shadow-sm"><h2 className="mb-4 font-bold text-slate-800">Change Password</h2><div className="space-y-3">{[['currentPassword', 'Current Password'], ['newPassword', 'New Password'], ['confirmPassword', 'Confirm New Password']].map(([name, label]) => <label key={name} className="block"><span className="mb-1 block text-slate-500">{label}</span><input required minLength={name === 'currentPassword' ? undefined : 6} type="password" value={values[name]} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))} className="w-full rounded border border-slate-300 px-2 py-1.5 outline-none focus:border-blue-500" /></label>)}</div><button type="submit" disabled={saving || !user?._id} className="mt-4 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Changing...' : 'Change Password'}</button>{message && <p className="mt-2 text-slate-600">{message}</p>}</form>;
}