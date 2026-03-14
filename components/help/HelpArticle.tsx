import { HelpAccordion } from "./HelpAccordion";
import type { HelpTopic } from "@/data/helpContent";

type HelpArticleProps = {
  topic: HelpTopic | null;
};

export function HelpArticle({ topic }: HelpArticleProps) {
  if (!topic) {
    return (
      <main className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold">No topic selected</h2>
        <p className="mt-3 text-sm text-neutral-600">
          Choose a topic from the Help sidebar to get started.
        </p>
      </main>
    );
  }

  return (
    <main className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm lg:p-8">
      <div className="border-b border-neutral-200 pb-6">
        <div className="flex flex-wrap gap-2">
          {(topic.tags ?? []).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700"
            >
              {tag}
            </span>
          ))}
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900">
          {topic.title}
        </h1>

        <p className="mt-3 max-w-4xl text-base leading-7 text-neutral-600">
          {topic.summary}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {topic.callout && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">Important</p>
            <p className="mt-2 text-sm leading-6 text-red-900">
              {topic.callout}
            </p>
          </div>
        )}

        {topic.sections.map((section) => (
          <HelpAccordion
            key={section.id}
            title={section.title}
            defaultOpen={section.defaultOpen}
          >
            <div className="space-y-4">
              <p className="whitespace-pre-line text-sm leading-7 text-neutral-700">
                {section.content}
              </p>

              {section.bullets && section.bullets.length > 0 && (
                <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-neutral-700">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}

              {section.tip && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Tip
                  </p>
                  <p className="mt-2 text-sm leading-6 text-blue-900">
                    {section.tip}
                  </p>
                </div>
              )}

              {section.warning && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Warning
                  </p>
                  <p className="mt-2 text-sm leading-6 text-amber-900">
                    {section.warning}
                  </p>
                </div>
              )}
            </div>
          </HelpAccordion>
        ))}
      </div>
    </main>
  );
}
