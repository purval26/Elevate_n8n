/**
 * Realistic test fixtures and mock data for ElevateWeb Content Engine E2E testing.
 */

export interface TestSlide {
  slideNumber: number;
  type: string;
  headline: string;
  body: string;
  visualSuggestion: string;
}

export interface TestCarouselPackage {
  topic: {
    title: string;
    pillar: string;
  };
  hook: string;
  slides: TestSlide[];
  caption: string;
  cta: string;
  hashtags: string[];
  sources: string[];
}

export function createValidCarouselFixture(
  overrides: Partial<TestCarouselPackage> & { slideCount?: number } = {},
): TestCarouselPackage {
  const slideCount = overrides.slideCount ?? (overrides.slides ? overrides.slides.length : 6);
  const slides: TestSlide[] = [];

  for (let i = 1; i <= slideCount; i++) {
    if (i === 1) {
      slides.push({
        slideNumber: 1,
        type: 'hook',
        headline: 'What Really Happens When You Type a URL?',
        body: 'Behind every browser request lies a lightning-fast distributed lookup system called DNS. Here is how it maps domain names to IP addresses in milliseconds.',
        visualSuggestion: 'Clean diagram showing user laptop pointing query arrow toward DNS cloud',
      });
    } else if (i === slideCount) {
      slides.push({
        slideNumber: i,
        type: 'cta',
        headline: 'Key Takeaways & Next Steps',
        body: 'DNS is the backbone of internet routing. Cache wisely, optimize TTLs, and follow @ElevateWeb for more deep-dive systems engineering content.',
        visualSuggestion: 'ElevateWeb brand logo with clean summary checklist and save post icon',
      });
    } else {
      slides.push({
        slideNumber: i,
        type: 'concept',
        headline: `Step ${i}: Recursive Resolver & Root Servers`,
        body: `Your ISP or local resolver queries the 13 root server clusters, which route the request to TLD nameservers (.com), resolving the authoritative host record.`,
        visualSuggestion: `Technical sequence diagram showing step ${i} hierarchy query path`,
      });
    }
  }

  return {
    topic: {
      title: overrides.topicTitle ?? overrides.topic?.title ?? 'How DNS Works: From URL to IP Address',
      pillar: overrides.pillar ?? overrides.topic?.pillar ?? 'tech_explained',
    },
    hook: 'Ever wondered what happens behind the scenes when you hit Enter on a URL? Here is the complete DNS journey in 6 slides.',
    slides: overrides.slides ?? slides,
    caption:
      'DNS translates human-readable domain names into machine-readable IP addresses in under 50ms. Here is the architectural breakdown of root servers, TLDs, and recursive resolvers. Follow @ElevateWeb for weekly system architecture guides.',
    cta: 'Save this post for your next system design interview and follow @ElevateWeb for daily tech insights!',
    hashtags: ['#DNS', '#SystemDesign', '#WebDev', '#Networking', '#SoftwareEngineering'],
    sources: ['RFC 1034 - Domain Names: Concepts and Facilities', 'RFC 1035 - Domain Names: Implementation and Specification'],
    ...overrides,
  };
}

