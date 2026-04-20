# Postiz - Codebase Documentation

## Mục Lục
1. [Tổng Quan](#tổng-quan)
2. [Chức Năng Chính](#chức-năng-chính)
3. [Thuật Toán & Logic Lõi](#thuật-toán--logic-lõi)
4. [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
5. [Tech Stack](#tech-stack)
6. [Cấu Trúc Cơ Sở Dữ Liệu](#cấu-trúc-cơ-sở-dữ-liệu)

---

## Tổng Quan

**Postiz** là một nền tảng SaaS để lên lịch các bài đăng trên mạng xã hội và các kênh chat đến hơn **30+ nền tảng** bao gồm:
- Social Media: X/Twitter, LinkedIn, Instagram, Facebook, TikTok, YouTube, Bluesky, Mastodon, Threads, Reddit, Pinterest, Dribbble, Farcaster, v.v.
- Chat/Messaging: Discord, Slack, Telegram
- Blogs: Dev.to, Hashnode, Medium, WordPress
- Khác: Nostr, VK, Lemmy

### Ngôn Ngữ & Framework
- **Backend**: NestJS (Node.js)
- **Orchestrator**: NestJS + Temporal.io
- **Frontend**: Next.js + React 19
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **AI**: LangChain + GPT-4.1 + DALL-E 3

---

## Chức Năng Chính

### 1. **Lên Lịch Bài Đăng (Post Scheduling)**
- Tạo bài đăng để múi lịch bất kỳ
- Hỗ trợ các loại bài đăng: Draft, Schedule, Post Immediately, Update Existing
- Tự động retry nếu đăng thất bại
- Hỗ trợ threading (bài chính + bình luận con có delay)

### 2. **AI Content Generation (LangGraph Agent)**
- Tạo bài đăng tự động qua web search
- Hỗ trợ 4 định dạng: one_short, one_long, thread_short, thread_long
- Hỗ trợ 2 tone: personal, company
- Tự động tạo ảnh qua DALL-E 3
- Upload và lưu trữ media

### 3. **Analytics (Phân Tích Dữ Liệu)**
- Theo dõi metrics theo từng nền tảng (engagement, reach, impressions)
- Phân tích trending posts
- Cache results trong Redis để tối ưu
- Hỗ trợ date range analytics

### 4. **Auto-Posting (Tự Động Đăng RSS)**
- Parse RSS feeds tự động mỗi giờ
- Generate content tự động từ article mới
- Tạo ảnh thumbnail tự động
- Schedule posting trên các integration đã chọn

### 5. **Team Collaboration (Cộng Tác Nhóm)**
- Multi-user organizations
- Role-based access (USER / ADMIN)
- Bình luận trên posts
- Quản lý team members

### 6. **Streak System (Hệ Thống Streak)**
- Theo dõi chuỗi đăng bài (22 giờ mỗi cửa sổ)
- Email reminder 2 giờ trước hết hạn
- Reset sau khi hết streak window
- Khuyến khích người dùng đăng bài thường xuyên

### 7. **Media Library (Thư Viện Media)**
- Upload và quản lý ảnh/video
- Tự động tạo thumbnail từ video
- Tagging và organization
- AWS S3 storage

### 8. **Webhook System (Hệ Thống Webhook)**
- Gửi events khi post được tạo, publish, fail
- Custom webhook URLs per organization
- Support selective integration filtering

### 9. **Billing & Subscriptions (Thanh Toán)**
- Stripe integration
- Subscription tiers: FREE, BASIC, PRO, BUSINESS
- Billing periods: MONTHLY, YEARLY, LIFETIME
- Trial period management

### 10. **Team Marketplace (Marketplace Nhóm)**
- Mua/bán posts giữa users
- Order management (PENDING → ACCEPTED → COMPLETED)
- Messaging system giữa buyer/seller
- Payout tracking

### 11. **Plugs/Extensions (Hệ Thống Plugin)**
- Internal plugs (repost toàn org)
- Global plugs (third-party integrations)
- Configurable per integration

### 12. **Short Link Tracking (Theo Dõi Link Rút Gọn)**
- Shorten URLs
- Track click analytics
- Custom domain support

### 13. **OAuth & Social Integrations**
- OAuth authentication cho 30+ platforms
- Token refresh automation
- Multi-account support
- Encryption sensitive tokens

### 14. **Newsletter & Bulk Email System**
- Tích hợp external newsletter providers (Beehiiv, Listmonk)
- Email subscriber management (register/unregister)
- Bulk email sending với rate limiting
- Digest email notifications hàng giờ
- Support 3 loại email: success, failure, info
- Email queue management với retry mechanism
- Cấu hình email preferences per user

---

## Thuật Toán & Logic Lõi

### 1. **Post Publishing Workflow (Temporal-based)**

**File**: `/apps/orchestrator/src/workflows/post-workflows/post.workflow.v1.0.2.ts`

```
Quy trình: 
1. Nhận post ID + publish date
2. Chờ đến publish date (hoặc post ngay nếu immediate)
3. Kiểm tra status integration (cần refresh token?)
4. Lấy post hierarchy (main post + comment threads)
5. Kiểm tra nền tảng có support comments không
6. Với mỗi post trong hierarchy:
   - Loop retry (tối đa 5 lần):
     a) Post tới platform
     b) Nếu token expired: refresh token + retry
     c) Nếu bad body: notify user + fail
     d) Nếu success: lưu releaseURL + postId
     e) Xử lý delay cho comment posts
7. Gửi webhooks
8. Process internal/global plugs
9. Update post state (SUCCESS/ERROR)
10. Gửi notification

Chiến lược Retry:
- 3 retries với exponential backoff (2 min initial)
- Token refresh handling qua signals
- Comment threading support
- Grouped concurrent publishing per platform
```

**Complexity**: O(n*m) - n posts, m platforms

---

### 2. **AI Content Generation (LangGraph State Machine)**

**File**: `/libraries/nestjs-libraries/src/agent/agent.graph.service.ts`

```
LangGraph Workflow:
research → categorize → topic → popular_posts → hook → content → images → upload → schedule

Nodes:
1. agent: Web search (Tavily API)
2. research: Extract search results
3. find-category: Classify to category (GPT-4.1)
4. find-topic: Classify to topic (GPT-4.1)
5. find-popular-posts: Lấy similar posts
6. generate-hook: Tạo hook 1-2 câu hấp dẫn
7. generate-content: Generate nội dung (1 hoặc thread)
8. generate-content-fix: Normalize to array
9. [Conditional] generate-picture: DALL-E 3
10. upload-pictures: Upload + lưu DB
11. post-time: Tìm slot posting tiếp theo

Conditional Logic:
- if isPicture → generate-picture → upload
- else → post-time (skip image)

Output:
{
  content: string | string[],
  images: { url, alt }[],
  scheduledTime: Date,
  category: string,
  topic: string,
  hook: string
}

AI Details:
- Model: GPT-4.1 (temp 0.7)
- Structured outputs via Zod
- 4 formats: one_short, one_long, thread_short, thread_long
- 2 tones: personal, company
```

**Complexity**: O(1) per generation (parallel steps)

---

### 3. **Auto-Posting Workflow (Infinite Long-Running)**

**File**: `/apps/orchestrator/src/workflows/autopost.workflow.ts`

```
Infinite Pattern:
while (true):
  1. Lần đầu: execute autopost activity ngay
  2. Lần sau: sleep 1 hour + execute
  3. Never terminate (infinite loop + signal handling)

Activity (autopost.activity.ts):
1. Fetch AutoPost config (RSS URL, integrations)
2. Parse RSS feed
3. Tìm latest article (by pubDate)
4. So sánh với lastUrl posted
5. Nếu mới:
   a) Generate content via LangGraph
   b) Transform content via GPT prompts
   c) Generate ảnh via DALL-E (nếu enabled)
   d) Create post drafts cho các integrations
   e) Schedule posts via Temporal

RSS Parsing:
- Use rss-parser library
- Lấy: title, description, pubDate, image
- So sánh URL để avoid duplicates
```

**Complexity**: O(n) - n feed items

---

### 4. **Streak Tracking (22-Hour Windows)**

**File**: `/apps/orchestrator/src/workflows/streak.workflow.ts`

```
Algorithm:
1. Trigger trên bài đăng đầu tiên (per org)
2. Set streak start timestamp
3. Sleep 22 giờ (79,200,000 ms)
4. Gửi email warning: "Lose streak in 2 hours!"
5. Sleep 2 giờ (7,200,000 ms)
6. Reset streak (end timestamp)
7. Repeat nếu có bài đăng tiếp theo

Temporal Retry:
- setOptions({ retry: retryPolicy })
- Exponential backoff with jitter
- Persist state qua organization record
```

**Complexity**: O(1)

---

### 5. **Post Slot Finding Algorithm**

**File**: `/libraries/nestjs-libraries/src/database/prisma/posts/posts.service.ts`

```
Algorithm: findFreeDateTime(orgId, integrationId?)

1. Retrieve tất cả scheduled posts cho org/integration
2. Sort by publishDate
3. Find first time slot không conflict
4. Default slots:
   - 120s after scheduledTime
   - 400s after
   - 700s after
5. Respect posting times từ integration settings
6. Return: nextAvailableSlot

Complexity: O(n log n) - n scheduled posts

Pseudo-code:
Function findFreeDateTime(orgId, integrationId):
  posts = getPosts(orgId, integrationId).sort(publishDate)
  
  FOR each scheduledSlot IN [120, 400, 700]:
    candidate = baseTime + scheduledSlot
    IF no post at candidate:
      RETURN candidate
    
  RETURN nextDefaultSlot
```

---

### 6. **Integration Token Refresh Strategy**

**File**: `/libraries/nestjs-libraries/src/integrations/refresh.integration.service.ts`

```
Algorithm: OAuth Token Management

Trigger Points:
- Check token expiration before posting
- Catch 401 error during API calls
- Periodic check (every X hours)

Refresh Flow:
1. Call platform's refreshToken() method
2. Validate new tokens received
3. Wait (some platforms need 10s delay)
4. Store encrypted token + new expiration
5. Retry original request

Failure Handling:
- If refresh fails 5 times: disconnect integration
- Notify user via email
- Set integration.disabled = true
- Return previous error to user

Token Retry in Post Workflow:
- Signal post workflow: "token_refresh_needed"
- Post workflow restarts from posting step
- Max 5 retries total per post

Security:
- Tokens encrypted at rest
- Never logged in plaintext
- Rotation handled per platform
```

**Complexity**: O(1) with exponential backoff

---

### 7. **Analytics Aggregation**

**File**: `/libraries/nestjs-libraries/src/database/prisma/posts/posts.service.ts`

```
Algorithm: checkPostAnalytics()

1. Get post + integration details
2. Check token expiration
3. If expired: call refreshToken()
4. Call platform.postAnalytics(postId)
5. Format response: 
   [{ 
     label: "Engagement",
     data: [[timestamp, metric], ...],
     percentageChange: 12.5
   }]
6. Cache in Redis:
   - Dev: 1 second TTL
   - Prod: 1 hour TTL
7. Return cached on repeat calls

Cache Key: `analytics:${postId}:${integrationId}`

Metrics per platform:
- Twitter: retweets, likes, replies, impressions
- LinkedIn: shares, comments, views
- Instagram: likes, comments, saves
- TikTok: views, shares, comments
- YouTube: views, likes, comments
```

**Complexity**: O(1) with caching

---

### 8. **Rate Limiting & Throttling**

**File**: NestJS ThrottlerModule + Redis

```
Algorithm: Request Rate Limiting

Implementation: Token Bucket with Redis

Configuration:
- Global limit: 30 requests/hour (configurable)
- Per-IP/User: optional
- Behind proxy support (X-Forwarded-For)
- Redis-backed for distributed setup

Flow:
1. Incoming request
2. Get rate limit key (user_id/ip)
3. Check Redis bucket count
4. If count < limit: 
   a) Decrement bucket
   b) Set TTL 1 hour
   c) Allow request
5. Else: Return 429 Too Many Requests

Pseudo-code:
Function checkRateLimit(userId):
  key = "rate_limit:" + userId
  current = redis.get(key)
  IF current >= 30:
    RETURN 429
  ELSE:
    redis.incr(key)
    redis.expire(key, 3600)
    RETURN 200
```

---

### 9. **Permission & Authorization System**

**File**: `/libraries/nestjs-libraries/src/policies/`

```
Framework: CASL (@casl/ability)

Authorization Checks:

1. SUBSCRIPTION_LIMITS:
   - Check org tier (FREE/BASIC/PRO/BUSINESS)
   - Validate channel count <= subscription.totalChannels
   - Validate posts/month <= tier limit

2. RESOURCE_ACCESS:
   - User can only access own organization's data
   - Post owner or org admin can modify
   - Team members can view/comment

3. ACTION_POLICIES:
   - posts:create → check subscription
   - integrations:add → check channel limit
   - webhooks:set → admin only
   - orders:manage → org members only

Guards:
- PoliciesGuard: Inject into controller
- ThrottlerGuard: Rate limiting
- JwtGuard: Authentication
```

---

### 10. **Newsletter & Bulk Email Workflow**

**Files**: 
- `/apps/orchestrator/src/workflows/send.email.workflow.ts`
- `/apps/orchestrator/src/workflows/digest.email.workflow.ts`
- `/apps/orchestrator/src/activities/email.activity.ts`

```
Bulk Email Sending (send.email.workflow):
1. Queue email signals đến từ các sources
2. Rate limiting: 700ms giữa mỗi email
3. Xử lý max 30 emails per run cycle
4. Sau 30 emails: continueAsNew (restart workflow)
5. Handler:
   - if addTo='top': unshift email (priority)
   - else: push email (queue)
6. Retry: 3 attempts với backoff 2 minutes

Digest Email (digest.email.workflow):
1. Per organization workflow
2. Collect notifications trong 1 giờ
3. Mỗi giờ: batch snapshot của queue
4. Filter emails theo user preferences:
   - sendSuccessEmails: 'success' type
   - sendFailureEmails: 'fail' type
   - Always include: 'info' type
5. Gửi consolidated email cho mỗi user
6. Format:
   - 1 email: use subject từ notification
   - Multiple: use "[Postiz] Your latest notifications"
7. Loop vô hạn (infinite workflow)

Newsletter Integration:
1. Providers: Beehiiv, Listmonk (hoặc empty)
2. Auto-detect via env vars:
   - BEEHIIV_API_KEY → use Beehiiv
   - LISTMONK_API_KEY → use Listmonk
3. Email validation: check for '@' character
4. Provider pattern: plugin-based architecture
```

**Complexity**: O(n) - n emails in queue

---

### 11. **Multi-Tenancy Architecture**

```
Data Isolation:

Organization Level:
- Each org has isolated:
  - Posts
  - Integrations
  - Users
  - Webhooks
  - Media files
  - AutoPost configs
  
Query Pattern:
- All queries filter by organizationId
- Automatic in middleware
- Can't access other org's data

Subscription Validation:
- Check tier on every action
- Free tier: 3 channels max
- Basic: 10 channels
- Pro: 50 channels
- Business: unlimited
```

---

## Kiến Trúc Hệ Thống

### Monorepo Structure

```
D:\Projects\postiz-app
├── apps/
│   ├── backend/          # NestJS API (port 3000)
│   │   ├── src/controllers/
│   │   ├── src/services/
│   │   └── main.ts
│   │
│   ├── orchestrator/      # Temporal Workers (port 3002)
│   │   ├── src/workflows/    # Post/Autopost/Streak workflows
│   │   ├── src/activities/   # Business logic
│   │   └── worker.ts
│   │
│   ├── frontend/          # Next.js UI (port 4200)
│   │   ├── src/app/         # Routes
│   │   ├── src/components/  # React components
│   │   └── tailwind.config.js
│   │
│   ├── extension/         # Chrome extension
│   ├── commands/          # CLI tools
│   └── sdk/               # Node.js SDK
│
├── libraries/
│   ├── nestjs-libraries/
│   │   ├── database/prisma/     # Prisma schemas + repos
│   │   ├── integrations/        # 30+ social providers
│   │   ├── agent/               # LangGraph AI
│   │   ├── temporal/            # Temporal utilities
│   │   ├── chat/                # MCP agent tools
│   │   ├── dtos/                # Validation schemas
│   │   └── redis/               # Cache service
│   │
│   ├── helpers/           # Shared utilities
│   └── react-shared-libraries/  # Shared React components
│
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── CLAUDE.md
└── Codebase.md (this file)
```

### Request Flow

```
Frontend (Next.js)
    ↓ HTTP/SWR
Backend API (NestJS)
    ↓ GraphQL/REST
Database (PostgreSQL + Prisma)
    ↓
Orchestrator (Temporal.io)
    ↓ Workflows
Social Platforms (APIs)
```

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend (Next.js + React)             │
│              (User Calendar, Post Editor, Analytics)    │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────────┐  ┌────▼──────────┐  ┌─▼────────────────┐
│  Backend API   │  │  AuthService  │  │  WebhookService  │
│  (NestJS)      │  │  (JWT/OAuth)  │  │  (Event pub/sub) │
└───────┬────────┘  └───────────────┘  └──────────────────┘
        │
        ├─────────────┬──────────────┬──────────────┐
        │             │              │              │
   ┌────▼────┐  ┌────▼────┐  ┌─────▼──┐  ┌───────▼───────┐
   │ Prisma  │  │  Redis  │  │ Stripe │  │  AWS S3       │
   │   ORM   │  │  Cache  │  │ Billing│  │  File Storage │
   └────┬────┘  └─────────┘  └────────┘  └───────────────┘
        │
   ┌────▼─────────────────────────────┐
   │  PostgreSQL Database             │
   │  (Users, Posts, Integrations)    │
   └────┬─────────────────────────────┘
        │
   ┌────▼────────────────────────────────────────────────┐
   │  Temporal Orchestrator (Workflow Engine)            │
   │  - post.workflow.v1.0.2                            │
   │  - autopost.workflow                               │
   │  - streak.workflow                                 │
   └────┬──────────┬──────────┬──────────┬──────────────┘
        │          │          │          │
   ┌────▼──┐  ┌──▼────┐ ┌───▼────┐ ┌──▼──────┐
   │Twitter│  │LinkedIn│ │Facebook│ │Instagram│  ...30+ Platforms
   └───────┘  └────────┘ └────────┘ └─────────┘
        │
   ┌────▼──────────────────────┐
   │  LangGraph AI Agent       │
   │  - GPT-4.1 Content Gen    │
   │  - DALL-E Image Gen       │
   │  - Tavily Web Search      │
   └───────────────────────────┘
```

---

## Tech Stack

### Backend
- **NestJS 10.0.2**: Framework chính
- **Temporal.io (@temporalio/*)**: Workflow orchestration
- **Prisma 6.5.0**: ORM + Database migrations
- **Redis**: Caching + Rate limiting
- **Express.js**: HTTP server

### Frontend
- **Next.js 16.2.1**: Framework React
- **React 19.2.4**: UI library
- **Mantine UI 5.10.5**: Component library
- **TailwindCSS 3.4.17**: Styling
- **SWR**: Data fetching
- **React Hook Form + Yup/Zod**: Form validation

### AI & LLM
- **LangChain**: AI orchestration
  - @langchain/openai: GPT models
  - @langchain/langgraph: Workflow
  - TavilySearch: Web search
- **OpenAI SDK**: Direct API calls
- **Zod**: Type-safe schemas

### Integration Libraries
- **twitter-api-v2**: X/Twitter
- **facebook-nodejs-business-sdk**: Meta
- **googleapis**: Google/YouTube
- **@atproto/api**: Bluesky
- **rss-parser**: RSS feeds
- **node-telegram-bot-api**: Telegram
- **tweetnacl**: Cryptography

### Infrastructure
- **PostgreSQL**: Primary database
- **Redis**: Cache + queue
- **Docker Compose**: Development
- **AWS S3**: File storage
- **Stripe**: Payment processing
- **Resend**: Transactional email
- **Sentry**: Error tracking

### Email & Newsletter
- **Resend**: Email service provider
- **NodeMailer**: SMTP email support
- **Beehiiv**: Newsletter provider integration
- **Listmonk**: Open-source newsletter integration
- **Temporal Workflows**: Email queue management + rate limiting

---

## Cấu Trúc Cơ Sở Dữ Liệu

### Core Models

#### Organizations (Multi-tenancy)
```prisma
model Organization {
  id: String (Primary Key)
  name: String
  description: String
  apiKey: String (Unique)
  streakSince: DateTime
  allowTrial: Boolean
  
  // Relations
  users: User[]
  integrations: Integration[]
  posts: Post[]
  subscriptions: Subscription[]
}
```

#### Users
```prisma
model User {
  id: String
  email: String (Unique)
  password: String (bcrypt hashed)
  provider: String (oauth provider)
  timezone: String
  
  // Notification settings
  sendStreakEmails: Boolean
  sendSuccessEmails: Boolean
  sendFailureEmails: Boolean
  lastReadNotifications: DateTime
  
  // Relations
  organizations: Organization[]
  posts: Post[]
  comments: Comment[]
}
```

#### Posts (Main Entity)
```prisma
model Post {
  id: String
  title: String
  description: String
  content: String | String[] (JSON)
  state: QUEUE | PROCESSING | PUBLISHED | SCHEDULED | ERROR | DRAFT
  publishDate: DateTime
  releaseURL: String (Platform post URL)
  releaseId: String (Platform post ID)
  
  // Scheduling
  delay: Int (milliseconds before posting)
  group: String (same-day grouping)
  intervalInDays: Int (repeat posting)
  
  // Media & Content
  image: Object[] (JSON - array of media)
  settings: Object (JSON - platform-specific)
  
  // Relations & Metadata
  organizationId: String
  integrationId: String
  parentPostId: String (for threading)
  tags: Tag[]
  
  // Marketplace
  approvedSubmitForOrder: Boolean
  
  // Timestamps
  createdAt: DateTime
  updatedAt: DateTime
  
  // Relations
  organization: Organization
  integration: Integration
  parentPost: Post
  comments: Comment[]
  errors: Error[]
}
```

#### Integrations (Connected Accounts)
```prisma
model Integration {
  id: String
  internalId: String (Platform account ID/handle)
  providerIdentifier: String (x-twitter, linkedin, instagram, etc.)
  
  // OAuth tokens
  token: String (Encrypted)
  refreshToken: String (Encrypted)
  tokenExpiration: DateTime
  
  // Status
  disabled: Boolean
  refreshNeeded: Boolean
  
  // Configuration
  postingTimes: Int[] (JSON - default slot times in ms)
  customInstanceDetails: Object (JSON)
  additionalSettings: Object (JSON)
  
  // Relations
  organizationId: String
  
  // Timestamps
  createdAt: DateTime
  updatedAt: DateTime
  
  // Relations
  organization: Organization
  posts: Post[]
  plugs: Plug[]
  webhooks: WebhookIntegration[]
}
```

#### Subscriptions
```prisma
model Subscription {
  id: String
  subscriptionTier: FREE | BASIC | PRO | BUSINESS
  period: MONTHLY | YEARLY | LIFETIME
  totalChannels: Int (max integrations allowed)
  
  // Billing
  identifier: String (Stripe subscription ID)
  cancelAt: DateTime
  isLifetime: Boolean
  
  // Relations
  organizationId: String
  organization: Organization
}
```

#### AutoPost
```prisma
model AutoPost {
  id: String
  url: String (RSS feed URL)
  lastUrl: String (Last posted article URL)
  
  // Feature flags
  active: Boolean
  onSlot: Boolean
  syncLast: Boolean
  addPicture: Boolean
  generateContent: Boolean
  
  // Content
  content: String (Template)
  title: String (Template)
  integrations: String[] (JSON - integration IDs)
  
  // Relations
  organizationId: String
  organization: Organization
}
```

#### Media
```prisma
model Media {
  id: String
  path: String (AWS S3 path)
  name: String
  originalName: String
  type: image | video
  fileSize: Int
  
  // Thumbnails
  thumbnail: String (S3 path)
  thumbnailTimestamp: Int (video preview time)
  alt: String (Accessibility)
  
  // Relations
  organizationId: String
  organization: Organization
}
```

#### Comments
```prisma
model Comment {
  id: String
  content: String
  
  // Relations
  postId: String
  userId: String
  organizationId: String
  
  post: Post
  user: User
  organization: Organization
}
```

#### Webhooks
```prisma
model Webhook {
  id: String
  name: String
  url: String (Webhook endpoint)
  active: Boolean
  
  // Relations
  organizationId: String
  integrations: WebhookIntegration[]
}

model WebhookIntegration {
  webhookId: String
  integrationId: String
}
```

#### Errors (Failed Posts)
```prisma
model Error {
  id: String
  message: String
  platform: String
  body: Object (JSON - error details)
  
  // Relations
  postId: String
  organizationId: String
  
  post: Post
  organization: Organization
}
```

#### Tags
```prisma
model Tag {
  id: String
  name: String
  color: String (HEX color)
  
  // Relations
  organizationId: String
  posts: Post[]
}
```

#### Orders (Marketplace)
```prisma
model Order {
  id: String
  state: PENDING | ACCEPTED | CANCELED | COMPLETED
  
  // Marketplace data
  buyerId: String
  sellerId: String
  postId: String
  
  // Relations
  messages: MessagesGroup[]
  payoutProblems: PayoutProblem[]
}
```

---

## Quy Trình Chính

### 1. Tạo & Đăng Bài

```
User tạo bài đăng
  ↓
POST /posts 
  - Validation (mapTypeToPost)
  - Xác định type: draft | schedule | now | update
  - Nếu shortLink enabled: shorten URLs
  - Generate tags
  - Validate media
  ↓
Tạo Post record (state=QUEUE)
  ↓
Nếu type="now": 
  → Trigger post workflow ngay
Nếu type="schedule":
  → Schedule via Temporal (wait until publishDate)
  ↓
Return postId → user
  ↓
Orchestrator nhận signal
  ↓
Post Publishing Workflow:
  1. Lấy integration tokens
  2. Refresh token nếu cần
  3. Post tới platform
  4. Retry 5 lần nếu fail
  5. Update post state → SUCCESS/ERROR
  6. Gửi webhook events
  7. Gửi notification email
```

### 2. Auto-Posting Flow

```
AutoPost enabled (RSS)
  ↓
Temporal Workflow: autopost.workflow
  - Lần đầu: execute ngay
  - Lần sau: sleep 1 hour + execute
  ↓
autopost.activity:
  1. Fetch AutoPost config
  2. Parse RSS feed
  3. Tìm latest article
  4. Compare với lastUrl
  5. Nếu mới:
     - Generate content via LangGraph
     - Generate ảnh DALL-E
     - Create posts cho integrations
     - Trigger post workflows
```

### 3. AI Content Generation

```
User request: "Create post about AI trends"
  ↓
Agent Graph Flow:
  1. Web search (Tavily) → findings
  2. Classify category (GPT-4.1)
  3. Classify topic (GPT-4.1)
  4. Find popular posts (search DB)
  5. Generate hook (1-2 sentences)
  6. Generate content (1 or thread)
  7. [if image needed] Generate image (DALL-E 3)
  8. Upload images to S3
  9. Find next posting slot
  ↓
Return: Fully generated post ready to publish
```

---

## Tóm Tắt Thuật Toán

| Thuật Toán | File | Mục Đích | Độ Phức Tạp |
|-----------|------|---------|-----------|
| Post Publishing | post.workflow.v1.0.2.ts | Đăng đa nền tảng | O(n*m) |
| AI Generation | agent.graph.service.ts | Generate content | O(1) |
| Auto-Posting | autopost.workflow.ts | RSS → Post | O(n) |
| Streak Tracking | streak.workflow.ts | 22-hour windows | O(1) |
| Token Refresh | refresh.integration.service.ts | OAuth management | O(1) |
| Slot Finding | posts.service.ts | Conflict-free schedule | O(n log n) |
| Analytics Cache | posts.service.ts | Redis metrics | O(1) |
| Rate Limiting | ThrottlerModule | Request throttling | O(1) |
| Bulk Email Sending | send.email.workflow.ts | Queue email processing | O(n) |
| Digest Email | digest.email.workflow.ts | Hourly notifications | O(n) |
| Newsletter Integration | newsletter.service.ts | Subscriber management | O(1) |

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-19  
**Maintained By**: Postiz Development Team
