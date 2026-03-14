"use client";

import { useMemo, useState } from "react";
import { HelpSidebar } from "./HelpSidebar";
import { HelpArticle } from "./HelpArticle";
import type { HelpSection, HelpTopic } from "@/data/helpContent";

type HelpLayoutProps = {
  sections: HelpSection[];
};

function findFirstTopic(sections: HelpSection[]): HelpTopic | null {
  for (const section of sections) {
    if (section.topics.length > 0) return section.topics[0];
  }
  return null;
}

export function HelpLayout({ sections }: HelpLayoutProps) {
  const [query, setQuery] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(
    findFirstTopic(sections)?.id ?? null
  );

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;

    return sections
      .map((section) => {
        const matchingTopics = section.topics.filter((topic) => {
          const haystack = [
            topic.title,
            topic.summary,
            ...(topic.tags ?? []),
            ...topic.sections.map((s) => `${s.title} ${s.content}`),
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(q);
        });

        return {
          ...section,
          topics: matchingTopics,
        };
      })
      .filter((section) => section.topics.length > 0);
  }, [query, sections]);

  const selectedTopic =
    filteredSections
      .flatMap((section) => section.topics)
      .find((topic) => topic.id === selectedTopicId) ??
    findFirstTopic(filteredSections) ??
    findFirstTopic(sections);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-6 py-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
              Dispatch
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Help Centre
            </h1>
            <p className="mt-2 max-w-4xl text-sm text-neutral-600">
              Guidance for planning facilitators, platform leads, agile delivery
              teams and stakeholders using Dispatch during PI Planning.
            </p>
          </div>

          <div className="max-w-xl">
            <label htmlFor="help-search" className="sr-only">
              Search help topics
            </label>
            <input
              id="help-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topics (dependencies, sorting frame, dashboard...)"
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-neutral-400 focus:border-red-500"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[300px_minmax(0,1fr)_280px] lg:px-8">
        <HelpSidebar
          sections={filteredSections}
          selectedTopicId={selectedTopic?.id ?? null}
          onSelectTopic={setSelectedTopicId}
        />

        <HelpArticle topic={selectedTopic} />

        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Quick Tips
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-neutral-600">
                <li>Use the Sorting Frame to understand overall sequencing.</li>
                <li>Use Team Planning Room to focus on one team’s quarter.</li>
                <li>
                  Use Dependencies Near You to surface blockers early in the
                  day.
                </li>
                <li>
                  Use the Live Tracking Dashboard for situational awareness.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Did you know?
              </h3>
              <p className="mt-3 text-sm text-neutral-600">
                Dispatch is designed to complement Jira and Azure DevOps rather
                than replace them. Teams continue working in BAU tooling while
                Dispatch provides orchestration and visibility.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">
                Future roadmap
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-neutral-600">
                <li>Direct ADO integration</li>
                <li>Jira integration</li>
                <li>Advanced risk heatmaps</li>
                <li>Scenario simulation</li>
                <li>Readiness scoring</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
