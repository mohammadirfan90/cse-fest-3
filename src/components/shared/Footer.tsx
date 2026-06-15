"use client";

import * as React from "react";
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

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 z-10">
        {/* Contact Info & Map Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-b border-neutral-900 pb-12 mb-10">
          {/* Contact Details */}
          <div className="space-y-5">
            <h4 className="font-heading font-semibold text-neutral-300 uppercase tracking-widest text-sm">
              Contact Info
            </h4>
            <ul className="space-y-4 text-sm text-neutral-500 font-sans">
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-neutral-900/80 border border-neutral-800/60 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-accent" />
                </div>
                <a
                  href={`mailto:${contact.email}`}
                  className="hover:text-neutral-200 transition-colors truncate"
                >
                  {contact.email}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-neutral-900/80 border border-neutral-800/60 flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4 text-accent" />
                </div>
                <a
                  href={`tel:${contact.phone}`}
                  className="hover:text-neutral-200 transition-colors"
                >
                  {contact.phone}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-neutral-900/80 border border-neutral-800/60 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4 text-accent" />
                </div>
                <span className="leading-relaxed text-neutral-400">{contact.address}</span>
              </li>
            </ul>
          </div>

          {/* Venue Map */}
          <div className="space-y-5">
            <h4 className="font-heading font-semibold text-neutral-300 uppercase tracking-widest text-sm">
              Venue
            </h4>
            <div className="rounded-md overflow-hidden border border-neutral-800/60 bg-neutral-900/50 p-2 space-y-2 max-w-md">
              <div className="w-full h-[150px] rounded-[10px] overflow-hidden relative border border-neutral-800/40">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d8980.229851246706!2d90.3747894839798!3d23.850253196212158!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755c416dd65bd2f%3A0x3ee4d56c0682b45f!2sShanto-Mariam%20University%20of%20Creative%20Technology!5e1!3m2!1sen!2sbd!4v1781554153849!5m2!1sen!2sbd"
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
                <span className="text-xs text-neutral-500 font-sans">
                  Sector 17, Uttara, Dhaka
                </span>
                <a
                  href={contact.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent/80 hover:underline font-sans transition-colors"
                >
                  <span>Open Maps</span>
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright notice */}
        <div className="flex flex-col items-center justify-center text-center gap-4 text-sm text-neutral-600 font-sans">
          <p>
            © {currentYear}{" "}
            <span className="text-neutral-500">Department of CSE &amp; CSIT, SMUCT.</span>
            {" "}All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
