import React from 'react';

const SummaryCard = ({ icon, text, number }) => {
  return (
    <div className="rounded flex bg-white shadow-sm p-2">
      <div className="text-3xl flex justify-center items-center bg-teal-600 text-white px-4 rounded">
        {icon}
      </div>
      <div className="pl-4 py-1">
        <p className="text-lg font-semibold">{text}</p>
        <p className="text-xl font-bold">{number}</p>
      </div>
    </div>
  );
};

export default SummaryCard;