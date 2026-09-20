import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Contact() {
  const [openFaq, setOpenFaq] = useState(null);
  const [formStatus, setFormStatus] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    employeeId: '',
    email: '',
    subject: '',
    category: '',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormStatus('Your message has been received. The Employee Clearance Support Office will contact you during working hours.');
    setFormData({ fullName: '', employeeId: '', email: '', subject: '', category: '', message: '' });
  };

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setFormStatus('');
  };

  const faqAnswers = [
    'Use the Get Started button, sign in with your employee account, and submit your clearance application with the required documents.',
    'Sign in to your employee account and open the clearance status page to see each responsible office and its current approval status.',
    'Requirements depend on your clearance case. Review the Instructions page and upload clear copies of the documents requested by each office.',
    'Read the office comment, correct the issue, and resubmit the required document. Contact support if you need clarification about the rejection.',
    'Processing time depends on the responsible offices and document completeness. You can track progress online after submitting your application.'
  ];

  const supportCategories = [
    { name: 'Clearance Application', icon: '📄' },
    { name: 'Clearance Status', icon: '🔍' },
    { name: 'Document Problem', icon: '📁' },
    { name: 'Office Approval', icon: '🏛️' },
    { name: 'Login / Account', icon: '👤' },
    { name: 'Technical Problem', icon: '⚙️' },
    { name: 'Other', icon: '❓' }
  ];

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans">
      
      {/* 1. Header Banner Section */}
      <div className="relative bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url('/background-image.jpg')` }}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/90 to-slate-900/70"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="text-sm text-blue-200 mb-2">
            <Link to="/" className="hover:underline">Home</Link> <span className="mx-2">&gt;</span> <span className="text-white font-medium">Contact Us</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight mb-2 text-white">Contact Us</h1>
          <p className="text-sm lg:text-base text-slate-200">
            Have questions about the employee clearance process? Our support team is ready to assist you.
          </p>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* 2. Top Row: Contact Information & Contact Support Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Contact Information (Left Column - 5 spans) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <h3 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-3">Contact Information</h3>
            
            <div className="space-y-5 text-xs text-slate-700">
              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-base shrink-0 mt-0.5">🏛️</div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Bahir Dar University</h4>
                  <p className="text-slate-500">Employee Clearance Support Office</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-base shrink-0 mt-0.5">📍</div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Location</h4>
                  <p className="text-slate-500">Bahir Dar, Ethiopia</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-base shrink-0 mt-0.5">✉️</div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Email</h4>
                  <a href="mailto:clearance@bdu.edu.et" className="text-slate-500 hover:text-blue-700">clearance@bdu.edu.et</a>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-base shrink-0 mt-0.5">📞</div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Phone</h4>
                  <a href="tel:+251582201010" className="text-slate-500 hover:text-blue-700">+251 58 220 1010</a>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-base shrink-0 mt-0.5">⏰</div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Working Hours</h4>
                  <p className="text-slate-500">Monday – Friday<br />8:00 AM – 4:30 PM (GMT+3)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Support Form (Right Column - 7 spans) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Contact Support</h3>
              <p className="text-xs text-slate-500 mt-1">Send us a message and we will get back to you as soon as possible.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Full Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Enter your full name" 
                    value={formData.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Employee ID *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Enter your Employee ID" 
                    value={formData.employeeId}
                    onChange={(e) => updateField('employeeId', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Email *</label>
                  <input 
                    type="email" 
                    required
                    placeholder="Enter your email address" 
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Subject *</label>
                  <select 
                    required
                    value={formData.subject}
                    onChange={(e) => updateField('subject', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600 bg-white"
                  >
                    <option value="">Select subject</option>
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="Clearance Delay">Clearance Delay</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Category *</label>
                <select 
                  required
                  value={formData.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600 bg-white"
                >
                  <option value="">Select a category</option>
                  <option value="Clearance Application">Clearance Application</option>
                  <option value="Clearance Status">Clearance Status</option>
                  <option value="Document Problem">Document Problem</option>
                  <option value="Office Approval">Office Approval</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Message *</label>
                <textarea 
                  rows="4" 
                  required
                  placeholder="Type your message here..." 
                  value={formData.message}
                  onChange={(e) => updateField('message', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-xs transition flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
              >
                <span>🚀</span>
                <span>Send Message</span>
              </button>
              {formStatus && (
                <p role="status" className="border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                  {formStatus}
                </p>
              )}
            </form>
          </div>

        </div>

        {/* 3. Middle Row: Support Categories & FAQ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Support Categories (Left - 5 spans) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Support Categories</h3>
            <div className="space-y-2">
              {supportCategories.map((cat) => (
                <button type="button" key={cat.name} onClick={() => updateField('category', cat.name)} className={`w-full flex items-center justify-between p-2.5 rounded-xl transition border text-xs font-medium text-left ${formData.category === cat.name ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>
                  <div className="flex items-center space-x-2.5">
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </div>
                  <span className="text-slate-400">&gt;</span>
                </button>
              ))}
            </div>
          </div>

          {/* Frequently Asked Questions (Right - 7 spans) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-4">Frequently Asked Questions</h3>
              <div className="space-y-3">
                {[
                  'How do I start my clearance?',
                  'How can I track my clearance status?',
                  'What documents are required?',
                  'What if my clearance is rejected by an office?',
                  'How long does the clearance process take?'
                ].map((faq, index) => (
                  <div key={index} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button 
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 text-left transition"
                    >
                      <span>{faq}</span>
                      <span className="text-slate-500">{openFaq === index ? '▲' : '▼'}</span>
                    </button>
                    {openFaq === index && (
                      <div className="p-3 text-xs text-slate-600 bg-white border-t border-slate-100">
                        {faqAnswers[index]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 text-center">
              <Link to="/instruction" className="inline-block px-6 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 text-xs font-semibold rounded-lg transition">
                View All FAQs &rarr;
              </Link>
            </div>
          </div>

        </div>

        {/* 4. Our Location Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="font-bold text-slate-900 text-base">Our Location</h3>
          <p className="text-xs text-slate-500">Visit us at Bahir Dar University. You can find us on the map.</p>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
            <div>
              <a href="https://www.google.com/maps/search/?api=1&query=Bahir+Dar+University%2C+Bahir+Dar%2C+Ethiopia" target="_blank" rel="noreferrer" className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg text-xs font-semibold transition">
                <span>📍</span>
                <span>Get Directions</span>
              </a>
            </div>
            <div className="lg:col-span-3 h-48 bg-slate-200 rounded-xl overflow-hidden border border-slate-300 relative">
              <div className="absolute inset-0 bg-cover bg-center flex items-center justify-center text-slate-500 font-semibold text-xs" style={{ backgroundImage: `url('/map-placeholder.jpg')` }}>
                [ Interactive Map View - Bahir Dar University ]
              </div>
            </div>
          </div>
        </div>

        {/* 5. Important Notice Banner */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start space-x-3 text-xs text-amber-900">
          <span className="text-amber-600 text-base font-bold shrink-0">⚠️</span>
          <p>
            <strong className="font-bold">Important Notice:</strong> For urgent clearance issues, please contact the responsible office during working hours or send your request through the support form above. We will respond as soon as possible.
          </p>
        </div>

      </div>
    </div>
  );
}