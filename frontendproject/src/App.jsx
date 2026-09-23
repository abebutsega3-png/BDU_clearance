import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/navbar';
import Hero from './components/hero';
import Footer from './components/footer';
import Home from './page/home';
import Service from './page/Service';
import AboutUs from './page/about us';
import Login from './page/login';
import Instruction from './page/instraction';
import Contact from './page/contact';
import AdminDashboard from './page/admindashboared';
import HrDashboard from './page/hr office dashboared';
import DepartmentsHeader from './components/department/departmentlist';
import AddDepartment from './components/department/add';
import EditDepartment from './components/department/EditDepartment';
import ViewDepartment from './components/department/viewdepartment';
import EmployeeList from './components/employee/employeelist';
import AddEmployee from './components/employee/addemployee';
import EditEmployee from './components/employee/edit';
import ViewEmployee from './components/employee/viewemployee';
import ClearanceList from './components/clearance/clearancelist';
import AddClearance from './components/clearance/addclearance';
import ClearanceStepsList from './components/clearancestep/clearancesteplist';
import AddClearanceStep from './components/clearancestep/addclearancestep';
import UsersList from './components/User/adduser';
import AddUser from './components/User/userlist';
import ViewUser from './components/User/viewuser';
import AdminSidebar from './components/admindashboared/adminSadbar';
import AdminTopbar from './components/admindashboared/navbare';
import PrivateRoutes from "./until/privateRouetes";
import RoleBasedRoutes from "./until/RoleBasedRoutes";
import Permissions from './components/role and permision/permision';
import AddRole from './components/role and permision/addrole';
import EditRole from './components/role and permision/editrole';
import AuditLog from './components/audit/auditlog';
import HRFinalClearance from './components/finalhr/finalhrclearance';
import HRCertificateList from './components/finalhr/hrcertificatelist';
import CertificatePreview from './components/finalhr/CertificatePreview';
import NotificationsPage from './components/notification/notification';
import HRReport from './components/Reports/HRReport';
import SystemAdminReports from './components/SystemAdminReports/SystemAdminReports';
import SystemSettings from './components/SystemSettings/SystemSettings';
import PositionList from './components/position/Positionlist';
import AddPosition from './components/position/addposition';
import EditPosition from './components/position/Editposition';
import ViewPosition from './components/position/Viewposition';
import SystemAdminMyProfile from './components/admindashboared/systemadminmyprofile';
import HRmyprofile from './components/myprofile/HRmyprofile';
import HRSetting from './components/hrofficedashboared/HRSetting';
import EmployeeDashboard from './page/employeedashboared';
import EmployeeDocuments from './components/employeedashboared/employeedocuments';
import MyClearancePage from './components/employeedashboared/MyClearancePage';
import EmployeeSettings from './components/employeedashboared/employeesetting';
import DepartmentHeadDashboard from './page/departmentheaddashboared';
import LibraryDashboard from './page/Librarydashboared';
import ClearanceRequests from './components/departmentheaddashboared/ClearanceRequests';
import MyDepartment from './components/departmentheaddashboared/mydepartment';
import ClearanceHistory from './components/departmentheaddashboared/Clearance History';
import DepartmentSummaryReport from './components/departmentheaddashboared/departmentSummary Report';
import DepartmentProfile from './components/departmentheaddashboared/departmentprofile';
import DepartmentSettings from './components/departmentheaddashboared/departmentsetting';
import DepartmentAssets from './components/departmentheaddashboared/departmentassest';
import LibraryClearanceRequestsPage from './components/Library Management/LibraryClearanceRequestsPage';
import LibraryNotifications from './components/Library Management/LibraryNotifications';
import { LibraryReports } from './components/Library Management/LibraryActivityPages';
import LibraryReport from './components/Library Management/libraryreport';
import LibraryClearanceHistory from './components/Library Management/libraryClearance History';
import LibrarySettings from './components/Library Management/LibrarySettings';
import LibraryProfile from './components/Library Management/LibraryProfile';
import LibraryRecords from './components/ICT Officer/Library Records';
import PropertyLayout from './components/Property Officer/propertysidbar';
import PropertyDashboard from './page/propertydashboared';
import PropertyAssetRecordsPage from './components/Property Officer/PropertyAssetRecords';
import PropertyClearanceRequests from './components/Property Officer/PropertyClearanceRequests';
import Propertreport from './components/Property Officer/propertreport';
import PropertyClearanceHistory from './components/Property Officer/propertyclearancehistory';
import PropertyNotifications from './components/Property Officer/propertynotification';
import PropertySettings from './components/Property Officer/propertysetting';
import PropertyProfile from './components/Property Officer/propertyprofile';
import FinanceOfficerDashboard from './page/finance officerdashboared';
import FinanceClearanceRequestPage from './components/Finance Officer/FinanceClearancerequest';
import FinancialRecords from './components/Finance Officer/Financial Records';
import FinanceReportsPage from './components/Finance Officer/FinanceReportsPage';
import FinanceNotifications from './components/Finance Officer/FinanceNotifications';
import FinanceProfilePage from './components/Finance Officer/FinanceProfilePage';
import FinanceSettingsPage from './components/Finance Officer/FinanceSettingsPage';
import IctClearanceRequestsPage from './components/ICT Officer/IctClearanceRequestsPage';
import ICTClearanceHistoryPage from './components/ICT Officer/ICTClearanceHistoryPage';
import ICTAssetManager from './components/ICT Officer/ICTAssetManager';
import ICTDashboard from './page/ICT officerDashboared';
import ICTReports from './components/ICT Officer/ICTReports';
import ICTNotifications from './components/ICT Officer/ICTNotifications';
import ICTProfile from './components/ICT Officer/ICTProfile';
import ICTSettings from './components/ICT Officer/ICTSettings';
import DepartmentNotifications from './components/departmentheaddashboared/departmentnotification';
import EmployeeClearanceChatbot from './components/EmployeeClearanceChatbot';


