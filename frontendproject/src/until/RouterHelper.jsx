import axios from 'axios';

const reportApiUrl = 'http://localhost:3000/api/reports';

export const getReportHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

export const fetchReports = async () => {
  const response = await axios.get(reportApiUrl, { headers: getReportHeaders() });
  return response.data.reports || response.data.data || [];
};

export const fetchReport = async (identifier) => {
  const response = await axios.get(`${reportApiUrl}/${encodeURIComponent(identifier)}`, {
    headers: getReportHeaders(),
  });
  return response.data.report;
};

export const createReport = async (reportData) => {
  const response = await axios.post(reportApiUrl, reportData, {
    headers: getReportHeaders(),
  });
  return response.data;
};

export const updateReport = async (id, reportData) => {
  const response = await axios.put(`${reportApiUrl}/${id}`, reportData, {
    headers: getReportHeaders(),
  });
  return response.data;
};

export const deleteReport = async (reportId) => {
  const response = await axios.delete(`${reportApiUrl}/${reportId}`, {
    headers: getReportHeaders(),
  });
  return response.data;
};

