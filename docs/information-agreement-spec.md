# Document parsed from: Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx

## Page 1

SOLO .BIZZ / PRODUCT SPECIFICATION

# Solo .Bizz — Information Agreement
## Full Functional Specification and Data Flow Design

Olha Stelmakh

20 July 2026

Table of Contents

## Document Control


<table>
  <tr>
    <th>
      <p><b>Attribute</b></p>
    </th>
    <th>
      <p><b>Value</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>Product</p>
    </td>
    <td>
      <p>Solo .Bizz</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Feature</p>
    </td>
    <td>
      <p>Information Agreement</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Document type</p>
    </td>
    <td>
      <p>Full Functional Specification / SRS</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Version</p>
    </td>
    <td>
      <p>1.0</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Status</p>
    </td>
    <td>
      <p>Draft for Product, UX, Engineering, QA, Security, Privacy and Legal review</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Owner</p>
    </td>
    <td>
      <p>Olha Stelmakh</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>MVP delivery</p>
    </td>
    <td>
      <p>A therapist copies a secure client-specific link; the client verifies their email, completes the interactive agreement, and the accepted document is stored in the client card</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Primary UI language</p>
    </td>
    <td>
      <p>Ukrainian</p>
    </td>
  </tr>
</table>



<mark>**Product outcome.** A reusable therapist-owned template, a client-specific agreement instance, secure recipient-bound access, interactive acceptance, immutable evidence, and a viewable document in the correct client record.</mark>

This document specifies product behavior and evidence capture. It does not certify the legal enforceability of agreement wording or the acceptance mechanism in a particular jurisdiction.

## Change Log


<table>
  <tr>
    <th>
      <p><b>Version</b></p>
    </th>
    <th>
      <p><b>Date</b></p>
    </th>
    <th>
      <p><b>Status</b></p>
    </th>
    <th>
      <p><b>Change</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>0.1</p>
    </td>
    <td>
      <p>20 Jul 2026</p>
    </td>
    <td>
      <p>Working draft</p>
    </td>
    <td>
      <p>Consolidated initial process diagram, product narration, Notion prototype screenshots and link-isolation requirement.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>1.0</p>
    </td>
    <td>
      <p>20 Jul 2026</p>
    </td>
    <td>
      <p>Draft for review</p>
    </td>
    <td>
      <p>Complete SRS, improved process, data flow, lifecycle, atomic requirements, data, security, acceptance and delivery breakdown.</p>
    </td>
  </tr>
</table>

## Page 2

SOLO .BIZZ / PRODUCT SPECIFICATION

# Source Inventory


<table>
  <tr>
    <th>
      <p><b>Source</b></p>
    </th>
    <th>
      <p><b>Used for</b></p>
    </th>
    <th>
      <p><b>Interpretation</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>Initial process diagram, image 21</p>
    </td>
    <td>
      <p>Initial workflow concept</p>
    </td>
    <td>
      <p>Corrected roles, terminology, settings/client-card separation, security gate, state handling and persistence.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Notion link supplied by Product Owner</p>
    </td>
    <td>
      <p>Prototype reference</p>
    </td>
    <td>
      <p>Direct page retrieval was unavailable during drafting; the supplied screenshots are treated as source of truth.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Screenshots 22–29</p>
    </td>
    <td>
      <p>Agreement sections, visual structure, checkboxes and signature area</p>
    </td>
    <td>
      <p>Content is illustrative. This SRS focuses on configuration, controls, client flow, evidence and data isolation.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Product-owner narration</p>
    </td>
    <td>
      <p>Business scope and expected behavior</p>
    </td>
    <td>
      <p>The latest explicit statements take precedence.</p>
    </td>
  </tr>
</table>



# Terminology


<table>
  <tr>
    <th>
      <p><b>Term</b></p>
    </th>
    <th>
      <p><b>Definition</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>Template</p>
    </td>
    <td>
      <p>Reusable therapist-owned master content stored in Settings. It is not a client document.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Template Version</p>
    </td>
    <td>
      <p>Immutable revision of a template. Exactly one version is Active for creation of new agreements within a tenant/language.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Agreement Instance</p>
    </td>
    <td>
      <p>Client-specific agreement copied from a Template Version and permanently linked to exactly one client.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Agreement Revision</p>
    </td>
    <td>
      <p>Frozen shareable version of an Agreement Instance.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Snapshot</p>
    </td>
    <td>
      <p>Complete rendered content and control configuration preserved at creation/share and at acceptance.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Invitation</p>
    </td>
    <td>
      <p>Recipient-bound access record containing an expiring, single-purpose token reference.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Client-bound link</p>
    </td>
    <td>
      <p>High-entropy URL mapped server-side to one tenant, therapist, client, agreement and revision. The URL contains no personal data.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>OTP</p>
    </td>
    <td>
      <p>One-time code sent to the primary email stored for the intended client.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Verified session</p>
    </td>
    <td>
      <p>Short-lived browser session authorized only for one agreement revision.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Acceptance Evidence</p>
    </td>
    <td>
      <p>Frozen agreement version, answers, typed name, system timestamp, verification reference, audit events and integrity hash.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Accepted Document</p>
    </td>
    <td>
      <p>Immutable human-readable agreement stored under Client Card → Documents.</p>
    </td>
  </tr>
</table>

## Page 3

SOLO .BIZZ / PRODUCT SPECIFICATION

# 1. Purpose and Business Context

## 1.1 Purpose
This specification defines the full behavior required to configure, create, customize, share, complete, accept, store and review an Information Agreement between a psychologist or psychotherapist and a client in Solo .Bizz.

The feature begins with one document type only: Information Agreement. The data model and UI must avoid assumptions that prevent later addition of other client-facing forms, but no other document types are included in this release.

## 1.2 Business Problem
* Therapists currently prepare or share agreements outside the client-management workflow, so the final accepted version may be difficult to locate or prove.
* A generic public page or reusable URL may be forwarded, opened by the wrong person or completed without a reliable link to the intended client.
* Static visual checkmarks do not enforce mandatory acknowledgement or show which specific terms the client accepted.
* Editing a common page risks changing historical content after a client has already reviewed or accepted it.
* The therapist needs a reusable starting template and controlled client-specific exceptions without reauthoring the entire agreement.
* The client needs a simple, mobile-friendly experience without access to the internal Solo .Bizz application.
* The accepted result must be stored with the correct client and remain readable without permitting later edits.

## 1.3 Value Proposition
The feature creates a traceable, low-friction agreement process within the existing client workflow. It reduces manual document handling, standardizes essential terms, protects client isolation, preserves historical evidence and places the final document where the therapist already manages the client.

## 1.4 Objectives and Success Indicators


<table>
  <tr>
    <th>
      <p><b>Objective</b></p>
    </th>
    <th>
      <p><b>Indicator</b></p>
    </th>
    <th>
      <p><b>Initial target</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>Complete onboarding digitally</p>
    </td>
    <td>
      <p>Completion rate</p>
    </td>
    <td>
      <p>At least 80% of sent invitations reach Accepted or an explicit terminal status.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Reduce therapist effort</p>
    </td>
    <td>
      <p>Median active preparation time</p>
    </td>
    <td>
      <p>No more than 3 minutes to create, review and copy a link when an Active template exists.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Protect client isolation</p>
    </td>
    <td>
      <p>Cross-client access incidents</p>
    </td>
    <td>
      <p>Zero successful accesses where the invitation client differs from the verified client context.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Preserve evidence</p>
    </td>
    <td>
      <p>Accepted-record completeness</p>
    </td>
    <td>
      <p>100% of Accepted records contain snapshot hash, response, timestamp, version and audit evidence.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Improve retrievability</p>
    </td>
    <td>
      <p>Document availability</p>
    </td>
    <td>
      <p>100% of accepted agreements appear under the correct Client Card within 5 seconds, or show a visible Processing state.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Support mobile completion</p>
    </td>
    <td>
      <p>Mobile success</p>
    </td>
    <td>
      <p>At least 95% successful submission in supported mobile browsers without horizontal scrolling.</p>
    </td>
  </tr>
</table>



Information Agreement • v1.0 • Page 3

## Page 4

SOLO .BIZZ / PRODUCT SPECIFICATION

# 1.5 AS-IS and TO-BE


<table>
  <tr>
    <th>
      <p><b>Dimension</b></p>
    </th>
    <th>
      <p><b>Initial concept / AS-IS</b></p>
    </th>
    <th>
      <p><b>Required TO-BE</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>Configuration</p>
    </td>
    <td>
      <p>Agreement represented as a document or public page.</p>
    </td>
    <td>
      <p>Reusable, versioned template in Settings.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Client use</p>
    </td>
    <td>
      <p>Same page/link may be available to anyone who receives it.</p>
    </td>
    <td>
      <p>Separate client instance and recipient-bound invitation.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Interaction</p>
    </td>
    <td>
      <p>Some checkboxes are visual symbols.</p>
    </td>
    <td>
      <p>Native accessible controls with required/optional metadata.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Acceptance</p>
    </td>
    <td>
      <p>Name/date may appear as manual lines.</p>
    </td>
    <td>
      <p>Typed name, verified email session, system time and immutable evidence.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Storage</p>
    </td>
    <td>
      <p>Filled result may not be systematically linked.</p>
    </td>
    <td>
      <p>Accepted document stored under the exact client Documents section.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>History</p>
    </td>
    <td>
      <p>Template updates may affect the viewed content.</p>
    </td>
    <td>
      <p>Historical snapshots do not change.</p>
    </td>
  </tr>
</table>



Information Agreement • v1.0 • Page 4

## Page 5

## 2. Scope

## 2.1 MVP In Scope

- Settings → Information Agreement:

– show a system starter template;

– create and edit Draft versions;

– configure content, supported variables and client controls;

– preview desktop/mobile rendering;

– validate and activate a version;

– view version history and archive obsolete versions.

- Client Card → Documents/Agreements:

– create a client agreement from the Active template;

– create a client-specific snapshot;

– allow client-specific edits before sharing;

– validate the client email and agreement completeness;

– generate, copy, revoke and regenerate a secure invitation;

– display status and activity;

– display the accepted document in read-only mode.

- Public client flow:

– open invitation without requiring a Solo .Bizz account;

– verify control of the client email using OTP before content is shown;

– read the frozen agreement revision;

– complete interactive mandatory acknowledgements and typed acceptance name;

– submit once;

– see a safe completion page.

- Platform processing:

– store snapshots, answers, evidence and audit events;

– invalidate the invitation after acceptance/revocation/expiry;

– create an immutable Accepted Document;

– attach it to the exact client record;

– support Ukrainian content and responsive rendering.

## 2.2 Extended Scope / Phase 1.1

- Send the invitation email from Solo .Bizz instead of requiring manual copying of the link.
- Reminder messages for Sent or Opened but incomplete agreements.
- Client receipt/PDF through a newly authenticated, time-limited flow.
- Therapist PDF export.
- Additional approved system templates by locale or practice type.
- Explicit client Decline action if approved by Product.
- Server-side cross-device progress saving.

## 2.3 Out of Scope

- A general client portal or access to sessions, notes, payments, invoices or any other client data.
- Qualified or advanced electronic-signature certification.
- Identity verification beyond control of the primary client email.
- Multi-party signing or therapist counter-signature.
- Guardian/parent consent.
- Uploading arbitrary DOCX/PDF and automatically converting it into an interactive form.
- Collaborative real-time editing between therapist and client.
- Automatic legal advice or automatic adaptation to national law.
- Other document types in the MVP UI.

## Page 6

SOLO .BIZZ / PRODUCT SPECIFICATION

## 2.4 Assumptions


<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Assumption</b></p>
    </th>
    <th>
      <p><b>Impact if false</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>A-01</p>
    </td>
    <td>
      <p>Each therapist works in one authenticated tenant context at a time.</p>
    </td>
    <td>
      <p>Tenant/team access rules require extension.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>A-02</p>
    </td>
    <td>
      <p>A client must have a deliverable primary email before a secure invitation is created.</p>
    </td>
    <td>
      <p>Another verified channel is required or sending must be blocked.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>A-03</p>
    </td>
    <td>
      <p>Product provides the starter agreement content and legal/professional owners approve it.</p>
    </td>
    <td>
      <p>Content approval becomes a release blocker.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>A-04</p>
    </td>
    <td>
      <p>Checkbox + typed name + email OTP is acceptable as MVP acceptance evidence.</p>
    </td>
    <td>
      <p>A dedicated signature provider is required.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>A-05</p>
    </td>
    <td>
      <p>Transactional email delivery is available for OTP.</p>
    </td>
    <td>
      <p>A bare copied URL cannot satisfy the non-transferability requirement.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>A-06</p>
    </td>
    <td>
      <p>The therapist owns decisions about template and client-specific wording.</p>
    </td>
    <td>
      <p>A governed content-approval workflow must be added.</p>
    </td>
  </tr>
</table>



## 2.5 Constraints and Dependencies

* The public URL must reveal no client name, email, tenant name or sequential database identifier.
* The client must not require a full Solo .Bizz account.
* Sensitive agreement data must follow product privacy, retention, encryption and incident-management policies.
* Legal review is required for template wording, privacy notice, acceptance wording, retention and jurisdiction-specific enforceability.
* Email delivery, bounce/rejection handling, rate limiting and abuse controls are dependencies for OTP.
* Existing client ownership/team permissions remain authoritative.

## 2.6 Risks and Mitigations


