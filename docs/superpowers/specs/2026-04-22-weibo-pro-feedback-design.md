# Weibo-Pro Feedback Implementation Design

- Date: 2026-04-22
- Status: Approved for planning
- Scope: `apps/bigscreen`, `apps/api`, `packages/sdk`

## Context

This design consolidates three local feedback sources:

- `docs/系统梳理反馈4.9.docx`
- `docs/舆情系统界面设计展示.pptx`
- `docs/舆情系统界面设计补充需求2.0.pdf`

The repository already contains substantial event-analysis capability. The current problem is not "missing system from scratch", but a mismatch between:

1. what the current product surfaces,
2. what the feedback expects as business-facing analysis,
3. how current metrics and loading behavior are explained.

Existing event analysis is centered in:

- `apps/bigscreen/src/pages/EventDetail.tsx`
- `apps/api/src/services/data/events/events.service.ts`
- `apps/api/src/services/data/events/event-query.service.ts`
- `apps/api/src/services/data/spread-breadth.service.ts`
- `apps/api/src/services/data/sentiment-transition.service.ts`
- `apps/api/src/services/data/community-detection.service.ts`
- `apps/api/src/services/data/user-stratification.service.ts`

Existing user monitoring is centered in:

- `apps/bigscreen/src/pages/UserDetection.tsx`
- `apps/bigscreen/src/pages/UserDetection3D.tsx`
- `apps/api/src/services/data/users.service.ts`

The current user monitoring implementation is materially misaligned with the feedback. It mainly classifies users by negative sentiment ratio, while the feedback is asking for abnormal-account detection, comprehensive scoring, and account profile completeness.

## Goals

1. Reorganize single-event analysis into business-facing sections instead of exposing a technical module inventory.
2. Productize the missing analysis capabilities requested in the feedback without replacing the monorepo architecture or controller-contract model.
3. Add explicit metric explanations for ambiguous indicators.
4. Stabilize page loading so one failed widget does not blank an entire section.
5. Reposition user monitoring from "sentiment risk list" to "abnormal account monitoring".

## Non-Goals

1. No full redesign of app routing, shell layout, or workspace-level architecture.
2. No replacement of the DI, controller, or SDK proxy model.
3. No new crawl platform or new raw-ingestion pipeline in the first implementation cycle.
4. No attempt to perfectly solve all government-account classification edge cases before a usable first version is live.

## Current-State Assessment

### Already implemented but poorly surfaced

- Spread breadth analysis
- Community detection
- Propagation velocity
- Sentiment transition
- User stratification
- Event keyword aggregation and keyword time series
- Anomaly timeline

### Implemented but not productized into the bigscreen flow

- Abnormal user detection logic in `packages/agent/src/tools/batch-detection.tool.ts`
- Key opinion extraction logic in `packages/agent/src/tools/key-opinion.tool.ts`
- Event milestone logic in `packages/agent/src/tools/event-analysis.tool.ts`

### Product gaps

- Government or institution account participation display
- Opinion clustering and representative viewpoints
- Detailed event topic distribution and frequency presentation
- Event milestone explanation connected to representative content
- Abnormal-account scoring as a first-class product capability
- Consistent metric explanation surfaces

## Target Product Structure

### 1. Event Detail Workbench

`EventDetail` remains the host page, but the content model changes from technical tabs to business-facing sections:

1. `事件概况`
2. `传播分析`
3. `情感分析`
4. `用户参与`
5. `观点汇集`

The page may still use tabs internally, but the labels and loading units must follow these business sections.

### 2. Global Overview

`DataOverview` stays lightweight and remains the global summary page. It only adds a compact user-network summary and stronger entry links into event-level deep analysis. Single-event deep content does not move onto the overview page.

### 3. User Monitoring Console

`UserDetection` and `UserDetection3D` become abnormal-account monitoring surfaces:

- overview list
- scoring and anomaly evidence
- account-type classification
- account profile completeness
- event-scoped participation evidence

The 3D view remains optional visualization, not the primary explanation surface.

## Detailed Page Design

### Event Detail: 事件概况

Required modules:

- event summary header
- hotness trend
- event timeline and milestone cards
- topic distribution and frequency
- keyword time-series heatmap
- institution-account participation

Data sources:

