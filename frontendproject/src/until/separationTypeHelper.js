import axios from 'axios';

const separationTypesUrl = 'http://localhost:3000/api/separation-types';

export const fetchActiveSeparationTypes = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.get(separationTypesUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const types = response.data?.data;
  if (!Array.isArray(types)) {
    throw new Error('The server returned an invalid separation type list.');
  }

  return types.filter((type) => type.isActive).map((type) => type.name);
};
