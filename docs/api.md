# ElevateWeb Content Engine — API Reference

## Base URL
```
http://localhost:3000
```

## Content Types
All endpoints accept and return `application/json; charset=utf-8`.

---

## Endpoints

### 1. Health Check
Checks service availability and identity.

- **Method**: `GET`
- **Path**: `/health`
- **Authentication**: None

#### Success Response
- **Status**: `200 OK`
- **Schema**:
```json
{
  "status": "ok",
  "service": "elevate-content-engine-api"
}
```

#### Example Request
```bash
curl -X GET http://localhost:3000/health
```

---

### 2. Generate Content Package
Generates an Instagram carousel package from technical topic parameters and persists it to PostgreSQL.

- **Method**: `POST`
- **Path**: `/api/content/generate`
- **Authentication**: None (Phase 1)
- **Headers**:
  - `Content-Type: application/json`

#### Request Body Schema
| Field | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `topic` | `string` | **Yes** | Technical subject to cover | 3–200 characters, auto-trimmed |
| `pillar` | `string` | **Yes** | Brand content pillar | Non-empty string |
| `tone` | `string` | No | Voice tone | Default `"educational"` |
| `slideCount` | `integer`| No | Number of carousel slides | Integer between `5` and `8` (default `6`) |

*Note: The request object is strict. Extra unrecognized fields will trigger a `400 VALIDATION_ERROR`.*

#### Example Request Body
```json
{
  "topic": "How DNS Works",
  "pillar": "tech_explained",
  "tone": "educational",
  "slideCount": 6
}
```

#### Success Response
- **Status**: `200 OK`
- **Body Schema**: `CarouselPackage`
```json
{
  "topic": {
    "title": "How DNS Works: From URL to IP Address",
    "pillar": "tech_explained"
  },
  "hook": "Ever wondered what happens behind the scenes when you hit Enter on a URL? Here is the complete DNS journey in 6 slides.",
  "slides": [
    {
      "slideNumber": 1,
      "type": "hook",
      "headline": "What Really Happens When You Type a URL?",
      "body": "Behind every browser request lies a lightning-fast distributed lookup system called DNS. Here is how it maps domain names to IP addresses in milliseconds.",
      "visualSuggestion": "Clean diagram showing user laptop pointing query arrow toward DNS cloud"
    },
    {
      "slideNumber": 2,
      "type": "concept",
      "headline": "Step 2: Recursive Resolver & Root Servers",
      "body": "Your ISP or local resolver queries the root server clusters, which route the request to TLD nameservers (.com).",
      "visualSuggestion": "Sequence diagram showing query dispatch path"
    },
    {
      "slideNumber": 6,
      "type": "cta",
      "headline": "Key Takeaways & Next Steps",
      "body": "DNS is the backbone of internet routing. Cache wisely, optimize TTLs, and follow @ElevateWeb for more deep-dive systems engineering content.",
      "visualSuggestion": "ElevateWeb brand logo with clean summary checklist and save post icon"
    }
  ],
  "caption": "DNS translates human-readable domain names into machine-readable IP addresses in under 50ms...",
  "cta": "Save this post for your next system design interview and follow @ElevateWeb!",
  "hashtags": ["#DNS", "#SystemDesign", "#WebDev", "#Networking", "#SoftwareEngineering"],
  "sources": [
    "RFC 1034 - Domain Names: Concepts and Facilities",
    "RFC 1035 - Domain Names: Implementation and Specification"
  ]
}
```

---

## Error Envelope & Status Codes

All errors return a structured JSON response matching `StructuredApiErrorSchema`:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description of error",
    "details": [
      {
        "path": "field.name",
        "message": "Specific issue description"
      }
    ]
  }
}
```

### Status Code Table
| HTTP Status | Error Code | Cause |
|---|---|---|
| `400 Bad Request` | `VALIDATION_ERROR` | Missing required fields, invalid types, slide count out of bounds, unrecognized keys, or invalid JSON syntax. |
| `500 Internal Server Error` | `GENERATION_ERROR` | Upstream OpenAI failure, rate limit (HTTP 429), or generated content failing Tier 2 schema validation. |
| `500 Internal Server Error` | `DATABASE_ERROR` | Supabase persistence error, database connection failure, or constraint violation. |
| `504 Gateway Timeout` | `UPSTREAM_TIMEOUT` | Upstream OpenAI network or request timeout exceeding threshold. |

### Secret Scrubbing Guarantee
All error messages and details are scrubbed before serialization. The API guarantees that:
- No OpenAI API keys (`sk-proj-...`) appear in responses.
- No Supabase JWT tokens (`eyJ...`) or service role keys appear in responses.
- No PostgreSQL connection strings (`postgresql://...`) appear in responses.
