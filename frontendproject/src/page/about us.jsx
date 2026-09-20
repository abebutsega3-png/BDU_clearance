import React from 'react';
import { Link } from 'react-router-dom';

// ምስሉን ከ assets አቃፊ ማስገባት (image4.png)
import image4 from '../assets/image4.png';

export default function AboutUs() {
  return (
    <div className="bg-slate-50 min-h-screen text-slate-800">
      
      {/* 1. Header Banner Section */}
      <div className="relative bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url(${image4})` }}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/90 to-slate-900/70"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="text-sm text-blue-200 mb-2">
            <Link to="/" className="hover:underline">Home</Link> <span className="mx-2">&gt;</span> <span className="text-white font-medium">About Us</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight mb-4 text-white">Bahir Dar University Employee Clearance System</h1>
              <p className="text-sm lg:text-base text-slate-200 leading-relaxed">
                This official employee portal helps Bahir Dar University employees submit clearance applications, provide required documents, follow office reviews and receive their completed clearance certificate through one transparent digital process.
              </p>
            </div>
            {/* ምስሉ በመሀከል/በስተቀኝ በኩል በትክክል እንዲታይ የተደረገበት ክፍል */}
            <div className="flex justify-center lg:justify-end">
              <div className="rounded-xl overflow-hidden shadow-2xl border border-white/20 max-w-md w-full">
                <img src={image4} alt="Bahir Dar University Campus" className="w-full h-56 object-cover transform hover:scale-105 transition duration-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* 2. Purpose, Vision, Mission Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Purpose */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                🎯
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Our Purpose</h3>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Simplify and standardize the clearance process</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Reduce paperwork and manual procedures</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Save time and resources</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Improve transparency and accountability</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Enable real-time tracking of clearance status</span>
              </li>
            </ul>
          </div>

          {/* Vision */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                👁️
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Our Vision</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              To be a leading digital clearance system that ensures a seamless and transparent experience for employees and the university.
            </p>
          </div>

          {/* Mission */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                🛡️
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Our Mission</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              To provide an efficient, secure and user-friendly clearance platform through innovation, collaboration and excellent service.
            </p>
          </div>

        </div>

        {/* 3. How the System Works */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-center font-bold text-slate-900 text-lg mb-8">How the System Works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 text-center relative">
            
            {/* Step 1 */}
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl shadow-inner">👤</div>
              <h4 className="font-bold text-slate-800 text-sm">Employee</h4>
              <p className="text-[11px] text-slate-500">Employee submits clearance application online.</p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shadow-inner">📄</div>
              <h4 className="font-bold text-slate-800 text-sm">Application</h4>
              <p className="text-[11px] text-slate-500">Application is received and assigned to the relevant offices.</p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xl shadow-inner">🏢</div>
              <h4 className="font-bold text-slate-800 text-sm">Office Review</h4>
              <p className="text-[11px] text-slate-500">Responsible offices review the application and documents.</p>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xl shadow-inner">✅</div>
              <h4 className="font-bold text-slate-800 text-sm">Approval</h4>
              <p className="text-[11px] text-slate-500">Offices approve and update the clearance status.</p>
            </div>

            {/* Step 5 */}
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-xl shadow-inner">📋</div>
              <h4 className="font-bold text-slate-800 text-sm">Completed</h4>
              <p className="text-[11px] text-slate-500">All approvals completed and clearance certificate is issued.</p>
            </div>

          </div>
        </div>

        {/* 4. Clearance Offices & Key Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Clearance Offices */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Clearance Offices</h3>
            <p className="text-xs text-slate-500">The system integrates the following university offices:</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">$</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Finance Office</h4>
                  <p className="text-[10px] text-slate-500">Financial clearance and settlement</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">📚</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Library</h4>
                  <p className="text-[10px] text-slate-500">Library materials clearance</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold">📦</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Property / Asset</h4>
                  <p className="text-[10px] text-slate-500">University property and asset clearance</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">👥</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Human Resource</h4>
                  <p className="text-[10px] text-slate-500">HR records and administration</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">🛡️</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Administration</h4>
                  <p className="text-[10px] text-slate-500">Administrative clearance</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-slate-600 text-white flex items-center justify-center text-xs font-bold">🏢</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Other Offices</h4>
                  <p className="text-[10px] text-slate-500">Other relevant offices</p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Features */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Key Features</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-700">
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Online Clearance Application</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Real-time Notifications</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Clearance Status Tracking</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Clearance Certificate</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Office Review & Approval</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Secure Employee Account</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Document Management</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Audit Trail & Reporting</span>
              </div>
            </div>
          </div>

        </div>

        {/* 5. Benefits & Our Commitment */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Benefits */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Benefits</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              
              <div>
                <h4 className="font-semibold text-xs text-blue-600 uppercase tracking-wider mb-2 flex items-center space-x-1">
                  <span>👤</span> <span>For Employees</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  <li className="flex items-center space-x-2"><span className="text-blue-600 font-bold">✓</span><span>Apply from anywhere, anytime</span></li>
                  <li className="flex items-center space-x-2"><span className="text-blue-600 font-bold">✓</span><span>Save time and travel</span></li>
                  <li className="flex items-center space-x-2"><span className="text-blue-600 font-bold">✓</span><span>Track your clearance status online</span></li>
                  <li className="flex items-center space-x-2"><span className="text-blue-600 font-bold">✓</span><span>Receive notifications at each stage</span></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-xs text-emerald-600 uppercase tracking-wider mb-2 flex items-center space-x-1">
                  <span>🏛️</span> <span>For the University</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  <li className="flex items-center space-x-2"><span className="text-emerald-600 font-bold">✓</span><span>Standardized and efficient process</span></li>
                  <li className="flex items-center space-x-2"><span className="text-emerald-600 font-bold">✓</span><span>Better record management</span></li>
                  <li className="flex items-center space-x-2"><span className="text-emerald-600 font-bold">✓</span><span>Improved transparency and accountability</span></li>
                  <li className="flex items-center space-x-2"><span className="text-emerald-600 font-bold">✓</span><span>Data-driven decision making</span></li>
                </ul>
              </div>

            </div>
          </div>

          {/* Our Commitment */}
          <div className="bg-amber-50/50 p-6 rounded-2xl shadow-sm border border-amber-200/60 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-3">Our Commitment</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We are committed to providing a transparent, efficient, secure and employee-friendly clearance process that upholds the values and standards of Bahir Dar University.
              </p>
            </div>
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-lg shadow-inner">
                🛡️
              </div>
            </div>
          </div>

        </div>

        {/* 6. Need Help Callout */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl shadow-md">
              🎧
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Need Help?</h3>
              <p className="text-xs text-slate-500">If you have any questions or need assistance, our support team is ready to help you.</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <Link to="/contact" className="flex-1 md:flex-none text-center px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200">
              📞 Contact Support
            </Link>
            <Link to="/instruction" className="flex-1 md:flex-none text-center px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm">
              📄 View Instructions
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}