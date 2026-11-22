import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  FileSpreadsheet,
  Filter,
  Laptop,
  ListChecks,
  Menu,
  MessageSquare,
  Search,
  SlidersHorizontal,
  Sparkles,
  Table2,
} from "lucide-react";
import { domAnimation, LazyMotion, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { Link } from "react-router";
import { BrandLink } from "@/components/BrandLink";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { useTheme } from "@/components/theme/theme";
import "./landing.css";

type Appearance = "light" | "dark";
type ImageSize = readonly [number, number];

const workspace = "/workspace";
const salesData = "/workspace/datasets?sample=1";
const salesAssistant = "/workspace/charts?sample=1&view=assistant";
const salesBuilder = "/workspace/charts?sample=1&view=builder";
const ease = [0.23, 1, 0.32, 1] as const;

const featureLinks = [
  { href: "#explorer", label: "Data Explorer" },
  { href: "#assistant", label: "Ask AI" },
  { href: "#charts", label: "Charts" },
];

const revenue = [
  { category: "Lighting", amount: 4130 },
  { category: "Accessories", amount: 1920 },
  { category: "Storage", amount: 1816 },
  { category: "Furniture", amount: 654 },
];
const revenueFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function ProductImage({
  name,
  theme,
  alt,
  size,
  mobile,
  priority = false,
}: {
  name: string;
  theme: Appearance;
  alt: string;
  size: ImageSize;
  mobile?: ImageSize;
  priority?: boolean;
}) {
  const src = "/landing/" + name;
  return (
    <picture>
      {mobile && (
        <source
          media="(max-width: 639px)"
          srcSet={src + "-mobile-" + theme + ".webp"}
          width={mobile[0]}
          height={mobile[1]}
        />
      )}
      <img
        src={src + "-" + theme + ".webp"}
        alt={alt}
        width={size[0]}
        height={size[1]}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
      />
    </picture>
  );
}

function WorkspaceActions() {
  return (
    <div className="landing-actions">
      <Link to={workspace} className="landing-button">
        Open workspace <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
      <Link to={salesData} className="landing-button landing-button-secondary">
        Explore sales data
      </Link>
    </div>
  );
}

function LandingHeader() {
  return (
    <header className="landing-header">
      <nav className="landing-shell landing-nav" aria-label="Main">
        <BrandLink compact />
        <div className="landing-nav-links">
          {featureLinks.map(({ href, label }) => (
            <a key={href} href={href}>
              <span className="landing-nav-label">
                <span>{label}</span>
                <span aria-hidden="true">{label}</span>
              </span>
            </a>
          ))}
        </div>
        <div className="landing-nav-actions">
          <ThemeSwitcher />
          <Link to={workspace} className="landing-button landing-button-small">
            Open workspace
          </Link>
          <details className="landing-mobile-nav">
            <summary aria-label="Landing page sections">
              <Menu size={19} strokeWidth={1.6} aria-hidden="true" />
            </summary>
            <div className="landing-mobile-links">
              {featureLinks.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  onClick={(event) =>
                    event.currentTarget
                      .closest("details")
                      ?.removeAttribute("open")
                  }
                >
                  {label}
                </a>
              ))}
            </div>
          </details>
        </div>
      </nav>
    </header>
  );
}

