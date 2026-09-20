import axios from 'axios';

const employeeApiUrl = 'http://localhost:3000/api/employee';

export const getEmployeeHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

export const fetchEmployees = async () => {
  const response = await axios.get(employeeApiUrl, { headers: getEmployeeHeaders() });
  return response.data.employees || [];
};

export const fetchEmployee = async (id) => {
  const response = await axios.get(`${employeeApiUrl}/${id}`, { headers: getEmployeeHeaders() });
  return response.data.employee;
};

export const createEmployee = async (employeeData) => {
  const response = await axios.post(employeeApiUrl, employeeData, {
    headers: getEmployeeHeaders(),
  });
  return response.data;
};

export const updateEmployee = async (id, employeeData) => {
  const response = await axios.put(`${employeeApiUrl}/${id}`, employeeData, {
    headers: getEmployeeHeaders(),
  });
  return response.data;
};

export const deleteEmployee = async (employeeId) => {
  const response = await axios.delete(`${employeeApiUrl}/${employeeId}`, {
    headers: getEmployeeHeaders(),
  });
  return response.data;
};
