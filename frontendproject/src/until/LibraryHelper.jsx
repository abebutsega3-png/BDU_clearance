import axios from 'axios';

const libraryApiUrl = 'http://localhost:3000/api/library-clearances';

const getLibraryHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

export const fetchLibraryClearances = async () => {
  const response = await axios.get(libraryApiUrl, { headers: getLibraryHeaders() });
  return response.data.clearances || [];
};

export const createLibraryClearance = async (clearanceData) => {
  const response = await axios.post(libraryApiUrl, clearanceData, {
    headers: {
      ...getLibraryHeaders(),
    },
  });
  return response.data;
};

export const updateLibraryClearance = async (clearanceId, clearanceData) => {
  const response = await axios.put(`${libraryApiUrl}/${clearanceId}`, clearanceData, {
    headers: getLibraryHeaders(),
  });
  return response.data;
};

export const deleteLibraryClearance = async (clearanceId) => {
  const response = await axios.delete(`${libraryApiUrl}/${clearanceId}`, {
    headers: getLibraryHeaders(),
  });
  return response.data;
};