<table>
  <tr>
    <th>
      <p><b>Risk</b></p>
    </th>
    <th>
      <p><b>Consequence</b></p>
    </th>
    <th>
      <p><b>Mitigation</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>Forwarded URL</p>
    </td>
    <td>
      <p>Another person attempts access.</p>
    </td>
    <td>
      <p>Server-side client binding plus OTP to stored client email; never rely only on URL secrecy.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Template edited after sharing</p>
    </td>
    <td>
      <p>Client accepts unseen/new terms.</p>
    </td>
    <td>
      <p>Freeze shareable revision; editing after Sent revokes the old invitation and creates a new revision.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Client email changes</p>
    </td>
    <td>
      <p>Verification reaches a different address.</p>
    </td>
    <td>
      <p>Invalidate every active invitation bound to the old email.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Duplicate clicks or retries</p>
    </td>
    <td>
      <p>Duplicate documents or inconsistent status.</p>
    </td>
    <td>
      <p>Idempotency and atomic transition to Accepted.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Unsuitable legal wording</p>
    </td>
    <td>
      <p>False sense of protection.</p>
    </td>
    <td>
      <p>Legal review and explicit limitation: the system records evidence but does not promise legal validity.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Sensitive data in logs</p>
    </td>
    <td>
      <p>Privacy/security incident.</p>
    </td>
    <td>
      <p>Structured safe audit metadata; never log body, raw token or OTP.</p>
    </td>
  </tr>
</table>

## Page 7

SOLO .BIZZ / PRODUCT SPECIFICATION

# 3. Stakeholders, Actors and Permissions

## 3.1 Actors


<table>
  <tr>
    <th>
      <p><b>Actor</b></p>
    </th>
    <th>
      <p><b>Goal</b></p>
    </th>
    <th>
      <p><b>Allowed actions</b></p>
    </th>
    <th>
      <p><b>Restrictions</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>Psychologist / Psychotherapist</p>
    </td>
    <td>
      <p>Configure terms and obtain client acceptance.</p>
    </td>
    <td>
      <p>Manage own tenant templates; create/edit/share/revoke agreements for authorized clients; view accepted documents.</p>
    </td>
    <td>
      <p>Cannot access another tenant/client/agreement.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Client</p>
    </td>
    <td>
      <p>Review and accept one agreement.</p>
    </td>
    <td>
      <p>Open invitation; request/enter OTP; complete and submit the current agreement.</p>
    </td>
    <td>
      <p>No internal app, settings, Client Card or other agreement access.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Admin / Support</p>
    </td>
    <td>
      <p>Operate and support the platform.</p>
    </td>
    <td>
      <p>Restricted technical status/delivery metadata according to support policy.</p>
    </td>
    <td>
      <p>No document-body access by default. Privileged access requires authorization and audit.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Email / OTP service</p>
    </td>
    <td>
      <p>Deliver verification code.</p>
    </td>
    <td>
      <p>Receive recipient, localized template, code and expiry.</p>
    </td>
    <td>
      <p>Does not receive agreement body or client history.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Background worker</p>
    </td>
    <td>
      <p>Expire invitations and generate artifacts.</p>
    </td>
    <td>
      <p>Perform system transitions using service identity.</p>
    </td>
    <td>
      <p>Idempotent processing and mandatory audit.</p>
    </td>
  </tr>
</table>



## 3.2 Permission Matrix


<table>
  <tr>
    <th>
      <p><b>Capability</b></p>
    </th>
    <th>
      <p><b>Therapist</b></p>
    </th>
    <th>
      <p><b>Verified client</b></p>
    </th>
    <th>
      <p><b>Support</b></p>
    </th>
    <th>
      <p><b>System worker</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>Edit reusable template</p>
    </td>
    <td>
      <p>Own tenant</p>
    </td>
    <td>
      <p>No</p>
    </td>
    <td>
      <p>No by default</p>
    </td>
    <td>
      <p>No</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Activate template version</p>
    </td>
    <td>
      <p>Own tenant</p>
    </td>
    <td>
      <p>No</p>
    </td>
    <td>
      <p>No</p>
    </td>
    <td>
      <p>No</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Create agreement</p>
    </td>
    <td>
      <p>Authorized client</p>
    </td>
    <td>
      <p>No</p>
    </td>
    <td>
      <p>No</p>
    </td>
    <td>
      <p>No</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>View Draft body</p>
    </td>
    <td>
      <p>Authorized client</p>
    </td>
    <td>
      <p>Current invitation only after verification</p>
    </td>
    <td>
      <p>No by default</p>
    </td>
    <td>
      <p>Processing only</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Complete agreement</p>
    </td>
    <td>
      <p>No</p>
    </td>
    <td>
      <p>Current invitation only</p>
    </td>
    <td>
      <p>No</p>
    </td>
    <td>
      <p>No</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>View Accepted document</p>
    </td>
    <td>
      <p>Authorized client</p>
    </td>
    <td>
      <p>Receipt only if separately enabled</p>
    </td>
    <td>
      <p>No by default</p>
    </td>
    <td>
      <p>Processing only</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Revoke invitation</p>
    </td>
    <td>
      <p>Authorized client</p>
    </td>
    <td>
      <p>No</p>
    </td>
    <td>
      <p>No</p>
    </td>
    <td>
      <p>Automatic expiry allowed</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>Read audit metadata</p>
    </td>
    <td>
      <p>Own authorized records</p>
    </td>
    <td>
      <p>No</p>
    </td>
    <td>
      <p>Restricted support view</p>
    </td>
    <td>
      <p>Write only</p>
    </td>
  </tr>
</table>

## Page 8

SOLO .BIZZ / PRODUCT SPECIFICATION

# 4. Solution Overview

## 4.1 Critical Design Decision
<mark>Settings contains the reusable Template. Client Card contains the Agreement Instance. A template is never sent directly to a client, and an invitation never points to a shared public template.</mark>

When the therapist creates an agreement, Solo .Bizz copies the Active template version into an isolated client-specific instance. The therapist may modify that instance while it is Draft or Ready. Sharing freezes the exact client revision. The generated URL resolves only to an invitation gate. The client must verify control of the stored email before the agreement body is accessible.

## 4.2 Improved TO-BE Process

**TO-BE PROCESS — INFORMATION AGREEMENT**

Flowchart showing the process for an information agreement between a therapist, the Solo .Bizz system, and a client.

*   **ПСИХОЛОГ**
    *   1. Налаштувати й активувати template
    *   2. Створити та відкоригувати client agreement
    *   3. Скопіювати secure link
    *   8. Переглянути Accepted document
*   **СИСТЕМА SOLO .BIZZ**
    *   Зберегти template version
    *   Створити client snapshot
    *   Створити client-bound invitation
    *   Зберегти evidence, document та audit
*   **КЛІЄНТ**
    *   4. Відкрити link
    *   5. Підтвердити email через OTP
    *   6. Прочитати, заповнити поля та checkbox
    *   7. Погодитися й надіслати

Security gate: URL bound to tenant + client + agreement; agreement body requires OTP verification.

The improved flow separates therapist, system and client responsibility and adds the security and evidence steps missing from the original diagram.

Information Agreement • v1.0 • Page 8

## Page 9

SOLO .BIZZ / PRODUCT SPECIFICATION

## 4.3 Data Flow Diagram

**DATA FLOW DIAGRAM — LEVEL 1**

*   Психолог
*   P1. Template Management
*   D1 Templates & Versions
*   P2. Agreement Instance & Invitation
*   D2 Client Profile & Email
*   D4 Hashed Token / OTP
*   Клієнт
*   P3. Verification & Completion
*   D3 Agreements & Snapshots
*   Email / OTP service
*   Психолог: status / view
*   P4. Documents, View & Audit
*   D5 Client Documents
*   D6 Immutable Audit Log

Public channel carries token/verification metadata only; internal client data never appears in the URL.

The editable source contains three pages: TO-BE Process, Data Flow Level 1 and Agreement Lifecycle.

## 4.4 Agreement Lifecycle

**AGREEMENT LIFECYCLE**

*   Draft
*   Ready
*   Sent
*   Opened
*   Verified / In progress
*   Accepted
*   Stored in Documents
*   Expired
*   Revoked
*   Superseded

Primary states: Draft → Ready → Sent → Opened → Verified/In Progress → Accepted → Stored in Documents.
Expired, Revoked and Superseded are terminal/alternate outcomes.

## 4.5 End-to-End Flow

1. The therapist opens Settings → Information Agreement and reviews the starter or existing template.
2. The therapist edits supported text, parameters and control metadata, saves a Draft version and activates it.
3. From Client Card → Documents/Agreements, the therapist selects Create Information Agreement.
4. The system verifies permission, Active template availability and client email readiness.
5. The system creates an Agreement Instance and immutable reference to the source Template Version.
6. Safe therapist/client placeholders are prefilled.
7. The therapist reviews and, if needed, changes the client copy. This never changes the reusable template.
8. When Copy secure link is selected, the system validates completeness and freezes the shareable revision.
9. The system creates a cryptographically strong invitation bound to tenant, therapist, client, agreement, revision and email fingerprint.

Information Agreement • v1.0 • Page 9

## Page 10

SOLO .BIZZ / PRODUCT SPECIFICATION

10. The client opens the URL. The system validates the token and shows only an OTP gate.
11. The OTP is delivered to the primary email stored in the client record.
12. After verification, a short-lived agreement-scoped session is created and the frozen agreement is displayed.
13. The client reads the content, selects every mandatory acknowledgement, enters the full name and submits.
14. The system revalidates state, commits acceptance atomically, stores evidence, invalidates the invitation and creates the Client Document.
15. The therapist views the read-only accepted agreement in the correct client record.

## 4.6 Link Non-Transferability

A copied URL can always be physically forwarded. Therefore the product requirement is implemented as **non-transferable access**, not as an impossible guarantee that the text of a URL cannot be copied.

The required control set is:

* unique high-entropy invitation token;
* server-side binding to one tenant, client, agreement, revision and email fingerprint;
* no personal data in the URL;
* OTP sent only to the stored client email;
* agreement body hidden until OTP verification;
* short-lived agreement-scoped browser session;
* immediate invalidation after acceptance, revocation, expiry, supersession or client email change;
* uniform failure response that does not reveal whether another agreement exists.

## Page 11

SOLO .BIZZ / PRODUCT SPECIFICATION

# 5. Use Cases


<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Use case</b></p>
    </th>
    <th>
      <p><b>Actor</b></p>
    </th>
    <th>
      <p><b>Trigger</b></p>
    </th>
    <th>
      <p><b>Preconditions</b></p>
    </th>
    <th>
      <p><b>Outcome</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>UC-01</p>
    </td>
    <td>
      <p>Configure reusable template</p>
    </td>
    <td>
      <p>Therapist</p>
    </td>
    <td>
      <p>Settings opened</p>
    </td>
    <td>
      <p>Authenticated and authorized</p>
    </td>
    <td>
      <p>Draft template saved and previewable.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>UC-02</p>
    </td>
    <td>
      <p>Activate template version</p>
    </td>
    <td>
      <p>Therapist</p>
    </td>
    <td>
      <p>Activate selected</p>
    </td>
    <td>
      <p>Valid Draft</p>
    </td>
    <td>
      <p>Exactly one Active version exists.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>UC-03</p>
    </td>
    <td>
      <p>Create client agreement</p>
    </td>
    <td>
      <p>Therapist</p>
    </td>
    <td>
      <p>Create selected</p>
    </td>
    <td>
      <p>Authorized client, Active template and client email</p>
    </td>
    <td>
      <p>Client-linked Draft instance created.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>UC-04</p>
    </td>
    <td>
      <p>Customize client copy</p>
    </td>
    <td>
      <p>Therapist</p>
    </td>
    <td>
      <p>Edit selected</p>
    </td>
    <td>
      <p>Draft/Ready instance</p>
    </td>
    <td>
      <p>Client revision changes; master template unchanged.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>UC-05</p>
    </td>
    <td>
      <p>Generate and copy invitation</p>
    </td>
    <td>
      <p>Therapist</p>
    </td>
    <td>
      <p>Copy secure link</p>
    </td>
    <td>
      <p>Complete Ready revision</p>
    </td>
    <td>
      <p>Frozen revision and recipient-bound invitation created.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>UC-06</p>
    </td>
    <td>
      <p>Verify client access</p>
    </td>
    <td>
      <p>Client</p>
    </td>
    <td>
      <p>Link opened</p>
    </td>
    <td>
      <p>Valid, non-terminal invitation</p>
    </td>
    <td>
      <p>OTP verified and scoped session established.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>UC-07</p>
    </td>
    <td>
      <p>Complete and accept</p>
    </td>
    <td>
      <p>Client</p>
    </td>
    <td>
      <p>Submit</p>
    </td>
    <td>
      <p>Verified session and complete required fields</p>
    </td>
    <td>
      <p>Atomic Accepted state and evidence.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>UC-08</p>
    </td>
    <td>
      <p>View final document</p>
    </td>
    <td>
      <p>Therapist</p>
    </td>
    <td>
      <p>Open from Documents</p>
    </td>
    <td>
      <p>Authorized client</p>
    </td>
    <td>
      <p>Read-only document and metadata displayed.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>UC-09</p>
    </td>
    <td>
      <p>Revoke or regenerate</p>
    </td>
    <td>
      <p>Therapist</p>
    </td>
    <td>
      <p>Revoke/regenerate selected</p>
    </td>
    <td>
      <p>Not Accepted</p>
    </td>
    <td>
      <p>Old token invalid; new invitation may be generated.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>UC-10</p>
    </td>
    <td>
      <p>Expire and recover</p>
    </td>
    <td>
      <p>System/Therapist</p>
    </td>
    <td>
      <p>Expiry or reported problem</p>
    </td>
    <td>
      <p>Not Accepted</p>
    </td>
    <td>
      <p>Safe terminal state and optional new link.</p>
    </td>
  </tr>
</table>



## 5.1 Alternate and Exception Flows


<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Condition</b></p>
    </th>
    <th>
      <p><b>Required behavior</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>AF-01</p>
    </td>
    <td>
      <p>No Active template</p>
    </td>
    <td>
      <p>Block agreement creation and direct the therapist to Settings.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>AF-02</p>
    </td>
    <td>
      <p>No client email</p>
    </td>
    <td>
      <p>Block link generation because recipient verification cannot be performed.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>AF-03</p>
    </td>
    <td>
      <p>Agreement edited after Sent</p>
    </td>
    <td>
      <p>Require confirmation, revoke current invitation and create a new Draft revision.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>AF-04</p>
    </td>
    <td>
      <p>OTP expired</p>
    </td>
    <td>
      <p>Allow a new code subject to cooldown/rate limits; old code is invalid.</p>
    </td>
  </tr>