function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />
      <div className="min-h-screen">
        <AdminTopbar />
        <div className="bg-gray-100">{children}</div>
      </div>
    </div>
  );
}

function MainLayout() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isHrRoute = location.pathname.startsWith('/hr-office');
  const isDepartmentHeadRoute = location.pathname.startsWith('/department-head');
  const isEmployeeRoute = location.pathname.startsWith('/employee');
  const isFinanceRoute = location.pathname.startsWith('/finance-office');
  const isLibraryRoute = location.pathname.startsWith('/library-office');
  const isPropertyRoute = location.pathname.startsWith('/property');
  const isICTRoute = location.pathname.startsWith('/ict-office');
	const assistantRoutePrefixes = ['/admin', '/hr-office', '/employee', '/department-head', '/finance-office', '/library-office', '/property', '/ict-office', '/other-office'];
	const showAssistant = location.pathname === '/contact' || assistantRoutePrefixes.some((prefix) => location.pathname.startsWith(prefix));
  const allowedPathsForFooter = ['/', '/home', '/services', '/about', '/instruction', '/contact'];
  const showFooter = allowedPathsForFooter.includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
	{!isAdminRoute && !isHrRoute && !isDepartmentHeadRoute && !isEmployeeRoute && !isFinanceRoute && !isLibraryRoute && !isPropertyRoute && !isICTRoute && <Navbar />}
      <div className="flex-grow">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/services" element={<Service />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/login" element={<Login />} />
          <Route path="/instruction" element={<Instruction />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/unauthorized" element={<div className="p-8 text-center">You are not authorized to view this page.</div>} />
          
          {/* የተጠበቀው የአድሚን ራውት (Protected & Role-Based Admin Route) */}
          <Route 
            path="/admin" 
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["admin"]}>
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </RoleBasedRoutes>
              </PrivateRoutes>
            } 
          />
          <Route
            path="/hr-office"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["HR Officer"]}>
                  <HrDashboard />
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/employee-dashboard"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["employee", "standard user", "user"]}>
                  <EmployeeDashboard />
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/department-head"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["Department Head", "departmenthead"]}>
                  <DepartmentHeadDashboard />
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/finance-office"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["Finance Officer", "finance officer", "finance office", "finance"]}>
                  <FinanceOfficerDashboard />
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/finance-office/requests"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["Finance Officer", "finance officer", "finance office", "finance"]}>
                  <FinanceOfficerDashboard>
                    <FinanceClearanceRequestPage />
                  </FinanceOfficerDashboard>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/finance-office/reports"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["Finance Officer", "finance officer", "finance office", "finance"]}>
                  <FinanceOfficerDashboard>
                    <FinanceReportsPage />
                  </FinanceOfficerDashboard>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
					<Route
						path="/finance-office/records"
						element={
							<PrivateRoutes>
								<RoleBasedRoutes requiredRole={["Finance Officer", "finance officer", "finance office", "finance"]}>
									<FinanceOfficerDashboard>
										<FinancialRecords />
									</FinanceOfficerDashboard>
								</RoleBasedRoutes>
							</PrivateRoutes>
						}
					/>
          <Route
            path="/finance-office/notifications"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["Finance Officer", "finance officer", "finance office", "finance"]}>
                  <FinanceOfficerDashboard>
                    <FinanceNotifications />
                  </FinanceOfficerDashboard>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/finance-office/profile"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["Finance Officer", "finance officer", "finance office", "finance"]}>
                  <FinanceOfficerDashboard>
                    <FinanceProfilePage />
                  </FinanceOfficerDashboard>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/finance-office/settings"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["Finance Officer", "finance officer", "finance office", "finance"]}>
                  <FinanceOfficerDashboard>
                    <FinanceSettingsPage />
                  </FinanceOfficerDashboard>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/ict-office"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["ICT Officer", "ict officer", "ict office", "ict"]}>
                  <ICTDashboard />
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/ict-office/requests"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["ICT Officer", "ict officer", "ict office", "ict"]}>
                  <ICTDashboard>
                    <IctClearanceRequestsPage />
                  </ICTDashboard>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/ict-office/assets"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["ICT Officer", "ict officer", "ict office", "ict"]}>
                  <ICTDashboard>
                    <ICTAssetManager />
                  </ICTDashboard>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/ict-office/ictassestrecored"
            element={<Navigate to="/ict-office/assets" replace />}
          />
          <Route
            path="/ict-office/history"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["ICT Officer", "ict officer", "ict office", "ict"]}>
                  <ICTDashboard>
                    <ICTClearanceHistoryPage />
                  </ICTDashboard>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/ict-office/reports"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["ICT Officer", "ict officer", "ict office", "ict"]}>
                  <ICTDashboard>
                    <ICTReports />
                  </ICTDashboard>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/ict-office/notifications"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["ICT Officer", "ict officer", "ict office", "ict"]}>
                  <ICTDashboard>
                    <ICTNotifications />
                  </ICTDashboard>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/ict-office/profile"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["ICT Officer", "ict officer", "ict office", "ict"]}>
                  <ICTDashboard>
                    <ICTProfile />
                  </ICTDashboard>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/ict-office/settings"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["ICT Officer", "ict officer", "ict office", "ict"]}>
                  <ICTDashboard>
                    <ICTSettings />
                  </ICTDashboard>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/library-office"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["Library Officer", "library officer"]}>
                  <LibraryDashboard />
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/property"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["Property Officer", "property officer"]}>
                  <PropertyLayout />
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<PropertyDashboard />} />
            <Route path="clearance-requests" element={<PropertyClearanceRequests />} />
            <Route path="reports" element={<Propertreport />} />
            <Route path="asset-records" element={<PropertyAssetRecordsPage />} />
            <Route path="clearance-history" element={<PropertyClearanceHistory />} />
            <Route path="notifications" element={<PropertyNotifications />} />
            <Route path="settings" element={<PropertySettings />} />
            <Route path="profile" element={<PropertyProfile />} />
          </Route>
          <Route path="/library-office/clearance-requests" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["Library Officer", "library officer"]}><LibraryDashboard><LibraryClearanceRequestsPage /></LibraryDashboard></RoleBasedRoutes></PrivateRoutes>} />
		  <Route path="/library-office/library-records" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["Library Officer", "library officer"]}><LibraryDashboard><LibraryRecords /></LibraryDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/library-office/clearance-history" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["Library Officer", "library officer"]}><LibraryDashboard><LibraryClearanceHistory /></LibraryDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/library-office/reports" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["Library Officer", "library officer"]}><LibraryDashboard><LibraryReport /></LibraryDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/library-office/notifications" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["Library Officer", "library officer"]}><LibraryDashboard><LibraryNotifications /></LibraryDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/library-office/profile" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["Library Officer", "library officer"]}><LibraryDashboard><LibraryProfile /></LibraryDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/library-office/settings" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["Library Officer", "library officer"]}><LibraryDashboard><LibrarySettings /></LibraryDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route
            path="/department-head/clearance-requests"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["Department Head", "departmenthead"]}>
                  <DepartmentHeadDashboard>
                    <ClearanceRequests />
                  </DepartmentHeadDashboard>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route path="/department-head/my-department" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["Department Head", "departmenthead"]}><DepartmentHeadDashboard><MyDepartment /></DepartmentHeadDashboard></RoleBasedRoutes></PrivateRoutes>} />
		  <Route path="/department-head/department-assets" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["Department Head", "departmenthead"]}><DepartmentHeadDashboard><DepartmentAssets /></DepartmentHeadDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/department-head/clearance-history" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["Department Head", "departmenthead"]}><DepartmentHeadDashboard><ClearanceHistory /></DepartmentHeadDashboard></RoleBasedRoutes></PrivateRoutes>} />
		  <Route path="/department-head/notifications" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["Department Head", "departmenthead"]}><DepartmentHeadDashboard><DepartmentNotifications /></DepartmentHeadDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/department-head/reports" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["Department Head", "departmenthead"]}><DepartmentHeadDashboard><DepartmentSummaryReport /></DepartmentHeadDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/department-head/profile" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["Department Head", "departmenthead"]}><DepartmentHeadDashboard><DepartmentProfile /></DepartmentHeadDashboard></RoleBasedRoutes></PrivateRoutes>} />
		  <Route path="/department-head/settings" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["Department Head", "departmenthead"]}><DepartmentHeadDashboard><DepartmentSettings /></DepartmentHeadDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/employee/my-clearance" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["employee", "standard user", "user"]}><MyClearancePage /></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/employee/my clearance" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["employee", "standard user", "user"]}><MyClearancePage /></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/employee/My Clearance" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["employee", "standard user", "user"]}><MyClearancePage /></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/employee/notifications" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["employee", "standard user", "user"]}><NotificationsPage /></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/employee/profile" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["employee", "standard user", "user"]}><HRmyprofile /></RoleBasedRoutes></PrivateRoutes>} />
		  <Route path="/employee/settings" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["employee", "standard user", "user"]}><EmployeeSettings /></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/employee/documents" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["employee", "standard user", "user"]}><EmployeeDocuments /></RoleBasedRoutes></PrivateRoutes>} />
		  <Route path="/employee/Documents" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["employee", "standard user", "user"]}><EmployeeDocuments /></RoleBasedRoutes></PrivateRoutes>} />
		  <Route path="/employee/my-certificates" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["employee", "standard user", "user"]}><EmployeeDocuments /></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/hr-office/reports" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["HR Officer"]}><HrDashboard><HRReport /></HrDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/hr-office/profile" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["HR Officer"]}><HrDashboard><HRmyprofile /></HrDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/hr-office/employees" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["HR Officer"]}><HrDashboard><EmployeeList /></HrDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/hr-office/add-employee" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["HR Officer"]}><HrDashboard><AddEmployee /></HrDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/hr-office/edit-employee/:id" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["HR Officer"]}><HrDashboard><EditEmployee /></HrDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/hr-office/view-employee/:id" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["HR Officer"]}><HrDashboard><ViewEmployee /></HrDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/hr-office/clearance-requests" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["HR Officer"]}><HrDashboard><ClearanceList /></HrDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/hr-office/add-clearance" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["HR Officer"]}><HrDashboard><AddClearance /></HrDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/hr-office/final-hr-clearance" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["HR Officer"]}><HrDashboard><HRFinalClearance /></HrDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/hr-office/final-hr-clearance/:id" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["HR Officer"]}><HrDashboard><HRFinalClearance /></HrDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/hr-office/certificates" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["HR Officer"]}><HrDashboard><HRCertificateList /></HrDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/hr-office/certificate-preview" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["HR Officer"]}><HrDashboard><CertificatePreview /></HrDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/hr-office/notifications" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["HR Officer"]}><HrDashboard><NotificationsPage /></HrDashboard></RoleBasedRoutes></PrivateRoutes>} />
		  <Route path="/hr-office/settings" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["HR Officer"]}><HrDashboard><HRSetting /></HrDashboard></RoleBasedRoutes></PrivateRoutes>} />
          <Route 
            path="/admin/departments" 
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["admin"]}>
                  <AdminLayout>
                    <DepartmentsHeader />
                  </AdminLayout>
                </RoleBasedRoutes>
              </PrivateRoutes>
            } 
          />
          <Route path="/admin/positions" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["admin"]}><AdminLayout><PositionList /></AdminLayout></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/admin/add-position" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["admin"]}><AdminLayout><AddPosition /></AdminLayout></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/admin/edit-position/:id" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["admin"]}><AdminLayout><EditPosition /></AdminLayout></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/admin/view-position/:id" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["admin"]}><AdminLayout><ViewPosition /></AdminLayout></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/admin/roles-permissions" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["admin"]}><AdminLayout><Permissions /></AdminLayout></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/admin/roles-permissions/add" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["admin"]}><AdminLayout><AddRole /></AdminLayout></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/admin/roles-permissions/edit/:id" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["admin"]}><AdminLayout><EditRole /></AdminLayout></RoleBasedRoutes></PrivateRoutes>} />
          <Route
            path="/admin/employees"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["admin"]}>
                  <AdminLayout>
                    <EmployeeList />
                  </AdminLayout>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route path="/admin/add-clearance" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["admin"]}><AdminLayout><AddClearance /></AdminLayout></RoleBasedRoutes></PrivateRoutes>} />
          <Route
            path="/admin/clearance-steps"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["admin"]}>
                  <AdminLayout>
                    <ClearanceStepsList />
                  </AdminLayout>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/admin/add-clearance-step"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["admin"]}>
                  <AdminLayout>
                    <AddClearanceStep />
                  </AdminLayout>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
         
          <Route
            path="/admin/users"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["admin"]}>
                  <AdminLayout>
                    <UsersList />
                  </AdminLayout>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route path="/admin/audit-logs" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["admin"]}><AdminLayout><AuditLog /></AdminLayout></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/admin/profile" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["admin"]}><AdminLayout><SystemAdminMyProfile /></AdminLayout></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/admin/reports" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["admin"]}><AdminLayout><SystemAdminReports /></AdminLayout></RoleBasedRoutes></PrivateRoutes>} />
          <Route path="/admin/system-settings" element={<PrivateRoutes><RoleBasedRoutes requiredRole={["admin"]}><AdminLayout><SystemSettings /></AdminLayout></RoleBasedRoutes></PrivateRoutes>} />
          <Route
            path="/admin/add-user"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["admin"]}>
                  <AdminLayout>
                    <AddUser />
                  </AdminLayout>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/admin/view-user/:id"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["admin"]}>
                  <AdminLayout>
                    <ViewUser />
                  </AdminLayout>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/admin/add-employee"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["admin"]}>
                  <AdminLayout>
                    <AddEmployee />
                  </AdminLayout>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/admin/edit-employee/:id"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["admin"]}>
                  <AdminLayout>
                    <EditEmployee />
                  </AdminLayout>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/admin/view-employee/:id"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["admin"]}>
                  <AdminLayout>
                    <ViewEmployee />
                  </AdminLayout>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route 
            path="/admin/add-department" 
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["admin"]}>
                  <AdminLayout>
                    <AddDepartment />
                  </AdminLayout>
                </RoleBasedRoutes>
              </PrivateRoutes>
            } 
          />
          <Route
            path="/admin/edit-department/:id"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["admin"]}>
                  <AdminLayout>
                    <EditDepartment />
                  </AdminLayout>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
          <Route
            path="/admin/view-department/:id"
            element={
              <PrivateRoutes>
                <RoleBasedRoutes requiredRole={["admin"]}>
                  <AdminLayout>
                    <ViewDepartment />
                  </AdminLayout>
                </RoleBasedRoutes>
              </PrivateRoutes>
            }
          />
        </Routes>
				{showAssistant && <EmployeeClearanceChatbot />}
      </div>

	{!isAdminRoute && !isFinanceRoute && !isLibraryRoute && !isPropertyRoute && showFooter && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout />
    </BrowserRouter>
  );
}