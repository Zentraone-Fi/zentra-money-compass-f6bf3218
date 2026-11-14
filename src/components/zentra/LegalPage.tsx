import { PageHeader, PageShell } from "./PageHeader";
import { Panel } from "./Panel";

export function LegalPage({ title, sections }: { title: string; sections: { h: string; p: string }[] }) {
  return (
    <PageShell>
      <PageHeader title={title} subtitle="Draft — this text is pending legal review and may change before launch." />
      <Panel className="max-w-3xl">
        <div className="space-y-6">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-lg font-medium">{s.h}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-text-2">{s.p}</p>
            </section>
          ))}
        </div>
      </Panel>
    </PageShell>
  );
}
