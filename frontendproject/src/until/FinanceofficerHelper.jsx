import axios from 'axios';

const financeofficerApiUrl = 'http://localhost:3000/api/finance-officer';

export const getFinanceOfficerHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

export const fetchFinanceOfficers = async () => {
  const response = await axios.get(financeofficerApiUrl, { headers: getFinanceOfficerHeaders() });
  return response.data.financeOfficers || [];
};

export const createFinanceOfficer = async (financeOfficerData) => {
  const response = await axios.post(financeofficerApiUrl, financeOfficerData, {
    headers: getFinanceOfficerHeaders(),
  });
  return response.data;
};
