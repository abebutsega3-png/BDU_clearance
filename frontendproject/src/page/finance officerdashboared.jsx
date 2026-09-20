import React from 'react';
import FinanceOfficerNavbar from '../components/Finance Officer/finanancenavbar';
import FinanceOfficerSidebar from '../components/Finance Officer/financesidbare';
import FinanceSummaryDashboard from '../components/Finance Officer/FinanceSummaryDashboard';

const FinanceOfficerDashboard = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-100">
      <FinanceOfficerSidebar />
      <div className="ml-72 min-h-screen">
        <FinanceOfficerNavbar />
        <main className="p-4 sm:p-5 lg:p-6">{children || <FinanceSummaryDashboard />}</main>
      </div>
    </div>
  );
};

export default FinanceOfficerDashboard;