- existing: `getEventDetail`, `getEventTrends`, `getEventKeywords`, `getKeywordsTimeSeries`
- new: `getEventMilestones`, `getEventInstitutions`

### Event Detail: 传播分析

Required modules:

- spread breadth
- propagation velocity
- media type distribution
- community graph
- user relation graph
- anomaly timeline

Data sources:

- existing services remain in place
- no routing change required

Required UX change:

- each chart gets a local metric explanation entry
- each widget renders independently with its own loading, empty, error, and retry state

### Event Detail: 情感分析

Required modules:

- sentiment distribution summary
- sentiment-hotness scatter
- sentiment intensity distribution
- sentiment transition
- emotion map
- user emotion insight
- emotion trend

Data sources:

- existing: `getSentimentHotness`, `getSentimentIntensity`, `SentimentTransitionController`
- new: `getEventEmotionMap`, `getEventUserEmotionInsights`, `getEventSentimentTrendDetailed`

### Event Detail: 用户参与

Required modules:

- user stratification
- event participant network
- abnormal account panel
- key participants and influence summary

Data sources:

- existing: `UserStratificationController`, `UserRelationController`, event user relations
- new: `getEventAbnormalUsers`

### Event Detail: 观点汇集

Required modules:

- opinion clusters
- representative viewpoints
- opposing viewpoints
- milestone-linked representative posts

Data sources:

- new: `getEventOpinionClusters`
- milestone-linking uses `getEventMilestones`

This section should be evidence-first: cluster summary plus representative posts, not free-form narrative only.

## New Backend Capabilities

The current `event-query.service.ts` is already dense. New product capabilities should be implemented as focused services and then exposed through existing controllers.

### New services

- `apps/api/src/services/data/events/event-milestone.service.ts`
- `apps/api/src/services/data/events/event-opinion.service.ts`
- `apps/api/src/services/data/events/event-institution.service.ts`
- `apps/api/src/services/data/events/event-abnormal-user.service.ts`
- `apps/api/src/services/data/users/user-risk-profile.service.ts`

### Controller strategy

Keep the frontend consumption model simple:

- event-scoped read APIs remain on `EventsController`
- user-scoped detailed scoring remains on `UsersController`

This matches the current `EventDetail` usage pattern and avoids introducing a large new controller forest for one page flow.

### New `EventsController` methods

- `getEventMilestones(id)`
- `getEventOpinionClusters(id)`
- `getEventInstitutions(id)`
- `getEventAbnormalUsers(id, minPosts?, sensitivity?, limit?)`
- `getEventEmotionMap(id)`
- `getEventUserEmotionInsights(id)`
- `getEventSentimentTrendDetailed(id)`

### New `UsersController` methods

- `getRiskProfile(userId, eventId?)`

## Data Contract Design

### Event milestones

```ts
interface EventMilestone {
  timestamp: string;
  type: 'heat_spike' | 'sentiment_turn' | 'propagation_peak' | 'official_response' | 'discussion_shift';
  title: string;
  summary: string;
  confidence: number;
  metrics: {
    hotness?: number;
    postCount?: number;
    userCount?: number;
    sentimentShift?: number;
  };
  representativePosts: Array<{
    postId: string;
    author: string;
    excerpt: string;
    engagement: number;
  }>;
}
```

### Opinion clusters

```ts
interface EventOpinionCluster {
  id: string;
  label: string;
  stance: 'supportive' | 'critical' | 'neutral' | 'mixed';
  summary: string;
  postCount: number;
  userCount: number;
  keywords: string[];
  representativePosts: Array<{
    postId: string;
    author: string;
    excerpt: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    engagement: number;
  }>;
}
```

### Institution accounts

```ts
interface EventInstitutionAccount {
  userId: string;
  screenName: string;
  avatar?: string;
  institutionType: 'government' | 'state_media' | 'enterprise_org' | 'official_other';
  verified: boolean;
  verifiedType?: string;
  postCount: number;
  interactionCount: number;
  influenceScore: number;
  sentimentTilt: 'positive' | 'negative' | 'neutral';
}
```

### Abnormal users

```ts
interface EventAbnormalUser {
  userId: string;
  userName: string;
  avatar?: string;
  verified: boolean;
  accountType: 'bot' | 'troll' | 'suspicious' | 'normal';
  abnormalityScore: number; // 0-100
  profileCompleteness: number; // 0-100
  signalCount: number;
  abnormalSignals: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  activity: {
    postCount: number;
    activeHours: number;
    averageIntervalMinutes?: number;
  };
}
```