export function createDNSScenarioFixture(): TestCarouselPackage {
  return createValidCarouselFixture({
    topic: {
      title: 'How DNS Works: From URL to IP Address',
      pillar: 'tech_explained',
    },
    hook: 'Ever wondered what happens in the 30ms between typing a URL and seeing the page? Meet DNS.',
    slides: [
      {
        slideNumber: 1,
        type: 'hook',
        headline: 'The Internet’s Phonebook Explained',
        body: 'Computers communicate through IP addresses like 142.250.190.46, not google.com. DNS is the global distributed database that bridges the human-machine gap.',
        visualSuggestion: 'Split screen: human typing domain on left, glowing binary/IP packets on right',
      },
      {
        slideNumber: 2,
        type: 'concept',
        headline: '1. Local Cache & The Recursive Resolver',
        body: 'First, your OS checks browser and OS caches. On a cache miss, your query hits the Recursive Resolver (ISP or 1.1.1.1/8.8.8.8) which acts as your detective.',
        visualSuggestion: 'Cache check flow chart showing instant return on hit vs resolver dispatch on miss',
      },
      {
        slideNumber: 3,
        type: 'architecture',
        headline: '2. The 13 Root Server Clusters',
        body: 'The resolver asks the DNS Root Servers: "Where is .com?". The root servers direct the resolver to the authoritative Top-Level Domain (TLD) servers.',
        visualSuggestion: 'Worldwide map showing Anycast distribution of 13 root server clusters',
      },
      {
        slideNumber: 4,
        type: 'breakdown',
        headline: '3. TLD & Authoritative Name Servers',
        body: 'The .com TLD server points to the Authoritative Name Server managing the specific domain, which holds the final A/AAAA address record.',
        visualSuggestion: 'Hierarchical inverted tree diagram: Root -> TLD (.com) -> Authoritative (elevateweb.io)',
      },
      {
        slideNumber: 5,
        type: 'concept',
        headline: '4. TTL & Caching Magic',
        body: 'The resolver caches the IP with a Time-To-Live (TTL) counter, then returns the IP to your browser. Future lookups take 0ms until TTL expires.',
        visualSuggestion: 'Countdown timer clock representing TTL cache expiration bar',
      },
      {
        slideNumber: 6,
        type: 'cta',
        headline: 'Master Web Architecture with ElevateWeb',
        body: 'Understanding foundational networking makes you a 10x better engineer. Save this guide and follow @ElevateWeb for clear, no-fluff engineering guides.',
        visualSuggestion: 'ElevateWeb signature dark-mode closing slide with save/share bookmark icons',
      },
    ],
    caption: 'How does DNS resolve domain names in under 50ms? Here is the exact query flow from browser cache to root, TLD, and authoritative nameservers. Save for your next system design interview! Follow @ElevateWeb for daily tech breakdowns.',
    cta: 'Save this post for your next system design interview and follow @ElevateWeb!',
    hashtags: ['#DNS', '#Networking', '#SystemDesign', '#WebDevelopment', '#SoftwareEngineering'],
    sources: ['IETF RFC 1035: Domain Implementation', 'Cloudflare Learning: How DNS Works'],
  });
}

