import { NextResponse } from "next/server";

const CATEGORIES = ["Physics", "Mathematics", "Computer Science", "System Architecture", "Chemistry"];

const SAMPLE_TOPICS = [
  {
    title: "Electromagnetic Induction & Faraday's Law in High-Frequency Circuits",
    category: "Physics",
    difficulty: "Advanced",
    summary: "Comprehensive derivation of induced EMF in time-varying magnetic fields with eddy current minimization techniques and Maxwell-Faraday equations.",
  },
  {
    title: "Multivariable Calculus: Stokes' Theorem & Divergence Applications",
    category: "Mathematics",
    difficulty: "Advanced",
    summary: "Deep dive into vector fields, surface integrals, curl operations, and non-Euclidean manifold transformations for competitive engineering exams.",
  },
  {
    title: "Distributed Consensus & Raft Protocol Under Network Partitions",
    category: "System Architecture",
    difficulty: "Expert",
    summary: "Analyzing leader election, log replication, split-brain prevention, and quorum read/write latencies across multi-region clusters.",
  },
  {
    title: "Dynamic Programming on Trees & Heavy-Light Decomposition",
    category: "Computer Science",
    difficulty: "Advanced",
    summary: "Optimizing path queries on large trees from O(N) to O(log^2 N) using segment trees and Euler tour flattening.",
  },
  {
    title: "Quantum Mechanics: Wave-Particle Duality & Schrodinger Wave Equation",
    category: "Physics",
    difficulty: "Intermediate",
    summary: "Solving the time-independent Schrodinger equation for potential wells, harmonic oscillators, and quantum tunneling probabilities.",
  },
  {
    title: "Chemical Kinetics & Arrhenius Equation Activation Energy",
    category: "Chemistry",
    difficulty: "Intermediate",
    summary: "Order of reactions, molecularity, collision theory, and rate constant temperature dependence in catalytic reactions.",
  },
];

export async function GET(request: Request) {
  const startTime = performance.now();
  const { searchParams } = new URL(request.url);

  const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "12", 10), 1), 100);
  const category = searchParams.get("category") || "all";
  const search = (searchParams.get("search") || "").toLowerCase().trim();
  const size = searchParams.get("size") || "normal"; // "normal" | "large"

  const paragraphsPerArticle = size === "large" ? 18 : 3;
  const commentsPerArticle = size === "large" ? 12 : 3;

  const articles = [];
  const totalItems = 120;

  for (let i = 0; i < limit; i++) {
    const globalId = (page - 1) * limit + i + 1;
    const template = SAMPLE_TOPICS[globalId % SAMPLE_TOPICS.length];

    if (category !== "all" && template.category.toLowerCase() !== category.toLowerCase()) {
      continue;
    }

    if (
      search &&
      !template.title.toLowerCase().includes(search) &&
      !template.summary.toLowerCase().includes(search) &&
      !template.category.toLowerCase().includes(search)
    ) {
      continue;
    }

    const bodyParagraphs = Array.from({ length: paragraphsPerArticle }, (_, pIdx) =>
      `[Section ${pIdx + 1}.${globalId}] ${template.summary} In real-world engineering and scientific analysis, understanding the boundary conditions of ${template.title} requires evaluating both steady-state and transient responses. When scaling across high-concurrency environments, numerical stability and algorithmic efficiency directly dictate throughput and tail latency.`
    );

    const comments = Array.from({ length: commentsPerArticle }, (_, cIdx) => ({
      id: `cmt-${globalId}-${cIdx + 1}`,
      author: `student_user_${(globalId * 7 + cIdx) % 500}`,
      rating: 4 + (cIdx % 2),
      text: `Great explanation on section ${cIdx + 1}! The step-by-step derivation helped clarify the edge cases in ${template.category}.`,
      createdAt: new Date(Date.now() - (cIdx + 1) * 3600_000).toISOString(),
    }));

    articles.push({
      id: `art-${globalId}`,
      index: globalId,
      title: `${template.title} (Module #${globalId})`,
      category: template.category,
      difficulty: template.difficulty,
      readTimeMinutes: 5 + (globalId % 15),
      views: 1250 + globalId * 83,
      likes: 140 + (globalId * 17) % 300,
      summary: template.summary,
      content: bodyParagraphs.join("\n\n"),
      tags: [template.category.toLowerCase(), "jee-advanced", "full-stack-test", `module-${globalId}`],
      comments,
      updatedAt: new Date(Date.now() - globalId * 600_000).toISOString(),
    });
  }

  const payloadString = JSON.stringify(articles);
  const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

  return NextResponse.json({
    status: "success",
    type: "rich-text-feed",
    meta: {
      page,
      limit,
      returnedCount: articles.length,
      totalAvailable: totalItems,
      categoryFilter: category,
      searchQuery: search || null,
      payloadMode: size,
      approxPayloadKB: Math.round((Buffer.byteLength(payloadString, "utf8") / 1024) * 100) / 100,
      generationTimeMs: durationMs,
      categories: CATEGORIES,
    },
    articles,
  });
}
