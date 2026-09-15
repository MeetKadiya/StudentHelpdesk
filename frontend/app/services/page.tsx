"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { CAMPUS_SERVICES, type CampusService } from "@/data/student-services";
import { ServiceActionDialog } from "@/components/service-action-dialog";

const CATEGORIES = [
  "All",
  "Academic",
  "Financial",
  "Registrar",
  "Technology",
  "Facilities",
  "Library",
  "Health",
  "Career",
] as const;

export default function ServicesPage() {
  const { isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModalService, setActiveModalService] = useState<CampusService | null>(null);

  const filteredServices = CAMPUS_SERVICES.filter((service) => {
    const matchesCategory =
      selectedCategory === "All" || service.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.commonRequests.some((req) =>
        req.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-line pb-6">
        <p className="font-display text-sm italic text-ledger">University Portal</p>
        <h1 className="mt-1 font-display text-3xl font-medium text-ink">
          Campus Student Services Directory
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Access essential academic, administrative, financial, and student life services.
          Select any service to view department office hours, locations, or submit a direct inquiry.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-ledger text-paper-raised"
                  : "border border-line bg-paper-raised text-ink-muted hover:border-ledger/40 hover:text-ink"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search services, forms, offices..."
            className="field-input !py-1.5 !text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-muted hover:text-ink"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="surface-card px-6 py-12 text-center">
          <p className="text-base font-medium text-ink">No matching services found</p>
          <p className="mt-1 text-sm text-ink-muted">
            Try adjusting your search terms or selecting a different category filter.
          </p>
          <button
            onClick={() => {
              setSelectedCategory("All");
              setSearchQuery("");
            }}
            className="btn-secondary mt-4 !py-1.5 !px-3"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="surface-card flex flex-col justify-between overflow-hidden border border-line transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* Card Header & Content */}
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-ledger-light/15 px-2 py-0.5 text-[11px] font-semibold text-ledger-dark uppercase tracking-wider">
                    {service.category}
                  </span>
                  {service.badge && (
                    <span className="rounded-full bg-stamp-light/20 px-2 py-0.5 text-[10px] font-medium text-stamp">
                      {service.badge}
                    </span>
                  )}
                </div>

                <h2 className="mt-3 font-display text-lg font-medium leading-snug text-ink">
                  {service.title}
                </h2>
                <p className="text-xs text-stamp font-medium mt-0.5">
                  {service.department}
                </p>

                <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                  {service.description}
                </p>

                {/* Common Requests */}
                <div className="mt-4 border-t border-line/60 pt-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                    Available Inquiries:
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {service.commonRequests.slice(0, 3).map((req, i) => (
                      <li key={i} className="flex items-center text-xs text-ink/80">
                        <span className="mr-1.5 text-stamp">•</span>
                        <span className="truncate">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Card Footer */}
              <div className="border-t border-line bg-paper-raised/60 px-5 py-3 text-xs text-ink-muted">
                <div className="space-y-0.5 pb-3">
                  <p className="truncate">
                    <span className="font-medium text-ink">Location:</span> {service.location}
                  </p>
                  <p className="truncate">
                    <span className="font-medium text-ink">Hours:</span> {service.hours}
                  </p>
                </div>

                {isAuthenticated ? (
                  <button
                    onClick={() => setActiveModalService(service)}
                    className="btn-primary w-full !py-2 !text-xs font-bold"
                  >
                    ⚡ {service.actionLabel}
                  </button>
                ) : (
                  <Link
                    href={`/login?returnUrl=/services`}
                    className="btn-secondary block w-full !py-2 !text-xs font-bold text-center"
                  >
                    Log In to Access Service
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Service Action Dialog */}
      <ServiceActionDialog
        service={activeModalService}
        isOpen={activeModalService !== null}
        onClose={() => setActiveModalService(null)}
      />
    </div>
  );
}
