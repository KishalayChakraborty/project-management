# HR Management Module - Implementation Progress

## ✅ COMPLETED

### 1. Database Schema (Prisma)
- ✅ All 11 new enums added (JobLevel, EmploymentType, JobAdStatus, ApplicantSource, ApplicantStatus, InterviewType, InterviewStatus, FeedbackRecommendation, OfferStatus, NegotiationStatus, AIProvider)
- ✅ All 11 new models created with relationships:
  - JobProfile, JobAdvertisement, Applicant, ApplicantEducation, ApplicantExperience
  - InterviewRound, InterviewRoundInterviewer, InterviewFeedback
  - SalaryStructure, SalaryNegotiation, EmploymentOffer, HiringBudget
- ✅ All foreign keys and indexes created
- ✅ Migration applied to PostgreSQL database
- ✅ Prisma client generated

### 2. Initial API Routes
- ✅ `/app/api/orgs/[orgId]/hr/job-profiles/route.ts` - GET (list), POST (create)

### 3. Initial Hooks
- ✅ `/hooks/hr/useJobProfiles.ts` - useQuery, useCreate, useUpdate, useDelete

---

## 🔄 IN PROGRESS / TODO

### Phase A: Complete All API Routes (20 routes)

Each route file should follow this pattern:
```typescript
- requireAuth() → getCurrentUser()
- requireOrgAccess(orgId, userId)
- For mutations: requireOrgRole(orgId, userId, ['ADMIN', 'MAINTAINER'])
- Zod validation for POST/PATCH bodies
- Error handling: catch z.ZodError → 400, 'Access denied' → 403, 'Insufficient permissions' → 403, default → 500
- On success mutations: createAuditLog() entry
- Pagination response: { items, pagination: { page, limit, total, totalPages, hasNext, hasPrev } }
```

#### Core Job Management Routes

1. **GET/PATCH/DELETE** `/app/api/orgs/[orgId]/hr/job-profiles/[jobProfileId]/route.ts`
   - GET: fetch single profile
   - PATCH: update profile (HR only)
   - DELETE: soft delete or hard delete (HR only)

2. **GET/POST** `/app/api/orgs/[orgId]/hr/job-ads/route.ts`
   - GET: list ads with status filter
   - POST: create ad from profile

3. **GET/PATCH/DELETE** `/app/api/orgs/[orgId]/hr/job-ads/[adId]/route.ts`
   - GET: fetch single ad
   - PATCH: update ad (HR only)
   - DELETE: delete ad (HR only)

4. **POST** `/app/api/orgs/[orgId]/hr/job-ads/[adId]/generate/route.ts`
   - AI generation with fallback to template
   - Provider: 'CLAUDE' | 'OPENAI' | 'GEMINI' | 'TEMPLATE'
   - Request body: `{ provider, modifications: string }`
   - Reads JobProfile, generates prompt, calls AI, saves result, records provider + modifications

#### Applicant Management Routes

5. **GET/POST** `/app/api/orgs/[orgId]/hr/applicants/route.ts`
   - GET: paginated list with filters (status, ad, profile)
   - POST: HR adds applicant

6. **GET/PATCH/DELETE** `/app/api/orgs/[orgId]/hr/applicants/[applicantId]/route.ts`
   - GET: fetch single applicant
   - PATCH: update applicant (HR only)
   - DELETE: delete applicant (HR only)

7. **POST** `/app/api/orgs/[orgId]/hr/applicants/[applicantId]/cv/route.ts`
   - File upload to MinIO (hr-cvs bucket)
   - Store cvMinioPath, cvPublicUrl, cvFileName, cvFileSize
   - Return: { minioPath, publicUrl, fileName, fileSize }

8. **GET/POST** `/app/api/orgs/[orgId]/hr/applicants/[applicantId]/education/route.ts`
   - GET: list education records
   - POST: add education

9. **PATCH/DELETE** `/app/api/orgs/[orgId]/hr/applicants/[applicantId]/education/[eduId]/route.ts`
   - PATCH: update education
   - DELETE: delete education

10. **GET/POST** `/app/api/orgs/[orgId]/hr/applicants/[applicantId]/experience/route.ts`
    - GET: list experience records
    - POST: add experience

11. **PATCH/DELETE** `/app/api/orgs/[orgId]/hr/applicants/[applicantId]/experience/[expId]/route.ts`
    - PATCH: update experience
    - DELETE: delete experience

#### Interview Management Routes

12. **GET/POST** `/app/api/orgs/[orgId]/hr/applicants/[applicantId]/interviews/route.ts`
    - GET: list interview rounds
    - POST: schedule new round (require round type, interviewers, date)

