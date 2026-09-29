# FundiConnect
## Trusted Artisan Marketplace for Nairobi

### What Is FundiConnect?
FundiConnect is a **Progressive Web Application (PWA)** solving a critical gap in Nairobi's informal services economy. It's a two-sided marketplace connecting:
- **Customers** seeking trustworthy, qualified service providers
- **Artisans** seeking reliable customer networks and steady income

**Website:** fundiconnect.africa
**Market:** Nairobi, Kenya (launch location)
**Business Model:** Commission-based marketplace for skilled services

### The Problem FundiConnect Solves

**For Customers:**
- Finding trustworthy plumbers, electricians, carpenters is hard
- Quality varies wildly
- No easy verification or rating system
- Risk of poor work or scams
- No recourse if work isn't done right

**For Artisans:**
- Finding consistent work is unreliable
- No formal customer network
- Lose income to middlemen (brokers)
- No platform to build reputation
- Struggle to scale from sole operator

**The Opportunity:**
Nairobi has 500,000+ skilled tradespeople but zero trusted platform. Market is fragmented, inefficient, and excludes formal employment for this segment.

### Service Offerings

**Original Launch (2 categories):**
- Plumbing
- Electrical

**Expanded to 8+ Service Types:**
Market research validated demand across:
- Plumbing
- Electrical
- Carpentry
- Home Maintenance
- Cleaning Services
- Installation Services
- Repairs
- Additional skilled trades

This expansion reflects actual customer demand and market opportunity.

### How It Works

**The Deposit-Plus-Site-Payment Model:**

1. **Booking Phase:**
   - Customer requests service on platform
   - Artisan quotes and proposes time
   - Customer reviews artisan profile, ratings, experience

2. **Deposit Phase:**
   - Customer places deposit (20-50% of job cost)
   - Protects both parties
   - Gives artisan confidence customer is serious
   - Holds artisan accountable

3. **Service Delivery:**
   - Artisan shows up, completes work
   - Customer verifies quality on platform
   - Real-time communication via app

4. **Completion Payment:**
   - Full payment rendered upon completion
   - Customer satisfied (or raises issues)
   - Transaction closes

**Why This Model Works:**
- Addresses trust gaps both directions
- Artisans get immediate liquidity
- Customers have recourse if work isn't done
- Platform takes commission (7-15%)
- Incentives aligned for quality

### Technology Stack

**Frontend:**
- React + Vite (lightweight, fast)
- Mobile-first responsive design
- Managed by Jackson

**Backend:**
- Node.js + Express (scalable, JavaScript-based)
- REST API architecture
- Managed by Nelson

**Database:**
- PostgreSQL with Supabase
- Serverless scaling
- Secure and reliable

**Deployment:**
- Railway (one-click deployment)
- Minimal DevOps overhead
- Auto-scaling for traffic

**Communications:**
- Africa's Talking SMS/Voice API
- SMS notifications for artisans (many lack mobile data)
- Push notifications for customers
- Call integration for phone-based users

**Media:**
- Cloudinary for image optimization
- Before/after photos of work
- Artisan portfolio images
- Fast CDN delivery

**Payment Processing:**
- M-Pesa integration (most Kenyans use mobile money)
- Other local payment methods
- Escrow handling via platform

