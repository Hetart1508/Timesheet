# Timesheet Portal: Agent User Guide

## Purpose

This guide explains how to use the Agent side of the Timesheet Portal to record company visits, submit daily work, respond to review feedback, and manage company information.

## Sign in and account setup

Open the Agent sign-in page at `/login/agent` (the older `/login` address redirects there).

### First-time registration

1. Select **Create an account** from Agent sign-in.
2. Enter your name, username, email, and password. Passwords must be at least 12 characters; a passphrase is a good choice.
3. Submit the registration form.
4. Enter the six-digit verification code sent to your email before it expires. If needed, request another code from the verification flow.
5. Return to Agent sign-in and use your verified email and password.

Verification and resend actions appear when they are needed, rather than on the normal sign-in form. Use **Forgot password?** if you cannot remember your password. The recovery flow will provide the next step by email.

If an Admin deactivated your existing account, you cannot sign in or register another account using the same details. Ask the Admin to reactivate your existing account. After reactivation, sign in again; your prior sessions were revoked.

## Mobile navigation

On a phone, tap the menu icon in the top bar to open navigation. Choose **Home**, **Timesheets**, **Companies**, or **Account & security**. The drawer closes after you choose a page. Use the close button, tap outside the drawer, or press Escape to dismiss it.

## Daily timesheet workflow

### 1. Open the work date

From **Home**, review the business date and today's visit/time totals. The date picker allows today or an earlier date, not a future date. Choose the date and select **Start today's timesheet** or **Open selected day**. If a timesheet already exists for today, choose **Continue today's timesheet**.

You can also use **Timesheets** to find an earlier record, filter by date or status, and open it.

### 2. Add company visits

On the timesheet page, select **Add a visit** and complete the required details:

1. Search for a company and select the correct suggestion, or choose it from the list.
2. If it is not listed, use **Add a company** to create a submission. It can be used for your visit immediately while it is pending Admin review.
3. Choose a visit category: Gold, Silver, or Bronze.
4. Enter the contact person, purpose, and visit notes.
5. Enter the actual check-in and check-out times in IST.
6. Select **Add visit** to save.

Check-out must be later than check-in, and a visit cannot overlap another visit on the same timesheet. Fix any highlighted fields and save again. Use the edit or remove controls on a visit card to correct an entry; removal asks for confirmation.

### 3. Write the daily summary

In **Summary and submission**, describe the work completed in at least 20 characters. Select **Save for later** if you are not ready to submit. The character counter shows whether the summary meets the minimum.

### 4. Submit for review

A timesheet needs at least one visit and a summary of at least 20 characters before it can be submitted. Select **Submit timesheet** and confirm. The record then moves to **Submitted** for Admin review. You can check its state from the Timesheets list or the record itself.

## Timesheet statuses and corrections

- **Draft:** still being prepared or reopened after an edit.
- **Submitted:** sent to the Admin for review.
- **Approved:** accepted by the Admin.
- **Changes requested:** the Admin left feedback that needs to be addressed.
- **Rejected:** not approved; review the comment and contact your Admin if the required next step is unclear.

Read the review comment at the top of the individual timesheet. Make the requested corrections to the visits or summary, then submit again. Editing a submitted or reviewed record returns it to **Draft**; submit it again so the Admin can review the updated version. Changes are saved as you use the visit and summary actions, but a Draft is not in the Admin review queue until it is submitted.

## Companies

Use **Companies** to search the directory, review company details, and check visit history. You can submit a new company with its name and address; contact information and notes are optional. Admins review company submissions. An Agent may edit or remove their own active, pending submission; approved entries are managed by an Admin. Removing a company from the active directory does not delete existing visit history.

You can also add a company from the timesheet visit form if it is missing from the list.

## Account and password

Open **Account & security** to view your account details and change your password. Enter your current password and a new password, then confirm it. Changing a password revokes active sessions, including the current one; sign in again with the new password.

## Dates and time

Dates display in Indian `DD-MM-YYYY` format (for example, `18-10-2026`). Times are recorded and displayed in IST. Date filters and date pickers use the portal's India business date; future dates are not available for timesheets or date-range filters.

Visit times are entered manually. The portal does not use location tracking.

## Common issues

- **I cannot sign in:** check that you are using the Agent sign-in page, the verified email, and the correct password. If the account is inactive, ask an Admin to reactivate it.
- **I registered but cannot sign in:** complete email verification first. If the code expired, request a new one.
- **The submit button is unavailable:** add at least one visit and enter a summary of 20 or more characters.
- **A visit will not save:** confirm the company, category, contact, purpose, notes, and times; check that checkout is later than check-in and does not overlap another visit.
- **My record is not in the review queue:** confirm that its status is **Submitted**, not **Draft**.
- **The requested company is missing:** submit it from **Companies** or from the visit form. It is usable for your visit while pending review.
- **A page says the account is inactive:** contact your Admin; do not try to register a duplicate account.

## Agent handover checklist

- Confirm you can sign in with the verified Agent email.
- Practice opening today's timesheet and an earlier work date.
- Record a sample visit with accurate IST times and a complete summary.
- Submit a timesheet and confirm its status appears as **Submitted**.
- Locate review feedback and practice returning a corrected record to submission.
- Know which Admin to contact for account activation or a missing company.
