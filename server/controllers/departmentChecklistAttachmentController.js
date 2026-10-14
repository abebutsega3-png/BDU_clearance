import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import Clearance from '../models/clearance.js';
import Department from '../models/department.js';
import Employee from '../models/employee.js';
import { isDepartmentHead } from '../utils/roleHelpers.js';
import { uploadDirectory } from '../middleware/departmentChecklistUpload.js';

const normalizeDepartment = (value) => String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '');

const findClearance = (id) => Clearance.findOne(mongoose.isValidObjectId(id)
  ? { $or: [{ _id: id }, { requestId: id }] }
  : { requestId: id });

const canAccessDepartmentClearance = async (request, user) => {
  if (!isDepartmentHead(user)) return false;

  const employee = request.employeeId
    ? await Employee.findOne({ employeeId: request.employeeId }).select('department departmentId').lean()
    : null;
  const requestDepartmentId = request.departmentId || employee?.departmentId;
  const userDepartmentId = user.departmentId;
  if (requestDepartmentId && userDepartmentId) {
    return String(requestDepartmentId) === String(userDepartmentId);
  }

  const requestDepartment = typeof request.department === 'object'
    ? request.department?.departmentName || request.department?.name || employee?.department
    : request.department || employee?.department;
  let userDepartment = user.department;
  if (!userDepartment && userDepartmentId) {
    const department = await Department.findById(userDepartmentId).select('departmentName').lean();
    userDepartment = department?.departmentName;
  }
  return Boolean(requestDepartment && userDepartment
    && normalizeDepartment(requestDepartment) === normalizeDepartment(userDepartment));
};

const findChecklistItem = (request, itemId) => (
  Array.isArray(request.departmentChecklist)
    ? request.departmentChecklist.findIndex((item) => String(item.item || '').trim().toLowerCase() === itemId.toLowerCase())
    : -1
);

export const authorizeDepartmentChecklistUpload = async (req, res, next) => {
  try {
    if (!isDepartmentHead(req.user)) {
      return res.status(403).json({ success: false, message: 'Department Head access is required.' });
    }
    const request = await findClearance(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Clearance request not found.' });
    if (!await canAccessDepartmentClearance(request, req.user)) {
      return res.status(403).json({ success: false, message: 'This clearance request belongs to another department.' });
    }
    if (request.initialHRStatus !== 'Approved' || !['Pending', 'In Progress'].includes(request.departmentStatus)) {
      return res.status(409).json({ success: false, message: 'Only an open Department Head review can receive attachments.' });
    }
    return next();
  } catch (error) {
    console.error('Unable to authorize department checklist upload:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify clearance access.' });
  }
};

export const uploadDepartmentChecklistAttachmentForItem = async (req, res) => {
  let saved = false;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Choose an attachment to upload.' });
    }
    const itemId = String(req.body?.itemId || '').trim();
    const section = String(req.body?.section || '').trim();
    const category = String(req.body?.category || '').trim();
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
    if (!itemId || itemId.length > 160 || !section || section.length > 80 || !category || category.length > 160) {
      return res.status(400).json({ success: false, message: 'A valid checklist item is required.' });
    }
    if (note.length > 1000) {
      return res.status(400).json({ success: false, message: 'Checklist remarks must be 1000 characters or fewer.' });
    }

    const request = await findClearance(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Clearance request not found.' });
    if (!await canAccessDepartmentClearance(request, req.user)) {
      return res.status(403).json({ success: false, message: 'This clearance request belongs to another department.' });
    }
    if (request.initialHRStatus !== 'Approved' || !['Pending', 'In Progress'].includes(request.departmentStatus)) {
      return res.status(409).json({ success: false, message: 'Only an open Department Head review can receive attachments.' });
    }

    const checklist = Array.isArray(request.departmentChecklist) ? [...request.departmentChecklist] : [];
    const itemIndex = findChecklistItem(request, itemId);
    const previousAttachment = itemIndex >= 0 ? checklist[itemIndex].attachment : null;
    const attachment = {
      storageName: req.file.filename,
      fileName: path.basename(String(req.file.originalname).replaceAll('\\', '/')),
      contentType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user?.fullName || req.user?.name || 'Department Head',
      uploadedAt: new Date(),
    };
    const item = itemIndex >= 0
      ? { ...checklist[itemIndex], note, attachment, updatedAt: new Date() }
      : { item: itemId, section, category, status: 'Pending', note, attachment, updatedAt: new Date() };
    if (itemIndex >= 0) checklist[itemIndex] = item;
    else checklist.push(item);

    request.departmentChecklist = checklist;
    await request.save();
    saved = true;

    if (previousAttachment?.storageName && previousAttachment.storageName !== attachment.storageName) {
      const previousPath = path.join(uploadDirectory, path.basename(previousAttachment.storageName));
      await fs.unlink(previousPath).catch((error) => {
        if (error.code !== 'ENOENT') console.error('Unable to remove replaced department attachment:', error);
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Checklist attachment uploaded.',
      attachment,
      item: { item: item.item, section: item.section, status: item.status, note: item.note },
    });
  } catch (error) {
    console.error('Unable to save department checklist attachment:', error);
    return res.status(500).json({ success: false, message: 'Unable to save the attachment.' });
  } finally {
    if (!saved && req.file?.path) {
      await fs.unlink(req.file.path).catch((error) => {
        if (error.code !== 'ENOENT') console.error('Unable to remove an unsaved department attachment:', error);
      });
    }
  }
};