**Architecture Rationale:**
This stack prioritizes:
- Developer velocity (Jackson + Nelson can move fast)
- Cost efficiency (startup-friendly pricing)
- African-native integration (Africa's Talking, M-Pesa)
- Scalability for rapid growth

### Development Timeline & Launch

**Testing Phase:** Completed (target: June 27, 2026)
- Internal QA
- Stress testing
- Payment integration testing
- SMS/notification testing

**Real-User Launch:** Post-testing phase
- Gradual rollout starting with select neighborhoods
- Build artisan supply side first
- Then customer acquisition
- Iterate based on real feedback

**Go-to-Market Approach:**
1. **Pilot Neighborhoods:** Start with 3-5 affluent Nairobi areas (high density, willingness to pay)
2. **Artisan Recruitment:** Actively recruit quality artisans, verify credentials
3. **Customer Acquisition:** Drive through digital marketing, word-of-mouth
4. **Expansion:** Prove unit economics, then expand to other areas

### Team

**Jackson** - Frontend Development
- React/Vite expertise
- Mobile-first design
- User experience
- Also works on GII Connect

**Nelson** - Backend Development
- Node.js/Express architecture
- API design
- Database optimization
- Scalability focus
- Also supports GII Connect

### Service Differentiation

**vs. Uber/Jiji-based Gig Platforms:**
- Focused on artisans specifically, not generic labor
- Emphasis on trust and verification (not anonymous)
- Quality assurance and reputation system
- Long-term relationships, not one-off jobs
- Artisan empowerment, not exploitation

**vs. Manual/Offline:**
- Verified credentials and ratings
- Formal transaction records
- Dispute resolution
- Recourse if work is poor
- Consistent pricing (no haggling exploiting customers or artisans)

**vs. International Platforms:**
- Built for African context (offline capability, mobile money, local languages)
- Lower fees (not taking 50% like some platforms)
- Artisan-first design
- Relationships and reputation matter
- Community-focused

### Business Model & Monetization

**Commission Structure:**
- Platform takes 7-15% per transaction
- Scales with artisan quality and volume
- Top artisans (5+ stars) might pay lower commission
- Incentivizes quality

**Revenue Example:**
- Job: 5,000 KES plumbing work
- Deposit: 2,000 KES (40%)
- Commission: ~900 KES (18% on deposit + final payment)
- Unit economics attractive for platform

**Unit Economics:**
- Cost per transaction: ~100-200 KES (payments, infrastructure)
- Commission per transaction: 900 KES
- Profit margin: 70%+
- Attractive path to profitability

### Metrics & Success Indicators

**Supply Side (Artisans):**
- Artisan registrations (target: 500+ by launch)
- Active artisans (monthly)
- Jobs completed
- Average earnings per artisan
- Churn rate and retention

**Demand Side (Customers):**
- Customer signups
- Booking rate (% of users who book)
- Repeat booking rate
- Average job value
- Customer satisfaction (NPS)

**Platform:**
- Service completion rate (% of bookings completed)
- Average transaction value
- Growth rate (month-over-month)
- Profitability timeline

### Market Opportunity

**Nairobi Market:**
- Population: 4.3M+
- Affluent/middle-income: 1.5M+
- Monthly home service spending: 500-5,000 KES per household
- TAM: 50M+ KES monthly ($500K+)

**Kenya Expansion:**
- Mombasa, Kisumu, Kigali (Rwanda)
- Similar artisan gap exists everywhere
- Can replicate playbook rapidly

**East Africa:**
- 400M+ population
- Similar informal economy structure
- Massive underpenetration of formal services

### Strategic Priorities

**Pre-Launch (Now):**
- Finalize testing
- Begin artisan recruitment and verification
- Prepare customer acquisition strategy
- Set up payment processing

**Launch (Q3-Q4 2026):**
- Go live in select neighborhoods
- Onboard 500+ quality artisans
- Achieve 1,000+ customer signups
- Process 100+ jobs in first month

**Scaling (2027):**
- Expand to 5 neighborhoods
- 2,000+ active artisans
- 10,000+ customers
- 1,000+ jobs/month
- Profitability achieved

### Competitive Advantage

1. **Artisan-First Design:** Built specifically for informal service providers, not generic gig workers
2. **Local Context:** Understands Nairobi economics, payment methods, customer expectations
3. **Quality Focus:** Verification and rating system prioritizes quality over volume
4. **Trust Mechanism:** Deposit model addresses risk for both parties
5. **Founder Credibility:** Charlie's background gives investor/artisan confidence

### Financial Projections

**Year 1 (2026-2027):**
- Revenue: $100K-$200K (commission from jobs)
- Costs: $50K-$75K (team, infrastructure, marketing)
- Breakeven: 12-18 months

**Year 2 (2027-2028):**
- Revenue: $500K-$1M (scaling to other neighborhoods)
- Path to profitability clear
- Consider expansion to Rwanda, Uganda

**Year 3+ (2028+):**
- Revenue: $3M-$5M (regional scale)
- Multiple cities, multiple countries
- Potential acquisition or IPO path

### Why This Matters

- **Economic Impact:** Creates formal income pathway for 5,000+ artisans (each employing family members)
- **Empowerment:** Formalizes informal economy, builds generational wealth
- **Quality of Life:** Better services for customers, better income for artisans
- **Data & Insights:** First time collecting data on East Africa's artisan economy
- **Scalability:** Model works everywhere - every city has this gap

### Getting Started with FundiConnect

- Artisans: Sign up after launch, get verified, build profile
- Customers: Download app, find quality artisans, book with confidence
- Investors: B2B2C model with attractive unit economics
- Partners: Collaborate on artisan training, customer acquisition
