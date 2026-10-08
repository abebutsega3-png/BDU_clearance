import React from 'react';
import DepartmentSidebar from '../components/departmentheaddashboared/departmentsidbar';
import DepartmentNavbar from '../components/departmentheaddashboared/departmentnavbar';
import DepartmentSummary from '../components/departmentheaddashboared/departmentsummary';
import { DepartmentLanguageProvider } from '../components/departmentheaddashboared/DepartmentLanguage';


const departmentheaddashboared = ({ children }) => {
  return (
    <DepartmentLanguageProvider>
      <div className='bg-gray-100 min-h-screen'>
        <DepartmentSidebar />
        <div className="ml-72 min-h-screen">
          <DepartmentNavbar />
          <main className="p-5">
            {children || <DepartmentSummary />}
          </main>
        </div>
      </div>
    </DepartmentLanguageProvider>
  );
};

export default departmentheaddashboared;