export function createJWTScenarioFixture(): TestCarouselPackage {
  return {
    topic: {
      title: 'JWT vs Session Cookies: Authentication Deep Dive',
      pillar: 'web_architecture',
    },
    hook: 'Stateless tokens or server-side sessions? Choosing the wrong auth architecture can haunt your production app.',
    slides: [
      {
        slideNumber: 1,
        type: 'hook',
        headline: 'JWT vs Session Cookies: The Battle for Auth',
        body: 'Every web application faces this architectural fork in the road: stateless JWTs stored on the client, or stateful session IDs backed by Redis?',
        visualSuggestion: 'Two opposing server shields: JWT token vs Cookie jar',
      },
      {
        slideNumber: 2,
        type: 'concept',
        headline: 'Session Cookies: Stateful & Battle-Tested',
        body: 'The server stores session state in Redis or Postgres. The browser receives an opaque, HttpOnly session ID cookie. The server validates every single request.',
        visualSuggestion: 'Client sends cookie -> Server queries Redis session store -> Returns user object',
      },
      {
        slideNumber: 3,
        type: 'concept',
        headline: 'JWT: Stateless & Self-Contained',
        body: 'The server signs claims using a secret key (HMAC) or private key (RSA/ECDSA). No database lookup is needed to verify validity; any microservice can verify.',
        visualSuggestion: 'Three-part color-coded JWT breakdown: Header (red), Payload (purple), Signature (blue)',
      },
      {
        slideNumber: 4,
        type: 'comparison',
        headline: 'The Big Trade-Off: Revocation vs Scalability',
        body: 'Sessions make instant logout and permission revocation trivial. JWTs cannot be revoked without maintaining a blacklist—which eliminates their stateless advantage.',
        visualSuggestion: 'Comparison balance scale: Stateless Scale on left vs Instant Revocation on right',
      },
      {
        slideNumber: 5,
        type: 'architecture',
        headline: 'Security Considerations: XSS & CSRF',
        body: 'Storing JWTs in localStorage exposes them to XSS attacks. Session cookies require SameSite=Lax and CSRF tokens to prevent cross-site request forgery.',
        visualSuggestion: 'Security matrix table comparing XSS risk and CSRF mitigation per approach',
      },
      {
        slideNumber: 6,
        type: 'takeaway',
        headline: 'Production Architecture Recommendation',
        body: 'For monolithic apps: Use HttpOnly Session Cookies. For distributed microservices & mobile apps: Use short-lived JWTs (15m) paired with refresh token cookies.',
        visualSuggestion: 'Recommended hybrid architecture flow diagram with access and refresh tokens',
      },
      {
        slideNumber: 7,
        type: 'cta',
        headline: 'Level Up Your Architecture with ElevateWeb',
        body: 'Building secure systems requires mastering trade-offs. Save this post for your team discussions and follow @ElevateWeb for weekly architecture insights.',
        visualSuggestion: 'ElevateWeb closing screen with clear call to action and bookmarks',
      },
    ],
    caption: 'JWT or Session Cookies? Learn when to use stateless JWT tokens vs stateful Redis session cookies. We analyze revocation, XSS risks, and hybrid production architectures. Follow @ElevateWeb for engineering guides.',
    cta: 'Save this post for your next security review and follow @ElevateWeb!',
    hashtags: ['#Authentication', '#JWT', '#Security', '#WebArchitecture', '#BackendEngineering'],
    sources: ['OWASP Session Management Cheat Sheet', 'RFC 7519: JSON Web Token (JWT)'],
  };
}

export function createDockerScenarioFixture(): TestCarouselPackage {
  return {
    topic: {
      title: 'Docker Containers Under the Hood: Namespaces & Cgroups',
      pillar: 'developer_tools',
    },
    hook: 'Containers are not lightweight virtual machines. They are just standard Linux processes with kernel blindfolds.',
    slides: [
      {
        slideNumber: 1,
        type: 'hook',
        headline: 'Containers Are Not Real Virtual Machines',
        body: 'Unlike VMs running a guest OS on a hypervisor, containers share the host Linux kernel directly. What makes them feel isolated?',
        visualSuggestion: 'Hypervisor VM diagram side-by-side with shared host kernel container process',
      },
      {
        slideNumber: 2,
        type: 'concept',
        headline: 'The Magic Trio: Namespaces, Cgroups & UnionFS',
        body: 'Docker is a friendly wrapper around three native Linux kernel primitives: Namespaces (isolation), Cgroups (resource limits), and OverlayFS (layered files).',
        visualSuggestion: 'Three pillar blocks supporting the Docker container platform',
      },
      {
        slideNumber: 3,
        type: 'breakdown',
        headline: '1. Linux Namespaces: What You Can See',
        body: 'Namespaces partition system resources. PID namespace makes process 12487 believe it is PID 1. NET namespace gives a dedicated network stack and loopback.',
        visualSuggestion: 'Lens diagram showing container looking through filter seeing only its own PIDs',
      },
      {
        slideNumber: 4,
        type: 'breakdown',
        headline: 'Key Namespace Types in Every Container',
        body: 'MNT (isolated filesystem mount points), IPC (inter-process communication), UTS (custom hostname), and USER (root inside container, unprivileged on host).',
        visualSuggestion: 'Grid of 6 namespace icons with brief functional labels',
      },
      {
        slideNumber: 5,
        type: 'breakdown',
        headline: '2. Control Groups (Cgroups): What You Can Use',
        body: 'Without Cgroups, a runaway container could consume 100% of host RAM and CPU. Cgroups enforce strict ceilings: e.g. max 512MB RAM and 2 CPU cores.',
        visualSuggestion: 'Meter gauge showing container memory constrained to max 512MB by kernel',
      },
      {
        slideNumber: 6,
        type: 'breakdown',
        headline: '3. OverlayFS: Layered Copy-on-Write Files',
        body: 'Docker images consist of read-only image layers. When a container runs, a thin writable container layer is added on top. Only modified files are copied up.',
        visualSuggestion: 'Stacked layer diagram: Base OS -> Node.js -> App Code -> Thin Writable Layer',
      },
      {
        slideNumber: 7,
        type: 'takeaway',
        headline: 'Why Kernel Understanding Matters',
        body: 'Knowing containers are processes helps you debug production memory leaks, rootless containers, and Kubernetes OOMKilled errors effortlessly.',
        visualSuggestion: 'Terminal snapshot showing ps aux on host seeing container processes directly',
      },
      {
        slideNumber: 8,
        type: 'cta',
        headline: 'Master Linux & DevOps with ElevateWeb',
        body: 'Demystify developer tooling from first principles. Save this guide for your DevOps toolkit and follow @ElevateWeb for deep technical breakdowns.',
        visualSuggestion: 'ElevateWeb dark minimalist CTA card with follow and bookmark highlights',
      },
    ],
    caption: 'How do Docker containers actually isolate processes on Linux? Learn how kernel Namespaces, Cgroups, and OverlayFS work together without virtual machines. Follow @ElevateWeb for systems engineering breakdowns.',
    cta: 'Save this post for your next DevOps interview and follow @ElevateWeb!',
    hashtags: ['#Docker', '#DevOps', '#Linux', '#Containers', '#Kubernetes'],
    sources: ['Linux Kernel Documentation: cgroups-v2', 'Docker Engine Architectural Overview'],
  };
}

