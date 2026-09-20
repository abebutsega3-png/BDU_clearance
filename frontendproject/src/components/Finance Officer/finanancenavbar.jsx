import { Menu } from 'lucide-react';
import { useAuth } from '../../context/authContext';

const EmployeeNavbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const employeeName = user?.name || user?.fullName || 'Employee';

  return (
    <header className="flex h-20 items-center justify-between bg-teal-600 px-5 text-white shadow-sm lg:ml-72 lg:px-8">
      <div className="flex items-center gap-3">
        <button type="button" className="text-teal-100 hover:text-white lg:hidden" aria-label="Open menu" onClick={onMenuClick}>
          <Menu size={21} />
        </button>
        <span className="text-xl font-normal tracking-tight sm:text-2xl">Welcome {employeeName}</span>
      </div>
      <button type="button" onClick={logout} className="rounded-md bg-teal-700 px-5 py-2 text-lg font-normal transition hover:bg-teal-800">
        Logout
      </button>
    </header>
  );
};

export default EmployeeNavbar;