13. **GET/PATCH** `/app/api/orgs/[orgId]/hr/applicants/[applicantId]/interviews/[roundId]/route.ts`
    - GET: fetch single round with interviewers
    - PATCH: update round (status, date, location, etc.)

14. **GET/POST/PATCH** `/app/api/orgs/[orgId]/hr/applicants/[applicantId]/interviews/[roundId]/feedback/route.ts`
    - GET: list all feedback for round
    - POST: create feedback (for current interviewer)
    - PATCH: update feedback (own feedback only)

#### Salary Management Routes

15. **GET/POST** `/app/api/orgs/[orgId]/hr/applicants/[applicantId]/salary/route.ts`
    - GET: fetch salary structure
    - POST: create salary structure

16. **PATCH** `/app/api/orgs/[orgId]/hr/applicants/[applicantId]/salary/[structureId]/route.ts`
    - PATCH: update salary structure

17. **GET/POST** `/app/api/orgs/[orgId]/hr/applicants/[applicantId]/salary/[structureId]/negotiate/route.ts`
    - GET: list negotiation history
    - POST: add negotiation round (HR or applicant can propose)

#### Offer Management Routes

18. **GET/POST/PATCH** `/app/api/orgs/[orgId]/hr/applicants/[applicantId]/offer/route.ts`
    - GET: fetch current offer
    - POST: create/send offer
    - PATCH: update offer (ACCEPT/DECLINE - applicant), or update draft (HR)

19. **POST** `/app/api/orgs/[orgId]/hr/applicants/[applicantId]/offer/[offerId]/confirm-joining/route.ts`
    - Validate: joiningDate set, offer ACCEPTED
    - Auto-match or create user by applicant.email
    - Create OrgMember(orgId, userId, role=offer.assignedRole)
    - Set joiningConfirmed=true
    - Send audit log
    - Return: { userId, orgMemberId }

#### Analytics & Budget Routes

20. **GET** `/app/api/orgs/[orgId]/hr/analytics/route.ts`
    - Hiring funnel: count per status
    - Time-to-hire: avg days from applied to hired
    - Positions filled vs budgeted

21. **GET/POST** `/app/api/orgs/[orgId]/hr/budget/route.ts`
    - GET: list budgets
    - POST: create budget

22. **PATCH** `/app/api/orgs/[orgId]/hr/budget/[budgetId]/route.ts`
    - PATCH: update budget

#### Public Application Route (No Auth)

23. **GET/POST** `/app/api/apply/[token]/route.ts`
    - GET: fetch ad info by token
    - POST: submit application (multipart/form-data)
      - Fields: firstName, lastName, email, phone, alternatePhone, currentCompany, currentTitle, currentSalary, expectedSalaryMin, expectedSalaryMax, noticePeriodDays, educations (array), experiences (array), linkedinUrl, githubUrl, portfolioUrl, notes
      - CV file upload to MinIO (hr-cvs bucket)
      - Create Applicant record with source=PUBLIC_LINK
      - Validate token exists, ad is ACTIVE, no duplicate email per org

---

### Phase B: Create All Hooks (~12 hooks)

- `useJobAds.ts` - CRUD + generate mutation
- `useApplicants.ts` - paginated list, CRUD, CV upload
- `useApplicantEducation.ts` - education CRUD
- `useApplicantExperience.ts` - experience CRUD
- `useInterviews.ts` - schedule, fetch, update, feedback mutations
- `useSalary.ts` - structure CRUD, negotiation history + create
- `useHROffer.ts` - offer CRUD, accept/decline, confirm-joining
- `useHRAnalytics.ts` - fetch stats
- `useHRBudget.ts` - budget CRUD

---

### Phase C: Create All Components (~14 components)

`/components/hr/`:

- `JobProfileForm.tsx` - create/edit with dynamic lists (react-hook-form + Zod)
- `JobAdForm.tsx` - create/edit ad
- `JobAdGenerateDialog.tsx` - provider selector + prompt + preview
- `ApplicantPipeline.tsx` - Kanban view (react-beautiful-dnd or @dnd-kit)
- `ApplicantPipelineTable.tsx` - table view with status dropdown
- `ApplicantForm.tsx` - create/edit applicant
- `ApplicantDetail.tsx` - tabbed view: Profile | Education | Experience | Interviews | Salary | Offer
- `CVUploadSection.tsx` - file upload with progress
- `InterviewScheduleDialog.tsx` - schedule round
- `InterviewFeedbackForm.tsx` - scores + recommendation + text
- `SalaryStructureForm.tsx` - base + variable + benefits builder
- `SalaryNegotiationTimeline.tsx` - history + new proposal form
- `OfferDialog.tsx` - send offer or applicant accept/decline
- `JoiningConfirmationDialog.tsx` - set date, confirm → create member
- `HRAnalyticsDashboard.tsx` - charts + stats

