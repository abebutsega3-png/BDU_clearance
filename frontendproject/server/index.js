import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectToDB from './db/db.js';

// Authentication & Core Routers
import authRouter from './routes/auth.js';
import userRouter from './routes/user.js';
import profileRouter from './routes/profile.js';
import roleRouter from './routes/role.js';
import employeeRouter from './routes/employee.js';
import departmentRouter from './routes/department.js';
import positionRouter from './routes/position.js';
import adminDashboardRouter from './routes/adminDashboardRoutes.js';
import settingsRouter from './routes/settingsRoutes.js';
import auditLogRouter from './routes/auditlog.js';
import notificationRouter from './routes/notification.js';
import reportRouter from './routes/reportRoutes.js';

// Clearance Routers
import clearanceRouter from './routes/clearance.js';
import clearanceStepRouter from './routes/clearanceStep.js';
import hrFinalClearanceRouter from './routes/hrfinalclearance.js';
import departmentClearanceRouter from './routes/departmentclearanceRoutes.js';

// ICT Routers
import ictClearanceRouter from './routes/ictClearanceRoutes.js';
import ictClearanceHistoryRouter from './routes/ictClearanceHistoryRoutes.js';
import ictReportRouter from './routes/ictReportRoutes.js';
import ictassetRouter from './routes/ICTAssetRoutes.js';
import ictProfileRouter from './routes/ICTprofileRoutes.js';
import ictSettingsRouter from './routes/ICTSettingsRoutes.js';

// Library Routers
import libraryNotificationRouter from './routes/librarynotificationRoutes.js';
import librarySettingsRouter from './routes/librarysettingsRoutes.js';
import libraryReportRouter from './routes/libraryReportRoutes.js';
import libraryRecordsRouter from './routes/libraryRecordsRoutes.js';

// Property Routers
import assetRouter from './routes/propertyasset.js';
import propertyDashboardRouter from './routes/propertyDashboardRoutes.js';
import propertyReportRouter from './routes/propertyreport.js';
import propertyClearanceRequestRouter from './routes/propertyclearanceRequestRoutes.js';
import propertyClearanceHistoryRouter from './routes/propertyclearancehistory.js';
import propertyProfileRouter from './routes/propertyprofile.js';
import propertySettingsRouter from './routes/propertysetting.js';

// Finance Routers
import financeDashboardRouter from './routes/finanacedashboaredrouter.js'; 
import financeClearanceRequestRouter from './routes/financeclearanceRequestRoutes.js';
import financeReportRouter from './routes/financeReportRoutes.js';
import financeProfileRouter from './routes/financeProfileRoutes.js';
import financeNotificationRouter from './routes/financenotificationRoutes.js';
import financeSettingsRouter from './routes/financeSettingsRoutes.js';
import departmentSettingsRouter from './routes/departmentSettingsRoutes.js';
import aiRouter from './routes/aiRoutes.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// 1. Core & Admin Routes
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/profile', profileRouter);
app.use('/api/roles', roleRouter);
app.use('/api/employee', employeeRouter);
app.use('/api/department', departmentRouter);
app.use('/api/departments', departmentRouter);
app.use('/api/positions', positionRouter);
app.use('/api/admin', adminDashboardRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/audit-logs', auditLogRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/department-head/settings', departmentSettingsRouter);
app.use('/api/reports', reportRouter);
app.use('/api/ai', aiRouter);

// 2. Clearance Routes
app.use('/api/clearance', clearanceRouter);
app.use('/api/clearance-steps', clearanceStepRouter);
app.use('/api/hr-final-clearance', hrFinalClearanceRouter);
app.use('/api/clearance-requests', departmentClearanceRouter);

// 3. ICT Routes
app.use('/api/ict-assets', ictassetRouter);
app.use('/api/ict', ictClearanceRouter);
app.use('/api/ict', ictReportRouter);
app.use('/api/ict/profile', ictProfileRouter);
app.use('/api/ict/settings', ictSettingsRouter);
app.use('/api/ict-clearance-history', ictClearanceHistoryRouter);

// 4. Library Routes
app.use('/api/library-notifications', libraryNotificationRouter);
app.use('/api/library-settings', librarySettingsRouter);
app.use('/api/library/reports', libraryReportRouter);
app.use('/api/library/records', libraryRecordsRouter);

// 5. Property Module Routes
app.use('/api/property_assets', assetRouter);
app.use('/api/property/dashboard', propertyDashboardRouter);
app.use('/api/property/reports', propertyReportRouter);
app.use('/api/property/clearance-requests', propertyClearanceRequestRouter);
app.use('/api/property/clearance-history', propertyClearanceHistoryRouter);
app.use('/api/property/profile', propertyProfileRouter);
app.use('/api/property/settings', propertySettingsRouter);

// 6. Finance Module Routes
app.use('/api/finance/dashboard', financeDashboardRouter);
app.use('/api/finance/clearance-requests', financeClearanceRequestRouter);
app.use('/api/finance/reports', financeReportRouter);
app.use('/api/finance/profile', financeProfileRouter);
app.use('/api/finance/settings', financeSettingsRouter);
app.use('/api/finance/notifications', financeNotificationRouter);

// 7. Global 404 Route Catch-all
app.use((req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
});

// 8. Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Server Setup
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    const dbConnected = await connectToDB();

    if (!dbConnected) {
      console.error('MongoDB is unavailable. Server will not start until the database is reachable.');
      process.exitCode = 1;
      return;
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
  }
}

startServer();