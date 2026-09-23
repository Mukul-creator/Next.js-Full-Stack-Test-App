import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") || "nasa";

  const startTime = performance.now();

  try {
    if (source === "github") {
      // 1. GitHub Open-Source API
      const repo = searchParams.get("repo") || "vercel/next.js";
      const token = process.env.GITHUB_TOKEN;
      const headers: Record<string, string> = {
        "User-Agent": "Nextjs-Fullstack-App",
        Accept: "application/vnd.github.v3+json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const externalUrl = `https://api.github.com/repos/${repo}`;
      const response = await fetch(externalUrl, {
        headers,
        signal: AbortSignal.timeout(8000),
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          {
            status: "error",
            source: "GitHub Open Source REST API",
            externalStatus: response.status,
            latencyMs,
            error: errorText,
          },
          { status: response.status }
        );
      }

      const data = await response.json();

      return NextResponse.json({
        status: "success",
        source: "GitHub Open Source REST API",
        externalUrl,
        latencyMs,
        tokenConfig: {
          tokenUsed: Boolean(token),
          tokenType: token ? "Bearer Token" : "Anonymous / Public (Rate limited)",
          maskedToken: token ? `${token.slice(0, 4)}...${token.slice(-3)}` : "None (Public access)",
        },
        data: {
          name: data.full_name,
          description: data.description,
          stars: data.stargazers_count,
          forks: data.forks_count,
          openIssues: data.open_issues_count,
          license: data.license?.name || "None",
          repoUrl: data.html_url,
        },
      });
    }

    // 2. Default: NASA Open Data API (Official public token: DEMO_KEY)
    const apiKey = process.env.EXTERNAL_API_KEY || "DEMO_KEY";
    const baseUrl = process.env.EXTERNAL_API_URL || "https://api.nasa.gov/planetary/apod";
    const externalUrl = `${baseUrl}?api_key=${apiKey}`;

    const response = await fetch(externalUrl, {
      signal: AbortSignal.timeout(8000),
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          status: "error",
          source: "NASA Open Astronomy API",
          externalStatus: response.status,
          latencyMs,
          error: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      status: "success",
      source: "NASA Open Astronomy API (APOD)",
      externalUrl: `${baseUrl}?api_key=${apiKey.slice(0, 3)}...`,
      latencyMs,
      tokenConfig: {
        tokenUsed: true,
        tokenName: "EXTERNAL_API_KEY",
        tokenValueMasked: apiKey === "DEMO_KEY" ? "DEMO_KEY (Official Free Public Key)" : `${apiKey.slice(0, 3)}***`,
      },
      data: {
        title: data.title,
        date: data.date,
        explanation: data.explanation,
        mediaType: data.media_type,
        imageUrl: data.url,
        hdImageUrl: data.hdurl,
        copyright: data.copyright || "Public Domain / NASA",
      },
    });
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startTime);
    return NextResponse.json(
      {
        status: "error",
        source: "External API Proxy",
        latencyMs,
        error: error instanceof Error ? error.message : "Failed to fetch external API",
      },
      { status: 502 }
    );
  }
}

