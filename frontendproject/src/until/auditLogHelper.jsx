import axios from 'axios';

const auditLogApiUrl = 'http://localhost:3000/api/audit-logs';

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

export const fetchAuditLogs = async (filters = {}) => {
  const response = await axios.get(auditLogApiUrl, {
    headers: getHeaders(),
    params: filters,
  });
  return response.data;
};

export const fetchAuditLog = async (id) => {
  const response = await axios.get(`${auditLogApiUrl}/${id}`, { headers: getHeaders() });
  return response.data.data;
};

export const exportAuditLogs = async (filters = {}) => {
  const response = await axios.get(`${auditLogApiUrl}/export`, {
    headers: getHeaders(),
    params: filters,
  });
  return response.data.data || [];
};
