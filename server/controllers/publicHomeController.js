import Employee from '../models/employee.js';
import Clearance from '../models/clearance.js';
import ClearanceStep from '../models/ClearanceStep.js';

const officeDescription = (name) => {
  const value = name.toLowerCase();
  if (value.includes('finance')) return 'Verify financial obligations';
  if (value.includes('library')) return 'Verify library resources';
  if (value.includes('property') || value.includes('asset')) return 'Verify university assets';
  if (value.includes('ict')) return 'Verify ICT equipment';
  return 'Additional verification when required';
};

export const getPublicHomeData = async (_req, res) => {
  try {
    const [registeredEmployees, pendingRequests, completedClearances, issuedCertificates, requiredSteps, configuredOfficeNames] = await Promise.all([
      Employee.countDocuments(),
      Clearance.countDocuments({ status: 'Pending' }),
      Clearance.countDocuments({ status: 'Completed' }),
      Clearance.countDocuments({ 'certificate.issuedAt': { $exists: true, $ne: null } }),
      ClearanceStep.find({ status: 'Active', required: 'Yes' })
        .populate('department', 'departmentName office description')
        .sort({ order: 1 })
        .lean(),
      Clearance.distinct('requiredOffices'),
    ]);

    const stepOffices = requiredSteps.map((step) => {
      const department = step.department || {};
      return {
        name: department.office || department.departmentName || step.name,
        description: department.description,
      };
    });
    const offices = Array.from(new Map([...configuredOfficeNames, ...stepOffices.map((office) => office.name)]
      .map((office) => {
        const name = String(typeof office === 'string' ? office : office.name || '').trim();
        return [name.toLowerCase(), { name, description: office.description || officeDescription(name) }];
      })
      .filter(([, office]) => office.name && !/^admin$|department head|final hr|hr final/i.test(office.name))).values());

    return res.json({
      success: true,
      stats: { registeredEmployees, pendingRequests, completedClearances, issuedCertificates },
      offices,
    });
  } catch (error) {
    console.error('Error fetching public home data:', error);
    return res.status(500).json({ success: false, message: 'Unable to load home page data.' });
  }
};