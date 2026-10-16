
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import connectToDB from './db/db.js';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';

dotenv.config({
  path: fileURLToPath(new URL('./.env', import.meta.url)),
});

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
import hrSettingsRouter from './routes/hrSettingsRoutes.js';
import auditLogRouter from './routes/auditlog.js';
import notificationRouter from './routes/notification.js';
import reportRouter from './routes/reportRoutes.js';
import publicHomeRouter from './routes/publicHomeRoutes.js';
import hrContactMessagesRouter from './routes/hrContactMessages.js';
import adminContactMessagesRouter from './routes/adminContactMessages.js';

// Clearance Routers
import clearanceRouter from './routes/clearance.js';
import clearanceStepRouter from './routes/clearanceStep.js';
import hrAssessmentRouter from './routes/hrAssessmentRoutes.js';
import hrSeparationTypeRouter from './routes/HRseparationTypeRoutes.js';
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
import transportDashboardRouter from './routes/transportDashboardRoutes.js';
import registrarRouter from './routes/registrarRoutes.js';
import academicRecordRouter from './routes/registeracademicRecordRoutes.js';
import clearanceOfficeRouter from './routes/clearanceOfficeRoutes.js';

const app = express();
const httpServer = createServer(app);

// Middleware: CORS
const configuredFrontendOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowFrontendOrigin = (origin, callback) => {
  // Allow requests without an Origin header (e.g. health checks).
  if (!origin || configuredFrontendOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  // In development, allow local frontend origins.
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { hostname, protocol } = new URL(origin);
      const isLocalFrontend =
        protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(hostname);

      callback(null, isLocalFrontend);
      return;
    } catch {
      callback(null, false);
      return;
    }
  }

  callback(null, false);
};

app.use(
  cors({
    origin: allowFrontendOrigin,
    credentials: true,
  }),
);

const io = new Server(httpServer, {
  cors: {
    origin: allowFrontendOrigin,
    credentials: true,
  },
});

// Socket.IO authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (typeof token !== 'string' || !token) {
      return next(new Error('Authentication required.'));
    }

    const decoded = jwt.verify(token, process.env.JWT_KEY);

    if (decoded.tokenUse === 'refresh') {
      return next(new Error('Invalid access token.'));
    }

    const user = await User.findById(decoded._id)
      .select('_id tokenVersion')
      .lean();

    if (
      !user ||
      (decoded.tokenVersion || 0) !== (user.tokenVersion || 0)
    ) {
      return next(new Error('Session is no longer valid.'));
    }

    socket.data.userId = String(user._id);
    return next();
  } catch {
    return next(new Error('Invalid or expired access token.'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.data.userId}`);
});

app.set('io', io);

// Request body parsing
app.use(express.json({ limit: '5mb' }));

// Health check: GET /
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'BDU Clearance API is running successfully',
    status: 'OK',
  });
});

// Health check: GET /api/health
app.get('/api/health', (req, res) => {
  res.status(200).json({
    message: 'BDU Clearance API is running',
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// 1. Core & Admin Routes
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/profile', profileRouter);
app.use('/api/roles', roleRouter);
app.use('/api/employee', employeeRouter);
app.use('/api/department', departmentRouter);
app.use('/api/departments', departmentRouter);
app.use('/api/positions', positionRouter);
app.use('/api/admin/contact-messages', adminContactMessagesRouter);
app.use('/api/admin', adminDashboardRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/hr/settings', hrSettingsRouter);
app.use('/api/audit-logs', auditLogRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/department-head/settings', departmentSettingsRouter);
app.use('/api/reports', reportRouter);
app.use('/api/public/home', publicHomeRouter);
app.use('/api/hr/contact-messages', hrContactMessagesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/transport', transportDashboardRouter);
app.use('/api/registrar', registrarRouter);
app.use('/api/academic-records', academicRecordRouter);
app.use('/api/clearance-office', clearanceOfficeRouter);

// 2. Clearance Routes
app.use('/api/clearance', clearanceRouter);
app.use('/api/clearance-steps', clearanceStepRouter);
app.use('/api/hr', hrAssessmentRouter);
app.use('/api/separation-types', hrSeparationTypeRouter);
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

// 7. Global 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.originalUrl}`,
  });
});

// 8. Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);

  res.status(500).json({
    message: 'Internal Server Error',
    error:
      process.env.NODE_ENV === 'production'
        ? undefined
        : err.message,
  });
});

// Server Setup
const PORT = process.env.PORT || 3000;

httpServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} is already in use. Another server is already listening there. ` +
        'Stop the previous dev server with Ctrl+C in its terminal, or configure this app to use a free port.',
    );
  } else {
    console.error('Unable to start the HTTP server:', error.message);
  }

  process.exit(1);
});

const connectToDatabaseWithRetry = async () => {
  console.log('Connecting to MongoDB...');

  while (true) {
    const dbConnected = await connectToDB();

    if (dbConnected) {
      console.log('MongoDB connection established.');
      break;
    }

    console.error(
      'MongoDB is unavailable. Retrying connection in 10 seconds...',
    );

    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
};

const startServer = () => {
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    void connectToDatabaseWithRetry().catch((error) => {
      console.error('Database connection retry failed:', error.message);
    });
  });
};

startServer();