export function createReactScenarioFixture(): TestCarouselPackage {
  return {
    topic: {
      title: 'React 19 Reconciliation: Fiber Tree & Concurrent Mode',
      pillar: 'performance',
    },
    hook: 'Why is React 19 moving away from manual useMemo and useCallback? The secret is in the new compiler and reconciliation engine.',
    slides: [
      {
        slideNumber: 1,
        type: 'hook',
        headline: 'The Evolution of React Reconciliation',
        body: 'From stack reconciler to Fiber, and now to the React Compiler: how does React update your DOM at 60 frames per second without stuttering?',
        visualSuggestion: 'Timeline graphic showing React 15 Stack -> React 16 Fiber -> React 19 Compiler',
      },
      {
        slideNumber: 2,
        type: 'concept',
        headline: 'The Fiber Architecture: Schedulable Units of Work',
        body: 'A Fiber is a JavaScript object representing a component. Unlike the call stack, Fiber nodes are linked lists that can pause, resume, and abort work.',
        visualSuggestion: 'Linked list diagram of Fiber nodes: child, sibling, and return pointers',
      },
      {
        slideNumber: 3,
        type: 'breakdown',
        headline: 'Concurrent Mode & Time Slicing',
        body: 'React breaks long render phases into 5ms chunks. When high-priority user input (typing/clicks) arrives, React pauses background renders to keep UI responsive.',
        visualSuggestion: 'Timeline bar showing rendering sliced into 5ms blocks interrupted by user click',
      },
      {
        slideNumber: 4,
        type: 'concept',
        headline: 'React 19: Goodbye Manual Memoization',
        body: 'The new React Compiler automatically memoizes component outputs and hooks at build time. No more dependency array bugs or premature useMemo optimization.',
        visualSuggestion: 'Before & after code diff showing manual useMemo removed while maintaining 0 re-renders',
      },
      {
        slideNumber: 5,
        type: 'cta',
        headline: 'Build Faster Frontends with ElevateWeb',
        body: 'Master modern frontend internals. Save this breakdown and follow @ElevateWeb for advanced JavaScript, React, and web performance content.',
        visualSuggestion: 'ElevateWeb closing screen with bookmark badge and profile link',
      },
    ],
    caption: 'How does React 19 reconcile the Fiber tree while maintaining 60 FPS? Deep dive into time slicing, concurrent mode, and the React Compiler. Follow @ElevateWeb for modern web performance tips.',
    cta: 'Save this post and follow @ElevateWeb for weekly frontend deep dives!',
    hashtags: ['#ReactJS', '#WebPerformance', '#JavaScript', '#Frontend', '#SoftwareEngineering'],
    sources: ['React Documentation: Concurrent React', 'React Fiber Architecture by Andrew Clark'],
  };
}

