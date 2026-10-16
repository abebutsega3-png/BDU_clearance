import { useEffect, useState } from 'react';
import axios from 'axios';
import apiBaseUrl from '../until/apiBaseUrl';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Landmark,
  Laptop,
  Library,
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

  useEffect(() => {
    const rotationTimer = window.setInterval(() => {
      setActiveImage((currentImage) => (currentImage + 1) % campusImages.length);
    }, 5000);

    return () => window.clearInterval(rotationTimer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    axios.get(`${apiBaseUrl}/api/public/home`)
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
    <main className="min-h-full bg-white font-sans text-slate-800">
      
      {/* 1. Campus Image Carousel */}
      <section className="relative isolate h-[min(68vh,680px)] min-h-[480px] overflow-hidden bg-slate-900 text-white">
        {campusImages.map((campusImg, imageIndex) => (
          <img
            key={campusImg}
            src={campusImg}
            alt={`Bahir Dar University campus view ${imageIndex + 1}`}
            className={`absolute inset-0 -z-20 h-full w-full object-cover object-center transition-opacity duration-700 ease-in-out ${
              activeImage === imageIndex ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}

        <div className="absolute inset-0 -z-10 bg-black/20" />

        <button
          type="button"
          aria-label="Previous campus image"
          onClick={() => setActiveImage((activeImage - 1 + campusImages.length) % campusImages.length)}
          className="absolute left-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/80 text-white transition hover:bg-black sm:left-7 z-10"
        >
          <ChevronLeft size={27} />
        </button>
        <button
          type="button"
          aria-label="Next campus image"
          onClick={() => setActiveImage((activeImage + 1) % campusImages.length)}
          className="absolute right-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/80 text-white transition hover:bg-black sm:right-7 z-10"
        >
          <ChevronRight size={27} />
        </button>

        {/* Hero Overlay Card */}
        <div className="absolute bottom-16 left-1/2 w-11/12 max-w-4xl -translate-x-1/2 rounded-sm bg-blue-600/40 px-6 py-6 text-center text-white backdrop-blur-sm sm:px-8">
          <h1 className="mb-2 text-4xl font-light tracking-wide leading-tight text-white drop-shadow-md sm:text-5xl">
            Bahir Dar University
          </h1>
          <p className="text-base font-light italic text-white drop-shadow sm:text-lg">
            Wisdom at the Source of the Blue Nile
          </p>
        </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 z-10" aria-label="Campus image slides">
          {campusImages.map((campusImg, imageIndex) => (
            <button
              key={campusImg}
              type="button"
              aria-label={`Show campus image ${imageIndex + 1}`}
              aria-pressed={activeImage === imageIndex}
              onClick={() => setActiveImage(imageIndex)}
              className={`h-2.5 rounded-full border border-white/80 transition-all ${
                activeImage === imageIndex ? 'w-7 bg-white' : 'w-2.5 bg-white/50 hover:bg-white'
              }`}
            />
          ))}
        </div>
      </section>

      {/* 2. Official BDU Portal Statistics Section */}
      <section className="bg-white py-14 border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 text-center md:grid-cols-4 gap-8">
            {statistics.map(([key, label, Icon]) => (
              <div key={label} className="group flex flex-col items-center">
                {/* BDU Style Blue Circle Icon */}
                <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-[#29b6f6] text-white shadow-md transition-transform group-hover:scale-105 sm:h-28 sm:w-28">
                  <Icon className="h-12 w-12 stroke-[1.5] sm:h-14 sm:w-14" />
                </div>

                {/* Stat Value */}
                <h3 className="mb-1 font-sans text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  {homeData.stats ? homeData.stats[key] : homeData.error ? '0' : '...'}
                </h3>

                {/* Stat Label */}
                <p className="text-sm font-medium text-gray-700 sm:text-base">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Official Notice / Announcement Ticker */}
      <div className="bg-amber-400 px-5 py-2.5 text-xs font-medium text-slate-950 border-b border-amber-500">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <span className="rounded bg-slate-950 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-400 shrink-0">Notice</span>
          <p className="truncate">All staff members requesting clearance must ensure their department property items are returned prior to initiating digital requests.</p>
        </div>
      </div>

      {/* 4. System Services */}
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

      {/* 5. Step-by-Step Workflow */}
      <section className="bg-slate-50 border-y border-slate-200 px-5 py-14 sm:px-8 lg:px-12">
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

      {/* 6. BDU Clearance Offices */}
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

      {/* 7. Benefits */}
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

      {/* 8. BDU About Section */}
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

      {/* 9. BDU Footer */}
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