### User risk profile

```ts
interface UserRiskProfile {
  userId: string;
  accountType: 'bot' | 'troll' | 'suspicious' | 'normal';
  riskScore: number; // 0-100
  profileCompleteness: number; // 0-100
  evidence: Array<{
    category: 'time_pattern' | 'content_similarity' | 'interaction_abnormality' | 'sentiment_extremity' | 'profile_quality';
    score: number;
    summary: string;
  }>;
}
```

## Metric Explanation Layer

This is a first-class requirement, not decoration.

Add a shared metric-explanation surface in `apps/bigscreen`, implemented as a small reusable component such as `MetricExplainDrawer` or `MetricExplainPopover`.

Each ambiguous metric must define:

- label
- business meaning
- current calculation basis
- value range or interpretation
- data source

First-wave metrics:

- community grouping basis
- coverage region
- negative sentiment score
- unique reposters
- spread depth
- breadth index
- media type
- anomaly `value / expected / confidence`
- stability index
- polarization index
- total time points
- analyzed time points
- skipped boundary points
- user-type stratification basis

The explanation source is a frontend registry backed by exact current service behavior. For modules that already return metadata, the UI should render both backend metadata and the local definition text.

## Loading and Failure Strategy

`EventDetail` currently groups widget fetches per tab. This is too brittle for the requested page density.

New rules:

1. Keep section-level lazy loading.
2. Inside each section, fetch widgets with `Promise.allSettled`.
3. Each widget has its own `idle | loading | success | empty | error` state.
4. One widget failure must not fail the section.
5. Cache refresh must support widget-level retry in addition to whole-event refresh.

This is the first implementation phase because several feedback items are explicit load failures rather than missing charts.

## User Monitoring Redesign

### Current problem

`users.service.ts` currently derives risk mainly from negative-sentiment ratio. That is not a usable abnormal-account model.

### New model

The product model changes to:

- comprehensive score
- account type
- anomaly evidence
- profile completeness
- event participation evidence

### Scoring dimensions

First version uses weighted normalized evidence:

- time regularity
- burst posting
- text similarity
- extreme sentiment ratio
- interaction abnormality
- profile completeness penalty

The batch-detection rules already present in `packages/agent` provide the initial scoring seed. The implementation should extract and reuse those rules instead of inventing a disconnected second model.

## Delivery Plan

### Phase 1: stability and metric clarity

- refactor `EventDetail` widget loading and retry behavior
- add metric explanation layer
- add overview network summary

### Phase 2: single-event product gaps

- event milestones
- topic distribution and frequency presentation refinement
- institution-account participation

### Phase 3: opinions and detailed sentiment

- opinion clusters
- representative viewpoints
- emotion map
- user emotion insight
- detailed emotion trend

### Phase 4: user monitoring redesign

- abnormal user event panel
- user risk profile API
- list and detail scoring redesign
- profile completeness and avatar-quality improvements

## Acceptance Criteria

1. `EventDetail` is organized into five business-facing sections.
2. Every previously ambiguous core metric has an explanation surface.
3. A failed widget no longer blanks an entire tab or section.
4. Event detail includes milestones, institution participation, and opinion clustering.
5. User monitoring shows abnormal-account score and evidence, not only sentiment-derived risk.
6. New APIs follow existing SDK controller-contract patterns.

## Risks and Mitigations

- Risk: institution classification is noisy.
  Mitigation: ship an explicit `institutionType` confidence model and show fallback categories instead of pretending exact precision.

- Risk: opinion clustering may become slow on large events.
  Mitigation: cache event-level cluster results and limit representative-post extraction per cluster.

- Risk: user monitoring semantics drift from event-scoped analysis.
  Mitigation: keep event-scoped abnormal user analysis separate from global user profile analysis, with different payloads and labels.

- Risk: current community display is hard to trust because names and labels are thin.
  Mitigation: enrich community payloads with clearer summaries and explain the Louvain-based grouping basis directly in the UI.

## Final Recommendation

Proceed with incremental delivery. Do not rewrite the system. Stabilize and clarify the current event-detail experience first, then add the missing event-scoped capabilities, then replace the current user-monitoring semantics with an abnormal-account model.
