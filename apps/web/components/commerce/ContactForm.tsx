'use client';

import { useState, useTransition } from 'react';

interface ContactFormProps {
  onSuccess?: () => void;
}

export function ContactForm({ onSuccess }: ContactFormProps) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!formData.message.trim()) {
      setError('Please enter your message');
      return;
    }

    startTransition(async () => {
      // Simulate form submission - in production this would call the API
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSuccess(true);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      onSuccess?.();
    });
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-sm p-6 text-center">
        <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-green-800 mb-2">Message Sent!</h3>
        <p className="text-sm text-green-700">
          Thank you for contacting us. We&apos;ll get back to you within 24 hours.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-4 text-sm text-green-600 hover:text-green-800 underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full border border-black/15 rounded-sm px-3 py-2.5 text-sm"
            placeholder="Your full name"
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full border border-black/15 rounded-sm px-3 py-2.5 text-sm"
            placeholder="your@email.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">
            Phone
          </label>
          <input
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            className="w-full border border-black/15 rounded-sm px-3 py-2.5 text-sm"
            placeholder="+27 XX XXX XXXX"
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">
            Subject
          </label>
          <select
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className="w-full border border-black/15 rounded-sm px-3 py-2.5 text-sm bg-white"
          >
            <option value="">Select a topic</option>
            <option value="general">General Inquiry</option>
            <option value="order">Order Question</option>
            <option value="product">Product Information</option>
            <option value="trade">Trade Account</option>
            <option value="returns">Returns / Refunds</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          rows={5}
          className="w-full border border-black/15 rounded-sm px-3 py-2.5 text-sm resize-none"
          placeholder="How can we help you?"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-sm">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full sm:w-auto bg-ink text-white font-mono text-[11px] uppercase tracking-wide px-8 py-3 rounded-sm disabled:opacity-60 hover:bg-ink/90 transition-colors"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending…
          </span>
        ) : (
          'Send Message'
        )}
      </button>
    </form>
  );
}
