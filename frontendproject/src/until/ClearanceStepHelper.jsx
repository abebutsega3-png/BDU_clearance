import axios from 'axios';

const clearanceStepApiUrl = 'http://localhost:3000/api/clearance-steps';

export const getClearanceStepHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

export const fetchClearanceSteps = async () => {
  const response = await axios.get(clearanceStepApiUrl, { headers: getClearanceStepHeaders() });
  return response.data.steps || response.data.clearanceSteps || [];
};

export const createClearanceStep = async (clearanceStepData) => {
  const response = await axios.post(clearanceStepApiUrl, clearanceStepData, {
    headers: getClearanceStepHeaders(),
  });
  return response.data;
};