function LandingHero({
  theme,
  reducedMotion,
}: {
  theme: Appearance;
  reducedMotion: boolean;
}) {
  return (
    <section
      className="landing-shell landing-hero"
      aria-labelledby="landing-title"
    >
      <div className="landing-hero-heading">
        <m.div
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.52, ease }}
        >
          <div className="landing-hero-symbols" aria-hidden="true">
            {[FileSpreadsheet, MessageSquare, BarChart3].map((Icon, index) => (
              <m.span
                key={index}
                initial={
                  reducedMotion ? false : { y: 9, scale: 0.78, opacity: 0 }
                }
                animate={{ y: 0, scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 290,
                  damping: 16,
                  delay: reducedMotion ? 0 : index * 0.07,
                }}
              >
                <Icon size={18} strokeWidth={1.7} />
              </m.span>
            ))}
          </div>
          <h1 id="landing-title">
            Explore and chart your CSVs in your browser
          </h1>
        </m.div>
        <m.div
          className="landing-hero-aside"
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: reducedMotion ? 0 : 0.1, ease }}
        >
          <p>
            Open large CSVs, find patterns in your data, and turn what you learn
            into charts. Your files stay on your device.
          </p>
          <WorkspaceActions />
        </m.div>
      </div>

      <div className="landing-hero-stage">
        <m.div
          className="landing-hero-window"
          initial={reducedMotion ? false : { opacity: 0.78, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.48, ease }}
        >
          <ProductImage
            name="dashboard"
            theme={theme}
            alt="Ask2Chart sales dashboard showing monthly revenue."
            size={[2880, 1560]}
            mobile={[680, 984]}
            priority
          />
        </m.div>
      </div>
      <a className="landing-hero-next" href="#workflow">
        How it works <ArrowDown size={14} aria-hidden="true" />
      </a>
    </section>
  );
}

