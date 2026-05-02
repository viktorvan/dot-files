---
name: medoma-platform
description: "Load this skill to gain domain knowledge about the Medoma platform. Queries a Supabase vector database for relevant platform knowledge using semantic search."
---

# Medoma Platform Domain Knowledge

## Overview

Medoma is a digital care coordination platform for home-based healthcare (hemsjukvard). It consists of three applications:

- **Medoma Center** -- Web application for coordinators and managers. Used for planning, scheduling, patient registration, communication, and overview.
- **Medoma Go** -- Mobile app for healthcare staff performing home visits. Used to view and execute visits, report activities, and chat with the coordination center.
- **Medoma Care** -- Patient-facing mobile app. Used for viewing schedule, reporting measurements, receiving messages, and video calls.

## Key Domain Concepts

- **CareEpisode (Vardperiod)** -- A period of care for a patient, from admission (inskrivning) to discharge (utskrivning). A patient can have multiple care episodes over time.
- **Activity (Aktivitet)** -- A task or visit for a patient. Types: Hembesok (home visit), Mottagningsbesok (clinic visit), Administrativa aktiviteter (admin tasks), Patientaktiviteter (patient self-tasks), Egen matning (patient measurements), Videosamtal (video call), Telefonsamtal (phone call).
- **OccurrenceGroup** -- A recurring activity series. Individual occurrences are generated from the group's schedule.
- **Visit (Besok)** -- A grouping of activities at the same patient on the same day. Home visit activities are automatically grouped into one visit.
- **Planning (Planering)** -- Assigning activities/visits to staff members for each day via drag-and-drop.
- **Route** -- A sequence of visits assigned to a staff member for a shift.
- **Shift (Arbetspass)** -- A staff member's work period. Integrated from external scheduling systems (Tessa, Quinyx).
- **Patient states** -- Under assessment (Under bedomning) -> Admitted (Inskriven) -> Paused (Pausad) -> Discharged (Utskriven).
- **SITHS card** -- Smart card required for Center login (Swedish healthcare authentication).
- **Double staffing (Dubbelbemanning)** -- Assigning multiple staff members to a single visit.

## How to Query the Knowledge Base

This skill provides access to a vectorized knowledge base stored in Supabase. Use semantic search to find relevant platform documentation.

### Step 1: Generate a query embedding

Use `bash` to call the Azure OpenAI embedding API:

```bash
curl -s "https://medoma-openai-dev.openai.azure.com/openai/deployments/text-embedding-3-large/embeddings?api-version=2024-02-01" \
  -H "Content-Type: application/json" \
  -H "api-key: $AZURE_OPENAI_API_KEY" \
  -d '{"input": "<YOUR QUERY TEXT>"}' \
  | python3 -c "
import json, sys
resp = json.load(sys.stdin)
emb = resp['data'][0]['embedding']
vec = '[' + ','.join(str(v) for v in emb) + ']'
print(vec)
"
```

Replace `<YOUR QUERY TEXT>` with a natural-language description of what you need to know (e.g., "how does patient discharge work", "what are activity types").

### Step 2: Query the knowledge base

Use the `supabase_execute_sql` tool with project ID `uvieiiljupmaotvdcmdj`:

```sql
SELECT id, content, metadata, similarity
FROM match_documents(
  '<EMBEDDING_VECTOR>'::vector,
  5
);
```

Replace `<EMBEDDING_VECTOR>` with the vector output from Step 1. The `5` parameter controls how many results to return (top-N by cosine similarity).

### Combined one-liner

For convenience, you can combine both steps:

```bash
QUERY="how does patient admission work"
EMBEDDING=$(curl -s "https://medoma-openai-dev.openai.azure.com/openai/deployments/text-embedding-3-large/embeddings?api-version=2024-02-01" \
  -H "Content-Type: application/json" \
  -H "api-key: $AZURE_OPENAI_API_KEY" \
  -d "{\"input\": \"$QUERY\"}" \
  | python3 -c "import json,sys; emb=json.load(sys.stdin)['data'][0]['embedding']; print('['+','.join(str(v) for v in emb)+']')")
```

Then pass `$EMBEDDING` to `match_documents` via `supabase_execute_sql`.

### Configuration

- **Supabase project ID**: `uvieiiljupmaotvdcmdj`
- **Azure OpenAI endpoint**: `https://medoma-openai-dev.openai.azure.com/`
- **Embedding deployment**: `text-embedding-3-large`
- **Embedding dimensions**: 3072
- **API key env var**: `AZURE_OPENAI_API_KEY`
- **API version**: `2024-02-01`

### When to query

- When you need to understand a specific platform feature or workflow
- When a Linear issue or user request references Medoma domain concepts you're unsure about
- When you need to verify how users interact with the platform

You do NOT need to query for every task. Use the domain overview above for general context, and query only when you need specific details.
