import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ServicesSection() {
  const [selectedService, setSelectedService] = useState(null);

  const services = [
    {
      title: "Financial Clearance",
      shortDesc: "Verify financial obligations including debts, salary advances, loans, and payments.",
      detailedDesc: "The Financial Clearance office thoroughly reviews and clears all financial liabilities of the employee. This includes checking for any outstanding loans, salary advances, unliquidated advances, unpaid university dues, and other monetary obligations before granting approval.",
      icon: "💲",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-600"
    },
    {
      title: "Library Clearance",
      shortDesc: "Return borrowed books and clear any library-related debts and obligations.",
      detailedDesc: "This clearance ensures that the employee has returned all borrowed books, research materials, or other institutional resources taken from any Bahir Dar University library. It also verifies that there are no pending fines or unreturned library properties.",
      icon: "📚",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600"
    },
    {
      title: "ICT Clearance",
      shortDesc: "Return ICT equipment and ensure all ICT-related accounts and access are cleared.",
      detailedDesc: "The ICT clearance checks for the return of university-owned digital equipment such as laptops, desktop computers, networking gear, and peripherals. It also handles the safe deactivation or handover of official institutional email accounts, network credentials, and digital systems access.",
      icon: "💻",
      bgColor: "bg-purple-50",
      textColor: "text-purple-600"
    },
    {
      title: "HR Clearance",
      shortDesc: "Verify employment information, benefits, leave, and complete HR-related clearance.",
      detailedDesc: "The Human Resources department evaluates the employee's file, employment history, service duration, accumulated benefits, and leave balances. They ensure all personnel records are updated and official employment obligations are legally concluded.",
      icon: "👥",
      bgColor: "bg-amber-50",
      textColor: "text-amber-600"
    },
    {
      title: "Department Clearance",
      shortDesc: "Clear departmental responsibilities and ensure proper handover of tasks and documents.",
      detailedDesc: "This step verifies that the employee has properly handed over ongoing projects, official documents, office responsibilities, and duties to the respective department head or designated colleague before leaving or transferring.",
      icon: "🏢",
      bgColor: "bg-teal-50",
      textColor: "text-teal-600"
    },
    {
      title: "Asset & Property Clearance",
      shortDesc: "Return university properties and assets and clear related responsibilities.",
      detailedDesc: "Property and asset management verifies that all fixed assets, equipment, furniture, and institutional properties assigned to the employee under property code or hand-receipt are fully and safely returned without loss or damage.",
      icon: "📦",
      bgColor: "bg-rose-50",
      textColor: "text-rose-600"
    },
    {
      title: "Security Clearance",
      shortDesc: "Return ID cards, keys and other security items and complete security clearance.",
      detailedDesc: "The security office ensures the return of physical credentials such as university staff ID cards, office keys, laboratory keys, gate passes, parking permits, and any security-related items assigned to the employee.",
      icon: "🛡️",
      bgColor: "bg-orange-50",
      textColor: "text-orange-600"
    },
    {
      title: "Final Clearance",
      shortDesc: "After completing all clearances, receive final approval and clearance certificate.",
      detailedDesc: "Once all preceding departmental and office clearances are successfully approved, the final clearance authority processes the final verification and enables the generation of the official university clearance certificate.",
      icon: "🏅",
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-600"
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8 font-sans relative">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Our Services</h2>
          <div className="w-12 h-1 bg-amber-400 mx-auto rounded-full"></div>
          <p className="text-sm text-slate-600 leading-relaxed">
            The Employee Clearance System provides a smooth and organized clearance process for employees leaving or transferring from Bahir Dar University.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <div 
              key={index} 
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-4">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-2xl ${service.bgColor} ${service.textColor} flex items-center justify-center text-xl shadow-inner mx-auto sm:mx-0`}>
                  {service.icon}
                </div>

                {/* Title & Short Description */}
                <div className="space-y-2 text-center sm:text-left">
                  <h3 className="font-bold text-slate-900 text-base">{service.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{service.shortDesc}</p>
                </div>
              </div>

              {/* Learn More Button / Trigger */}
              <div className="pt-2 text-center sm:text-left">
                <button 
                  onClick={() => setSelectedService(service)}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition group cursor-pointer bg-transparent border-none p-0"
                >
                  <span>Learn more</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Alert / Call to Action Banner */}
        <div className="bg-white border border-blue-100 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg shrink-0">
              ℹ️
            </div>
            <p className="text-xs sm:text-sm text-slate-700 font-medium">
              To request any clearance, please login to your account.
            </p>
          </div>
          
          <Link 
            to="/login" 
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow transition duration-200 flex items-center justify-center space-x-2"
          >
            <span>👤</span>
            <span>Login to Continue</span>
          </Link>
        </div>

      </div>

      {/* Detailed Information Modal Popup */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl ${selectedService.bgColor} ${selectedService.textColor} flex items-center justify-center text-lg shadow-inner`}>
                  {selectedService.icon}
                </div>
                <h3 className="font-bold text-slate-900 text-lg">{selectedService.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedService(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            <div className="py-2 text-sm text-slate-600 leading-relaxed border-t border-b border-slate-100">
              <p>{selectedService.detailedDesc}</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedService(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}