import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Globe,
  GraduationCap,
  Landmark,
  Laptop,
  Library,
  Mail,
  Phone,
  SearchCheck,
  ShieldCheck,
  Users,
} from 'lucide-react';

import campusImageFive from '../assets/bahir_dar.pg5.jpg';
import campusImageOne from '../assets/image1.png';
import campusImageTwo from '../assets/image2.png';
import campusImageThree from '../assets/image3.png';
import campusImageFour from '../assets/image4.png';

const campusImages = [
  campusImageFive,
  campusImageOne,
  campusImageTwo,
  campusImageThree,
  campusImageFour,
];

const services = [
  { icon: ClipboardCheck, title: 'Clearance Request', text: 'Submit and track your clearance request online.' },
  { icon: ShieldCheck, title: 'Office Verification', text: 'Finance, library, property, and ICT teams review securely.' },
  { icon: SearchCheck, title: 'Request Tracking', text: 'Monitor the status of every clearance step in one place.' },
  { icon: FileCheck2, title: 'Digital Certificate', text: 'Generate, view, and download your completed certificate.' },
];

const steps = [
  ['01', 'Submit Request', 'Start your clearance request'],
  ['02', 'HR Review', 'HR checks your request'],
  ['03', 'Department Review', 'Department approves'],
  ['04', 'Office Verification', 'Finance, library and property'],
  ['05', 'HR Final Review', 'Final check and approval'],
  ['06', 'Certificate Issued', 'Download your certificate'],
];

const officeIcons = { finance: Landmark, library: Library, property: Building2, asset: Building2, ict: Laptop };

const benefits = [
  'Faster Clearance Process',
  'Centralized Employee Records',
  'Office-to-Office Digital Workflow',
  'Transparent Department Tracking',
  'Reduced Paperwork & Manual Errors',
  'Quick Access to Clearance Data',
];