</table>



Information Agreement • v1.0 • Page 11

## Page 12

SOLO .BIZZ / PRODUCT SPECIFICATION



<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Condition</b></p>
    </th>
    <th>
      <p><b>Required behavior</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>AF-05</p>
    </td>
    <td>
      <p>Repeated wrong OTP</p>
    </td>
    <td>
      <p>Temporarily lock verification without revealing internal information.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>AF-06</p>
    </td>
    <td>
      <p>Link expired or revoked</p>
    </td>
    <td>
      <p>Show neutral unavailable page; do not display agreement body.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>AF-07</p>
    </td>
    <td>
      <p>Two tabs submit concurrently</p>
    </td>
    <td>
      <p>First valid request commits; subsequent requests return the existing result.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>AF-08</p>
    </td>
    <td>
      <p>Document generation delayed</p>
    </td>
    <td>
      <p>Keep Accepted state; show Processing and retry idempotently.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>AF-09</p>
    </td>
    <td>
      <p>Client explicitly declines, if enabled</p>
    </td>
    <td>
      <p>Store Declined, do not create Accepted Document, show status to therapist.</p>
    </td>
  </tr>
</table>




Information Agreement • v1.0 • Page 12

## Page 13

SOLO .BIZZ / PRODUCT SPECIFICATION

# 6. Functional Requirements

Each requirement is an atomic, testable obligation. The word “system” means Solo .Bizz unless stated otherwise.

## 6.1 Template Management — Settings

<table>
<tr><th>ID</th><th>Formal requirement</th><th>Context / verification</th></tr>
<tr><td>FR-TPL-001</td><td>The system shall display Information Agreement under Settings to an authorized therapist.</td><td>Reusable configuration is not located in an individual client card.</td></tr>
<tr><td>FR-TPL-002</td><td>The system shall provide a preconfigured starter template when the tenant has no saved template.</td><td>Starter structure follows the reviewed product content.</td></tr>
<tr><td>FR-TPL-003</td><td>The system shall create a new Draft version from the starter template or an existing version.</td><td>An Active version is never edited in place.</td></tr>
<tr><td>FR-TPL-004</td><td>The system shall allow editing of supported headings, paragraphs, lists, callouts, safe links, values and control labels in Draft.</td><td>Content uses an allow-listed structure.</td></tr>
<tr><td>FR-TPL-005</td><td>The system shall allow each checkbox-like element to be configured as informational content, optional input or mandatory acknowledgement.</td><td>A visual symbol is not automatically a form control.</td></tr>
<tr><td>FR-TPL-006</td><td>The system shall support required typed-text controls, including client full name.</td><td>Each field has stable ID, label, required flag and validation.</td></tr>
<tr><td>FR-TPL-007</td><td>The system shall support approved placeholders for therapist name, client name, date, duration, fee, currency, cancellation period, percentage and timezone.</td><td>Unsupported placeholders are blocking errors.</td></tr>
<tr><td>FR-TPL-008</td><td>The system shall autosave a Draft without activating it.</td><td>Show Saving, Saved and Error state.</td></tr>
<tr><td>FR-TPL-009</td><td>The system shall provide desktop and mobile preview using the client renderer.</td><td>Preview must match public output.</td></tr>
<tr><td>FR-TPL-010</td><td>The system shall validate required sections, controls, placeholders and unsafe content before activation.</td><td>Error identifies affected block/field.</td></tr>
<tr><td>FR-TPL-011</td><td>The system shall require confirmation before activation.</td><td>Confirmation explains that only future agreements use the version.</td></tr>
<tr><td>FR-TPL-012</td><td>The system shall allow exactly one Active version per tenant and template language.</td><td>Activation retires the old Active version for new creation.</td></tr>
<tr><td>FR-TPL-013</td><td>The system shall preserve every activated version as immutable history.</td><td>Referenced history is never overwritten.</td></tr>
<tr><td>FR-TPL-014</td><td>The system shall allow an archived version to be duplicated into a new Draft.</td><td>Archived version itself remains immutable.</td></tr>
</table>

Information Agreement • v1.0 • Page 13

## Page 14

SOLO .BIZZ / PRODUCT SPECIFICATION

<table>
    <tr>
        <th>ID</th>
        <th>Formal requirement</th>
        <th>Context / verification</th>
    </tr>
    <tr>
        <td>FR-TPL-015</td>
        <td>The system shall prevent physical deletion of a template/version referenced by any agreement.</td>
        <td>Archive is used instead.</td>
    </tr>
    <tr>
        <td>FR-TPL-016</td>
        <td>The system shall record template creation, save, validation failure, activation and archive events.</td>
        <td>Do not log agreement body.</td>
    </tr>
</table>

<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Condition</b></p>
    </th>
    <th>
      <p><b>Required behavior</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>AF-09</p>
    </td>
    <td>
      <p>Client explicitly declines, if enabled</p>
    </td>
    <td>
      <p>Store Declined, do not create Accepted Document, show status to therapist.</p>
    </td>
  </tr>
</table>



## 6.2 Client Agreement Creation and Editing


<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Formal requirement</b></p>
    </th>
    <th>
      <p><b>Context / verification</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>FR-TPL-001</p>
    </td>
    <td>
      <p>The system shall display Information Agreement under Settings to an authorized therapist.</p>
    </td>
    <td>
      <p>Reusable configuration is not located in an individual client card.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-TPL-002</p>
    </td>
    <td>
      <p>The system shall provide a preconfigured starter template when the tenant has no saved template.</p>
    </td>
    <td>
      <p>Starter structure follows the reviewed product content.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-TPL-003</p>
    </td>
    <td>
      <p>The system shall create a new Draft version from the starter template or an existing version.</p>
    </td>
    <td>
      <p>An Active version is never edited in place.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-TPL-004</p>
    </td>
    <td>
      <p>The system shall allow editing of supported headings, paragraphs, lists, callouts, safe links, values and control labels in Draft.</p>
    </td>
    <td>
      <p>Content uses an allow-listed structure.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-TPL-005</p>
    </td>
    <td>
      <p>The system shall allow each checkbox-like element to be configured as informational content, optional input or mandatory acknowledgement.</p>
    </td>
    <td>
      <p>A visual symbol is not automatically a form control.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-TPL-006</p>
    </td>
    <td>
      <p>The system shall support required typed-text controls, including client full name.</p>
    </td>
    <td>
      <p>Each field has stable ID, label, required flag and validation.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-TPL-007</p>
    </td>
    <td>
      <p>The system shall support approved placeholders for therapist name, client name, date, duration, fee, currency, cancellation period, percentage and timezone.</p>
    </td>
    <td>
      <p>Unsupported placeholders are blocking errors.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-TPL-008</p>
    </td>
    <td>
      <p>The system shall autosave a Draft without activating it.</p>
    </td>
    <td>
      <p>Show Saving, Saved and Error state.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-TPL-009</p>
    </td>
    <td>
      <p>The system shall provide desktop and mobile preview using the client renderer.</p>
    </td>
    <td>
      <p>Preview must match public output.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-TPL-010</p>
    </td>
    <td>
      <p>The system shall validate required sections, controls, placeholders and unsafe content before activation.</p>
    </td>
    <td>
      <p>Error identifies affected block/field.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-TPL-011</p>
    </td>
    <td>
      <p>The system shall require confirmation before activation.</p>
    </td>
    <td>
      <p>Confirmation explains that only future agreements use the version.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-TPL-012</p>
    </td>
    <td>
      <p>The system shall allow exactly one Active version per tenant and template language.</p>
    </td>
    <td>
      <p>Activation retires the old Active version for new creation.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-TPL-013</p>
    </td>
    <td>
      <p>The system shall preserve every activated version as immutable history.</p>
    </td>
    <td>
      <p>Referenced history is never overwritten.</p>
    </td>
  </tr>
</table>



<table>
    <tr>
        <th>ID</th>
        <th>Formal requirement</th>
        <th>Context / verification</th>
    </tr>
    <tr>
        <td>FR-AGR-001</td>
        <td>The system shall display Information Agreement actions under Client Card → Documents/Agreements.</td>
        <td>Client instance actions only.</td>
    </tr>
    <tr>
        <td>FR-AGR-002</td>
        <td>The system shall create an Agreement Instance only when the client belongs to the current tenant and the therapist is authorized.</td>
        <td>Server-side authorization.</td>
    </tr>
    <tr>
        <td>FR-AGR-003</td>
        <td>The system shall create the Active template version selected for the tenant/language.</td>
        <td>Never use a mutable live instance from the template reference.</td>
    </tr>
    <tr>
        <td>FR-AGR-004</td>
        <td>The system shall store a complete snapshot and template_version_id when the agreement is created.</td>
        <td>Historical traceability.</td>
    </tr>
    <tr>
        <td>FR-AGR-005</td>
        <td>The system shall prefill approved placeholders from therapist, client and settings data.</td>
        <td>Missing required source values become validation issues.</td>
    </tr>
    <tr>
        <td>FR-AGR-006</td>
        <td>The system shall allow client-specific editing only in Draft or Ready.</td>
        <td>Master template remains unchanged.</td>
    </tr>
    <tr>
        <td>FR-AGR-007</td>
        <td>The system shall prevent modification of Accepted, Expired, Revoked and Superseded revisions.</td>
        <td>Read-only state.</td>
    </tr>
    <tr>
        <td>FR-AGR-008</td>
        <td>The system shall identify whether a value came from template content, a placeholder or client-specific override.</td>
        <td>Useful for therapist review and audit.</td>
    </tr>
    <tr>
        <td>FR-AGR-009</td>
        <td>The system shall prevent removal of mandatory final acceptance controls from a shareable client revision.</td>
        <td>Protect evidence completeness.</td>
    </tr>
    <tr>
        <td>FR-AGR-010</td>
        <td>The system shall save each shareable revision with a monotonically increasing revision number.</td>
        <td>Unique within agreement.</td>
    </tr>
    <tr>
        <td>FR-AGR-011</td>
        <td>The system shall require explicit confirmation before editing a Sent, Opened, Verified or In Progress agreement.</td>
        <td>Current link will stop working.</td>
    </tr>
    <tr>
        <td>FR-AGR-012</td>
        <td>The system shall revoke the current invitation before shared agreement content is changed.</td>
        <td>Prevent acceptance of stale terms.</td>
    </tr>
    <tr>
        <td>FR-AGR-013</td>
        <td>The system shall create a new Draft revision after shared content is changed.</td>
        <td>Old revision remains traceable.</td>
    </tr>
</table>

## Page 15

SOLO .BIZZ / PRODUCT SPECIFICATION

<table>
<tr><th>ID</th><th>Formal requirement</th><th>Context / verification</th></tr>
<tr><td>FR-AGR-014</td><td>The system shall list client agreements with type, status, revision, created, sent and accepted dates.</td><td>Most recent first.</td></tr>
<tr><td>FR-AGR-015</td><td>The system shall prevent reassignment of an Agreement Instance to another client.</td><td>client_id is immutable.</td></tr>
<tr><td>FR-AGR-016</td><td>The system shall block new agreements for an archived/deleted client by default.</td><td>Historical accepted documents remain viewable according to permissions.</td></tr>
<tr><td>FR-AGR-017</td><td>The system shall prevent duplicate active Draft creation when the same create request is retried with the same idempotency key.</td><td>Retry safety.</td></tr>
<tr><td>FR-AGR-018</td><td>The system shall show a preview of the exact client revision before link generation.</td><td>Includes resolved values and controls.</td></tr>
</table>

## 6.3 Secure Invitation and Link Isolation

<table>
<tr><th>ID</th><th>Formal requirement</th><th>Context / verification</th></tr>
<tr><td>FR-LNK-001</td><td>The system shall generate a cryptographically strong, non-sequential, single-purpose invitation token.</td><td>Minimum 128 bits of entropy.</td></tr>
<tr><td>FR-LNK-002</td><td>The system shall store only a non-reversible hash of the raw invitation token.</td><td>Raw token exists only when the URL is produced.</td></tr>
<tr><td>FR-LNK-003</td><td>The system shall bind each invitation to one tenant_id, therapist_id, client_id, agreement_id, revision_id and recipient email fingerprint.</td><td>Primary non-transferability control.</td></tr>
<tr><td>FR-LNK-004</td><td>The system shall exclude personal data and internal sequential IDs from the public URL.</td><td>No name, email or client database ID.</td></tr>
<tr><td>FR-LNK-005</td><td>The system shall validate token hash, status, expiry, tenant, client, agreement and revision before displaying any agreement content.</td><td>Fail closed.</td></tr>
<tr><td>FR-LNK-006</td><td>The system shall require OTP verification before returning the agreement body.</td><td>A valid URL alone is insufficient.</td></tr>
<tr><td>FR-LNK-007</td><td>The system shall send OTP only to the primary client email bound to the invitation.</td><td>Public UI shows masked email only.</td></tr>
<tr><td>FR-LNK-008</td><td>The system shall make OTP single-use and expire it after 10 minutes.</td><td>Default operational value.</td></tr>
<tr><td>FR-LNK-009</td><td>The system shall apply a 60-second resend cooldown and rate limits per invitation, email, IP and risk signal.</td><td>Abuse prevention.</td></tr>
<tr><td>FR-LNK-010</td><td>The system shall lock verification for 15 minutes after five consecutive invalid OTP attempts.</td><td>Neutral response.</td></tr>
</table>

Information Agreement • v1.0 • Page 15

## Page 16

SOLO .BIZZ / PRODUCT SPECIFICATION

