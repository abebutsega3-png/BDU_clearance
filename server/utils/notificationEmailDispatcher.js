import Employee from '../models/employee.js';
import User from '../models/User.js';
import { sendNotificationEmail } from './emailService.js';

export const dispatchNotificationEmails = async (notifications) => {
  const items = (Array.isArray(notifications) ? notifications : [notifications]).filter(Boolean);
  if (!items.length) return;

  try {
    const userIds = [...new Set(items.map((notification) => notification.recipientId?.toString()).filter(Boolean))];
    const employeeIds = [...new Set(items.map((notification) => String(notification.employeeId || '').trim()).filter(Boolean))];
    const userQueries = [];
    if (userIds.length) userQueries.push({ _id: { $in: userIds } });
    if (employeeIds.length) userQueries.push({ employeeId: { $in: employeeIds } });

    const [users, employees] = await Promise.all([
      userQueries.length
        ? User.find({ $or: userQueries }).select('_id employeeId email notificationPreferences').lean()
        : [],
      employeeIds.length
        ? Employee.find({ employeeId: { $in: employeeIds } }).select('employeeId email').lean()
        : [],
    ]);
    const usersById = new Map(users.map((user) => [user._id.toString(), user]));
    const usersByEmployeeId = new Map(users.filter((user) => user.employeeId).map((user) => [user.employeeId, user]));
    const employeesById = new Map(employees.map((employee) => [employee.employeeId, employee]));

    await Promise.all(items.map((notification) => {
      const employeeId = String(notification.employeeId || '').trim();
      const user = usersById.get(notification.recipientId?.toString()) || usersByEmployeeId.get(employeeId);
      const employee = employeesById.get(employeeId);
      const recipient = {
        email: user?.email || employee?.email,
        notificationPreferences: user?.notificationPreferences,
      };

      if (!recipient.email) return Promise.resolve();
      return sendNotificationEmail({
        recipient,
        title: notification.title,
        message: notification.message,
        actionLink: notification.actionLink,
      });
    }));
  } catch (error) {
    console.error('Unable to dispatch notification emails:', error.message);
  }
};