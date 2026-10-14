import { BookOpen, CarFront, FileText, PackageCheck, ShieldCheck } from 'lucide-react';

const checklistProfiles = {
  transport: {
    title: 'Transport Clearance Checklist',
    description: 'Verify assigned vehicles, equipment, handover, and outstanding transport obligations.',
    sections: [
      { key: 'vehicle', title: 'Assigned Vehicle', description: 'Confirm vehicle assignment and return status.', icon: CarFront, tone: 'blue', items: ['Vehicle Plate Number', 'Vehicle Type', 'Assigned Driver / Employee', 'Vehicle Return Status'] },
      { key: 'condition', title: 'Vehicle Condition and Equipment', description: 'Check vehicle condition and assigned accessories.', icon: PackageCheck, tone: 'emerald', items: ['Vehicle Condition', 'Vehicle Keys Returned', 'Vehicle Documents Returned', 'Fuel Card / Vehicle Accessories'] },
      { key: 'responsibilities', title: 'Transport Responsibilities', description: 'Check records, handover, and pending transport work.', icon: ShieldCheck, tone: 'amber', items: ['Outstanding Vehicle-related Tasks', 'Vehicle Handover', 'Transport Records', 'Pending Transport Obligations'] },
    ],
  },
  academic: {
    title: 'Academic Department Clearance Checklist',
    description: 'Verify teaching duties, academic records, department materials, and work handover.',
    sections: [
      { key: 'teaching', title: 'Teaching Responsibilities', description: 'Confirm course delivery, assessments, grades, and teaching handover.', icon: BookOpen, tone: 'blue', items: ['Course Completion Status', 'Student Assessment / Exam Records', 'Grade Submission Status', 'Pending Academic Tasks', 'Teaching Material Handover'] },
      { key: 'documents', title: 'Department Documents', description: 'Verify academic and department records.', icon: FileText, tone: 'violet', items: ['Course Files', 'Exam and Assessment Documents', 'Academic Reports', 'Project / Research Documents', 'Department Records'] },
      { key: 'materials', title: 'Department Materials', description: 'Check assigned teaching materials, equipment, and access items.', icon: PackageCheck, tone: 'emerald', items: ['Books or Teaching Materials', 'Department Equipment', 'Laboratory Materials', 'Office Keys / Access Card'] },
      { key: 'handover', title: 'Work Handover', description: 'Confirm ongoing academic work is handed to assigned staff.', icon: ShieldCheck, tone: 'amber', items: ['Ongoing Courses / Tasks', 'Student-related Responsibilities', 'Handover to Assigned Staff', 'Pending Department Duties'] },
    ],
  },
  general: {
    title: 'Department Clearance Checklist',
    description: 'Verify department responsibilities, materials, records, and work handover.',
    sections: [
      { key: 'responsibilities', title: 'Department Responsibilities', description: 'Ensure department work is completed or handed over.', icon: ShieldCheck, tone: 'blue', items: ['Pending Tasks', 'Assigned Responsibilities', 'Ongoing Work', 'Work Handover'] },
      { key: 'documents', title: 'Department Documents', description: 'Verify department documents and records.', icon: FileText, tone: 'violet', items: ['Department Files', 'Project Documents', 'Official Documents', 'Reports and Records'] },
      { key: 'materials', title: 'Department Materials', description: 'Check department equipment, keys, and other assigned materials.', icon: PackageCheck, tone: 'emerald', items: ['Office Materials', 'Department Equipment', 'Keys / Access Card', 'Other Assigned Materials'] },
    ],
  },
};

export const normalizeDepartmentName = (department) => {
  if (department && typeof department === 'object') return department.departmentName || department.name || '';
  return String(department || '');
};

export const getChecklistProfile = (request, user) => {
  const department = normalizeDepartmentName(request?.department || user?.department).toLowerCase();
  const position = String(request?.position || request?.employee?.position || '').toLowerCase();
  if (/transport|fleet/.test(department) || /\b(driver|chauffeur|transport officer|transport staff)\b/.test(position)) return checklistProfiles.transport;
  if (/academic|lecturer|faculty|teaching/.test(department) || /\b(lecturer|instructor|professor|academic staff|teacher)\b/.test(position)) return checklistProfiles.academic;
  return checklistProfiles.general;
};

export const freshChecklist = (profile, request) => {
  const savedChecklist = Array.isArray(request?.departmentChecklist)
    ? request.departmentChecklist
    : Array.isArray(request?.departmentClearances) ? request.departmentClearances : [];
  return profile.sections.flatMap((section) => section.items.map((item) => {
    const saved = savedChecklist.find((entry) => String(entry.item || entry.name || '').toLowerCase() === item.toLowerCase());
    const savedStatus = ['Cleared', 'Pending', 'N/A'].includes(saved?.status) ? saved.status : 'Pending';
    return {
      section: section.key,
      item,
      status: savedStatus,
      note: saved?.note || saved?.comment || '',
      attachment: saved?.attachment || saved?.document || null,
    };
  }));
};