<table>
<tr><th>ID</th><th>Formal requirement</th><th>Context / verification</th></tr>
<tr><td>FR-LNK-011</td><td>The system shall create a browser session scoped to exactly one agreement revision after valid OTP.</td><td>No wider client portal session.</td></tr>
<tr><td>FR-LNK-012</td><td>The system shall expire the scoped session after 30 minutes of inactivity and no later than 2 hours after creation.</td><td>Re-verification allowed while invitation remains valid.</td></tr>
<tr><td>FR-LNK-013</td><td>The system shall expire invitations after seven calendar days by default and store the exact UTC expiry timestamp.</td><td>Configurability may be added later.</td></tr>
<tr><td>FR-LNK-014</td><td>The system shall invalidate an invitation immediately when revoked, accepted, expired, superseded or when the bound client email changes.</td><td>Old URL must stop working.</td></tr>
<tr><td>FR-LNK-015</td><td>The system shall use the same neutral page for unknown, invalid, expired, revoked and cross-tenant tokens.</td><td>Avoid information disclosure.</td></tr>
<tr><td>FR-LNK-016</td><td>The system shall copy the secure URL only after all send validations pass.</td><td>Show clipboard success/failure.</td></tr>
<tr><td>FR-LNK-017</td><td>The system shall never resolve an invitation to an agreement or revision different from its stored binding.</td><td>Explicit cross-client isolation.</td></tr>
<tr><td>FR-LNK-018</td><td>The system shall record generation, copy, open, OTP request, verification, failure, lock, expiry and revocation events.</td><td>Raw token and OTP are prohibited in logs/audit.</td></tr>
<tr><td>FR-LNK-019</td><td>The system shall invalidate all non-terminal invitations associated with an old primary client email when that email changes.</td><td>Event-driven or transactional invalidation.</td></tr>
<tr><td>FR-LNK-020</td><td>The system shall allow regeneration only by creating a new invitation token.</td><td>Terminal tokens are never reactivated.</td></tr>
</table>

## 6.4 Client Interactive Form and Acceptance

<table>
<tr><th>ID</th><th>Formal requirement</th><th>Context / verification</th></tr>
<tr><td>FR-FRM-001</td><td>The system shall display the agreement only after a valid agreement-scoped session is established.</td><td>Pre-verification page has no body.</td></tr>
<tr><td>FR-FRM-002</td><td>The system shall render the exact frozen Agreement Revision, not the current Template Version.</td><td>Integrity requirement.</td></tr>
<tr><td>FR-FRM-003</td><td>The system shall render informational marks as content and configured form controls as native accessible inputs.</td><td>No ambiguous checkboxes.</td></tr>
<tr><td>FR-FRM-004</td><td>The system shall visibly and programmatically identify mandatory and optional inputs.</td><td>Accessibility.</td></tr>
<tr><td>FR-FRM-005</td><td>The system shall require every mandatory acknowledgement before submission.</td><td>Client and server validation.</td></tr>
</table>

## Page 17

SOLO .BIZZ / PRODUCT SPECIFICATION

<table>
<tr><th>ID</th><th>Formal requirement</th><th>Context / verification</th></tr>
<tr><td>FR-FRM-006</td><td>The system shall require client full name, trim surrounding whitespace and preserve the submitted internal characters.</td><td>Typed acceptance.</td></tr>
<tr><td>FR-FRM-007</td><td>The system shall display therapist identity and system-generated date/time as read-only values.</td><td>Date is not manually entered.</td></tr>
<tr><td>FR-FRM-008</td><td>The system shall keep the submit action disabled until client-side required conditions are met.</td><td>Server remains authoritative.</td></tr>
<tr><td>FR-FRM-009</td><td>The system shall show field-level errors and focus the first invalid control after failed submit.</td><td>Accessible recovery.</td></tr>
<tr><td>FR-FRM-010</td><td>The system shall retain current-browser progress during ordinary navigation/temporary network failure where technically possible.</td><td>No cross-device promise in MVP.</td></tr>
<tr><td>FR-FRM-011</td><td>The system shall revalidate invitation, session, revision and agreement state immediately before acceptance.</td><td>Prevent stale submit.</td></tr>
<tr><td>FR-FRM-012</td><td>The system shall commit one atomic acceptance transaction containing responses, typed name, UTC timestamp, verification reference and snapshot hash.</td><td>All-or-nothing.</td></tr>
<tr><td>FR-FRM-013</td><td>The system shall make acceptance idempotent for repeated requests with the same idempotency key.</td><td>No duplicate document.</td></tr>
<tr><td>FR-FRM-014</td><td>The system shall show a safe confirmation page after successful acceptance.</td><td>No other client data.</td></tr>
<tr><td>FR-FRM-015</td><td>The system shall invalidate the invitation and verified session immediately after acceptance.</td><td>Prevent modification/resubmission.</td></tr>
<tr><td>FR-FRM-016</td><td>The system shall not describe the MVP action as a qualified electronic signature.</td><td>Proposed button: Accept and submit.</td></tr>
<tr><td>FR-FRM-017</td><td>The system shall reject a response containing unknown or duplicated field IDs.</td><td>Prevent parameter injection.</td></tr>
<tr><td>FR-FRM-018</td><td>The system shall preserve the exact label and required state of each answered control in the acceptance snapshot.</td><td>Future template edits cannot change evidence.</td></tr>
</table>

## 6.5 Documents, Status, Notifications and Audit


<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Formal requirement</b></p>
    </th>
    <th>
      <p><b>Context / verification</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>FR-TPL-014</p>
    </td>
    <td>
      <p>The system shall allow an archived version to be duplicated into a new Draft.</p>
    </td>
    <td>
      <p>Archived version itself remains immutable.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-TPL-015</p>
    </td>
    <td>
      <p>The system shall prevent physical deletion of a template/version referenced by any agreement.</p>
    </td>
    <td>
      <p>Archive is used instead.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-TPL-016</p>
    </td>
    <td>
      <p>The system shall record template creation, save, validation failure, activation and archive events.</p>
    </td>
    <td>
      <p>Do not log agreement body.</p>
    </td>
  </tr>
</table>

## Page 18

SOLO .BIZZ / PRODUCT SPECIFICATION

<table>
<tr><th>ID</th><th>Formal requirement</th><th>Context / verification</th></tr>
<tr><td>FR-DOC-003</td><td>The system shall list the document under Client Card → Documents with type Information Agreement.</td><td>Status Accepted.</td></tr>
<tr><td>FR-DOC-004</td><td>The system shall show revision, template version, accepted date/time, therapist and client display name in the therapist view.</td><td>Metadata header.</td></tr>
<tr><td>FR-DOC-005</td><td>The system shall provide a read-only view that preserves content, checked acknowledgements and typed name.</td><td>No edit action.</td></tr>
<tr><td>FR-DOC-006</td><td>The system shall verify stored integrity hash when an accepted document is retrieved or exported.</td><td>Mismatch is a security event.</td></tr>
<tr><td>FR-DOC-007</td><td>The system shall update agreement status in Client Card without requiring a manual hard refresh.</td><td>Polling/event delivery is an implementation choice.</td></tr>
<tr><td>FR-DOC-008</td><td>The system shall show an in-app success indicator when the agreement becomes Accepted.</td><td>Email notification not required in MVP.</td></tr>
<tr><td>FR-DOC-009</td><td>The system shall retry asynchronous document generation idempotently and expose Processing/Failed states.</td><td>Acceptance is not rolled back.</td></tr>
<tr><td>FR-DOC-010</td><td>The system shall preserve accepted content when template or client profile values later change.</td><td>Snapshot semantics.</td></tr>
<tr><td>FR-DOC-011</td><td>The system shall sort agreement/document list by most recently updated by default.</td><td>Existing Documents sorting may be reused.</td></tr>
<tr><td>FR-DOC-012</td><td>The system shall display activity timestamps using the therapist locale and explicit timezone.</td><td>Stored canonical value remains UTC.</td></tr>
<tr><td>FR-AUD-001</td><td>The system shall append an immutable audit event for every lifecycle/security-relevant action.</td><td>Append-only business audit.</td></tr>
<tr><td>FR-AUD-002</td><td>The system shall record actor type/id, tenant, client, agreement, revision, event, UTC time, correlation ID, outcome and safe metadata.</td><td>Standard schema.</td></tr>
<tr><td>FR-AUD-003</td><td>The system shall never store raw OTP, raw invitation token or agreement body in operational logs.</td><td>Sensitive-value prohibition.</td></tr>
<tr><td>FR-AUD-004</td><td>The system shall distinguish therapist, client-session, admin and service actors.</td><td>Responsibility traceability.</td></tr>
<tr><td>FR-AUD-005</td><td>The system shall record previous and new status for every lifecycle transition.</td><td>Status history.</td></tr>
</table>

Information Agreement • v1.0 • Page 18

## Page 19

SOLO .BIZZ / PRODUCT SPECIFICATION



<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Formal requirement</b></p>
    </th>
    <th>
      <p><b>Context / verification</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>FR-TPL-016</p>
    </td>
    <td>
      <p>The system shall record template creation, save, validation failure, activation and archive events.</p>
    </td>
    <td>
      <p>Do not log agreement body.</p>
    </td>
  </tr>
</table>

## Page 20

SOLO .BIZZ / PRODUCT SPECIFICATION

# 7. Business Rules

<table>
<tr><th>ID</th><th>Business rule</th></tr>
<tr><td>BR-001</td><td>Template and client agreement are different entities. Updating either never silently updates the other.</td></tr>
<tr><td>BR-002</td><td>Exactly one Active Template Version is used for new agreements per tenant and language.</td></tr>
<tr><td>BR-003</td><td>Every Agreement Instance belongs to exactly one tenant, therapist context and client; client_id never changes.</td></tr>
<tr><td>BR-004</td><td>A shareable revision is frozen. Editing after sharing requires revocation and a new revision/invitation.</td></tr>
<tr><td>BR-005</td><td>An invitation is valid only when token hash, client, tenant, agreement, revision, email fingerprint, status and expiry all match server state.</td></tr>
<tr><td>BR-006</td><td>A copied URL alone does not authorize access. OTP verification is mandatory before the agreement body is delivered.</td></tr>
<tr><td>BR-007</td><td>The OTP recipient email is taken only from the stored client profile; it cannot be supplied on the public page.</td></tr>
<tr><td>BR-008</td><td>Changing the primary client email invalidates active invitations bound to the old email.</td></tr>
<tr><td>BR-009</td><td>Every mandatory acknowledgement defined in the frozen revision must be true at submission.</td></tr>
<tr><td>BR-010</td><td>System timestamps are stored in UTC and displayed using explicit locale/timezone.</td></tr>
<tr><td>BR-011</td><td>Acceptance is a single atomic transition. Accepted is terminal for that revision.</td></tr>
<tr><td>BR-012</td><td>Only one Accepted Document is created per accepted agreement revision.</td></tr>
<tr><td>BR-013</td><td>Accepted content is immutable. Changed terms require a new revision/agreement.</td></tr>
<tr><td>BR-014</td><td>The current master template is never used to render a historical or shared client revision.</td></tr>
<tr><td>BR-015</td><td>Expired, Revoked, Superseded and Accepted invitations cannot be reactivated.</td></tr>
<tr><td>BR-016</td><td>A therapist views only clients/documents authorized by current tenant permissions.</td></tr>
<tr><td>BR-017</td><td>The public page exposes only the current agreement after verification and never exposes Client Card data.</td></tr>
<tr><td>BR-018</td><td>MVP acceptance evidence is not labelled as a qualified electronic signature.</td></tr>
<tr><td>BR-019</td><td>Starter template content remains illustrative until legal and professional approval.</td></tr>
<tr><td>BR-020</td><td>Visual checkmark characters have no input meaning unless represented by a configured control.</td></tr>
<tr><td>BR-021</td><td>Editing the reusable template affects only Agreement Instances created after the new version is activated.</td></tr>
</table>

Information Agreement • v1.0 • Page 20

## Page 21

SOLO .BIZZ / PRODUCT SPECIFICATION



<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Formal requirement</b></p>
    </th>
    <th>
      <p><b>Context / verification</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-001</p>
    </td>
    <td>
      <p>The system shall display Information Agreement actions under Client Card → Documents/Agreements.</p>
    </td>
    <td>
      <p>Client instance actions only.</p>
    </td>
  </tr>
</table>




## 7.1 Status Transitions


<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Formal requirement</b></p>
    </th>
    <th>
      <p><b>Context / verification</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-002</p>
    </td>
    <td>
      <p>The system shall create an Agreement Instance only when the client belongs to the current tenant and the therapist is authorized.</p>
    </td>
    <td>
      <p>Server-side authorization.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-003</p>
    </td>
    <td>
      <p>The system shall create the instance from the currently Active template version selected for the tenant/language.</p>
    </td>
    <td>
      <p>Never use a mutable live template reference.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-004</p>
    </td>
    <td>
      <p>The system shall store a complete snapshot and template_version_id when the agreement is created.</p>
    </td>
    <td>
      <p>Historical traceability.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-005</p>
    </td>
    <td>
      <p>The system shall prefill approved placeholders from therapist, client and settings data.</p>
    </td>
    <td>
      <p>Missing required source values become validation issues.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-006</p>
    </td>
    <td>
      <p>The system shall allow client-specific editing only in Draft or Ready.</p>
    </td>
    <td>
      <p>Master template remains unchanged.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-007</p>
    </td>
    <td>
      <p>The system shall prevent modification of Accepted, Expired, Revoked and Superseded revisions.</p>
    </td>
    <td>
      <p>Read-only state.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-008</p>
    </td>
    <td>
      <p>The system shall identify whether a value came from template content, a placeholder or client-specific override.</p>
    </td>
    <td>
      <p>Useful for therapist review and audit.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-009</p>
    </td>
    <td>
      <p>The system shall prevent removal of mandatory final acceptance controls from a shareable client revision.</p>
    </td>
    <td>
      <p>Protect evidence completeness.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-010</p>
    </td>
    <td>
      <p>The system shall save each shareable revision with a monotonically increasing revision number.</p>
    </td>
    <td>
      <p>Unique within agreement.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-011</p>
    </td>
    <td>
      <p>The system shall require explicit confirmation before editing a Sent, Opened, Verified or In Progress agreement.</p>
    </td>
    <td>
      <p>Current link will stop working.</p>
    </td>
  </tr>