---

### Phase D: Create All Pages (~8 pages)

`/app/(main)/orgs/[orgId]/hr/`:

- `layout.tsx` - HR sub-sidebar + breadcrumbs
- `page.tsx` - redirect to dashboard
- `dashboard/page.tsx` - summary cards
- `job-profiles/page.tsx` - table + create button
- `job-profiles/[jobProfileId]/page.tsx` - detail + edit
- `job-ads/page.tsx` - card grid with status
- `job-ads/[adId]/page.tsx` - ad management + share link
- `applicants/page.tsx` - ApplicantPipeline with kanban/table toggle
- `applicants/[applicantId]/page.tsx` - ApplicantDetail
- `interviews/page.tsx` - list all rounds
- `salary/page.tsx` - salary structures list
- `budget/page.tsx` - hiring budgets
- `analytics/page.tsx` - HRAnalyticsDashboard

---

### Phase E: Update Main Layout

- `/app/(main)/orgs/[orgId]/layout.tsx`
  - Add to `orgNavItems`: `{ title: 'HR', icon: UserCheck, segment: 'hr' }`
  - Update `isProjectDetailRoute` to pass through HR routes with their own layout

---

## 🛠️ Utilities Needed

1. **AI Generation Utility** (`/lib/hr-ai.ts`):
   - `generateJobAd(profile: JobProfile, modifications: string, provider: AIProvider): Promise<string>`
   - Calls Claude / OpenAI / Gemini API (check env vars, fallback to template)
   - Template: structured interpolation from profile fields

2. **Template Generator** (`/lib/hr-templates.ts`):
   - `generateJobAdTemplate(profile: JobProfile): string`
   - `generateOfferTemplate(offer: EmploymentOffer, salary: SalaryStructure): string`

3. **Public Link Token Generator** (`/lib/hr-tokens.ts`):
   - `generatePublicToken(): string` - random 32-char alphanumeric
   - `validatePublicToken(token: string): Promise<JobAdvertisement | null>`

---

## 📋 Development Order Recommendation

1. **API Routes** (write all 23 routes)
2. **Hooks** (write all 12 hooks)
3. **Utilities** (AI generation, templates, tokens)
4. **Public Apply Page** (`/app/apply/[token]/page.tsx`)
5. **Components** (start with forms, then views)
6. **Pages** (wire up components into pages)
7. **Layout Update** (add HR to sidebar)
8. **Testing** (manual verification via browser)

---

## 🧪 Testing Checklist

After implementation:

- [ ] Create job profile → appears in list
- [ ] Create job ad from profile → status DRAFT → ACTIVE
- [ ] Generate ad content (TEMPLATE mode if no API key)
- [ ] Visit public link `/apply/{token}` → form loads
- [ ] Submit application from public form → applicant created with source=PUBLIC_LINK
- [ ] HR adds applicant internally → applicant created with source=HR_ADDED
- [ ] Move applicant through statuses (kanban drag or table dropdown)
- [ ] Schedule interview → rounds visible in interviews list
- [ ] Submit feedback (quantitative + qualitative) → feedback saved
- [ ] Create salary structure → offer references it
- [ ] Initiate 2 negotiation rounds → history saved
- [ ] Send offer → applicant accepts
- [ ] Confirm joining (set date) → OrgMember created in DB with correct role
- [ ] Analytics page shows correct counts
- [ ] Budget tracking updates as offers accepted

---

## 🚀 Quick Start Commands

```bash
# After implementing routes, hooks, components, pages:

# 1. Verify build
npm run build

# 2. Start dev server
npm run dev

# 3. Navigate to org
# http://localhost:7751/orgs/{orgId}/hr/dashboard

# 4. Create job profile, ad, apply via public link, move through pipeline
```

---

## 📝 Notes

- CV files stored in MinIO bucket: `hr-cvs`
- Offer documents (if PDF generated): bucket `hr-offers`
- All org-level, so user must be OrgMember to access HR module
- Interview feedback: quantitative (1-10 scores) + qualitative (text fields)
- Salary negotiation: bidirectional (HR proposes, applicant counter-proposes)
- On joining confirmation: auto-create user if email not found, then add to org
