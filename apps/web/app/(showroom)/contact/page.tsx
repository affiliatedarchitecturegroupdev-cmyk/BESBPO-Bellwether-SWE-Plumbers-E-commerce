import { Metadata } from 'next';
import { ContactForm } from '@/components/commerce/ContactForm';

export const metadata: Metadata = { 
  title: 'Contact Us | Bellwether SWE Plumbers',
  description: 'Get in touch with Bellwether SWE Plumbers. Contact us for product inquiries, order questions, or trade account applications.',
};

export default function ContactPage() {
  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">Contact Us</h1>
      <p className="text-steel text-sm sm:text-base mb-8">
        Have a question? Fill out the form below and we&apos;ll get back to you within 24 hours.
      </p>

      {/* Contact Form */}
      <div className="bg-white border border-black/10 rounded-sm p-4 sm:p-6 mb-8">
        <ContactForm />
      </div>

      {/* Alternative Contact Methods */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="border border-black/10 rounded-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-hydra" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="font-semibold">Email</h3>
          </div>
          <p className="text-steel">
            <a href="mailto:info@bswe.besbpo.co.za" className="text-hydra hover:underline">
              info@bswe.besbpo.co.za
            </a>
          </p>
        </div>

        <div className="border border-black/10 rounded-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-hydra" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <h3 className="font-semibold">Phone</h3>
          </div>
          <p className="text-steel">
            <a href="tel:+27115550123" className="text-hydra hover:underline">
              +27 11 555 0123
            </a>
          </p>
        </div>
      </div>

      {/* Order Questions */}
      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-sm">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800 mb-1">Order Questions?</p>
            <p className="text-xs text-amber-700">
              For a question about an existing order, signing in and viewing that order directly under{' '}
              <a href="/account/orders" className="text-hydra hover:underline">
                Account → Orders
              </a>{' '}
              is usually the fastest way to see its current status.
            </p>
          </div>
        </div>
      </div>

      {/* Trade Accounts */}
      <div className="mt-4 p-4 bg-hydra/5 border border-hydra/20 rounded-sm">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-hydra mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-ink mb-1">Trade Accounts</p>
            <p className="text-xs text-steel">
              Want trade pricing? Apply directly at{' '}
              <a href="/trade/apply" className="text-hydra hover:underline">
                Apply for a Trade Account
              </a>{' '}
              once signed in — we review every application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