</table>

## Page 22

SOLO .BIZZ / PRODUCT SPECIFICATION

# 8. Data Requirements

## 8.1 Logical Data Model

<table>
<tr><th>Entity</th><th>Purpose</th><th>Minimum fields</th></tr>
<tr><td>AgreementTemplate</td><td>Reusable tenant-owned template</td><td>id, tenant_id, language, name, status, created_by, created_at, archived_at</td></tr>
<tr><td>TemplateVersion</td><td>Immutable template revision</td><td>id, template_id, version_no, schema_json, rendered_html, content_hash, status, created_by, created_at, activated_at</td></tr>
<tr><td>Agreement</td><td>Client-level aggregate</td><td>id, tenant_id, therapist_id, client_id, type, current_revision_id, status, created_at, accepted_at</td></tr>
<tr><td>AgreementRevision</td><td>Frozen client-specific content</td><td>id, agreement_id, template_version_id, revision_no, schema_json, rendered_html, content_hash, status, created_by, created_at</td></tr>
<tr><td>Invitation</td><td>Client-bound access record</td><td>id, agreement_revision_id, tenant_id, client_id, token_hash, email_fingerprint, status, expires_at, opened_at, verified_at, revoked_at</td></tr>
<tr><td>OtpChallenge</td><td>Verification challenge</td><td>id, invitation_id, code_hash, expires_at, attempts, last_sent_at, locked_until, consumed_at</td></tr>
<tr><td>VerifiedAgreementSession</td><td>Short-lived authorization</td><td>id, invitation_id, revision_id, session_hash, expires_at, idle_expires_at, revoked_at</td></tr>
<tr><td>AgreementResponse</td><td>Client input/evidence</td><td>id, revision_id, field_answers_json, typed_name, accepted_at, verification_id, evidence_hash, idempotency_key</td></tr>
<tr><td>ClientDocument</td><td>Stored document index</td><td>id, tenant_id, client_id, agreement_id, type, status, artifact_ref, content_hash, created_at</td></tr>
<tr><td>AgreementAuditEvent</td><td>Append-only trace</td><td>id, tenant_id, client_id, agreement_id, revision_id, actor_type, actor_id, event_type, previous_status, new_status, occurred_at, correlation_id, safe_metadata</td></tr>
</table>

## 8.2 Content and Control Model


<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Formal requirement</b></p>
    </th>
    <th>
      <p><b>Context / verification</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-011</p>
    </td>
    <td>
      <p>The system shall require explicit confirmation before editing a Sent, Opened, Verified or In Progress agreement.</p>
    </td>
    <td>
      <p>Current link will stop working.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-012</p>
    </td>
    <td>
      <p>The system shall revoke the current invitation before shared agreement content is changed.</p>
    </td>
    <td>
      <p>Prevent acceptance of stale terms.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-013</p>
    </td>
    <td>
      <p>The system shall create a new Draft revision after shared content is changed.</p>
    </td>
    <td>
      <p>Old revision remains traceable.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-014</p>
    </td>
    <td>
      <p>The system shall list client agreements with type, status, revision, created, sent and accepted dates.</p>
    </td>
    <td>
      <p>Most recent first.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-015</p>
    </td>
    <td>
      <p>The system shall prevent reassignment of an Agreement Instance to another client.</p>
    </td>
    <td>
      <p>client_id is immutable.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-016</p>
    </td>
    <td>
      <p>The system shall block new agreements for an archived/deleted client by default.</p>
    </td>
    <td>
      <p>Historical accepted documents remain viewable according to permissions.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-017</p>
    </td>
    <td>
      <p>The system shall prevent duplicate active Draft creation when the same create request is retried with the same idempotency key.</p>
    </td>
    <td>
      <p>Retry safety.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-018</p>
    </td>
    <td>
      <p>The system shall show a preview of the exact client revision before link generation.</p>
    </td>
    <td>
      <p>Includes resolved values and controls.</p>
    </td>
  </tr>
</table>



Information Agreement • v1.0 • Page 22

22

## Page 23

SOLO .BIZZ / PRODUCT SPECIFICATION

<table>
<tr><th>Object</th><th>Supported type</th><th>Rules</th></tr>
</table>


<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Formal requirement</b></p>
    </th>
    <th>
      <p><b>Context / verification</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-014</p>
    </td>
    <td>
      <p>The system shall list client agreements with type, status, revision, created, sent and accepted dates.</p>
    </td>
    <td>
      <p>Most recent first.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-015</p>
    </td>
    <td>
      <p>The system shall prevent reassignment of an Agreement Instance to another client.</p>
    </td>
    <td>
      <p>client_id is immutable.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-016</p>
    </td>
    <td>
      <p>The system shall block new agreements for an archived/deleted client by default.</p>
    </td>
    <td>
      <p>Historical accepted documents remain viewable according to permissions.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-017</p>
    </td>
    <td>
      <p>The system shall prevent duplicate active Draft creation when the same create request is retried with the same idempotency key.</p>
    </td>
    <td>
      <p>Retry safety.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-018</p>
    </td>
    <td>
      <p>The system shall show a preview of the exact client revision before link generation.</p>
    </td>
    <td>
      <p>Includes resolved values and controls.</p>
    </td>
  </tr>
</table>



## 8.3 Template Section Model
The starter template shown in the prototype includes the following logical sections. The precise wording is managed as product content rather than hard-coded application logic.

<table>
<tr><th>Section</th><th>Typical content</th><th>Configurable controls</th></tr>
<tr><td>Description of services</td><td>Method, format, duration, cycle/regularity</td><td>Optional values for duration, frequency and service format</td></tr>
<tr><td>Rights and responsibilities</td><td>Client rights and therapist obligations</td><td>Informational by default</td></tr>
<tr><td>Confidentiality and limits</td><td>Confidentiality principles and exceptions</td><td>Mandatory acknowledgement may be configured</td></tr>
<tr><td>Place and time</td><td>Location, online/offline format, schedule</td><td>Place/time values</td></tr>
<tr><td>Online format and risks</td><td>Privacy and technical limitations</td><td>Mandatory or optional acknowledgement</td></tr>
<tr><td>Payment and cancellation</td><td>Payment timing, cancellation, missed session, lateness and exceptions</td><td>Mandatory policy acknowledgements and configurable amounts/periods</td></tr>
<tr><td>Acceptance</td><td>Confirmation statement, typed client name, therapist name and system date</td><td>Mandatory final checkbox and typed name</td></tr>
</table>

## 8.4 Integrity and Data Quality Rules
* Every business read/write includes tenant scope in its authorization predicate.
* Every Accepted response references one frozen AgreementRevision and its content_hash.
* evidence_hash is calculated from canonicalized revision content, field responses, typed name, accepted_at and verification reference.
* Raw invitation tokens and OTPs are never persisted; only secure hashes are stored.
* Client email fingerprint supports binding/comparison while the deliverable email remains protected in the Client entity/integration data.
* Database constraints prevent duplicate revision numbers and duplicate acceptance idempotency keys.
* Unknown client-supplied field IDs are rejected.
* The document index and artifact store must be reconciled by agreement_id and content_hash.

## 8.5 Retention, Archive and Deletion
Retention periods must be approved for each operating jurisdiction. The system must support separate configurable policies for template history, expired invitations, OTP challenges, accepted documents and audit evidence.

<table>
<tr><th>Data class</th><th>Lifecycle expectation</th><th>Notes</th></tr>
</table>


<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Formal requirement</b></p>
    </th>
    <th>
      <p><b>Context / verification</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-016</p>
    </td>
    <td>
      <p>The system shall block new agreements for an archived/deleted client by default.</p>
    </td>
    <td>
      <p>Historical accepted documents remain viewable according to permissions.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-017</p>
    </td>
    <td>
      <p>The system shall prevent duplicate active Draft creation when the same create request is retried with the same idempotency key.</p>
    </td>
    <td>
      <p>Retry safety.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-018</p>
    </td>
    <td>
      <p>The system shall show a preview of the exact client revision before link generation.</p>
    </td>
    <td>
      <p>Includes resolved values and controls.</p>
    </td>
  </tr>
</table>

## Page 24

SOLO .BIZZ / PRODUCT SPECIFICATION



<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Formal requirement</b></p>
    </th>
    <th>
      <p><b>Context / verification</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>FR-AGR-018</p>
    </td>
    <td>
      <p>The system shall show a preview of the exact client revision before link generation.</p>
    </td>
    <td>
      <p>Includes resolved values and controls.</p>
    </td>
  </tr>
</table>




Deleting or anonymizing a client must not silently break an applicable record-retention obligation. Where deletion is permitted, it must be authorized, audited and applied consistently to database records, artifacts and search indexes.

Information Agreement • v1.0 • Page 24

## Page 25

SOLO .BIZZ / PRODUCT SPECIFICATION

# 9. UI, Navigation and Interaction

## 9.1 Screen Inventory


<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Formal requirement</b></p>
    </th>
    <th>
      <p><b>Context / verification</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-001</p>
    </td>
    <td>
      <p>The system shall generate a cryptographically strong, non-sequential, single-purpose invitation token.</p>
    </td>
    <td>
      <p>Minimum 128 bits of entropy.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-002</p>
    </td>
    <td>
      <p>The system shall store only a non-reversible hash of the raw invitation token.</p>
    </td>
    <td>
      <p>Raw token exists only when the URL is produced.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-003</p>
    </td>
    <td>
      <p>The system shall bind each invitation to one tenant_id, therapist_id, client_id, agreement_id, revision_id and recipient email fingerprint.</p>
    </td>
    <td>
      <p>Primary non-transferability control.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-004</p>
    </td>
    <td>
      <p>The system shall exclude personal data and internal sequential IDs from the public URL.</p>
    </td>
    <td>
      <p>No name, email or client database ID.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-005</p>
    </td>
    <td>
      <p>The system shall validate token hash, status, expiry, tenant, client, agreement and revision before displaying any agreement content.</p>
    </td>
    <td>
      <p>Fail closed.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-006</p>
    </td>
    <td>
      <p>The system shall require OTP verification before returning the agreement body.</p>
    </td>
    <td>
      <p>A valid URL alone is insufficient.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-007</p>
    </td>
    <td>
      <p>The system shall send OTP only to the primary client email bound to the invitation.</p>
    </td>
    <td>
      <p>Public UI shows masked email only.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-008</p>
    </td>
    <td>
      <p>The system shall make OTP single-use and expire it after 10 minutes.</p>
    </td>
    <td>
      <p>Default operational value.</p>
    </td>
  </tr>
</table>



## 9.2 Settings Changes
* Add Information Agreement under Settings.
* Do not place reusable template configuration inside a client card.
* Show the Active Version card with version number, language, activation time and Preview.
* Edit Active creates a new Draft; it never changes the Active version in place.
* Show Draft separately and explain that Save does not affect new agreements until activation.
* Add a validation panel whose errors link to affected blocks.
* Add version history with Active/Archived state and Duplicate as new Draft.
* Require confirmation for Activate and Archive.
* Preserve a safe structured editor rather than accepting arbitrary executable HTML.

## 9.3 Client Card Changes
* Add an Information Agreement filter/section under Documents/Agreements.
* Add Create Information Agreement.
* If no Active template exists, show a blocking message with a route to Settings.
* Show status chips: Draft, Ready, Sent, Opened, Verified, In progress, Accepted, Expired, Revoked, Superseded and Document processing failed.
* Show state-dependent actions: Edit, Preview, Copy secure link, Revoke, Regenerate, View document and View activity.
* Do not show Copy link for Accepted, Expired or Revoked invitations.
* Display the bound client email in masked or standard internal form according to existing Client Card privacy rules.
* When email is missing/invalid, disable secure sharing and provide a direct route to edit client details.

Information Agreement • v1.0 • Page 25

## Page 26

SOLO .BIZZ / PRODUCT SPECIFICATION

## 9.4 Client Agreement Editor
* Header shows client, source template version, agreement revision and current status.
* Editable content is clearly distinguished from resolved read-only metadata.
* Client-specific edits never update the master template.
* Preview uses the same renderer and field labels as the client page.
* Save Draft and Copy secure link are separate actions.
* Copy secure link first runs blocking validation.
* Editing after Sent shows a confirmation that the current link will be revoked and the client will need a new link.

## 9.5 Public Client Experience
* Use Solo .Bizz visual identity with minimal navigation.
* Before verification, show no agreement text and no client identity.
* Show a masked email hint only after a valid invitation is recognized.
* After verification, show document title, therapist display name, section navigation/progress and privacy notice.
* Use native inputs with associated labels, keyboard focus and large touch targets.
* Distinguish mandatory controls from informational text.
* Do not make scrolling every pixel a legal acceptance requirement. Acceptance is based on explicit controls and server-side validation.
* On submit, disable repeated clicks and show progress.
* Recover safely from timeout using idempotency.

## 9.6 Proposed Ukrainian Messages

