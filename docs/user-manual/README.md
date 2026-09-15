# User Manual

A guide to using Student HelpDesk AI, for students, faculty, and admins.

## For students

### Creating an account

Go to the site and click **Sign up**. Enter your email and a password (at
least 8 characters). You'll be logged in automatically after signing up.

### Asking a question

1. Log in and go to **My tickets**.
2. Fill in an optional subject and your question, then **Submit ticket**.
3. Your question is answered automatically where possible. If the system
   isn't confident enough, it's routed to a faculty member instead — you
   don't need to do anything differently either way.

### Checking on a ticket

Open any ticket from your list to see the full conversation. The page
checks for updates automatically every few seconds, so you don't need to
refresh — a new answer or status change will appear on its own.

### Following up

If an answer doesn't fully address your question, or you have a related
follow-up, add a message directly in the ticket thread — no need to open
a new ticket.

### Ticket statuses

| Status | Meaning |
|---|---|
| Open | Submitted, awaiting an answer |
| Answered | The AI or a staff member has responded |
| Escalated | Routed to a faculty member for a human response |
| Closed | Resolved |

## For faculty

### Seeing your queue

Log in and go to **Faculty dashboard** — this shows only tickets that
have been routed to you specifically, not the full set of tickets in the
system.

### Responding

Open a ticket to see the student's question and full conversation, then
write your response at the bottom of the thread.

### Marking a response verified

After responding, you can mark your own reply **Verified**. This does
something important beyond just labeling it: a verified answer is
automatically added to the system's knowledge base, so the AI can use it
to answer similar future questions without escalating them to a human
again. Only mark something verified if you're confident it's a correct,
reusable answer — this directly shapes what the AI learns.

## For admins

### Routing rules

Under **Admin → Routing rules**, you control which faculty member
receives escalated tickets for each question category (academic, IT
support, admissions/enrollment, financial aid/billing, general). Add a
rule by picking a category and a faculty member; remove one with the
**Remove** link. A ticket in a category with no matching rule is still
marked escalated (so it's visible and not silently lost) but won't have
anyone specifically assigned — worth keeping every category covered.

### Managing users

Under **Admin → Users**, you can see every account and change anyone's
role via the dropdown next to their email (`student` / `faculty` /
`admin`). Be careful — this is the same mechanism used to grant admin
access, and there's currently no confirmation step.

### Analytics

Under **Admin → Analytics**, you can see:

- Total tickets and their breakdown by status
- What fraction of tickets get escalated to a human
- Average time to first response
- What fraction of AI attempts resolve without escalating
- The AI's average self-reported confidence

A field showing **"Not enough data"** means exactly that — there isn't
enough history yet to compute a meaningful number, not that something is
broken. These are real aggregates over live data, not estimates.

## Frequently asked questions

**Why did my question get escalated instead of answered right away?**
The AI only answers automatically when it's confident the answer is
correct and grounded in the knowledge base. Anything it's unsure about,
or that falls outside what it's been trained on so far, gets routed to a
person instead — this is by design, to avoid confidently wrong answers.

**Can I create the first admin account myself?**
Not currently through the sign-up flow — every new account starts as a
student, and only an existing admin can promote someone. If you're
setting this system up for the first time, you'll need direct database
access to create the initial admin account (see the
[Developer Guide](../developer-guide/)). This is a known, disclosed gap
in the current version.

**Is my data visible to other students?**
No — you only ever see your own tickets. Faculty only see tickets
routed to them. This is enforced on the server, not just hidden in the
interface.