export const downloadDepartmentChecklistAttachment = async (req, res) => {
  try {
    const attachment = await getAuthorizedAttachment(req, res);
    if (!attachment) return;

    const attachmentPath = path.join(uploadDirectory, attachment.storageName);
    res.set('X-Content-Type-Options', 'nosniff');
    const downloadName = path.basename(String(attachment.fileName || 'department-attachment').replaceAll('\\', '/'));
    return res.download(attachmentPath, downloadName, (error) => {
      if (error && !res.headersSent) {
        if (error.code === 'ENOENT') {
          res.status(404).json({ success: false, message: 'The attachment file could not be found.' });
          return;
        }
        console.error('Unable to download department checklist attachment:', error);
        res.status(500).json({ success: false, message: 'Unable to download the attachment.' });
      }
    });
  } catch (error) {
    console.error('Unable to load department checklist attachment:', error);
    return res.status(500).json({ success: false, message: 'Unable to load the attachment.' });
  }
};

export const previewDepartmentChecklistAttachment = async (req, res) => {
  try {
    const attachment = await getAuthorizedAttachment(req, res);
    if (!attachment) return;

    const attachmentPath = path.join(uploadDirectory, attachment.storageName);
    const previewContentTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
    res.set({
      'Content-Type': previewContentTypes.has(attachment.contentType) ? attachment.contentType : 'application/octet-stream',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.sendFile(attachmentPath, (error) => {
      if (error && !res.headersSent) {
        if (error.code === 'ENOENT') {
          res.status(404).json({ success: false, message: 'The attachment file could not be found.' });
          return;
        }
        console.error('Unable to preview department checklist attachment:', error);
        res.status(500).json({ success: false, message: 'Unable to preview the attachment.' });
      }
    });
  } catch (error) {
    console.error('Unable to load department checklist preview:', error);
    return res.status(500).json({ success: false, message: 'Unable to preview the attachment.' });
  }
};

export const deleteDepartmentChecklistAttachment = async (req, res) => {
  try {
    const request = await findClearance(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Clearance request not found.' });
    if (!await canAccessDepartmentClearance(request, req.user)) {
      return res.status(403).json({ success: false, message: 'This clearance request belongs to another department.' });
    }
    if (request.initialHRStatus !== 'Approved' || !['Pending', 'In Progress'].includes(request.departmentStatus)) {
      return res.status(409).json({ success: false, message: 'Only an open Department Head review can remove attachments.' });
    }

    const checklist = Array.isArray(request.departmentChecklist) ? [...request.departmentChecklist] : [];
    const itemIndex = findChecklistItem(request, req.params.itemId);
    const attachment = itemIndex >= 0 ? checklist[itemIndex].attachment : null;
    if (!attachment?.storageName) {
      return res.status(404).json({ success: false, message: 'No attachment is available for this checklist item.' });
    }

    checklist[itemIndex] = { ...checklist[itemIndex], attachment: null, updatedAt: new Date() };
    request.departmentChecklist = checklist;
    await request.save();

    const safeStorageName = path.basename(attachment.storageName);
    if (/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}\.(pdf|jpg|png|webp)$/i.test(safeStorageName)) {
      await fs.unlink(path.join(uploadDirectory, safeStorageName)).catch((error) => {
        if (error.code !== 'ENOENT') console.error('Unable to remove deleted department attachment:', error);
      });
    }

    return res.status(200).json({ success: true, message: 'Checklist attachment deleted.' });
  } catch (error) {
    console.error('Unable to delete department checklist attachment:', error);
    return res.status(500).json({ success: false, message: 'Unable to delete the attachment.' });
  }
};

const getAuthorizedAttachment = async (req, res) => {
  const request = await findClearance(req.params.id);
  if (!request) {
    res.status(404).json({ success: false, message: 'Clearance request not found.' });
    return null;
  }
  if (!await canAccessDepartmentClearance(request, req.user)) {
    res.status(403).json({ success: false, message: 'This clearance request belongs to another department.' });
    return null;
  }

  const item = Array.isArray(request.departmentChecklist)
    ? request.departmentChecklist.find((checklistItem) => (
      String(checklistItem.item || '').trim().toLowerCase() === req.params.itemId.trim().toLowerCase()
    ))
    : null;
  const attachment = item?.attachment;
  if (!attachment?.storageName || !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}\.(pdf|jpg|png|webp)$/i.test(attachment.storageName)) {
    res.status(404).json({ success: false, message: 'No attachment is available for this checklist item.' });
    return null;
  }
  return attachment;
};