<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Formal requirement</b></p>
    </th>
    <th>
      <p><b>Context / verification</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-009</p>
    </td>
    <td>
      <p>The system shall apply a 60-second resend cooldown and rate limits per invitation, email, IP and risk signal.</p>
    </td>
    <td>
      <p>Abuse prevention.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-010</p>
    </td>
    <td>
      <p>The system shall lock verification for 15 minutes after five consecutive invalid OTP attempts.</p>
    </td>
    <td>
      <p>Neutral response.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-011</p>
    </td>
    <td>
      <p>The system shall create a browser session scoped to exactly one agreement revision after valid OTP.</p>
    </td>
    <td>
      <p>No wider client portal session.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-012</p>
    </td>
    <td>
      <p>The system shall expire the scoped session after 30 minutes of inactivity and no later than 2 hours after creation.</p>
    </td>
    <td>
      <p>Re-verification allowed while invitation remains valid.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-013</p>
    </td>
    <td>
      <p>The system shall expire invitations after seven calendar days by default and store the exact UTC expiry timestamp.</p>
    </td>
    <td>
      <p>Configurability may be added later.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-014</p>
    </td>
    <td>
      <p>The system shall invalidate an invitation immediately when revoked, accepted, expired, superseded or when the bound client email changes.</p>
    </td>
    <td>
      <p>Old URL must stop working.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-015</p>
    </td>
    <td>
      <p>The system shall use the same neutral page for unknown, invalid, expired, revoked and cross-tenant tokens.</p>
    </td>
    <td>
      <p>Avoid information disclosure.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-016</p>
    </td>
    <td>
      <p>The system shall copy the secure URL only after all send validations pass.</p>
    </td>
    <td>
      <p>Show clipboard success/failure.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-017</p>
    </td>
    <td>
      <p>The system shall never resolve an invitation to an agreement or revision different from its stored binding.</p>
    </td>
    <td>
      <p>Explicit cross-client isolation.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-018</p>
    </td>
    <td>
      <p>The system shall record generation, copy, open, OTP request, verification, failure, lock, expiry and revocation events.</p>
    </td>
    <td>
      <p>Raw token and OTP are prohibited in logs/audit.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-019</p>
    </td>
    <td>
      <p>The system shall invalidate all non-terminal invitations associated with an old primary client email when that email changes.</p>
    </td>
    <td>
      <p>Event-driven or transactional invalidation.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-020</p>
    </td>
    <td>
      <p>The system shall allow regeneration only by creating a new invitation token.</p>
    </td>
    <td>
      <p>Terminal tokens are never reactivated.</p>
    </td>
  </tr>
</table>



## 9.7 Empty, Loading, Error and Permission States
<table>
<tr><th>State</th><th>Expected UI</th></tr>
<tr><td>No template</td><td>Starter template card and Create Draft action.</td></tr>
<tr><td>No agreement for client</td><td>Empty-state explanation and Create action.</td></tr>
<tr><td>Loading</td><td>Skeleton/progress without briefly exposing stale data from another client.</td></tr>
</table>

Information Agreement • v1.0 • Page 26

## Page 27

SOLO .BIZZ / PRODUCT SPECIFICATION

<table>
<tr><th>State</th><th>Expected UI</th></tr>
<tr><td>Save in progress</td><td>Saving indicator; prevent navigation loss warning only when unsaved state remains.</td></tr>
<tr><td>Save failed</td><td>Persistent error with Retry; keep local editor content.</td></tr>
<tr><td>Permission denied</td><td>Neutral unauthorized/not-found experience; no client/agreement identifiers.</td></tr>
<tr><td>Document Processing</td><td>Accepted status remains visible; document action shows Processing.</td></tr>
<tr><td>Document generation failed</td><td>Show retry/support state to authorized therapist; client acceptance remains intact.</td></tr>
</table>

## 9.8 Responsive, Accessibility and Localization
* Support 320 px viewport width and larger without horizontal scrolling for ordinary content.
* Meet WCAG 2.1 AA expectations for keyboard, labels, focus, contrast, error summary and touch target use.
* Section navigation must not cover content on small screens.
* UI text is localizable.
* Agreement content language is version metadata and is never machine-translated automatically.
* Dates, times, amounts and currencies render by locale while canonical storage remains unchanged.
* Test current and previous major versions of Chrome, Safari, Firefox and Edge, including iOS Safari and Android Chrome.

## Page 28

SOLO .BIZZ / PRODUCT SPECIFICATION

# 10. Interfaces and Integration

## 10.1 Conceptual API Operations

The routes below are conceptual. Existing backend naming may be used, but authorization, idempotency, binding and state behavior are mandatory.

<table>
<tr><th>Method</th><th>Conceptual route</th><th>Purpose</th><th>Control</th></tr>
<tr><td>GET</td><td>/settings/agreement-templates</td><td>List tenant templates/versions</td><td>Therapist authentication</td></tr>
<tr><td>POST</td><td>/settings/agreement-templates/{id}/versions</td><td>Create Draft version</td><td>Authentication + idempotency</td></tr>
<tr><td>PUT</td><td>/settings/agreement-template-versions/{id}</td><td>Save Draft schema/content</td><td>Authentication + optimistic concurrency</td></tr>
<tr><td>POST</td><td>/settings/agreement-template-versions/{id}/activate</td><td>Activate valid version</td><td>Authentication + confirmation</td></tr>
<tr><td>POST</td><td>/clients/{clientId}/agreements</td><td>Create client agreement</td><td>Tenant/client authorization + idempotency</td></tr>
<tr><td>PUT</td><td>/clients/{clientId}/agreements/{id}/revisions/{rev}</td><td>Save client Draft</td><td>Authorization + ETag/version</td></tr>
<tr><td>POST</td><td>/clients/{clientId}/agreements/{id}/invitations</td><td>Create invitation</td><td>Authorization + send validation + idempotency</td></tr>
<tr><td>POST</td><td>/clients/{clientId}/agreements/{id}/invitations/{inv}/revoke</td><td>Revoke</td><td>Authorization + idempotency</td></tr>
<tr><td>GET</td><td>/public/agreement-invitations/{token}/status</td><td>Validate safe invitation state</td><td>Public, throttled, neutral output</td></tr>
<tr><td>POST</td><td>/public/agreement-invitations/{token}/otp</td><td>Request OTP</td><td>Public, throttled</td></tr>
<tr><td>POST</td><td>/public/agreement-invitations/{token}/verify</td><td>Verify OTP/create session</td><td>Public, throttled</td></tr>
<tr><td>GET</td><td>/public/agreements/current</td><td>Fetch frozen agreement</td><td>Agreement-scoped session</td></tr>
<tr><td>POST</td><td>/public/agreements/current/acceptance</td><td>Submit acceptance</td><td>Scoped session + idempotency</td></tr>
<tr><td>GET</td><td>/clients/{clientId}/documents/{documentId}</td><td>View accepted document</td><td>Therapist authentication + client permission</td></tr>
</table>

## 10.2 OTP Email Integration

<table>
<tr><th>Aspect</th><th>Requirement</th></tr>
<tr><td>Direction</td><td>Solo .Bizz → transactional email provider → primary client email</td></tr>
<tr><td>Payload</td><td>Recipient, localized template ID, one-time code, expiry and correlation/reference. Agreement body is excluded.</td></tr>
<tr><td>Authentication</td><td>Provider credentials stored server-side in secret management.</td></tr>
</table>

## Page 29

SOLO .BIZZ / PRODUCT SPECIFICATION

<table>
<tr><th>Aspect</th><th>Requirement</th></tr>
<tr><td>Retry</td><td>Bounded exponential retry for transient error; do not create multiple valid codes unintentionally.</td></tr>
<tr><td>Idempotency</td><td>A resend creates/supersedes the challenge; only the latest code is valid.</td></tr>
<tr><td>Failure</td><td>Show safe client error, record outcome and allow retry after cooldown.</td></tr>
<tr><td>Monitoring</td><td>Request rate, provider error, delivery latency, rejection/bounce, verification conversion and abuse signals.</td></tr>
</table>

OTP email is transactional/security communication and must not depend on marketing subscription preferences.

## 10.3 Concurrency, Retry and Reconciliation
* Template and client Draft updates use optimistic concurrency. A conflict requires refresh/reconciliation rather than silent overwrite.
* Invitation creation accepts an idempotency key. A repeated confirmed request returns the same active invitation unless terminal.
* Acceptance uses an idempotency key and atomic compare-and-set from an allowed state to Accepted.
* A reconciliation worker finds Accepted agreements without ClientDocument and retries generation.
* An expiry worker transitions only non-terminal invitations whose expires_at is reached.
* All workers create audit events and use correlation IDs.

## Page 30

SOLO .BIZZ / PRODUCT SPECIFICATION

# 11. Security, Privacy and Audit

## 11.1 Required Threat Controls

<table>
<tr><th>Threat</th><th>Control</th></tr>
<tr><td>Broken object authorization</td><td>Every internal read/write checks tenant and client authorization; public lookup uses token hash and stored binding.</td></tr>
<tr><td>Forwarded/stolen URL</td><td>OTP to stored client email, short scoped session, expiry and revocation.</td></tr>
<tr><td>Token enumeration</td><td>High entropy, no sequential IDs, uniform response and throttling.</td></tr>
<tr><td>OTP brute force</td><td>Short expiry, attempt counter, cooldown, lockout, rate limit and monitoring.</td></tr>
<tr><td>Cross-client mix-up</td><td>Immutable client_id across agreement/invitation/document plus database constraints and negative tests.</td></tr>
<tr><td>Content injection</td><td>Structured allow-list and sanitized renderer; scripts/unsafe links blocked.</td></tr>
<tr><td>Replay/duplicate submit</td><td>Idempotency, atomic state transition and session invalidation.</td></tr>
<tr><td>Sensitive logging</td><td>No body, typed name, full email, raw token or OTP in operational logs/analytics.</td></tr>
<tr><td>Artifact tampering</td><td>Canonical hash over accepted content/evidence and verification on retrieval/export.</td></tr>
<tr><td>Session theft</td><td>TLS, Secure HttpOnly SameSite cookie, short TTL, agreement scope and revocation after submit.</td></tr>
</table>

## 11.2 Audit Event Catalogue

<table>
<tr><th>Area</th><th>Events</th></tr>
<tr><td>Template</td><td>TEMPLATE_DRAFT_CREATED, TEMPLATE_SAVED, TEMPLATE_VALIDATION_FAILED, TEMPLATE_ACTIVATED, TEMPLATE_ARCHIVED</td></tr>
<tr><td>Agreement</td><td>AGREEMENT_CREATED, AGREEMENT_DRAFT_SAVED, AGREEMENT_REVISION_FROZEN, AGREEMENT_STARTED, AGREEMENT_ACCEPTED</td></tr>
<tr><td>Invitation</td><td>INVITATION_CREATED, INVITATION_LINK_COPIED, INVITATION_OPENED, INVITATION_REVOKED, INVITATION_EXPIRED</td></tr>
<tr><td>Verification</td><td>OTP_REQUESTED, OTP_DELIVERY_FAILED, OTP_VERIFICATION_FAILED, OTP_VERIFIED, INVITATION_LOCKED</td></tr>
<tr><td>Document</td><td>DOCUMENT_GENERATION_STARTED, DOCUMENT_GENERATED, DOCUMENT_GENERATION_FAILED, DOCUMENT_VIEWED, INTEGRITY_CHECK_FAILED</td></tr>
</table>

Every audit event includes actor type/id, tenant, client, agreement, revision, prior/new state where applicable, UTC time, correlation ID, outcome and safe metadata.

## 11.3 Privacy Principles

* Data minimization: no agreement body before verification; masked email only.
* Purpose limitation: invitation/OTP data is used only for the agreement flow.
* Tenant isolation: all internal records and queries are tenant scoped.
* Encryption: TLS in transit and encryption at rest for sensitive records/artifacts.

Information Agreement • v1.0 • Page 30

## Page 31

- Operational access: support/admin body access denied by default.
- Privacy notice: client page must display approved controller/contact, purpose, data categories, retention and rights.
- Product analytics must exclude agreement body, typed name, full email, token and OTP.

## Page 32

SOLO .BIZZ / PRODUCT SPECIFICATION

# 12. Non-Functional Requirements

<table>
<tr><th>ID</th><th>Requirement</th></tr>
<tr><td>NFR-PERF-01</td><td>Settings and client agreement screens shall reach usable state within 2 seconds at the 95th percentile under agreed normal load.</td></tr>
<tr><td>NFR-PERF-02</td><td>Public token validation and agreement retrieval shall respond within 1.5 seconds at the 95th percentile, excluding email delivery.</td></tr>
<tr><td>NFR-PERF-03</td><td>Acceptance confirmation shall return within 3 seconds at the 95th percentile; document generation may continue asynchronously.</td></tr>
<tr><td>NFR-SCALE-01</td><td>The design shall support at least 100 template versions and 10,000 agreement records per tenant without changing user behavior; final sizing requires load validation.</td></tr>
<tr><td>NFR-AVAIL-01</td><td>Public verification/completion shall target 99.9% monthly availability excluding scheduled maintenance.</td></tr>
<tr><td>NFR-REC-01</td><td>A successful acceptance shall be durable; artifact creation shall be recoverable by reconciliation.</td></tr>
<tr><td>NFR-SEC-01</td><td>All traffic shall use TLS; secrets/raw tokens shall never be exposed to client logs or analytics.</td></tr>
<tr><td>NFR-SEC-02</td><td>Dependencies shall be patched/scanned according to platform SDLC policy.</td></tr>
<tr><td>NFR-A11Y-01</td><td>Public flow shall meet WCAG 2.1 AA for keyboard, labels, contrast, focus and error recovery.</td></tr>
<tr><td>NFR-COMP-01</td><td>Current and previous major Chrome, Safari, Firefox and Edge are supported, including iOS Safari and Android Chrome.</td></tr>
<tr><td>NFR-RESP-01</td><td>Public and therapist views shall remain usable from 320 px to 2560 px.</td></tr>
<tr><td>NFR-LOC-01</td><td>UI text shall be externalized; Agreement Revision shall identify content language.</td></tr>
<tr><td>NFR-OBS-01</td><td>Metrics shall cover generation, open, OTP, verification, acceptance, expiry, document generation and latency.</td></tr>
<tr><td>NFR-OBS-02</td><td>Correlation ID shall flow across API, email, worker and audit events.</td></tr>
<tr><td>NFR-PRIV-01</td><td>Sensitive analytics shall exclude body, typed name, full email, token and OTP.</td></tr>
<tr><td>NFR-MAIN-01</td><td>Template schema/renderer shall be versioned so historical revisions remain renderable.</td></tr>
<tr><td>NFR-BACKUP-01</td><td>Backup and restore shall preserve agreement, response, document index, artifact and audit referential integrity.</td></tr>
</table>

