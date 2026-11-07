// FILE: src/lib/documentTutorials.ts
//
// "How to use this page" guides for the certificate pages (Nov 2026),
// shown by <PageTutorial /> (src/components/shared/PageTutorial.tsx).
// Same format as src/lib/adminTutorials.ts. Keep button and status names
// identical to what's on screen: Submit request, Process now, Pending,
// Processing, Released, Cancelled, Document Queue.
import type { TutorialContent } from "@/components/shared/PageTutorial";

export const DOCUMENT_TUTORIALS = {
  certificatesNew: {
    title: "How to request a certificate",
    intro:
      "Fill in who the certificate is for and what it's for, then save it one of two ways: as a request that waits its turn, or processed right away when nobody else is waiting.",
    steps: [
      {
        title: "Choose the applicant",
        description:
          "Search for the resident by name. If they aren't in the RBI yet, tick Walk-in and type their full name and address instead.",
      },
      {
        title: "Pick the type and write the purpose",
        description:
          "The purpose is printed on the certificate, so write it the way the applicant needs it, such as \"Requirement for school enrollment\".",
      },
      {
        title: "Submit request: the normal way",
        description:
          "Saves it as Pending and gives the applicant a queue number. It waits in the Document Queue until staff start working on it.",
      },
      {
        title: "Process now: when the queue is empty",
        description:
          "Only shows up when no other request is Pending. It skips the waiting step and saves the request as Processing, so you can print it straight away. If someone is already waiting, use Submit request so they're served first.",
      },
      {
        title: "Check the summary, then confirm",
        description:
          "A summary appears before anything is saved. Check the spelling of the name, because it's printed exactly as shown. Click Edit to go back and fix anything.",
      },
      {
        title: "Release it when you hand it over",
        description:
          "After printing, open the Document Queue, select the request, and click Mark as Released when the applicant receives it. That's the date printed as \"Date Issued\".",
      },
    ],
    tips: [
      "Status flow: Pending (waiting) → Processing (being prepared) → Released (handed over). A request can be Cancelled any time before it's Released.",
      "Process now still saves a record with a certificate number and queue number, so it's counted in reports and can be verified by its QR code like any other.",
      "Released and Cancelled are final. To fix a mistake after that, file a new request.",
    ],
  },

  certificateDetail: {
    title: "Reading a certificate record",
    intro:
      "This page shows one certificate request: who it's for, where it is in the process, and every other certificate the same resident has received.",
    steps: [
      {
        title: "Status and the tracker",
        description:
          "The tracker under the title shows each step and when it happened: Pending (waiting in the queue), Processing (being prepared), and Released (handed to the applicant). The highlighted step is where it is now.",
      },
      {
        title: "\"Skipped, processed right away\"",
        description:
          "Shown under Pending when the request was saved with Process now because the queue was empty. Nothing is missing: it simply never had to wait.",
      },
      {
        title: "Moving it to the next step",
        description:
          "Status is changed from the Document Queue, not from this page. Select the request there and use Start Processing, Mark as Released or Cancel Request.",
      },
      {
        title: "Printing",
        description:
          "Preview / Print opens the printable certificate. You can print at any step, but only release it once the applicant actually has it.",
      },
    ],
    tips: [
      "Payment shows Unpaid until it's marked Paid or Waived in the Document Queue.",
      "A Cancelled request can't be reopened. File a new request if the applicant still needs the document.",
    ],
  },
} satisfies Record<string, TutorialContent>;