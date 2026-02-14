# HEARTBEAT.md
ask yourself what else we can automate to skyrocket the work done for voicehub

## VoiceHub AI Workforce - Daily Heartbeat Checklist

Run these checks every heartbeat (rotate through, don't do all at once):

### Marketing & Content
- [ ] **Check blog status** — verify yesterday's post succeeded, check word count
- [ ] **SEO check** — Run rank-4 to check keyword positions (if not automated)
- [ ] **Social content** — Draft 2 LinkedIn/Twitter posts (ghost-9)

### Lead Generation
- [ ] **Review scout-alpha results** — Check new prospects, flag hot leads
- [ ] **Draft outreach** — Run reach-3 for hot prospects (if not auto)
- [ ] **Lead scoring** — Run qualify-7 on new inbound

### Competitive Intel
- [ ] **Check competitors** — Run intel-9 for pricing/feature changes
- [ ] **Battlecard update** — Review and update competitive positioning

### Customer Success
- [ ] **Health check** — Run health-5 for churn risk
- [ ] **Support review** — Check open tickets, flag urgent

### Revenue
- [ ] **Revenue metrics** — Run revbot ( Mondays only )
- [ ] **Pricing check** — Review conversion rates

### Current Status (Auto-runs via cron)
| Agent | Schedule | Status |
|-------|----------|--------|
| blog-bot | Daily 08:00 | ✅ Today's post: "62% After-Hours Calls" (944 words) |
| scout-alpha | Every 4h | ✅ **FIXED** — Timeout increased 600s→900s, next run ~00:00 |
| brain sync | Daily 09:00 | ✅ Synced |
| reach-3 | 9am, 3pm | ✅ **ACTIVATED** |
| ghost-9 | Daily 8am | ✅ **ACTIVATED** |
| health-5 | Daily 10am | ✅ **ACTIVATED** |
| intel-9 | Daily 9am | ✅ **ACTIVATED** |
| rank-4 | Daily 6am | ✅ **ACTIVATED** |
| revbot | Mondays 9am | ✅ **ACTIVATED** |
| PageSEO-10 | Mon/Thu 11am | ✅ **ACTIVATED** — Programmatic pages |

## Active Tasks
- Next scout: 12:00 (4 hours from last run)
- Next brain sync: Tomorrow 09:00
- Next blog: Tomorrow 08:00
