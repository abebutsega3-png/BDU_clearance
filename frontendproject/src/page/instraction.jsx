import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Instruction() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800">
      
      {/* 1. Header Banner Section */}
      <div className="relative bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950 to-slate-900"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 flex flex-col md:flex-row items-center justify-between">
          <div className="space-y-3 max-w-xl">
            <div className="text-sm text-blue-200">
              <Link to="/" className="hover:underline">Home</Link> <span className="mx-2">&gt;</span> <span className="text-white font-medium">Instructions</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white">Clearance Instructions</h1>
            <p className="text-sm text-slate-200 leading-relaxed">
              Follow these steps to complete your employee clearance process smoothly and successfully.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/login" className="inline-flex items-center rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-300">
                Start Clearance →
              </Link>
              <button type="button" onClick={() => window.print()} className="inline-flex items-center rounded-lg border border-white/60 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white hover:text-slate-900">
                Print Instructions
              </button>
            </div>
          </div>
          
          <div className="mt-6 md:mt-0">
            <div className="w-32 h-32 bg-blue-600/20 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col items-center justify-center shadow-lg">
              <span className="text-4xl">📋</span>
              <span className="text-xs text-blue-200 font-semibold mt-2">Guide & Steps</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* 2. Steps to Complete Your Clearance */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-900 text-base mb-6">Steps to Complete Your Clearance</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 relative">
            
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center space-y-2 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow">1</div>
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg">👤</div>
              <h4 className="font-bold text-slate-800 text-xs">Login</h4>
              <p className="text-[10px] text-slate-500 leading-tight">Login to your account using your employee credentials.</p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center space-y-2 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow">2</div>
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">📄</div>
              <h4 className="font-bold text-slate-800 text-xs">Start Clearance</h4>
              <p className="text-[10px] text-slate-500 leading-tight">Go to My Clearance and start a new clearance request.</p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center space-y-2 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow">3</div>
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-lg">📝</div>
              <h4 className="font-bold text-slate-800 text-xs">Fill Information</h4>
              <p className="text-[10px] text-slate-500 leading-tight">Fill all required information accurately.</p>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center text-center space-y-2 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow">4</div>
              <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-lg">🚀</div>
              <h4 className="font-bold text-slate-800 text-xs">Submit Application</h4>
              <p className="text-[10px] text-slate-500 leading-tight">Review your information and submit application.</p>
            </div>

            {/* Step 5 */}
            <div className="flex flex-col items-center text-center space-y-2 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow">5</div>
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">🏢</div>
              <h4 className="font-bold text-slate-800 text-xs">Office Review</h4>
              <p className="text-[10px] text-slate-500 leading-tight">Relevant offices will review and verify your clearance.</p>
            </div>

            {/* Step 6 */}
            <div className="flex flex-col items-center text-center space-y-2 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow">6</div>
              <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-lg">🔍</div>
              <h4 className="font-bold text-slate-800 text-xs">Track Status</h4>
              <p className="text-[10px] text-slate-500 leading-tight">Track your clearance status online in real time.</p>
            </div>

            {/* Step 7 */}
            <div className="flex flex-col items-center text-center space-y-2 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow">7</div>
              <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-lg">✅</div>
              <h4 className="font-bold text-slate-800 text-xs">Completed</h4>
              <p className="text-[10px] text-slate-500 leading-tight">Once all offices approve, clearance is completed.</p>
            </div>

          </div>
        </div>

        {/* 3. Required Documents, Important Notes, & Clearance Offices */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Required Documents */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-emerald-600 text-lg">📄</span>
              <h3 className="font-bold text-slate-900 text-base">Required Documents</h3>
            </div>
            
            <ul className="space-y-3 text-xs text-slate-700">
              <li className="flex items-start space-x-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Employee ID Card (Copy)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Resignation/Termination Letter (If applicable)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Department Clearance Form (If applicable)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Any other document required by specific offices</span>
              </li>
            </ul>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-800 flex items-start space-x-2">
              <span>ℹ️</span>
              <span>Make sure all documents are clear and valid before submission.</span>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-amber-500 text-lg">🔔</span>
              <h3 className="font-bold text-slate-900 text-base">Important Notes</h3>
            </div>

            <ul className="space-y-3 text-xs text-slate-700">
              <li className="flex items-start space-x-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>Provide correct and accurate information.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>Submit all required documents.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>Clearance is not complete until all offices approve.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>Track your clearance status regularly.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>You will be notified at each stage.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>Contact support if you face any issues.</span>
              </li>
            </ul>
          </div>

          {/* Clearance Offices Involved */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-blue-600 text-lg">🏛️</span>
              <h3 className="font-bold text-slate-900 text-base">Clearance Offices Involved</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">$</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Finance Office</h4>
                  <p className="text-[10px] text-slate-500">Financial clearance and settlement</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">📚</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Library</h4>
                  <p className="text-[10px] text-slate-500">Library materials clearance</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold">📦</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Property/Asset</h4>
                  <p className="text-[10px] text-slate-500">University property and asset clearance</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">👥</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Human Resource</h4>
                  <p className="text-[10px] text-slate-500">HR records and administration</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">🛡️</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Administration</h4>
                  <p className="text-[10px] text-slate-500">Administrative clearance</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* 4. Frequently Asked Questions (FAQ) */}
        <div id="faq" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="font-bold text-slate-900 text-base mb-4">Frequently Asked Questions (FAQ)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { q: "How do I start my clearance?", a: "Log into your account, navigate to My Clearance, and click on Start New Clearance." },
              { q: "What should I do if an office rejects my clearance?", a: "Check the feedback provided by the office, correct the issue or provide the requested document, and resubmit." },
              { q: "How can I track my clearance status?", a: "You can track your real-time clearance status directly from your dashboard under the tracking section." },
              { q: "How long does the clearance process take?", a: "It typically takes 3 to 5 working days depending on the responsiveness of the respective offices." },
              { q: "What documents are required?", a: "An employee ID copy, departmental clearance forms, and any specific termination/resignation documents." },
              { q: "Who can I contact for support?", a: "You can reach out via the Contact Support page or email clearance@bdu.edu.et." }
            ].map((item, index) => (
              <div key={index} className="border border-slate-200 rounded-xl overflow-hidden">
                <button 
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 text-left transition"
                >
                  <span>{item.q}</span>
                  <span className="text-slate-500">{openFaq === index ? '▲' : '▼'}</span>
                </button>
                {openFaq === index && (
                  <div className="p-3 text-xs text-slate-600 bg-white border-t border-slate-100">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 5. Need Help Callout */}
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
            <Link to="#faq" className="flex-1 md:flex-none text-center px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200">
              ❓ View FAQ
            </Link>
            <Link to="/contact" className="flex-1 md:flex-none text-center px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm">
              📞 Contact Support
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}