"use client";

import type { HelpSection } from "@/data/helpContent";

type HelpSidebarProps = {
  sections: HelpSection[];
  selectedTopicId: string | null;
  onSelectTopic: (topicId: string) => void;
};

export function HelpSidebar({
  sections,
  selectedTopicId,
  onSelectTopic,
}: HelpSidebarProps) {
  return (
    <aside className="lg:sticky lg:top-6 lg:h-fit">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <nav aria-label="Help topics" className="space-y-5">
          {sections.length === 0 ? (
            <div className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-500">
              No topics match your search.
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.id}>
                <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {section.title}
                </h2>
                <ul className="space-y-1">
                  {section.topics.map((topic) => {
                    const isSelected = topic.id === selectedTopicId;

                    return (
                      <li key={topic.id}>
                        <button
                          type="button"
                          onClick={() => onSelectTopic(topic.id)}
                          className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                            isSelected
                              ? "bg-red-50 font-medium text-red-800"
                              : "text-neutral-700 hover:bg-neutral-50"
                          }`}
                        >
                          {topic.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </nav>
      </div>
    </aside>
  );
}
