// FILE: src/lib/adminTutorials.ts
//
// Step-by-step "How to use this page" guides for the Admin section, shown
// by <PageTutorial /> (see src/components/shared/PageTutorial.tsx). One
// entry per admin page. Edit the wording here — no page layout changes
// needed. Keep button/field names identical to what's on screen so the
// steps are easy to follow.
import type { TutorialContent } from "@/components/shared/PageTutorial";

export const ADMIN_TUTORIALS = {
  hub: {
    title: "How to use the Admin page",
    intro:
      "This is the starting point for system administration. Each card opens a different tool for managing accounts, zones, activity records, and backups.",
    steps: [
      {
        title: "Pick a section",
        description:
          "Click a card — User Management, Puroks, Audit Logs, or Backup — to open that tool.",
      },
      {
        title: "Come back any time",
        description:
          "Every admin page has a Back link or the sidebar's Admin menu to return here.",
      },
      {
        title: "Looking for barangay details or incident types?",
        description:
          "Those are under Settings in the sidebar, not on this page.",
      },
    ],
    tips: ["Which cards you can open depends on your account's permissions."],
  },

  users: {
    title: "How to manage users",
    intro:
      "Every person who logs in to this system has a user account here. Use this page to create accounts, change roles, and turn access on or off.",
    steps: [
      {
        title: "Check the totals",
        description:
          "The cards at the top show how many accounts exist, how many can log in (Active), and how many are switched off (Inactive).",
      },
      {
        title: "Find an account",
        description:
          "Type in the search box to filter by username or role.",
      },
      {
        title: "Add a new account",
        description:
          "Click Add User at the top right, fill in the username, password, and role, then click Create User.",
      },
      {
        title: "Edit an account",
        description:
          "Click Edit on a row to change that person's role, switch their access on or off, or set a new password.",
      },
      {
        title: "Deactivate or reactivate",
        description:
          "Click Deactivate on a row to stop that person from logging in, then confirm. Click Activate on an inactive row to give access back.",
      },
    ],
    tips: [
      "Deactivating keeps the account and its history — it just blocks login. Prefer this over removing people.",
      "Give each person the lowest role that lets them do their job.",
    ],
  },

  usersNew: {
    title: "How to add a user",
    intro:
      "Create a login for a staff member or official. They can sign in as soon as you click Create User.",
    steps: [
      {
        title: "Enter a username",
        description:
          "Choose something easy to recognize, like secretary_dlrosario. Usernames are how people sign in, so each one must be different.",
      },
      {
        title: "Set a password",
        description:
          "Type a password of at least 8 characters. Use the eye icon to show or hide what you typed, and share it with the person privately.",
      },
      {
        title: "Choose a role",
        description:
          "Pick the role that matches the person's job — Admin, Barangay Captain, Secretary, Kagawad, BHW, or Staff / Encoder. The role decides which pages and actions they can use.",
      },
      {
        title: "Create the account",
        description: "Click Create User. To back out without saving, click Cancel.",
      },
    ],
    tips: ["You can change the role or reset the password later from the Users list."],
  },

  usersEdit: {
    title: "How to edit a user",
    intro:
      "Change what an existing account is allowed to do, or reset its password.",
    steps: [
      {
        title: "Change the role",
        description:
          "Pick a different role from the Role list if the person's job has changed.",
      },
      {
        title: "Turn access on or off",
        description:
          "Use the Active checkbox. Unchecking it stops this person from logging in without deleting their account.",
      },
      {
        title: "Reset the password (optional)",
        description:
          "Type a new password of at least 8 characters. Leave the box empty to keep the current one.",
      },
      {
        title: "Save",
        description: "Click Save Changes. Click Cancel to leave without changing anything.",
      },
    ],
    tips: ["The username is shown for reference and can't be changed here."],
  },

  puroks: {
    title: "How to manage puroks",
    intro:
      "Puroks are the zones of the barangay. The list here feeds the purok choices on residents, households, and filters everywhere in the system.",
    steps: [
      {
        title: "Add a purok",
        description:
          "Type the name in the box at the top (for example, Purok 5) and click Add Purok.",
      },
      {
        title: "Rename a purok",
        description:
          "Click the pencil icon on a row, edit the name, then click the check mark to save or the X to cancel.",
      },
      {
        title: "Delete a purok",
        description:
          "Click the trash icon on a row and confirm. Only do this for a purok that was added by mistake.",
      },
    ],
    tips: [
      "A purok that residents or households still belong to can't be deleted. The message will tell you how many records are linked — move them to another purok first.",
      "Renaming is safe: everything linked to the purok shows the new name.",
    ],
  },

  auditLogs: {
    title: "How to read the audit logs",
    intro:
      "The audit log is a permanent record of what people did in the system — who did it, what they did, and when. Use it to review activity or trace a change.",
    steps: [
      {
        title: "Scan the list",
        description:
          "Each row shows the timestamp, the user, the action, which table it affected, the record ID, and a short description in Details. Newest entries are first.",
      },
      {
        title: "Search",
        description:
          "Type in the search box to look for a user, action, table, or words in the details.",
      },
      {
        title: "Narrow it down with Filters",
        description:
          "Click Filters to choose a Table, an Action, and a From / To date range, then click Apply. Click Clear to reset everything.",
      },
    ],
    tips: [
      "Entries can't be edited or deleted — that's what makes the log trustworthy.",
      "To find out who changed a specific record, filter by its Table and look for its Record ID.",
    ],
  },

  backup: {
    title: "How to use Backup",
    intro:
      "Create a downloadable copy of the whole database and review the history of past backups.",
    steps: [
      {
        title: "Review the summary",
        description:
          "The cards show how many backups are on record and when the last one was made.",
      },
      {
        title: "Trigger a backup",
        description:
          "Click Trigger Backup, then confirm in the popup. The server runs a database dump and a new entry with your name and the time is added to the history.",
      },
      {
        title: "Download a copy",
        description:
          "Use the Download link on any entry to save the file. Keep copies somewhere safe and off the server. Backup files contain all resident records.",
      },
    ],
    tips: [
      "This button needs a server that can run pg_dump and keep files on disk. On serverless hosting (e.g. Vercel) it is unavailable — use the scheduled backup workflow or your database provider's backups instead.",
      "A backup can be restored with psql.",
    ],
  },

  settings: {
    title: "How to use General Settings",
    intro:
      "These details are printed on certificates, reports, and letterheads, so keep them accurate. Everything on this page is saved together with one button.",
    steps: [
      {
        title: "Barangay Information",
        description:
          "Fill in the barangay name, address, city or municipality, province, region, and postal code as they should appear on documents.",
      },
      {
        title: "Contact Information",
        description: "Add the office phone number and email address.",
      },
      {
        title: "Certificate Signatory Override (only if needed)",
        description:
          "Certificates normally sign with the active Barangay Captain from the Officials directory. Fill in Override Name and Override Position only when that record is unavailable, such as a vacant seat or an officer-in-charge. Leave them blank otherwise.",
      },
      {
        title: "Incident Types",
        description:
          "Manage the incident categories that appear when filing a blotter report.",
      },
      {
        title: "Save",
        description:
          "Click Save Settings at the bottom. You'll see \"Settings saved\" when it worked.",
      },
    ],
    tips: [
      "Remember to clear the override once a Captain is seated again, or certificates will keep using it.",
    ],
  },
} satisfies Record<string, TutorialContent>;