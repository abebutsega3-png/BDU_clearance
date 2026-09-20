import React from 'react';
import DepartmentSidebar from '../components/departmentheaddashboared/departmentsidbar';
import DepartmentNavbar from '../components/departmentheaddashboared/departmentnavbar';
import DepartmentSummary from '../components/departmentheaddashboared/departmentsummary';


const departmentheaddashboared = ({ children }) => {
  return (
    <div className='bg-gray-100 min-h-screen'>
      <DepartmentSidebar />
      <div className="ml-72 min-h-screen">
        <DepartmentNavbar />
        <main className="p-5">
          {children || <DepartmentSummary />}
        </main>
      </div>
    </div>
  );
};

export default departmentheaddashboared;