import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import campusImageOne from '../assets/image1.png';
import campusImageTwo from '../assets/image2.png';
import campusImageThree from '../assets/image3.png';
import campusImageFour from '../assets/image4.png';

const campusImages = [campusImageOne, campusImageTwo, campusImageThree, campusImageFour];

export default function Hero() {
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const rotationTimer = window.setInterval(() => {
      setActiveImage((currentImage) => (currentImage + 1) % campusImages.length);
    }, 5500);

    return () => window.clearInterval(rotationTimer);
  }, []);

  return (
    <section className="relative isolate flex min-h-[620px] items-center overflow-hidden bg-slate-950 text-white">
      {campusImages.map((campusImage, imageIndex) => (
        <img
          key={campusImage}
          src={campusImage}
          alt={`Bahir Dar University campus view ${imageIndex + 1}`}
          className={`absolute inset-0 -z-20 h-full w-full object-cover object-center transition-opacity duration-[1400ms] ${activeImage === imageIndex ? 'hero-image-active opacity-100' : 'opacity-0'}`}
        />
      ))}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(4,15,35,0.94)_0%,rgba(4,15,35,0.78)_43%,rgba(4,15,35,0.2)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(4,15,35,0.58),transparent_42%)]" />

      <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
        <div className="hero-content max-w-3xl space-y-7">
          <div className="inline-flex items-center gap-3 rounded-full border border-amber-300/40 bg-slate-950/35 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.9)]" />
            Bahir Dar University
          </div>
          
          

          <p className="max-w-xl text-base leading-relaxed text-slate-100 drop-shadow sm:text-lg">
            Complete your employee clearance smoothly across every university department, with one secure and transparent digital process.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link 
              to="/login" 
              className="inline-flex items-center gap-3 rounded-lg bg-amber-300 px-6 py-3.5 font-semibold text-slate-950 shadow-[0_12px_30px_rgba(251,191,36,0.2)] transition duration-200 hover:-translate-y-0.5 hover:bg-amber-200"
            >
              <span>Get Started</span>
              <span aria-hidden="true">-&gt;</span>
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-3 rounded-lg border border-white/50 bg-white/10 px-6 py-3.5 font-semibold text-white backdrop-blur-sm transition duration-200 hover:bg-white hover:text-slate-900"
            >
              <span>Learn More</span>
              <span aria-hidden="true">-&gt;</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 pt-2" aria-label="Campus image slides">
            {campusImages.map((campusImage, imageIndex) => (
              <button
                key={campusImage}
                type="button"
                aria-label={`Show campus image ${imageIndex + 1}`}
                aria-pressed={activeImage === imageIndex}
                onClick={() => setActiveImage(imageIndex)}
                className={`h-2 rounded-full transition-all duration-300 ${activeImage === imageIndex ? 'w-10 bg-amber-300' : 'w-2 bg-white/60 hover:bg-white'}`}
              />
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}