"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";
import useSWR from "swr";
import { CONTACT_DETAILS } from "@/constants/content";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ContactData {
  email?: string;
  phone?: string;
  facebook?: string;
  linkedin?: string;
  address?: string;
  maps_url?: string;
}

export function Footer() {
  const { data } = useSWR<{ success: boolean; data: ContactData | null }>(
    "/api/public/cms/contact",
    fetcher
  );

  const contact = React.useMemo(() => {
    const dbData = data?.success ? data.data : null;
    return {
      email: dbData?.email || CONTACT_DETAILS.email,
      phone: dbData?.phone || CONTACT_DETAILS.phone,
      facebook: dbData?.facebook || CONTACT_DETAILS.facebook,
      linkedin: dbData?.linkedin || CONTACT_DETAILS.linkedin,
      address: dbData?.address || CONTACT_DETAILS.address,
      mapsUrl: dbData?.maps_url || CONTACT_DETAILS.mapsUrl,
    };
  }, [data]);

  const currentYear = new Date().getFullYear();

  return (
    <footer id="contact" className="relative bg-neutral-950 mt-auto">
      {/* Gradient top — seamless transition from CTA section above */}
      <div
        className="absolute top-0 inset-x-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(99,102,241,0.4), rgba(139,92,246,0.3), transparent)",
        }}
        aria-hidden="true"
      />
      {/* Subtle grid texture */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.025] pointer-events-none" aria-hidden="true" />

      {/* Top gradient bleed to create depth */}
      <div
        className="absolute top-0 inset-x-0 h-48 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(99,102,241,0.06), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand & Tagline */}
          <div className="space-y-5">
            <Link href="/" className="flex items-center group relative h-9 w-[126px]">
              <Image
                src="/logo of smuct and cse fest combined light.png"
                alt="SMUCT CSE Fest '26 Logo"
                width={126}
                height={36}
                className="h-9 w-auto object-contain transition-transform duration-150 group-hover:scale-[1.02] dark:hidden"
              />
              <Image
                src="/logo of smuct and cse fest combined (for dark mode).png"
                alt="SMUCT CSE Fest '26 Dark Logo"
                width={126}
                height={36}
                className="h-9 w-auto object-contain transition-transform duration-150 group-hover:scale-[1.02] hidden dark:block"
              />
            </Link>
            <p className="text-sm text-neutral-500 font-sans leading-relaxed">
              {"SMUCT's premier national technology festival, empowering future computer science innovators."}
            </p>
            {/* Social links */}
            <div className="flex gap-3">
              <a
                href={contact.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg border border-neutral-800/80 bg-neutral-900/60 flex items-center justify-center text-neutral-500 hover:text-accent hover:border-accent/30 hover:bg-accent/5 transition-all duration-200"
                aria-label="Facebook"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                </svg>
              </a>
              <a
                href={contact.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg border border-neutral-800/80 bg-neutral-900/60 flex items-center justify-center text-neutral-500 hover:text-accent hover:border-accent/30 hover:bg-accent/5 transition-all duration-200"
                aria-label="LinkedIn"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-semibold text-neutral-300 mb-5 uppercase tracking-widest text-sm">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-sm text-neutral-500 font-sans">
              {[
                { label: "About", href: "#about" },
                { label: "Competitions", href: "#competitions" },
                { label: "Timeline", href: "#timeline" },
                { label: "FAQs", href: "#faq" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="hover:text-neutral-200 transition-colors duration-150 flex items-center gap-1 group"
                  >
                    <span className="w-0 h-px bg-accent transition-all duration-200 group-hover:w-3 rounded-full" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="font-heading font-semibold text-neutral-300 mb-5 uppercase tracking-widest text-sm">
              Contact Info
            </h4>
            <ul className="space-y-3 text-sm text-neutral-500 font-sans">
              <li className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-neutral-900/80 border border-neutral-800/60 flex items-center justify-center shrink-0">
                  <Mail className="h-3.5 w-3.5 text-accent" />
                </div>
                <a
                  href={`mailto:${contact.email}`}
                  className="hover:text-neutral-200 transition-colors truncate"
                >
                  {contact.email}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-neutral-900/80 border border-neutral-800/60 flex items-center justify-center shrink-0">
                  <Phone className="h-3.5 w-3.5 text-accent" />
                </div>
                <a
                  href={`tel:${contact.phone}`}
                  className="hover:text-neutral-200 transition-colors"
                >
                  {contact.phone}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-md bg-neutral-900/80 border border-neutral-800/60 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-accent" />
                </div>
                <span className="leading-relaxed">{contact.address}</span>
              </li>
            </ul>
          </div>

          {/* Venue map */}
          <div>
            <h4 className="font-heading font-semibold text-neutral-300 mb-5 uppercase tracking-widest text-sm">
              Venue
            </h4>
            <div className="rounded-md overflow-hidden border border-neutral-800/60 bg-neutral-900/50 p-2 space-y-2">
              <div className="w-full h-[140px] rounded-[10px] overflow-hidden relative border border-neutral-800/40">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3650.0620245030245!2d90.39958747530666!3d23.874493386617066!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755c4250278168f%3A0x6b4f74d008453489!2sShanto-Mariam%20University%20of%20Creative%20Technology!5e0!3m2!1sen!2sbd!4v1718090000000!5m2!1sen!2sbd"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="SMUCT Campus Map"
                />
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-sm text-neutral-500 font-sans leading-normal">
                  Sector 17, Uttara, Dhaka
                </span>
                <a
                  href={contact.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent/80 hover:underline font-sans transition-colors"
                >
                  <span>Open Maps</span>
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar — premium gradient accent line above */}
        <div className="mt-14 pt-6 relative">
          {/* Premium gradient accent line */}
          <div
            className="absolute top-0 inset-x-0 h-px"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(99,102,241,0.4), rgba(139,92,246,0.3), transparent)",
            }}
            aria-hidden="true"
          />
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-neutral-600 font-sans">
            <p>
              © {currentYear}{" "}
              <span className="text-neutral-500">Department of CSE &amp; CSIT, SMUCT.</span>
              {" "}All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-neutral-400 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-neutral-400 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
