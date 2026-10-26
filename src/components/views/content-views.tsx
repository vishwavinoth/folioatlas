"use client";

import type { ClientIndex } from "@/lib/portfolio/types";
import { CLASSIFICATION_RULES } from "@/lib/portfolio/classify";
import { useFeatures } from "@/lib/features/context";

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="fa-prose max-w-2xl">{children}</div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export function AboutView({ index }: { index: ClientIndex }) {
  return (
    <div className="motion-fade-in mx-auto w-full max-w-5xl px-4 pb-12 pt-8 sm:pt-10">
      <Prose>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">About FolioAtlas</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
          <strong className="text-foreground">One beautiful place to discover real developer portfolios.</strong>{" "}
          FolioAtlas is a searchable, fast and accessible directory of developer portfolios collected by the open-source
          community repository{" "}
          <a
            className="text-[var(--fa-accent)] hover:underline"
            href={`https://github.com/${index.source.repository}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {index.source.repository}
          </a>
          . Every entry you see here comes from that repository — nothing on this site is invented, generated, or
          embellished.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
          The directory is built for developers looking for presentation inspiration, recruiters and hiring managers
          exploring publicly available portfolios, students learning how experienced developers present their work, and
          open-source contributors tracing entries back to their source. You can search by name, domain, or primary
          focus area, browse alphabetically, and jump straight to any original portfolio in a click.
        </p>

        <Section title="What FolioAtlas is">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            A read-only lens over a community-maintained list. The upstream repository is the canonical source of
            truth: FolioAtlas synchronizes its README, validates every URL, removes nothing silently, and publishes a
            derived index that always names the exact upstream commit it was built from. If an entry appears wrong,
            the fix belongs upstream — this site follows.
          </p>
        </Section>

        <Section title="What FolioAtlas is not">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            It is not a portfolio builder, a social network, or a profile database. There are no accounts, ratings,
            reviews, follower counts, or engagement metrics. Individual developers are not profiled beyond the name,
            link and role label their upstream entry supplies. No headshots, logos, or statistics are fabricated to
            make cards look richer.
          </p>
        </Section>

        <Section title="Design notes">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            The interface takes inspiration from Apple’s Liquid Glass material language: translucent, layered controls
            for navigation and search, with deliberately restrained content surfaces that keep the directory itself
            easy to read. It is an independent project built with web-standard CSS — it is not affiliated with, or
            endorsed by, Apple, and it does not claim to use Apple’s proprietary materials. It is likewise not
            affiliated with the maintainers of the upstream repository, though it is grateful to them.
          </p>
        </Section>

        <Section title="The numbers">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            The current index contains {index.stats.valid.toLocaleString()} validated portfolios, of which{" "}
            {index.stats.withDescription.toLocaleString()} carry a short role description and{" "}
            {index.stats.classified.toLocaleString()} have at least one focus-area label. {index.stats.quarantined}{" "}
            entr{index.stats.quarantined === 1 ? "y was" : "ies were"} quarantined by validation and{" "}
            {index.stats.duplicatesRemoved} duplicate{index.stats.duplicatesRemoved === 1 ? "" : "s"} removed during
            the last synchronization. The full report is described on the{" "}
            <a className="text-[var(--fa-accent)] hover:underline" href="/methodology">
              methodology page
            </a>
            .
          </p>
        </Section>
      </Prose>
    </div>
  );
}

export function MethodologyView({ index }: { index: ClientIndex }) {
  const rules = CLASSIFICATION_RULES;
  const { ai } = useFeatures();
  return (
    <div className="motion-fade-in mx-auto w-full max-w-5xl px-4 pb-12 pt-8 sm:pt-10">
      <Prose>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Methodology</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
          This page documents exactly how FolioAtlas collects, validates, deduplicates, classifies and publishes
          directory data. The pipeline is deterministic: the same upstream README always produces the same index.
        </p>

        <Section title="Data collection">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            The canonical source is the README of{" "}
            <a
              className="text-[var(--fa-accent)] hover:underline"
              href={`https://github.com/${index.source.repository}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {index.source.repository}
            </a>{" "}
            (branch <code className="rounded bg-black/[0.05] px-1 font-mono text-[13px] dark:bg-white/[0.07]">{index.source.branch}</code>
            {index.source.commit ? (
              <>
                , commit <code className="rounded bg-black/[0.05] px-1 font-mono text-[13px] dark:bg-white/[0.07]">{index.source.commit.slice(0, 7)}</code>
              </>
            ) : null}
            ). A daily synchronization job fetches the file, parses every entry in the alphabetical sections, and
            regenerates the index; each change is reviewed as a pull request before it is loaded into the directory
            database. This site was last synchronized on{" "}
            {new Date(index.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}. If
            upstream is unreachable, the last successfully generated index keeps serving — a failed sync never erases
            good data.
          </p>
        </Section>

        <Section title="URL validation">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            Only <code className="rounded bg-black/[0.05] px-1 font-mono text-[13px] dark:bg-white/[0.07]">http://</code> and{" "}
            <code className="rounded bg-black/[0.05] px-1 font-mono text-[13px] dark:bg-white/[0.07]">https://</code> links are accepted.
            Schemes such as <code className="rounded bg-black/[0.05] px-1 font-mono text-[13px] dark:bg-white/[0.07]">javascript:</code>,{" "}
            <code className="rounded bg-black/[0.05] px-1 font-mono text-[13px] dark:bg-white/[0.07]">data:</code> or{" "}
            <code className="rounded bg-black/[0.05] px-1 font-mono text-[13px] dark:bg-white/[0.07]">file:</code> are rejected, as are URLs
            with embedded credentials, loopback or private-IP hosts, and unparseable values. Normalization is
            conservative: hostnames are lower-cased, default ports are stripped, a trailing slash is removed, and URL
            fragments are dropped — path casing and segments are never altered.
          </p>
        </Section>

        <Section title="Duplicates and names">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            Two entries are considered the same portfolio only when their fully normalized URLs match. Different paths
            under one domain (for example two sites on <code className="rounded bg-black/[0.05] px-1 font-mono text-[13px] dark:bg-white/[0.07]">github.io</code>) are
            different people. When a URL collision occurs, the first upstream occurrence is kept and the collision is
            reported rather than silently discarded. Identical names with different URLs — different people who share
            a name — are always kept separately. Each entry gets a deterministic identifier derived from its name and
            URL, so IDs are stable across builds.
          </p>
        </Section>

        <Section title="Focus-area classification">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            The upstream list does not provide structured technology metadata. FolioAtlas therefore classifies
            entries using only the role label text supplied upstream (the bracketed text after each link). Matching is
            a documented, deterministic keyword mapping — URLs are never used as evidence, and portfolio websites are
            never scraped. Entries without supplied role text stay unclassified and remain fully browsable in the
            general directory. The complete rule set:
          </p>
          <div className="surface-card fa-scroll mt-4 max-h-96 overflow-y-auto rounded-2xl p-4">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {rules.map((rule) => {
                const count = index.technologies.find((t) => t.slug === rule.slug)?.count ?? 0;
                return (
                  <div key={rule.slug}>
                    <dt className="text-[13px] font-semibold">
                      {rule.label}
                      <span className="ml-1.5 font-normal text-[var(--fa-text-secondary)]">({count.toLocaleString()})</span>
                    </dt>
                    <dd className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--fa-text-secondary)]">{rule.blurb}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </Section>

        <Section title="Quality gates">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            Every synchronization run produces a validation report alongside the index. Entries that cannot be
            interpreted are quarantined with their line number and reason instead of being silently converted. The
            pipeline refuses to publish a new index that is empty or has lost more than half of the previous
            entries — a likely signal that the upstream format changed and the parser needs review. Generated
            artifacts are written atomically: the new file is validated before it replaces the previous one.
          </p>
        </Section>

        <Section title="Verified growth history">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            The Portfolio Growth chart is built exclusively from verified records. When FolioAtlas synchronizes, it
            records a snapshot of the directory size with the exact upstream commit SHA and timestamp. Historical
            points are derived by replaying the upstream repository&apos;s actual git history — each historical count
            is the real number of valid entries present in a real, linkable commit. Nothing is interpolated from a
            single report, and the chart always states the window its history covers. Where provenance cannot be
            established, history simply starts later — it is never invented.
          </p>
        </Section>

        {ai && (
        <Section title="AI features and their guardrails">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            Two features use language models, and both are clearly labeled. First, <strong className="text-foreground">AI
            search</strong>: your plain-language request is converted into a typed search intent (focus areas, keywords,
            exclusions) that is validated against the canonical technology vocabulary before the database executes the
            real query. The model can shape the query; it can never invent developer records. Second,{" "}
            <strong className="text-foreground">AI portfolio summaries</strong>: generated once per entry from the
            entry&apos;s supplied role text and focus areas only, validated against a strict schema, stored, and reused.
            Summaries never claim experience, employment, or project ownership that the source does not support, and
            every summary is labeled AI-generated. When the AI provider is unavailable, both features fall back to the
            standard keyword search — the directory keeps working without AI.
          </p>
        </Section>
        )}

        <Section title="Website previews and images">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            FolioAtlas uses no screenshot or thumbnail service and never fetches portfolio websites on the server.
            The in-page preview embeds the portfolio website itself, only when you open it. If a website refuses
            embedding, the UI says so explicitly with an open-in-new-tab action; FolioAtlas never bypasses a
            site&apos;s own security headers. Profile pictures are shown only for entries hosted on{" "}
            <code className="rounded bg-black/[0.05] px-1 font-mono text-[13px] dark:bg-white/[0.07]">github.io</code>, using the
            public GitHub avatar of the inferred account; every other entry shows a neutral placeholder.
          </p>
        </Section>

        <Section title="Corrections and removals">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            Because the upstream repository is the canonical source, edits — including removing your own portfolio —
            happen there via a normal pull request. Once merged upstream, the change propagates here automatically at
            the next synchronization. Nothing needs to be done on this site.
          </p>
        </Section>
      </Prose>
    </div>
  );
}

export function PrivacyView() {
  const { ai } = useFeatures();
  return (
    <div className="motion-fade-in mx-auto w-full max-w-5xl px-4 pb-12 pt-8 sm:pt-10">
      <Prose>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Privacy</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
          FolioAtlas is designed to be useful without collecting anything about you. This page describes what the
          deployed system does and does not do with data.
        </p>

        <Section title="No accounts, no personal data">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            You can browse, search and filter the entire directory without an account, without signing in, and without
            providing any information. The site has no registration system and stores no personal data.
          </p>
        </Section>

        <Section title="Search and the server">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            Search, filtering, sorting and pagination run against the directory database on the server, so results are
            consistent and shareable. Search terms travel as ordinary URL query parameters — the same thing you would
            send by loading a link — and are not profiled, tracked, or combined with anything identifying. Filter
            state lives in the page URL so you can share or bookmark a view; that is the only place it goes.
            {ai &&
              " When you use AI search, your query text is sent to the configured language-model provider solely to be parsed into a structured search intent; it is not stored."}
          </p>
        </Section>

        <Section title="Hosting and storage">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            The site is hosted on Vercel and the directory data is stored in a Supabase database. Like any web host,
            these providers process standard request data (such as IP address and user agent) to deliver pages and
            protect the service; FolioAtlas itself does not store or analyze it. Your browser keeps one preference
            locally — the light/dark theme you choose — which never leaves your device. No cookies are set.
          </p>
        </Section>

        <Section title="Third-party content">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            For entries hosted on <code className="rounded bg-black/[0.05] px-1 font-mono text-[13px] dark:bg-white/[0.07]">github.io</code>, the
            profile picture loads directly from GitHub, which receives a normal image request from your browser. When
            you open the in-page preview, the portfolio website is loaded directly in your browser, exactly as if you
            had visited it. Nothing else on this site loads third-party content.
          </p>
        </Section>

        <Section title="External links">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            Portfolio cards link to third-party websites that are outside of this project’s control. Links open with{" "}
            <code className="rounded bg-black/[0.05] px-1 font-mono text-[13px] dark:bg-white/[0.07]">rel=&quot;noopener noreferrer&quot;</code>, so
            destination sites do not learn that you arrived from here. Once you follow an external link, that site’s
            own privacy practices apply.
          </p>
        </Section>

        <Section title="No ads or trackers">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            The site ships no advertising, no cross-site trackers, and no fingerprinting scripts. If privacy-conscious
            analytics are ever introduced, this page will be updated to describe exactly what is collected before they
            are enabled.
          </p>
        </Section>

        <Section title="About the data">
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fa-text-secondary)]">
            Directory entries (names, portfolio links, role labels) come from a public open-source repository whose
            contributors added their own portfolios. This site adds no scraping and collects no additional personal
            information from linked sites. If you are listed and want your entry changed or removed, edit the upstream
            repository — see the{" "}
            <a className="text-[var(--fa-accent)] hover:underline" href="/methodology">
              methodology
            </a>{" "}
            for how updates propagate.
          </p>
        </Section>
      </Prose>
    </div>
  );
}