Information Agreement • v1.0 • Page 32

## Page 33

SOLO .BIZZ / PRODUCT SPECIFICATION

# 13. Error and Edge-Case Catalogue

<table>
<tr><th>ID</th><th>Condition</th><th>Expected behavior</th></tr>
<tr><td>EC-01</td><td>No starter/Active template</td><td>Block agreement creation and direct therapist to Settings; create no empty record.</td></tr>
<tr><td>EC-02</td><td>Unsafe or unsupported markup</td><td>Sanitize or block save/activation with exact error; never render executable content.</td></tr>
<tr><td>EC-03</td><td>Required placeholder source is missing</td><td>Show therapist validation and block Ready/Sent.</td></tr>
<tr><td>EC-04</td><td>Client email missing/malformed</td><td>Block invitation generation.</td></tr>
<tr><td>EC-05</td><td>Client email changes after copy</td><td>Invalidate invitation; client receives neutral unavailable page.</td></tr>
<tr><td>EC-06</td><td>Token unknown or tampered</td><td>Neutral unavailable page and throttled security event.</td></tr>
<tr><td>EC-07</td><td>Token binding conflicts with tenant/client</td><td>Fail closed; never search fallback agreements.</td></tr>
<tr><td>EC-08</td><td>Invitation expired/revoked/superseded</td><td>No OTP or agreement body; contact-therapist instruction.</td></tr>
<tr><td>EC-09</td><td>OTP provider unavailable</td><td>Safe error and retry after cooldown; no content disclosure.</td></tr>
<tr><td>EC-10</td><td>Multiple OTP requests</td><td>Only latest code valid; rate limits applied.</td></tr>
<tr><td>EC-11</td><td>Browser refresh after verification</td><td>Keep valid scoped session or require re-verification.</td></tr>
<tr><td>EC-12</td><td>Network lost during completion</td><td>Preserve current-browser state where possible; safe retry.</td></tr>
<tr><td>EC-13</td><td>Therapist revokes while page open</td><td>Next fetch/submit fails safely; no acceptance committed.</td></tr>
<tr><td>EC-14</td><td>Template archived after instance creation</td><td>Existing agreement remains valid using snapshot.</td></tr>
<tr><td>EC-15</td><td>Two authorized therapists access same client</td><td>Apply existing ownership/team rules and audit actual actor.</td></tr>
<tr><td>EC-16</td><td>Two submit requests</td><td>First commits; second reuses existing result.</td></tr>
<tr><td>EC-17</td><td>Document generation fails</td><td>Agreement remains Accepted; Processing/Failed visible; reconciliation retries.</td></tr>
<tr><td>EC-18</td><td>Integrity hash mismatch</td><td>Flag/block artifact, record event and alert; do not silently present as valid.</td></tr>
<tr><td>EC-19</td><td>Client archived with active invitation</td><td>Invalidate active invitation by default; accepted history follows archive permissions.</td></tr>
<tr><td>EC-20</td><td>Unsupported locale/timezone</td><td>Use tenant default with explicit timezone; store UTC.</td></tr>
<tr><td>EC-21</td><td>Therapist loses permission while editing</td><td>Next save/share fails; local UI clears sensitive content after response.</td></tr>
<tr><td>EC-22</td><td>Draft conflict from two tabs</td><td>Reject stale update with conflict and offer reload; never silently overwrite.</td></tr>
</table>

Information Agreement • v1.0 • Page 33

## Page 34

SOLO .BIZZ / PRODUCT SPECIFICATION



<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Formal requirement</b></p>
    </th>
    <th>
      <p><b>Context / verification</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-019</p>
    </td>
    <td>
      <p>The system shall invalidate all non-terminal invitations associated with an old primary client email when that email changes.</p>
    </td>
    <td>
      <p>Event-driven or transactional invalidation.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-LNK-020</p>
    </td>
    <td>
      <p>The system shall allow regeneration only by creating a new invitation token.</p>
    </td>
    <td>
      <p>Terminal tokens are never reactivated.</p>
    </td>
  </tr>
</table>




Information Agreement • v1.0 • Page 34

## Page 35

# 14. Acceptance Criteria and Test Coverage

## 14.1 Given / When / Then Acceptance


<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Formal requirement</b></p>
    </th>
    <th>
      <p><b>Context / verification</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-001</p>
    </td>
    <td>
      <p>The system shall display the agreement only after a valid agreement-scoped session is established.</p>
    </td>
    <td>
      <p>Pre-verification page has no body.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-002</p>
    </td>
    <td>
      <p>The system shall render the exact frozen Agreement Revision, not the current Template Version.</p>
    </td>
    <td>
      <p>Integrity requirement.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-003</p>
    </td>
    <td>
      <p>The system shall render informational marks as content and configured form controls as native accessible inputs.</p>
    </td>
    <td>
      <p>No ambiguous checkboxes.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-004</p>
    </td>
    <td>
      <p>The system shall visibly and programmatically identify mandatory and optional inputs.</p>
    </td>
    <td>
      <p>Accessibility.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-005</p>
    </td>
    <td>
      <p>The system shall require every mandatory acknowledgement before submission.</p>
    </td>
    <td>
      <p>Client and server validation.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-006</p>
    </td>
    <td>
      <p>The system shall require client full name, trim surrounding whitespace and preserve the submitted internal characters.</p>
    </td>
    <td>
      <p>Typed acceptance.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-007</p>
    </td>
    <td>
      <p>The system shall display therapist identity and system-generated date/time as read-only values.</p>
    </td>
    <td>
      <p>Date is not manually entered.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-008</p>
    </td>
    <td>
      <p>The system shall keep the submit action disabled until client-side required conditions are met.</p>
    </td>
    <td>
      <p>Server remains authoritative.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-009</p>
    </td>
    <td>
      <p>The system shall show field-level errors and focus the first invalid control after failed submit.</p>
    </td>
    <td>
      <p>Accessible recovery.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-010</p>
    </td>
    <td>
      <p>The system shall retain current-browser progress during ordinary navigation/temporary network failure where technically possible.</p>
    </td>
    <td>
      <p>No cross-device promise in MVP.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-011</p>
    </td>
    <td>
      <p>The system shall revalidate invitation, session, revision and agreement state immediately before acceptance.</p>
    </td>
    <td>
      <p>Prevent stale submit.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-012</p>
    </td>
    <td>
      <p>The system shall commit one atomic acceptance transaction containing responses, typed name, UTC timestamp, verification reference and snapshot hash.</p>
    </td>
    <td>
      <p>All-or-nothing.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-013</p>
    </td>
    <td>
      <p>The system shall make acceptance idempotent for repeated requests with the same idempotency key.</p>
    </td>
    <td>
      <p>No duplicate document.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-014</p>
    </td>
    <td>
      <p>The system shall show a safe confirmation page after successful acceptance.</p>
    </td>
    <td>
      <p>No other client data.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-015</p>
    </td>
    <td>
      <p>The system shall invalidate the invitation and verified session immediately after acceptance.</p>
    </td>
    <td>
      <p>Prevent modification/resubmission.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-016</p>
    </td>
    <td>
      <p>The system shall not describe the MVP action as a qualified electronic signature.</p>
    </td>
    <td>
      <p>Proposed button: Accept and submit.</p>
    </td>
  </tr>
</table>

## Page 36

SOLO .BIZZ / PRODUCT SPECIFICATION

<table>
<tr><th>ID</th><th>Acceptance criterion</th></tr>
<tr><td>AC-17</td><td>Given all required inputs, when the client submits, then the agreement atomically becomes Accepted and one response/evidence record is stored.</td></tr>
<tr><td>AC-18</td><td>Given the same acceptance request is retried with the same idempotency key, then the existing Accepted result is returned and no second document is created.</td></tr>
<tr><td>AC-19</td><td>Given acceptance succeeded, when the old invitation opens, then it is unavailable and no content is shown.</td></tr>
<tr><td>AC-20</td><td>Given an Accepted agreement, when Client Documents opens, then Information Agreement is listed under the correct client and is read-only.</td></tr>
<tr><td>AC-21</td><td>Given the master template later changes, when the accepted document is viewed, then content and hash remain unchanged.</td></tr>
<tr><td>AC-22</td><td>Given a Sent agreement, when Edit is confirmed, then the invitation is revoked and a new Draft revision is created.</td></tr>
<tr><td>AC-23</td><td>Given a revoked/expired token, when opened, then the same neutral unavailable page is shown as for an unknown token.</td></tr>
<tr><td>AC-24</td><td>Given the client email changes, when an old invitation is used, then it is rejected and a new link is required.</td></tr>
<tr><td>AC-25</td><td>Given document generation fails after acceptance, when the therapist views the record, then Accepted remains true and Processing/Failed is shown until retry succeeds.</td></tr>
<tr><td>AC-26</td><td>Given a therapist in another tenant, when an agreement/document ID is requested, then the system returns unauthorized/not found without disclosure.</td></tr>
<tr><td>AC-27</td><td>Given a 320 px mobile viewport, when the client completes the agreement, then content and controls are usable without horizontal scrolling.</td></tr>
<tr><td>AC-28</td><td>Given keyboard-only navigation, when the flow is completed, then focus, labels, errors, OTP and submit are fully operable.</td></tr>
<tr><td>AC-29</td><td>Given a lifecycle transition, when it completes, then one audit event records actor, prior/new state, UTC time and correlation ID without secrets/body.</td></tr>
<tr><td>AC-30</td><td>Given an integrity mismatch, when the accepted artifact is retrieved, then the system flags it, records an event and does not silently present it as valid.</td></tr>
<tr><td>AC-31</td><td>Given two therapist tabs edit the same Draft, when the stale tab saves, then a conflict is returned and newer data is not overwritten.</td></tr>
<tr><td>AC-32</td><td>Given Clipboard API is denied, when Copy is selected, then a manual-copy fallback is shown and no duplicate invitation is created.</td></tr>
<tr><td>AC-33</td><td>Given link generation is retried with the same idempotency key, then the same active invitation is returned.</td></tr>
<tr><td>AC-34</td><td>Given the invitation is revoked while the client form is open, when submit occurs, then acceptance is rejected and no response record is committed.</td></tr>
</table>

Information Agreement • v1.0 • Page 36

## Page 37

SOLO .BIZZ / PRODUCT SPECIFICATION

<table>
    <tr>
        <th>ID</th>
        <th>Acceptance criterion</th>
    </tr>
    <tr>
        <td>AC-35</td>
        <td>Given support role without privileged body access, when document body is requested, then access is denied and the attempt is audited.</td>
    </tr>
</table>

<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Formal requirement</b></p>
    </th>
    <th>
      <p><b>Context / verification</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-017</p>
    </td>
    <td>
      <p>The system shall reject a response containing unknown or duplicated field IDs.</p>
    </td>
    <td>
      <p>Prevent parameter injection.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-018</p>
    </td>
    <td>
      <p>The system shall preserve the exact label and required state of each answered control in the acceptance snapshot.</p>
    </td>
    <td>
      <p>Future template edits cannot change evidence.</p>
    </td>
  </tr>
</table>



## 14.2 UAT Entry and Exit

<table>
    <tr>
        <th>Stage</th>
        <th>Criteria</th>
    </tr>
    <tr>
        <td>Entry</td>
        <td>Approved UX, stable starter content, legal/privacy review underway, email sandbox, seeded test tenant/client data, stable environment and audit visibility for QA.</td>
    </tr>
    <tr>
        <td>Exit</td>
        <td>All Critical/High criteria pass; zero cross-tenant/client defects; critical accessibility issues resolved; recovery/idempotency verified; monitoring ready; Product, Security, Privacy and Legal approvals recorded.</td>
    </tr>
</table>

<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Formal requirement</b></p>
    </th>
    <th>
      <p><b>Context / verification</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-017</p>
    </td>
    <td>
      <p>The system shall reject a response containing unknown or duplicated field IDs.</p>
    </td>
    <td>
      <p>Prevent parameter injection.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-FRM-018</p>
    </td>
    <td>
      <p>The system shall preserve the exact label and required state of each answered control in the acceptance snapshot.</p>
    </td>
    <td>
      <p>Future template edits cannot change evidence.</p>
    </td>
  </tr>
</table>



## 14.3 Required Test Suites

<table>
    <tr>
        <th>Suite</th>
        <th>Coverage</th>
    </tr>
    <tr>
        <td>Unit</td>
        <td>Template validation, state machine, token/OTP hashing, expiry, canonical hashes and placeholder resolution.</td>
    </tr>
    <tr>
        <td>API</td>
        <td>Authorization, idempotency, concurrency, state validation, unknown fields, cross-client and cross-tenant negative tests.</td>
    </tr>
    <tr>
        <td>Integration</td>
        <td>Email provider success/failure/retry, worker expiry, document generation and reconciliation.</td>
    </tr>
    <tr>
        <td>UI</td>
        <td>Settings editor, Client Card actions, public OTP/form, validation, read-only document and error states.</td>
    </tr>
    <tr>
        <td>Security</td>
        <td>Enumeration, token replay, OTP brute force, object authorization, injection, log/analytics secret scanning and session scope.</td>
    </tr>
    <tr>
        <td>Accessibility</td>
        <td>Keyboard, screen reader labels, focus, contrast, zoom/reflow and error recovery.</td>
    </tr>
    <tr>
        <td>Compatibility</td>
        <td>Supported desktop/mobile browsers, different viewport sizes and interrupted networks.</td>
    </tr>
    <tr>
        <td>Regression</td>
        <td>Client permissions, email edits, archive/delete, Documents list, localization and timezones.</td>
    </tr>