function Workflow({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <section
      className="landing-shell landing-section"
      id="workflow"
      aria-labelledby="workflow-title"
    >
      <div className="landing-section-heading">
        <h2 id="workflow-title">Ask a question. See the answer in a chart.</h2>
      </div>
      <div className="landing-workflow">
        <article className="landing-step">
          <div
            className="landing-step-art landing-import-art"
            aria-hidden="true"
          >
            <div className="landing-file">
              <span className="landing-file-icon">
                <FileSpreadsheet size={23} strokeWidth={1.6} />
              </span>
              <div>
                <strong>retail_orders_2025.csv</strong>
                <span>5 columns · Ready to explore</span>
              </div>
            </div>
          </div>
          <div className="landing-step-copy">
            <h3>
              <FileSpreadsheet size={16} aria-hidden="true" /> Open a CSV
            </h3>
            <p>
              Choose a file from your device. Ask2Chart detects the column types
              as you import it.
            </p>
          </div>
        </article>
        <article className="landing-step">
          <div
            className="landing-step-art landing-question-art"
            aria-hidden="true"
          >
            <div className="landing-question">
              <MessageSquare size={17} strokeWidth={1.7} />
              <span>
                Which product category
                <br /> made the most revenue?
              </span>
              <span className="landing-question-arrow">
                <ArrowUp size={14} />
              </span>
            </div>
          </div>
          <div className="landing-step-copy">
            <h3>
              <MessageSquare size={16} aria-hidden="true" /> Ask questions in
              your own words
            </h3>
            <p>
              Compare categories, look for trends, or see which region sold the
              most.
            </p>
          </div>
        </article>
        <article className="landing-step">
          <div className="landing-step-art landing-result-art">
            <div className="landing-mini-chart">
              <p>Revenue by category</p>
              <ul>
                {revenue.map(({ category, amount }, index) => (
                  <li key={category}>
                    <span>{category}</span>
                    <span className="landing-chart-track">
                      <m.span
                        aria-hidden="true"
                        initial={reducedMotion ? false : { scaleX: 0.05 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true, amount: 0.6 }}
                        transition={{
                          duration: 0.5,
                          ease,
                          delay: reducedMotion ? 0 : index * 0.065,
                        }}
                        style={{
                          width: (100 * amount) / revenue[0].amount + "%",
                        }}
                      />
                    </span>
                    <span>{revenueFormat.format(amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="landing-step-copy">
            <h3>
              <BarChart3 size={16} aria-hidden="true" /> See the answer
            </h3>
            <p>
              Compare the results in a chart, then open the result table to
              check the exact numbers.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

export function LandingPage() {
  const { resolvedTheme: theme } = useTheme();
  const reducedMotion = useReducedMotion() === true;
  const reveal = {
    initial: reducedMotion ? (false as const) : { opacity: 0.55, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.22 },
    transition: { duration: 0.56, ease },
  };

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="landing-page">
        <a href="#landing-main" className="landing-skip-link">
          Skip to content
        </a>
        <LandingHeader />

        <main id="landing-main" tabIndex={-1}>
          <LandingHero theme={theme} reducedMotion={reducedMotion} />
          <Workflow reducedMotion={reducedMotion} />

          <section
            className="landing-shell landing-section landing-feature"
            id="explorer"
            aria-labelledby="explorer-title"
          >
            <div className="landing-feature-copy">
              <p className="landing-feature-label">
                <Table2 size={16} aria-hidden="true" /> Data Explorer
              </p>
              <h2 id="explorer-title">Get to the rows that matter</h2>
              <p>
                Focus on one region, bring your highest-value orders to the top,
                or widen a column to read the full value.
              </p>
              <ul className="landing-feature-list">
                <li>
                  <Filter size={16} aria-hidden="true" /> Filter rows by column
                </li>
                <li>
                  <ArrowDown size={16} aria-hidden="true" /> Sort by the values
                  you care about
                </li>
                <li>
                  <Search size={16} aria-hidden="true" /> Check and resize your
                  columns
                </li>
              </ul>
              <Link className="landing-text-link" to={salesData}>
                Open Data Explorer <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <m.figure
              className="landing-product-frame landing-explorer"
              {...reveal}
            >
              <div className="landing-scale">
                <FileSpreadsheet
                  size={20}
                  strokeWidth={1.6}
                  aria-hidden="true"
                />
                <p>
                  <strong>100,000+ rows</strong>
                  <span>Import large CSVs in your browser</span>
                </p>
              </div>
              <ProductImage
                name="explorer"
                theme={theme}
                alt="Data Explorer showing a million-row product catalog filtered to Home and Kitchen."
                size={[3072, 1900]}
                mobile={[780, 1750]}
              />
              <figcaption>
                A product catalog filtered to Home &amp; Kitchen.
              </figcaption>
            </m.figure>
          </section>

          <section
            className="landing-shell landing-section landing-feature landing-feature-assistant"
            id="assistant"
            aria-labelledby="assistant-title"
          >
            <div className="landing-feature-copy">
              <p className="landing-feature-label">
                <MessageSquare size={16} aria-hidden="true" /> Ask AI
              </p>
              <h2 id="assistant-title">Ask questions in your own words</h2>
              <p>
                Ask how sales changed month to month or which category brought
                in the most revenue. Ask2Chart turns your question into an
                analysis and runs it in your browser.
              </p>
              <Link className="landing-text-link" to={salesAssistant}>
                Try Ask AI <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <div className="landing-assistant-stage">
              <div className="landing-assistant-background" aria-hidden="true">
                <ProductImage
                  name="studio-workspace"
                  theme={theme}
                  size={[2880, 1700]}
                  alt=""
                />
              </div>
              <m.div
                className="landing-assistant-card"
                {...reveal}
                initial={
                  reducedMotion ? false : { opacity: 0.55, y: 22, scale: 0.97 }
                }
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
              >
                <div className="landing-assistant-title">
                  <span>
                    <Sparkles size={18} strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  Ask2Chart Assistant
                </div>
                <div className="landing-assistant-suggestions">
                  <span>Questions you can ask</span>
                  <span>How did revenue change month to month?</span>
                  <span>Which region had the highest sales?</span>
                </div>
                <blockquote className="landing-assistant-prompt">
                  <p>Which product category made the most revenue?</p>
                  <ArrowUp size={16} aria-hidden="true" />
                </blockquote>
              </m.div>
            </div>
          </section>

          <section
            className="landing-shell landing-section"
            id="charts"
            aria-labelledby="charts-title"
          >
            <div className="landing-section-heading">
              <div>
                <p className="landing-feature-label">
                  <SlidersHorizontal size={16} aria-hidden="true" /> Chart
                  builder
                </p>
                <h2 id="charts-title">Build charts your way</h2>
              </div>
              <p>
                Pick the fields, calculation, and filters. Then pin your chart
                to a dashboard or export it as an image or CSV.
              </p>
            </div>
            <m.div className="landing-chart-views" {...reveal}>
              <figure className="landing-product-frame">
                <ProductImage
                  name="builder"
                  theme={theme}
                  alt="Chart builder grouping orders by month and filtering by product and region."
                  size={[1750, 1584]}
                  mobile={[652, 1546]}
                />
                <figcaption>Set the fields and filters</figcaption>
              </figure>
              <div>
                <figure className="landing-product-frame">
                  <ProductImage
                    name="calculation"
                    theme={theme}
                    alt="Monthly floor lamp revenue chart with the exact result rows below it."
                    size={[2238, 1920]}
                    mobile={[704, 1346]}
                  />
                  <figcaption>See the chart and result table</figcaption>
                </figure>
                <details className="landing-calculation">
                  <summary>
                    <ListChecks size={16} aria-hidden="true" /> How this was
                    calculated <ChevronDown size={15} aria-hidden="true" />
                  </summary>
                  <div className="landing-calculation-body">
                    <dl>
                      <div>
                        <dt>Group by</dt>
                        <dd>Order date by month</dd>
                      </div>
                      <div>
                        <dt>Calculation</dt>
                        <dd>Sum of revenue</dd>
                      </div>
                      <div>
                        <dt>Filters</dt>
                        <dd>Floor Lamp in the West</dd>
                      </div>
                    </dl>
                    <p>
                      In Chart Studio, you can also inspect the SQL and open the
                      result table to check the exact numbers.
                    </p>
                    <Link className="landing-text-link" to={salesBuilder}>
                      Open Chart Studio{" "}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                </details>
              </div>
            </m.div>
          </section>

          <section
            className="landing-shell landing-section landing-local"
            aria-labelledby="local-title"
          >
            <div className="landing-local-panel">
              <div className="landing-local-art" aria-hidden="true">
                <span>
                  <FileSpreadsheet size={23} strokeWidth={1.5} />
                </span>
                <ArrowRight size={18} strokeWidth={1.5} />
                <span>
                  <Laptop size={26} strokeWidth={1.5} />
                </span>
                <ArrowRight size={18} strokeWidth={1.5} />
                <span>
                  <BarChart3 size={23} strokeWidth={1.5} />
                </span>
              </div>
              <div>
                <h2 id="local-title">Your CSV stays on your device</h2>
                <p>
                  Importing, filtering, and chart calculations run in your
                  browser. Your datasets and dashboards are saved there, ready
                  when you come back.
                </p>
              </div>
            </div>
          </section>

          <section
            className="landing-shell landing-section landing-start"
            aria-labelledby="start-title"
          >
            <h2 id="start-title">What’s in your CSV?</h2>
            <WorkspaceActions />
          </section>
        </main>

        <footer className="landing-footer">
          <div className="landing-shell">
            <div className="landing-footer-top">
              <div>
                <BrandLink compact />
                <p>CSV analysis in your browser.</p>
              </div>
              <nav aria-label="Footer">
                {featureLinks.map(({ href, label }) => (
                  <a key={href} href={href}>
                    {label}
                  </a>
                ))}
                <Link to={workspace}>
                  Open workspace <ArrowDownRight size={14} aria-hidden="true" />
                </Link>
              </nav>
            </div>
            <img
              className="landing-footer-mark"
              src={
                "/brand/ask2chart-" +
                (theme === "dark" ? "white" : "black") +
                ".svg"
              }
              width={1880}
              height={386}
              alt=""
              loading="lazy"
            />
            <div className="landing-footer-base">
              <p>© 2026 Ask2Chart</p>
              <p>Built by Nihar Kushwaha · Made in India</p>
            </div>
          </div>
        </footer>
      </div>
    </LazyMotion>
  );
}
