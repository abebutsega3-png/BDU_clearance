import axios from 'axios';

const myprofileApiUrl = 'http://localhost:3000/api/profile';

export const getMyProfileHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

export const fetchMyProfile = async (userId) => {
  const response = await axios.get(`${myprofileApiUrl}/${userId}`, { headers: getMyProfileHeaders() });
  return response.data.data || response.data;
};

export const updateMyProfile = async (userId, profileData) => {
  const response = await axios.put(`${myprofileApiUrl}/${userId}`, profileData, {
    headers: getMyProfileHeaders(),
  });
  return response.data;
};

export const changeMyPassword = async (userId, passwordData) => {
  const response = await axios.patch(`${myprofileApiUrl}/${userId}/password`, passwordData, {
    headers: getMyProfileHeaders(),
  });
  return response.data;
};
