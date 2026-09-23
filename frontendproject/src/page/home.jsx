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
    Landmark,
    Laptop,
    Library,
    SearchCheck,
    ShieldCheck,
    Users,
} from 'lucide-react';
import campusImage from '../assets/image1.png';

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

const benefits = ['Faster Clearance Process', 'Centralized Employee Records', 'Office-to-Office Digital Workflow', 'Transparent Department Tracking', 'Reduced Paperwork & Manual Errors', 'Quick Access to Clearance Data'];

export default function Home() {
    const [homeData, setHomeData] = useState({ stats: null, offices: [], error: false });

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
        <main className="min-h-full bg-white text-slate-800">
            <section className="relative isolate overflow-hidden bg-[#08264d] text-white">
                <img src={campusImage} alt="Bahir Dar University campus" className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-55" />
                <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(3,24,53,0.96)_0%,rgba(5,42,82,0.76)_52%,rgba(5,42,82,0.28)_100%)]" />
                <div className="mx-auto grid min-h-[390px] max-w-7xl items-center px-5 py-16 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-12">
                    <div className="max-w-2xl">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-sky-300">Bahir Dar University</p>
                        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">Employee Clearance<br />Management System</h1>
                        <p className="mt-5 max-w-lg text-sm leading-6 text-slate-200 sm:text-base">Simple, secure and digital employee clearance. Complete your clearance process and receive your certificate through one centralized platform.</p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <Link to="/login" className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300">Start Clearance <ArrowRight size={16} /></Link>
                            <Link to="/instruction" className="inline-flex items-center gap-2 rounded-md border border-white/60 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-slate-900">Learn More <ArrowRight size={16} /></Link>
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-b border-slate-100 bg-white">
                <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4">
                    {statistics.map(([key, label, Icon]) => (
                        <div key={label} className="flex items-center gap-3 px-4 py-5 sm:justify-center"><Icon className="text-sky-600" size={22} /><div><strong className="block text-lg text-slate-900">{homeData.stats ? homeData.stats[key] : homeData.error ? '0' : '...'}</strong><span className="text-[10px] text-slate-500 sm:text-xs">{label}</span></div></div>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12">
                <SectionHeading eyebrow="Our Services" title="Everything you need for a smooth clearance process" />
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {services.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-sky-300"><Icon className="text-sky-600" size={24} /><h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{text}</p><Link to="/services" className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-sky-700">Learn More <ArrowRight size={13} /></Link></article>)}
                </div>
            </section>

            <section className="bg-sky-50 px-5 py-14 sm:px-8 lg:px-12">
                <div className="mx-auto max-w-7xl"><SectionHeading eyebrow="How the Clearance Process Works" title="A clear path from request to certificate" /><div className="mt-9 grid gap-6 sm:grid-cols-3 lg:grid-cols-6">{steps.map(([number, title, text]) => <div key={number} className="relative text-center"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">{number}</div><h3 className="mt-3 text-xs font-bold text-slate-900">{title}</h3><p className="mt-1 text-[11px] leading-4 text-slate-500">{text}</p></div>)}</div></div>
            </section>

            <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12"><SectionHeading eyebrow="Clearance Offices" title="Get verification from the responsible offices" /><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{homeData.offices.length ? homeData.offices.map(({ name, description }) => { const Icon = Object.entries(officeIcons).find(([key]) => name.toLowerCase().includes(key))?.[1] || BadgeCheck; return <div key={name} className="rounded-lg border border-slate-200 p-5 text-center"><Icon className="mx-auto text-emerald-600" size={25} /><h3 className="mt-3 text-xs font-bold text-slate-900">{name}</h3><p className="mt-1 text-[11px] text-slate-500">{description}</p></div>; }) : <p className="col-span-full text-center text-sm text-slate-500">No active clearance offices configured.</p>}</div></section>

            <section className="bg-sky-50 px-5 py-12 sm:px-8 lg:px-12"><div className="mx-auto max-w-7xl"><SectionHeading eyebrow="Why Use This System?" title="A better clearance experience for everyone" /><div className="mt-7 grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{benefits.map((benefit) => <div key={benefit} className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle2 size={15} className="shrink-0 text-emerald-500" />{benefit}</div>)}</div></div></section>

            <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:px-12"><img src={campusImage} alt="Bahir Dar University" className="h-56 w-full rounded-lg object-cover" /><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">About Bahir Dar University</p><h2 className="mt-2 text-2xl font-extrabold text-slate-900">Serving our university community</h2><p className="mt-4 text-sm leading-6 text-slate-500">Bahir Dar University is committed to providing efficient, transparent, and accessible services for its employees. This platform simplifies the clearance journey while keeping every step accountable.</p><Link to="/about" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-sky-700">Learn More About BDU <ArrowRight size={16} /></Link></div></section>
        </main>
    );
}

function SectionHeading({ eyebrow, title }) {
    return <div className="text-center"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">{eyebrow}</p><h2 className="mt-2 text-xl font-extrabold text-slate-900 sm:text-2xl">{title}</h2></div>;
}