</table>

<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Formal requirement</b></p>
    </th>
    <th>
      <p><b>Context / verification</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>FR-DOC-001</p>
    </td>
    <td>
      <p>The system shall generate an immutable human-readable Accepted Document from the accepted snapshot and responses.</p>
    </td>
    <td>
      <p>HTML record required; PDF is Phase 1.1.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-DOC-002</p>
    </td>
    <td>
      <p>The system shall store the Accepted Document under the same client_id as the Agreement Instance.</p>
    </td>
    <td>
      <p>No manual reassignment.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-DOC-003</p>
    </td>
    <td>
      <p>The system shall list the document under Client Card → Documents with type Information Agreement.</p>
    </td>
    <td>
      <p>Status Accepted.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-DOC-004</p>
    </td>
    <td>
      <p>The system shall show revision, template version, accepted date/time, therapist and client display name in the therapist view.</p>
    </td>
    <td>
      <p>Metadata header.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-DOC-005</p>
    </td>
    <td>
      <p>The system shall provide a read-only view that preserves content, checked acknowledgements and typed name.</p>
    </td>
    <td>
      <p>No edit action.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-DOC-006</p>
    </td>
    <td>
      <p>The system shall verify stored integrity hash when an accepted document is retrieved or exported.</p>
    </td>
    <td>
      <p>Mismatch is a security event.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-DOC-007</p>
    </td>
    <td>
      <p>The system shall update agreement status in Client Card without requiring a manual hard refresh.</p>
    </td>
    <td>
      <p>Polling/event delivery is an implementation choice.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-DOC-008</p>
    </td>
    <td>
      <p>The system shall show an in-app success indicator when the agreement becomes Accepted.</p>
    </td>
    <td>
      <p>Email notification not required in MVP.</p>
    </td>
  </tr>
</table>




Information Agreement • v1.0 • Page 37
</page_number>

## Page 38

SOLO .BIZZ / PRODUCT SPECIFICATION

# 15. Traceability Matrix


<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Formal requirement</b></p>
    </th>
    <th>
      <p><b>Context / verification</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>FR-DOC-009</p>
    </td>
    <td>
      <p>The system shall retry asynchronous document generation idempotently and expose Processing/Failed states.</p>
    </td>
    <td>
      <p>Acceptance is not rolled back.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-DOC-010</p>
    </td>
    <td>
      <p>The system shall preserve accepted content when template or client profile values later change.</p>
    </td>
    <td>
      <p>Snapshot semantics.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-DOC-011</p>
    </td>
    <td>
      <p>The system shall sort agreement/document list by most recently updated by default.</p>
    </td>
    <td>
      <p>Existing Documents sorting may be reused.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-DOC-012</p>
    </td>
    <td>
      <p>The system shall display activity timestamps using the therapist locale and explicit timezone.</p>
    </td>
    <td>
      <p>Stored canonical value remains UTC.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AUD-001</p>
    </td>
    <td>
      <p>The system shall append an immutable audit event for every lifecycle/security-relevant action.</p>
    </td>
    <td>
      <p>Append-only business audit.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AUD-002</p>
    </td>
    <td>
      <p>The system shall record actor type/id, tenant, client, agreement, revision, event, UTC time, correlation ID, outcome and safe metadata.</p>
    </td>
    <td>
      <p>Standard schema.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AUD-003</p>
    </td>
    <td>
      <p>The system shall never store raw OTP, raw invitation token or agreement body in operational logs.</p>
    </td>
    <td>
      <p>Sensitive-value prohibition.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AUD-004</p>
    </td>
    <td>
      <p>The system shall distinguish therapist, client-session, admin and service actors.</p>
    </td>
    <td>
      <p>Responsibility traceability.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AUD-005</p>
    </td>
    <td>
      <p>The system shall record previous and new status for every lifecycle transition.</p>
    </td>
    <td>
      <p>Status history.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AUD-006</p>
    </td>
    <td>
      <p>The system shall make audit metadata queryable by agreement/client for authorized investigation.</p>
    </td>
    <td>
      <p>Restricted access.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AUD-007</p>
    </td>
    <td>
      <p>The system shall record privileged support access to agreement metadata or body, if such access is enabled.</p>
    </td>
    <td>
      <p>Default is no body access.</p>
    </td>
  </tr>
</table>

## Page 39

SOLO .BIZZ / PRODUCT SPECIFICATION

# 16. Delivery Breakdown

<table>
<tr><th>Feature</th><th>Work package</th><th>Owner profile</th><th>Deliverable</th><th>Dependency</th></tr>
<tr><td>F01</td><td>Template data model and starter seed</td><td>BE/Data</td><td>Schema, migration, seed and status rules</td><td>—</td></tr>
<tr><td>F02</td><td>Settings template overview</td><td>FE/BE</td><td>Navigation, cards, history and permissions</td><td>F01</td></tr>
<tr><td>F03</td><td>Structured template editor</td><td>FE/BE</td><td>Block schema, controls, placeholders, sanitization and autosave</td><td>F01</td></tr>
<tr><td>F04</td><td>Preview and activation</td><td>FE/BE/QA</td><td>Renderer, validation, activate/archive/versioning</td><td>F02–F03</td></tr>
<tr><td>F05</td><td>Agreement instance model</td><td>BE/Data</td><td>Agreement/ revision, snapshot/hash and state machine</td><td>F01</td></tr>
<tr><td>F06</td><td>Client Card Agreements UI</td><td>FE/BE</td><td>Create/list/ status/actions/ permissions</td><td>F05</td></tr>
<tr><td>F07</td><td>Client-specific editor</td><td>FE/BE</td><td>Overrides, preview, freeze and revoke-on- edit</td><td>F03, F05</td></tr>
<tr><td>F08</td><td>Secure invitation service</td><td>BE/Security</td><td>Token/hash/ binding/expiry/ revoke/rate limit</td><td>F05</td></tr>
<tr><td>F09</td><td>OTP integration</td><td>BE/Integration</td><td>Challenge, email, cooldown, attempts and lockout</td><td>F08</td></tr>
<tr><td>F10</td><td>Public verification gate</td><td>FE/BE</td><td>Safe token status, masked email, OTP and scoped session</td><td>F08–F09</td></tr>
<tr><td>F11</td><td>Interactive client agreement</td><td>FE/BE</td><td>Frozen renderer, controls, validation, responsive/a11y</td><td>F03, F10</td></tr>
<tr><td>F12</td><td>Atomic acceptance</td><td>BE/Data/Security</td><td>Idempotency, evidence, hashes and session invalidation</td><td>F11</td></tr>
<tr><td>F13</td><td>Client Documents integration</td><td>BE/FE</td><td>Accepted artifact, list/view and processing states</td><td>F12</td></tr>
<tr><td>F14</td><td>Audit and observability</td><td>BE/DevOps</td><td>Events, metrics, correlation, dashboards and alerts</td><td>All</td></tr>
<tr><td>F15</td><td>Automated and regression tests</td><td>QA</td><td>API/UI/security/ accessibility/ concurrency coverage</td><td>F01–F14</td></tr>
</table>

Information Agreement • v1.0 • Page 39

## Page 40

SOLO .BIZZ / PRODUCT SPECIFICATION



<table>
  <tr>
    <th>
      <p><b>ID</b></p>
    </th>
    <th>
      <p><b>Formal requirement</b></p>
    </th>
    <th>
      <p><b>Context / verification</b></p>
    </th>
  </tr>
  <tr>
    <td>
      <p>FR-AUD-003</p>
    </td>
    <td>
      <p>The system shall never store raw OTP, raw invitation token or agreement body in operational logs.</p>
    </td>
    <td>
      <p>Sensitive-value prohibition.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AUD-004</p>
    </td>
    <td>
      <p>The system shall distinguish therapist, client-session, admin and service actors.</p>
    </td>
    <td>
      <p>Responsibility traceability.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AUD-005</p>
    </td>
    <td>
      <p>The system shall record previous and new status for every lifecycle transition.</p>
    </td>
    <td>
      <p>Status history.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AUD-006</p>
    </td>
    <td>
      <p>The system shall make audit metadata queryable by agreement/client for authorized investigation.</p>
    </td>
    <td>
      <p>Restricted access.</p>
    </td>
  </tr>
  <tr>
    <td>
      <p>FR-AUD-007</p>
    </td>
    <td>
      <p>The system shall record privileged support access to agreement metadata or body, if such access is enabled.</p>
    </td>
    <td>
      <p>Default is no body access.</p>
    </td>
  </tr>
</table>



## 16.1 Suggested Sequence
1. Foundation: F01, F05, threat model and retention decision.
2. Therapist configuration: F02–F04.
3. Client instance: F06–F07.
4. Secure access: F08–F10.
5. Completion and evidence: F11–F13.
6. Cross-cutting hardening: F14–F16, UAT and release gate.

## 16.2 Definition of Done
* Approved desktop/mobile UX and all specified states are implemented.
* Requirements and criteria are traced to manual/automated tests.
* No Critical/High security finding remains.
* Cross-tenant and cross-client negative tests pass.
* Audit/metrics contain no raw token, OTP or agreement body.
* Migration/seed are tested and rollback-ready.
* Legal/privacy decisions are recorded for wording, acceptance and retention.
* Runbook covers email outage, document generation failure, lockout/abuse and support investigation.

## Page 41

SOLO .BIZZ / PRODUCT SPECIFICATION

# 17. Open Questions and Decision Log

<table>
<tr><th>ID</th><th>Decision/ question</th><th>Recommendation</th><th>Owner</th><th>Status</th></tr>
<tr><td>DQ-01</td><td>Is email OTP the approved MVP verification method?</td><td>Yes. A copied URL alone cannot enforce non-transferable access.</td><td>Product + Security</td><td>Open / blocking</td></tr>
<tr><td>DQ-02</td><td>What is invitation lifetime?</td><td>Seven days by default.</td><td>Product</td><td>Confirm</td></tr>
<tr><td>DQ-03</td><td>Is in-platform invitation email MVP?</td><td>No. Copy link is still mandatory.</td><td>Product</td><td>Assumed</td></tr>
<tr><td>DQ-04</td><td>May multiple therapists share one client?</td><td>Reuse existing permission model; confirm team rules.</td><td>Product + Security</td><td>Open</td></tr>
<tr><td>DQ-05</td><td>What accepted-document retention applies by country?</td><td>Legal/privacy decision before production.</td><td>Legal/Privacy</td><td>Open / blocking</td></tr>
<tr><td>DQ-06</td><td>Is checkbox + typed name + OTP legally sufficient?</td><td>Treat as electronic acceptance evidence, not qualified signature.</td><td>Legal</td><td>Open / blocking</td></tr>
<tr><td>DQ-07</td><td>Should the client be able to decline?</td><td>Add explicit Decline in Phase 1.1 if approved.</td><td>Product</td><td>Open</td></tr>
<tr><td>DQ-08</td><td>Should the client receive a PDF/receipt?</td><td>Phase 1.1 after secure delivery decision.</td><td>Product/Privacy</td><td>Open</td></tr>
<tr><td>DQ-09</td><td>Is server-side progress saving MVP?</td><td>No; guarantee only current-browser recovery.</td><td>Product</td><td>Open</td></tr>
<tr><td>DQ-10</td><td>Are guardian/multi-party agreements required?</td><td>Separate future feature and consent model.</td><td>Product/Legal</td><td>Future</td></tr>
</table>

Information Agreement • v1.0 • Page 41

## Page 42

SOLO .BIZZ / PRODUCT SPECIFICATION

# 18. Appendix — Corrections to the Initial Diagram

<table>
<tr><th>Initial/prototype element</th><th>Required correction</th></tr>
<tr><td>Go to Client card → Configure agreement</td><td>Reusable configuration moves to Settings. Client Card creates/customizes the client instance.</td></tr>
<tr><td>Save Information agreement</td><td>Distinguish Save Draft, Activate Template Version and Save Client Draft.</td></tr>
<tr><td>Send onboarding link</td><td>Use Create Agreement → Freeze Revision → Create client-bound invitation → Copy secure link.</td></tr>
<tr><td>Share link with Agreement</td><td>Link opens a verification gate, not a publicly shared agreement.</td></tr>
<tr><td>Client fill in information</td><td>Client first verifies email, then completes configured controls and typed acceptance.</td></tr>
<tr><td>System stores data on the document</td><td>Persist response/evidence atomically, create immutable document, attach to correct client and audit.</td></tr>
<tr><td>Psychologist opens view mode</td><td>Read-only view with version, status, integrity and permission checks.</td></tr>
<tr><td>Checkbox symbols in prototype</td><td>Intended acknowledgements become real controls; decorative/informational marks remain content.</td></tr>
<tr><td>Manual signature/date lines</td><td>Use typed acceptance name and server timestamp; do not claim qualified electronic signature.</td></tr>
</table>

> **Final product rule: one client, one agreement, one secure access scope.** A client-specific invitation may never open, update, complete or store an agreement for another client, even if URL parameters are changed, an old token is reused, a second tab is opened or the request comes from another tenant. This is enforced server-side and covered by automated negative tests.

Information Agreement • v1.0 • Page 42


### Extracted images (45):
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/img_p8_1.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/img_p9_1.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/img_p9_2.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_1.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_10.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_11.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_12.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_13.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_14.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_15.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_16.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_17.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_18.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_19.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_2.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_20.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_21.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_22.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_23.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_24.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_25.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_26.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_27.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_28.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_29.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_3.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_30.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_31.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_32.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_33.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_34.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_35.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_36.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_37.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_38.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_39.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_4.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_40.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_41.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_42.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_5.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_6.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_7.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_8.jpg`
- `parsed-documents://20260720-131733-544852/Solo_Bizz_Information_Agreement_Functional_Specification_v1.0.docx/images/page_9.jpg`