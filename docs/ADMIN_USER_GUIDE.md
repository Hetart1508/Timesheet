# Timesheet Portal: Admin User Guide

## Purpose

This guide explains the Admin side of the Timesheet Portal: reviewing work, managing Agent access, maintaining company records, and using reports and exports.

## Admin access

Open the Admin sign-in page at `/login/admin` (the older `/admin/login` address redirects there). Enter your Admin email and password. Each Admin sign-in also requires a fresh six-digit security code sent to the registered Admin email. Enter the code before it expires to finish signing in.

The Admin account is a one-time setup account. If setup has not yet been completed, follow the onboarding instructions for creating the first Admin account. Do not use the one-time setup flow for ordinary sign-ins.

For security, use **Sign out** when you finish, especially on a shared phone or computer. On a phone, tap the menu icon to open the navigation drawer; tap a destination to go there and close the drawer.

## Admin navigation

- **Home:** operational summary and the submitted-timesheet review queue.
- **Reviews:** timesheets awaiting a decision.
- **Timesheets:** search, filter, sort, and inspect Agent records.
- **Work calendar:** approved visit hours by Agent and day.
- **Agents:** email verification, account status, activity totals, and access controls.
- **Companies:** review Agent-submitted companies and maintain the shared directory.
- **Reports:** daily and monthly trends, Agent performance, and company coverage.
- **Exports:** download filtered CSV or Excel files.
- **Invoices:** generate an Agent invoice PDF for a month.
- **Audit log:** inspect recorded administrative and business actions.
- **Account & security:** change the Admin password.

## Review a timesheet

1. Open **Reviews** or select a submitted record from the Home review queue.
2. Open a timesheet to inspect the Agent, work date, visit log, recorded durations, and the Agent's declaration.
3. Confirm the visits and declaration are complete and consistent.
4. Choose **Approve**, **Request changes**, or **Reject**.
5. Add a review comment when requesting changes or rejecting. These decisions require a comment of at least five characters. A comment is optional when approving.
6. Confirm the decision.

A review decision changes the timesheet status and is recorded in the review history and audit log. The Agent can see the decision and any comment in their timesheet.

### Timesheet statuses

- **Draft:** the Agent is still preparing the record.
- **Submitted:** waiting for Admin review.
- **Approved:** accepted by an Admin.
- **Changes requested:** the Agent needs to correct the record and submit it again.
- **Rejected:** not approved; the Agent can update the record and resubmit it.

Agents can edit a timesheet after submission or review. An edit returns it to **Draft**, so it must be submitted again before it can be reviewed.

## Find and inspect records

In **Timesheets**, open **Filters** to narrow the list by Agent, status, or work-date range. Search by Agent or reviewer, sort by the table headers, and use pagination for longer lists. Date-range calendars do not allow future dates. To return from an individual review to the full list, use the browser Back button; the list clears the Submitted-only filter for that return.

## Work calendar

The calendar displays one row per Agent and one cell per day for the selected month. It counts **approved visit hours only**. Darker blue indicates more approved hours; a blank weekday has no approved hours recorded. Weekends are not shaded differently.

To focus the calendar:

1. Type an Agent name and wait for the suggestions (about half a second).
2. Select the Agent suggestion.
3. Choose a month.
4. Press Enter or select **Apply filters**.

The calendar updates only after filters are applied. With a specific Agent selected, hover over or focus a day cell to see its approved hours and date. The month selector does not allow future months.

## Manage Agent accounts

Use the Agent directory to search by name, username, or email. The directory distinguishes **Verified** email from **Active** account status; verification alone does not mean that an account is currently allowed to sign in.

- Select **Deactivate** and confirm to disable an Agent. Their active sessions are revoked, and they cannot sign in while inactive. Their existing timesheets and visit history are retained.
- Select **Activate** and confirm to restore access. The Agent must sign in again because the old sessions remain revoked.

Agents create their own accounts through registration; the Admin directory controls their access rather than creating duplicate accounts.

## Manage companies

The Admin **Companies** page is used to search and filter company records, review submissions, edit company details, and control availability. Approve pending company submissions to make them part of the shared directory. Deleting/removing a company from the active directory does not erase its visit history.

## Reports, exports, and invoices

### Reports

The Reports page has four views:

- **Daily trends:** activity by work date.
- **Monthly overview:** monthly totals and corrections.
- **Agent performance:** timesheet, approval, visit, company, and recorded-time totals.
- **Company coverage:** visits, Agents, recorded time, and last-visited date.

Use the start and end date filters and select **Apply**. Future dates cannot be selected. Dates display in `DD-MM-YYYY` format; times are shown in India Standard Time (IST).

### Exports

In **Exports**, choose an optional Agent and status, then a From/To date range, and download CSV or Excel. Future dates are unavailable. Exports contain visit-level information, including work date, Agent, company, visit category, times, duration, and review comments where present. Each export is recorded in the audit log.

### Invoices

In **Invoices**, select an Agent and billing month, then generate a PDF. The invoice includes approved, non-deleted visits for that Agent and month. Current per-visit rates are:

| Category | Rate |
| --- | ---: |
| Gold | INR 1,000 |
| Silver | INR 800 |
| Bronze | INR 600 |

The invoice is a generated report; download it and follow your organization's separate delivery and accounting process.

## Audit log

Use **Audit log** to search and inspect recorded actions, including timesheet decisions, Agent status changes, company changes, and exports. Expand an entry to view its before/after details when available.

## Account security

From **Account & security**, enter your current password and a new password. Passwords must meet the portal's minimum length requirement shown by the form. Changing a password revokes active sessions, including your current session; sign in again with the new password.

## Common issues

- **Admin sign-in asks for a code:** this is expected. Every Admin sign-in uses two-step verification.
- **Agent cannot sign in:** check both the Agent's email verification and Active status in the Agent directory.
- **Activation or another Admin action returns 403:** note the exact error and the portal address you used, then contact the system administrator. An origin-policy error must be corrected in the server's allowed-origin configuration; retrying the button will not resolve it.
- **No invoice data:** confirm that the selected Agent and month contain approved visits.
- **A filter returns no rows:** clear or broaden the Agent, status, or date filters.

## Admin handover checklist

- Confirm the Admin email can receive sign-in security codes.
- Verify that each Agent has a verified email and the intended Active status.
- Review the pending queue and agree on approval/comment standards.
- Confirm company submission approval practices and invoice rates with the organization.
- Test a CSV/Excel export and confirm who is authorized to receive it.
- Sign out after training, especially on shared devices.