export default function Home() {
  const [homeData, setHomeData] = useState({ stats: null, offices: [], error: false });
  const [activeImage, setActiveImage] = useState(0);

  // Fast image rotation (3 seconds with 500ms transition)
  useEffect(() => {
    const rotationTimer = window.setInterval(() => {
      setActiveImage((currentImage) => (currentImage + 1) % campusImages.length);
    }, 3000);

    return () => window.clearInterval(rotationTimer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    axios.get('/api/public/home')
      .then(({ data }) => {
        if (isMounted && data.success) setHomeData({ stats: data.stats, offices: data.offices || [], error: false });
        else if (isMounted) setHomeData((current) => ({ ...current, error: true }));
      })
      .catch((error) => {
        console.error('Unable to load public home data:', error);
        if (isMounted) setHomeData((current) => ({ ...current, error: true }));
      });
    return () => { isMounted = false; };
  }, []);

  const statistics = [
    ['registeredEmployees', 'Registered Employees', Users],
    ['pendingRequests', 'Pending Requests', FileText],
    ['completedClearances', 'Completed Clearances', CheckCircle2],
    ['issuedCertificates', 'Issued Certificates', FileCheck2],
  ];

  return (
    <main className="min-h-full bg-slate-50 font-sans text-slate-800">
      
      {/* 1. Official BDU Top Info Bar */}
      <div className="bg-[#001738] text-xs text-slate-300 py-2 px-5 sm:px-8 border-b border-slate-800">
        <div className="mx-auto max-w-7xl flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Mail size={13} className="text-amber-400" /> info@bdu.edu.et</span>
            <span className="hidden sm:flex items-center gap-1.5"><Phone size={13} className="text-amber-400" /> +251 58 220 5925</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://www.bdu.edu.et" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-amber-400 transition">
              <Globe size={13} /> Official BDU Website
            </a>
            <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-semibold text-[10px]">Wisdom at the Source of the Blue Nile</span>
          </div>
        </div>
      </div>

      {/* 2. Hero Section with BDU Color Palette */}
      <section className="relative isolate overflow-hidden bg-[#001c3d] text-white">
        {campusImages.map((campusImg, imageIndex) => (
          <img
            key={campusImg}
            src={campusImg}
            alt={`Bahir Dar University campus view ${imageIndex + 1}`}
            className={`absolute inset-0 -z-20 h-full w-full object-cover object-center transition-opacity duration-500 ease-in-out ${
              activeImage === imageIndex ? 'opacity-40' : 'opacity-0'
            }`}
          />
        ))}

        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(0,33,71,0.95)_0%,rgba(0,33,71,0.75)_50%,rgba(0,33,71,0.3)_100%)]" />
        
        <div className="mx-auto grid min-h-[420px] max-w-7xl items-center px-5 py-16 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-400/30 mb-4">
              <GraduationCap size={15} /> BDU Digital Services
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-5xl text-white">
              Online Employee Clearance Management System
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-200 sm:text-base">
              A secure, transparent, and centralized digital clearance system designed for Bahir Dar University academic and administrative staff.
            </p>
            
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/login" className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-lg transition hover:bg-amber-300 hover:shadow-amber-400/20">
                Start Clearance Process <ArrowRight size={16} />
              </Link>
              <Link to="/instruction" className="inline-flex items-center gap-2 rounded-md border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white hover:text-[#002147]">
                System Instructions
              </Link>
            </div>

            {/* Slide Indicators */}
            <div className="flex items-center gap-2 pt-8" aria-label="Campus image slides">
              {campusImages.map((campusImg, imageIndex) => (
                <button
                  key={campusImg}
                  type="button"
                  aria-label={`Show slide ${imageIndex + 1}`}
                  onClick={() => setActiveImage(imageIndex)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    activeImage === imageIndex ? 'w-8 bg-amber-400' : 'w-2 bg-white/40 hover:bg-white'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Official Notice / Announcement Ticker */}
      <div className="bg-amber-400 text-slate-950 px-5 py-2.5 font-medium text-xs border-b border-amber-500">
        <div className="mx-auto max-w-7xl flex items-center gap-3">
          <span className="font-extrabold uppercase bg-slate-950 text-amber-400 px-2 py-0.5 rounded text-[10px]">Notice</span>
          <p className="truncate">All staff members requesting clearance must ensure their department property items are returned prior to initiating digital requests.</p>
        </div>
      </div>

      {/* 5. Live Portal Statistics */}
      <section className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4">
          {statistics.map(([key, label, Icon]) => (
            <div key={label} className="flex items-center gap-3 px-4 py-6 sm:justify-center">
              <div className="p-2.5 rounded-lg bg-sky-50 text-[#002147]">
                <Icon size={22} />
              </div>
              <div>
                <strong className="block text-xl font-black text-slate-900">{homeData.stats ? homeData.stats[key] : homeData.error ? '0' : '...'}</strong>
                <span className="text-[11px] font-semibold text-slate-500 uppercase">{label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. System Services */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12">
        <SectionHeading eyebrow="Clearance Services" title="Streamlined Digital Workflows" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#002147] hover:shadow-md">
              <div className="inline-block p-3 rounded-lg bg-[#002147] text-amber-400">
                <Icon size={22} />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* 7. Step-by-Step Workflow */}
      <section className="bg-slate-100 border-y border-slate-200 px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Clearance Steps" title="How the Process Works" />
          <div className="mt-10 grid gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {steps.map(([number, title, text]) => (
              <div key={number} className="relative text-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#002147] text-xs font-extrabold text-amber-400">
                  {number}
                </div>
                <h3 className="mt-3 text-xs font-bold text-slate-900">{title}</h3>
                <p className="mt-1 text-[11px] text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. BDU Clearance Offices */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12">
        <SectionHeading eyebrow="Verification Units" title="Participating Clearance Offices" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {homeData.offices.length ? (
            homeData.offices.map(({ name, description }) => {
              const Icon = Object.entries(officeIcons).find(([key]) => name.toLowerCase().includes(key))?.[1] || BadgeCheck;
              return (
                <div key={name} className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                  <Icon className="mx-auto text-[#002147]" size={26} />
                  <h3 className="mt-3 text-xs font-bold text-slate-900">{name}</h3>
                  <p className="mt-1 text-[11px] text-slate-500">{description}</p>
                </div>
              );
            })
          ) : (
            <p className="col-span-full text-center text-sm text-slate-500">No active clearance offices configured.</p>
          )}
        </div>
      </section>

      {/* 9. Benefits */}
      <section className="bg-[#002147] text-white px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400">System Advantages</p>
            <h2 className="mt-1 text-2xl font-extrabold text-white">Why BDU Staff Use Digital Clearance</h2>
          </div>
          <div className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10 text-xs text-slate-200">
                <CheckCircle2 size={16} className="shrink-0 text-amber-400" />
                {benefit}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. BDU About Section */}
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:px-12">
        <img src={campusImages[activeImage]} alt="Bahir Dar University" className="h-64 w-full rounded-xl object-cover shadow-md border border-slate-200" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#002147]">About BDU Clearance Portal</p>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-900">Wisdom at the Source of the Blue Nile</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Bahir Dar University is committed to integrating modern ICT solutions into its administrative workflows. This portal provides employees with a fast, traceable, and error-free clearance experience across all campuses and departments.
          </p>
          <Link to="/about" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#002147] hover:text-amber-600">
            Learn More About BDU Clearance Guidelines <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* 11. BDU Footer */}
      <footer className="bg-slate-950 text-slate-400 text-xs py-8 px-5 border-t border-slate-800">
        <div className="mx-auto max-w-7xl text-center space-y-2">
          <p className="text-slate-200 font-semibold">Bahir Dar University — Employee Clearance System</p>
          <p>© {new Date().getFullYear()} Bahir Dar University. All Rights Reserved.</p>
        </div>
      </footer>

    </main>
  );
}

function SectionHeading({ eyebrow, title }) {
  return (
    <div className="text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#002147] font-extrabold">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">{title}</h2>
    </div>
  );
}