/**
 * FolioAtlas — transparent technology classification (PRD §7.7).
 *
 * Rules:
 *  - Classification uses ONLY the role/description text supplied upstream.
 *  - URLs are NEVER used as evidence (no "react" just because of a domain).
 *  - Portfolios are never scraped.
 *  - Entries without supplied role text stay unclassified and remain in the
 *    general directory.
 *  - Every rule below is published on the /methodology page.
 */

export type ClassificationRule = {
  slug: string;
  label: string;
  blurb: string;
  patterns: RegExp[];
};

export const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    slug: "full-stack",
    label: "Full Stack",
    blurb: "Mentions full-stack, fullstack or MERN-style role text.",
    patterns: [/\bfull[\s-]?stack\b/i, /\bmern\b/i, /\bmean\s+stack\b/i],
  },
  {
    slug: "frontend",
    label: "Frontend",
    blurb: "Mentions front-end / frontend / UI engineering.",
    patterns: [/\bfront[\s-]?end\b/i, /\bfrontend\b/i, /\bui\s+developer\b/i],
  },
  {
    slug: "backend",
    label: "Backend",
    blurb: "Mentions back-end / backend engineering.",
    patterns: [/\bback[\s-]?end\b/i, /\bbackend\b/i],
  },
  {
    slug: "react",
    label: "React",
    blurb: "Mentions React in the supplied role text.",
    patterns: [/\breact\.?js\b/i, /\breact\b/i],
  },
  {
    slug: "nextjs",
    label: "Next.js",
    blurb: "Mentions Next.js / NextJS.",
    patterns: [/\bnext\.?js\b/i],
  },
  {
    slug: "vue",
    label: "Vue",
    blurb: "Mentions Vue / Vue.js.",
    patterns: [/\bvue\.?js\b/i, /\bvue\b/i],
  },
  {
    slug: "angular",
    label: "Angular",
    blurb: "Mentions Angular.",
    patterns: [/\bangular\b/i],
  },
  {
    slug: "nodejs",
    label: "Node.js",
    blurb: "Mentions Node.js / NodeJS.",
    patterns: [/\bnode\.?js\b/i],
  },
  {
    slug: "typescript",
    label: "TypeScript",
    blurb: "Mentions TypeScript.",
    patterns: [/\btypescript\b/i],
  },
  {
    slug: "javascript",
    label: "JavaScript",
    blurb: "Mentions JavaScript.",
    patterns: [/\bjavascript\b/i],
  },
  {
    slug: "ai-ml",
    label: "AI / ML",
    blurb: "Mentions AI, ML, machine learning or LLMs.",
    patterns: [/\ba\.?i\b/i, /\bml\b/i, /\bmachine\s+learning\b/i, /\bllms?\b/i, /\bgen\s*ai\b/i],
  },
  {
    slug: "mobile",
    label: "Mobile",
    blurb: "Mentions mobile, Android, iOS or app development.",
    patterns: [/\bmobile\b/i, /\bandroid\b/i, /\bios\b/i, /\bapp\s+developer\b/i, /\breact\s+native\b/i],
  },
  {
    slug: "flutter",
    label: "Flutter",
    blurb: "Mentions Flutter.",
    patterns: [/\bflutter\b/i],
  },
  {
    slug: "devops-cloud",
    label: "DevOps & Cloud",
    blurb: "Mentions DevOps, SRE, cloud, infrastructure or containers.",
    patterns: [
      /\bdevops\b/i, /\bs\.?r\.?e\.?\b/i, /\bsite\s+reliability\b/i, /\bcloud\b/i,
      /\binfrastructure\b/i, /\bkubernetes\b/i, /\bdocker\b/i, /\baws\b/i, /\bazure\b/i, /\bgcp\b/i,
    ],
  },
  {
    slug: "data",
    label: "Data",
    blurb: "Mentions data science, engineering or analytics.",
    patterns: [/\bdata\s+(scientist|science|engineer|analyst|analytics)\b/i, /\bbig\s+data\b/i],
  },
  {
    slug: "design",
    label: "Design",
    blurb: "Mentions UI/UX, product or graphic design.",
    patterns: [/\bui\s*\/?\s*ux\b/i, /\bux\b/i, /\bdesigner\b/i, /\bproduct\s+design\b/i],
  },
  {
    slug: "game-dev",
    label: "Game Dev",
    blurb: "Mentions game development, Unity or Unreal.",
    patterns: [/\bgame\s+(dev|developer|development)\b/i, /\bunity\b/i, /\bunreal\b/i],
  },
  {
    slug: "wordpress",
    label: "WordPress",
    blurb: "Mentions WordPress or WooCommerce.",
    patterns: [/\bwordpress\b/i, /\bwoocommerce\b/i],
  },
  {
    slug: "salesforce",
    label: "Salesforce",
    blurb: "Mentions Salesforce.",
    patterns: [/\bsalesforce\b/i],
  },
  {
    slug: "dotnet",
    label: ".NET",
    blurb: "Mentions .NET, dotnet or C#.",
    patterns: [/\.\s*net\b/i, /\bdotnet\b/i, /\bc#\b/i, /\basp\.net\b/i],
  },
  {
    slug: "python",
    label: "Python",
    blurb: "Mentions Python, Django, Flask or FastAPI.",
    patterns: [/\bpython\b/i, /\bdjango\b/i, /\bflask\b/i, /\bfastapi\b/i],
  },
  {
    slug: "php-laravel",
    label: "PHP / Laravel",
    blurb: "Mentions PHP or Laravel.",
    patterns: [/\bphp\b/i, /\blaravel\b/i],
  },
  {
    slug: "ruby",
    label: "Ruby / Rails",
    blurb: "Mentions Ruby or Rails.",
    patterns: [/\bruby\b/i, /\brails\b/i],
  },
  {
    slug: "golang",
    label: "Go",
    blurb: "Mentions Golang.",
    patterns: [/\bgolang\b/i, /\bgo\s+(developer|engineer)\b/i],
  },
  {
    slug: "java",
    label: "Java",
    blurb: "Mentions Java (word-boundary match; never matches JavaScript).",
    patterns: [/\bjava\b/i],
  },
  {
    slug: "blockchain",
    label: "Blockchain",
    blurb: "Mentions blockchain, web3, smart contracts or Solidity.",
    patterns: [/\bblockchain\b/i, /\bweb3\b/i, /\bsmart\s+contracts?\b/i, /\bsolidity\b/i],
  },
  {
    slug: "security",
    label: "Security",
    blurb: "Mentions security, cybersecurity or penetration testing.",
    patterns: [/\bsecurity\b/i, /\bcyber\s*security\b/i, /\bpenetration\b/i],
  },
  {
    slug: "founder",
    label: "Founder",
    blurb: "Mentions founder, co-founder, entrepreneur or CEO.",
    patterns: [/\bco?-?founder\b/i, /\bentrepreneur\b/i, /\bceo\b/i],
  },
  {
    slug: "freelance",
    label: "Freelance",
    blurb: "Mentions freelancer / freelance work.",
    patterns: [/\bfreelanc(e|er|ing)\b/i],
  },
  {
    slug: "student",
    label: "Student",
    blurb: "Mentions student or undergraduate status.",
    patterns: [/\bstudent\b/i, /\bundergrad\b/i],
  },
];

const RULES_BY_SLUG = new Map(CLASSIFICATION_RULES.map((r) => [r.slug, r]));

export function technologyLabel(slug: string): string {
  return RULES_BY_SLUG.get(slug)?.label ?? slug;
}

/**
 * Classify from supplied role text only. Returns matched slugs in the
 * canonical rule order for deterministic output.
 */
export function classifyRoleText(roleText: string | null | undefined): string[] {
  if (!roleText) return [];
  const text = roleText.trim();
  if (!text) return [];
  const hits: string[] = [];
  for (const rule of CLASSIFICATION_RULES) {
    if (rule.patterns.some((re) => re.test(text))) {
      hits.push(rule.slug);
    }
  }
  return hits;
}