export function createKafkaScenarioFixture(): TestCarouselPackage {
  return {
    topic: {
      title: 'Kafka vs RabbitMQ: Event Streaming vs Message Queues',
      pillar: 'web_architecture',
    },
    hook: 'Both move messages, but they solve completely different architectural problems. Here is how to choose between Kafka and RabbitMQ.',
    slides: [
      {
        slideNumber: 1,
        type: 'hook',
        headline: 'Kafka vs RabbitMQ: Which Broker Do You Need?',
        body: 'Picking between Apache Kafka and RabbitMQ is one of the most consequential decisions in distributed systems design. Here is what separates them.',
        visualSuggestion: 'Side-by-side comparison: Kafka distributed commit log vs RabbitMQ AMQP exchange',
      },
      {
        slideNumber: 2,
        type: 'concept',
        headline: 'RabbitMQ: The Smart Broker, Dumb Consumer',
        body: 'RabbitMQ routes messages through exchanges and queues based on routing keys. Once a consumer acknowledges a message, it is deleted from the queue.',
        visualSuggestion: 'Exchange routing messages to multiple queues based on pattern matching',
      },
      {
        slideNumber: 3,
        type: 'concept',
        headline: 'Kafka: The Dumb Broker, Smart Consumer',
        body: 'Kafka is an append-only distributed commit log. Messages are persisted to disk and retained regardless of consumption. Consumers track their own offsets.',
        visualSuggestion: 'Sequential partition log with consumer offset pointers reading independently',
      },
      {
        slideNumber: 4,
        type: 'comparison',
        headline: 'Key Difference: Message Replayability',
        body: 'Because Kafka persists data for days or weeks, new consumers can replay history from the beginning. RabbitMQ cannot replay consumed messages.',
        visualSuggestion: 'Rewind button visual showing consumer rewinding offset to re-process historical events',
      },
      {
        slideNumber: 5,
        type: 'architecture',
        headline: 'Architectural Decision Cheat Sheet',
        body: 'Choose RabbitMQ for: complex routing, per-message priority, transactional task queues. Choose Kafka for: event streaming, high throughput (>100k/s), log aggregation.',
        visualSuggestion: 'Summary quadrant matrix comparing throughput vs routing complexity',
      },
      {
        slideNumber: 6,
        type: 'cta',
        headline: 'Architect Distributed Systems with ElevateWeb',
        body: 'System design is all about trade-offs. Save this cheat sheet for your next design review and follow @ElevateWeb for clear architecture guides.',
        visualSuggestion: 'ElevateWeb dark theme closing card with save and share highlights',
      },
    ],
    caption: 'Kafka or RabbitMQ? Discover the architectural differences between an append-only distributed commit log and an AMQP message broker. Save this post for your next system design interview! Follow @ElevateWeb.',
    cta: 'Save this post for your system design toolkit and follow @ElevateWeb!',
    hashtags: ['#SystemDesign', '#Kafka', '#RabbitMQ', '#DistributedSystems', '#SoftwareArchitecture'],
    sources: ['Designing Data-Intensive Applications by Martin Kleppmann', 'RabbitMQ vs Kafka Architectural Guide'],
  };
}
