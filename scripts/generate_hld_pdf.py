#!/usr/bin/env python3
"""
Astalakshimi High-Level Design (HLD) & Codebase Audit PDF Generator
Generates a publication-grade, professional architecture & audit document.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas

# ----------------------------------------------------------------------
# Numbered Canvas for Running Headers & Footers
# ----------------------------------------------------------------------
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        # Skip header and footer on cover page (page 1)
        if self._pageNumber == 1:
            return

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Running Header
        header_text = "ASTALAKSHIMI MATRIMONY — HIGH-LEVEL DESIGN & CODEBASE AUDIT"
        self.drawString(40, 752, header_text)
        self.drawRightString(572, 752, "CONFIDENTIAL & PROPRIETARY")

        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(40, 744, 572, 744)

        # Running Footer
        self.line(40, 42, 572, 42)
        footer_left = "Architecture Review & Engineering Due Diligence"
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawString(40, 30, footer_left)
        self.drawRightString(572, 30, page_str)

        self.restoreState()


# ----------------------------------------------------------------------
# Styles Setup
# ----------------------------------------------------------------------
def setup_styles():
    styles = getSampleStyleSheet()

    PRIMARY = colors.HexColor("#7C1535")   # Deep Burgundy / Vermilion
    SECONDARY = colors.HexColor("#B8901F") # Royal Gold
    DARK = colors.HexColor("#0F172A")      # Slate 900
    BODY = colors.HexColor("#1E293B")      # Slate 800
    MUTED = colors.HexColor("#64748B")     # Slate 500

    styles.add(ParagraphStyle(
        name="CoverTitle",
        fontName="Helvetica-Bold",
        fontSize=26,
        leading=32,
        textColor=PRIMARY,
        alignment=TA_LEFT,
    ))

    styles.add(ParagraphStyle(
        name="CoverSubtitle",
        fontName="Helvetica",
        fontSize=12,
        leading=16,
        textColor=SECONDARY,
        alignment=TA_LEFT,
    ))

    styles.add(ParagraphStyle(
        name="DocH1",
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    ))

    styles.add(ParagraphStyle(
        name="DocH2",
        fontName="Helvetica-Bold",
        fontSize=11.5,
        leading=15,
        textColor=DARK,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    ))

    styles.add(ParagraphStyle(
        name="DocH3",
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=13,
        textColor=SECONDARY,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True,
    ))

    styles.add(ParagraphStyle(
        name="DocBody",
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=BODY,
        spaceAfter=4,
        alignment=TA_LEFT,
    ))

    styles.add(ParagraphStyle(
        name="DocBodyBold",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=BODY,
        spaceAfter=3,
    ))

    styles.add(ParagraphStyle(
        name="DocBullet",
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=BODY,
        leftIndent=10,
        firstLineIndent=-6,
        spaceAfter=2.5,
    ))

    styles.add(ParagraphStyle(
        name="TableCell",
        fontName="Helvetica",
        fontSize=7,
        leading=9,
        textColor=BODY,
    ))

    styles.add(ParagraphStyle(
        name="TableCellBold",
        fontName="Helvetica-Bold",
        fontSize=7,
        leading=9,
        textColor=BODY,
    ))

    styles.add(ParagraphStyle(
        name="TableHeader",
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.white,
        alignment=TA_LEFT,
    ))

    styles.add(ParagraphStyle(
        name="CalloutText",
        fontName="Helvetica",
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#334155"),
    ))

    styles.add(ParagraphStyle(
        name="FlowStep",
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10,
        textColor=PRIMARY,
        alignment=TA_CENTER,
    ))

    return styles

def build_pdf(filename):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=48,
        bottomMargin=48,
    )

    styles = setup_styles()
    story = []

    # Colors
    PRIMARY = colors.HexColor("#7C1535")
    SECONDARY = colors.HexColor("#B8901F")
    DARK = colors.HexColor("#0F172A")
    ACCENT_BG = colors.HexColor("#FFF9F2")
    CARD_BG = colors.HexColor("#F8FAFC")
    BORDER_COLOR = colors.HexColor("#E2E8F0")
    ALERT_BG = colors.HexColor("#FEF2F2")
    SUCCESS_BG = colors.HexColor("#F0FDF4")

    # =========================================================================
    # 1. COVER PAGE
    # =========================================================================
    story.append(Spacer(1, 30))
    story.append(Paragraph("ASTALAKSHIMI MATRIMONY", ParagraphStyle("CoverSuper", fontName="Helvetica-Bold", fontSize=11, leading=15, textColor=SECONDARY, spaceAfter=6)))
    story.append(Paragraph("High-Level Design (HLD) & Codebase Architecture Audit", styles["CoverTitle"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Comprehensive Architectural Due Diligence, End-to-End Feature Tracing, Technical Debt Audit & Production Readiness Roadmap", styles["CoverSubtitle"]))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2.5, color=PRIMARY, spaceAfter=18, spaceBefore=4))

    # Executive Overview Box
    exec_summary_text = (
        "<b>Executive Summary:</b> Astalakshimi is an enterprise South Indian matrimony platform engineered with a modern "
        "TypeScript monorepo architecture (pnpm workspaces + Turborepo). The system comprises a Next.js 15 App Router web "
        "frontend with a Backend-for-Frontend (BFF) HTTP-only cookie proxy, a modular NestJS 10 REST API backend, a PostgreSQL RDS "
        "database managed via Drizzle ORM (18 relational schemas), and dual-tier AWS S3 storage (public media and private verification vault). "
        "This High-Level Design document represents an exhaustive, evidence-based architectural audit of the active codebase, mapping every "
        "concrete feature, request lifecycle, dataflow, API endpoint, entity relationship, security vulnerability, and technical debt item."
    )
    exec_table = Table([[Paragraph(exec_summary_text, styles["CalloutText"])]], colWidths=[532])
    exec_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), ACCENT_BG),
        ('BOX', (0,0), (-1,-1), 1, SECONDARY),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(exec_table)
    story.append(Spacer(1, 15))

    # Metadata Grid
    meta_data = [
        [
            Paragraph("<b>Target Application:</b> Astalakshimi Platform", styles["TableCellBold"]),
            Paragraph("<b>Monorepo Root:</b> /Users/karikalanloganathan/Desktop/Astalakshimi", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Architecture Pattern:</b> Monorepo (Next.js + NestJS + Drizzle)", styles["TableCellBold"]),
            Paragraph("<b>Database:</b> PostgreSQL 16 (AWS RDS) via Drizzle ORM", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Frontend Framework:</b> Next.js 15 (App Router, Tailwind, TanStack Query)", styles["TableCellBold"]),
            Paragraph("<b>Backend API:</b> NestJS 10 (TypeScript, Passport JWT, Zod)", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Object Storage:</b> AWS S3 (Dual-Bucket: Media + Vault) + CloudFront", styles["TableCellBold"]),
            Paragraph("<b>Payment Gateway:</b> Razorpay (Orders & HMAC Signature Verification)", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Document Version:</b> 2.0 (Deep Codebase Audit)", styles["TableCellBold"]),
            Paragraph("<b>Audit Date:</b> August 2026", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Audited By:</b> Senior Principal Software Architect & Codebase Auditor", styles["TableCellBold"]),
            Paragraph("<b>Classification:</b> Confidential / Engineering Blueprint", styles["TableCellBold"]),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[266, 266])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CARD_BG),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(meta_table)

    story.append(Spacer(1, 18))
    story.append(Paragraph("<b>Table of Contents Overview:</b>", styles["DocH3"]))
    toc_data = [
        [
            Paragraph("1. Technology Stack Inventory & Monorepo Map<br/>2. System Architecture & Request Lifecycle<br/>3. Master Feature Matrix & Domain Inventory<br/>4. Deep Feature-by-Feature Technical Workflows<br/>5. Master API Inventory Table (35+ Endpoints)<br/>6. Database Architecture & ER Schema Specifications", styles["TableCell"]),
            Paragraph("7. Authentication, Authorization & Security Audit<br/>8. Frontend State & Component Architecture<br/>9. Backend Modular Architecture & Service Design<br/>10. Redundant, Dead & Duplicate Code Audit<br/>11. Architecture Gap Analysis (Specs vs Reality)<br/>12. Bottleneck Analysis & Actionable Roadmap", styles["TableCell"]),
        ]
    ]
    toc_table = Table(toc_data, colWidths=[266, 266])
    toc_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.white),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('PADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(toc_table)

    story.append(PageBreak())

    # =========================================================================
    # 2. TECHNOLOGY STACK & MONOREPO TOPOGRAPHY
    # =========================================================================
    story.append(Paragraph("1. Technology Stack Inventory & Monorepo Topography", styles["DocH1"]))
    story.append(Paragraph(
        "Astalakshimi is structured as a pnpm multi-package workspace managed by Turborepo. "
        "The codebase is divided into two runnable application packages (`apps/`) and five shared internal packages (`packages/`), "
        "supported by infrastructure and specification files.",
        styles["DocBody"]
    ))

    tech_stack_data = [
        [Paragraph("Layer", styles["TableHeader"]), Paragraph("Technology", styles["TableHeader"]), Paragraph("Active Path / Package", styles["TableHeader"]), Paragraph("Architectural Role & Scope", styles["TableHeader"])],
        [
            Paragraph("<b>Monorepo</b>", styles["TableCellBold"]),
            Paragraph("pnpm workspaces + Turborepo", styles["TableCell"]),
            Paragraph("Root: package.json, turbo.json", styles["TableCell"]),
            Paragraph("Workspace orchestration, build caching, dependency deduplication.", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Frontend App</b>", styles["TableCellBold"]),
            Paragraph("Next.js 15 (App Router), React 19, TypeScript", styles["TableCell"]),
            Paragraph("apps/web (`@astalakshimi/web`)", styles["TableCell"]),
            Paragraph("UI rendering, route groups, server-side data fetching, BFF cookie proxy.", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Styling & UI</b>", styles["TableCellBold"]),
            Paragraph("Tailwind CSS v4, Radix UI, Framer Motion", styles["TableCell"]),
            Paragraph("apps/web/src/components/ui", styles["TableCell"]),
            Paragraph("Accessible UI primitives, South Indian royal theme tokens, micro-animations.", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Client State</b>", styles["TableCellBold"]),
            Paragraph("TanStack Query (React Query v5)", styles["TableCell"]),
            Paragraph("apps/web/src/hooks/queries.ts", styles["TableCell"]),
            Paragraph("Server state synchronization, query caching, optimistic UI updates.", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Backend API</b>", styles["TableCellBold"]),
            Paragraph("NestJS 10, Express, Passport JWT", styles["TableCell"]),
            Paragraph("apps/api (`@astalakshimi/api`)", styles["TableCell"]),
            Paragraph("Core domain logic, REST controllers, guards, filters, transaction boundaries.", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Database ORM</b>", styles["TableCellBold"]),
            Paragraph("Drizzle ORM + postgres-js", styles["TableCell"]),
            Paragraph("packages/database (`@astalakshimi/database`)", styles["TableCell"]),
            Paragraph("18 SQL schemas, Drizzle Kit migrations, type-safe query builder.", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Database</b>", styles["TableCellBold"]),
            Paragraph("PostgreSQL 16 (AWS RDS)", styles["TableCell"]),
            Paragraph("Infrastructure / AWS Cloud", styles["TableCell"]),
            Paragraph("Relational persistence, unique constraints, foreign keys, btree indexes.", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Storage & CDN</b>", styles["TableCellBold"]),
            Paragraph("AWS S3 (Dual-Bucket) + CloudFront", styles["TableCell"]),
            Paragraph("apps/api/src/media/providers/s3.provider.ts", styles["TableCell"]),
            Paragraph("Public photos/horoscopes in Media bucket; secure IDs in Vault bucket.", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Validation</b>", styles["TableCellBold"]),
            Paragraph("Zod TypeScript Schema Validation", styles["TableCell"]),
            Paragraph("packages/validation (`@astalakshimi/validation`)", styles["TableCell"]),
            Paragraph("Shared contract validation for web forms and NestJS DTO pipes.", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Shared Types</b>", styles["TableCellBold"]),
            Paragraph("TypeScript Contract Definitions", styles["TableCell"]),
            Paragraph("packages/types (`@astalakshimi/types`)", styles["TableCell"]),
            Paragraph("Shared entity interfaces, auth payloads, upload contracts, profile DTOs.", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Payments</b>", styles["TableCellBold"]),
            Paragraph("Razorpay Node SDK", styles["TableCell"]),
            Paragraph("apps/api/src/payments", styles["TableCell"]),
            Paragraph("Order generation, payment capture, webhook event handling, signature checks.", styles["TableCell"]),
        ],
    ]
    tech_table = Table(tech_stack_data, colWidths=[65, 110, 140, 217])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, CARD_BG]),
        ('PADDING', (0,0), (-1,-1), 3.5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(tech_table)

    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Repository Topography & Package Status:</b>", styles["DocH2"]))

    repo_map_data = [
        [Paragraph("Directory / Package", styles["TableHeader"]), Paragraph("Type", styles["TableHeader"]), Paragraph("Active Status", styles["TableHeader"]), Paragraph("Audit Observation & Recommendation", styles["TableHeader"])],
        [
            Paragraph("`apps/web`", styles["TableCellBold"]),
            Paragraph("Next.js App", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Actively Used</b></font>", styles["TableCell"]),
            Paragraph("Full App Router frontend. Handles BFF authentication, proxy, profile editing, and UI dashboard.", styles["TableCell"]),
        ],
        [
            Paragraph("`apps/api`", styles["TableCellBold"]),
            Paragraph("NestJS API", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Actively Used</b></font>", styles["TableCell"]),
            Paragraph("Backend API service containing 18 domain modules, controllers, and services.", styles["TableCell"]),
        ],
        [
            Paragraph("`packages/database`", styles["TableCellBold"]),
            Paragraph("Drizzle ORM", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Actively Used</b></font>", styles["TableCell"]),
            Paragraph("Source of truth for 18 database schemas, client provider, and SQL migrations.", styles["TableCell"]),
        ],
        [
            Paragraph("`packages/types`", styles["TableCellBold"]),
            Paragraph("Shared Types", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Actively Used</b></font>", styles["TableCell"]),
            Paragraph("Shared TypeScript interfaces for Profile, User, Media, Preferences, Auth.", styles["TableCell"]),
        ],
        [
            Paragraph("`packages/validation`", styles["TableCellBold"]),
            Paragraph("Shared Zod", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Actively Used</b></font>", styles["TableCell"]),
            Paragraph("Shared Zod validation schemas for forms and NestJS ZodValidationPipe.", styles["TableCell"]),
        ],
        [
            Paragraph("`packages/config`", styles["TableCellBold"]),
            Paragraph("Shared Config", styles["TableCell"]),
            Paragraph("<font color='#DC2626'><b>Empty Stub</b></font>", styles["TableCell"]),
            Paragraph("Contains only `.gitkeep`. Constants are currently scattered across web and api. Safe to populate or consolidate.", styles["TableCell"]),
        ],
        [
            Paragraph("`packages/api-client`", styles["TableCellBold"]),
            Paragraph("Shared HTTP Client", styles["TableCell"]),
            Paragraph("<font color='#DC2626'><b>Empty Stub</b></font>", styles["TableCell"]),
            Paragraph("Contains only `.gitkeep`. HTTP client was directly embedded into `apps/web/src/lib/api-client.ts`.", styles["TableCell"]),
        ],
        [
            Paragraph("`infrastructure/`", styles["TableCellBold"]),
            Paragraph("Docker Config", styles["TableCell"]),
            Paragraph("<font color='#D97706'><b>Empty Stub</b></font>", styles["TableCell"]),
            Paragraph("`docker/` and `docker-compose/` contain only `.gitkeep`. Docker setup not yet configured.", styles["TableCell"]),
        ],
        [
            Paragraph("`scripts/`", styles["TableCellBold"]),
            Paragraph("Build Scripts", styles["TableCell"]),
            Paragraph("<font color='#D97706'><b>Empty Stub</b></font>", styles["TableCell"]),
            Paragraph("Contained `.gitkeep`. Scratch scripts (`test-db.js`, `apps/web/fix_ts.js`) were left scattered in root.", styles["TableCell"]),
        ],
    ]
    repo_table = Table(repo_map_data, colWidths=[95, 75, 80, 282])
    repo_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, CARD_BG]),
        ('PADDING', (0,0), (-1,-1), 3.5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(repo_table)

    story.append(PageBreak())

    # =========================================================================
    # 3. END-TO-END SYSTEM ARCHITECTURE & REQUEST LIFECYCLE
    # =========================================================================
    story.append(Paragraph("2. System Architecture & Request Lifecycle", styles["DocH1"]))
    story.append(Paragraph(
        "Astalakshimi implements a decoupled 3-tier architecture with a secure Backend-for-Frontend (BFF) proxy pattern. "
        "The browser never directly receives or stores the JWT access token in JavaScript localStorage; instead, the Next.js API route "
        "attaches the token via HTTP-only, Secure, SameSite cookies.",
        styles["DocBody"]
    ))

    # Architecture Flow Diagram Box
    arch_flow_data = [
        [
            Paragraph("<b>CLIENT LAYER</b><br/>Next.js 15 Web App<br/>(React 19 / TanStack Query)", styles["FlowStep"]),
            Paragraph("<b>BFF PROXY LAYER</b><br/>Next.js Route Handler<br/>`app/api/proxy/[...path]`", styles["FlowStep"]),
            Paragraph("<b>DOMAIN API LAYER</b><br/>NestJS 10 REST API<br/>(`apps/api/src`)", styles["FlowStep"]),
            Paragraph("<b>PERSISTENCE & CLOUD</b><br/>PostgreSQL 16 (RDS)<br/>AWS S3 (Media/Vault)", styles["FlowStep"]),
        ],
        [
            Paragraph("• User Action (Form/Click)<br/>• React Hook Form (Zod)<br/>• TanStack Mutation / Query<br/>• `apiClient` fetch call", styles["TableCell"]),
            Paragraph("• Reads HTTP-only cookie<br/>• Injects `Authorization: Bearer`<br/>• Auto-refreshes 401 tokens<br/>• Strips sensitive headers", styles["TableCell"]),
            Paragraph("• Global Exception Filter<br/>• JwtAuthGuard & RolesGuard<br/>• Controller endpoint routing<br/>• Domain Service business rules", styles["TableCell"]),
            Paragraph("• Drizzle ORM queries<br/>• PostgreSQL ACID transactions<br/>• AWS S3 Presigned URLs<br/>• CloudFront media delivery", styles["TableCell"]),
        ]
    ]
    arch_flow_table = Table(arch_flow_data, colWidths=[133, 133, 133, 133])
    arch_flow_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), colors.HexColor("#EFF6FF")),
        ('BACKGROUND', (1,0), (1,0), colors.HexColor("#F0FDF4")),
        ('BACKGROUND', (2,0), (2,0), colors.HexColor("#FEF3C7")),
        ('BACKGROUND', (3,0), (3,0), colors.HexColor("#FDF2F8")),
        ('GRID', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(arch_flow_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>End-to-End Request Lifecycle Specification:</b>", styles["DocH2"]))
    lifecycle_steps = [
        "<b>1. Client Trigger:</b> The user initiates an interaction (e.g., submitting the registration form, sending an interest, or searching for matches). React Hook Form validates input against Zod schemas from `@astalakshimi/validation`.",
        "<b>2. TanStack Query Execution:</b> `apps/web/src/hooks/queries.ts` dispatches a request through `apiClient` (`apps/web/src/lib/api-client.ts`), targeting the local Next.js BFF proxy `/api/proxy/*`.",
        "<b>3. BFF Proxy & Cookie Translation:</b> `apps/web/src/app/api/proxy/[...path]/route.ts` extracts the `astalakshimi.auth_token` HTTP-only cookie, attaches it as an `Authorization: Bearer <token>` header, and proxies the request to the NestJS backend at `http://localhost:4000/api/*`.",
        "<b>4. Automatic Token Refresh:</b> If the backend returns a `401 Unauthorized`, the BFF proxy transparently reads `astalakshimi.refresh_token`, calls `POST /api/auth/refresh`, obtains new tokens, updates the HTTP-only cookies in the response, and retries the original request seamlessly.",
        "<b>5. NestJS Guards & Pipes:</b> In NestJS, `JwtAuthGuard` validates the JWT signature and extracts user context (`req.user = { id, phone, role }`). `ZodValidationPipe` validates the request payload, and `RolesGuard` verifies role permissions.",
        "<b>6. Service & ORM Execution:</b> The controller delegates to domain services (e.g., `ProfilesService`, `InterestsService`), which execute ACID transactions or queries against PostgreSQL via Drizzle ORM (`@astalakshimi/database`).",
        "<b>7. External Services Integration:</b> For media uploads, `S3Provider` generates 10-minute presigned `PUT` URLs. For payments, `PaymentsService` calls Razorpay SDK and verifies SHA-256 HMAC signatures.",
        "<b>8. Response & UI Sync:</b> The NestJS response passes through the BFF proxy back to TanStack Query, which updates cached query keys (e.g., `['profile']`, `['interests']`, `['chat']`) and triggers reactive UI re-renders.",
    ]
    for step in lifecycle_steps:
        story.append(Paragraph(f"• {step}", styles["DocBullet"]))

    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>Dual-Bucket Media & Verification Pipeline:</b>", styles["DocH2"]))
    story.append(Paragraph(
        "To satisfy strict privacy requirements, media assets are physically segregated into two AWS S3 buckets:<br/>"
        "1. <b>Public Media Bucket (`astalakshimi-media-dev`):</b> Stores member profile photos (`profiles/{userId}/photos/{uuid}.{ext}`) and horoscope PDFs (`profiles/{userId}/horoscopes/{uuid}.pdf`). Delivered via CloudFront CDN.<br/>"
        "2. <b>Private Vault Bucket (`astalakshimi-vault-dev`):</b> Stores sensitive verification documents, including live selfies (`verifications/{userId}/selfie-{uuid}.{ext}`) and government IDs (`verifications/{userId}/govt-id-{uuid}.{ext}`). Direct access is blocked; only admins can view documents via 15-minute presigned URLs (`getAdminSignedViewUrl`).",
        styles["DocBody"]
    ))

    story.append(PageBreak())

    # =========================================================================
    # 4. MASTER FEATURE INVENTORY & MATRIX
    # =========================================================================
    story.append(Paragraph("3. Master Feature Inventory & Feature Matrix", styles["DocH1"]))
    story.append(Paragraph(
        "The repository contains 15 core feature domains spanning public onboarding, authenticated matchmaking, communication, privacy controls, and administrative moderation.",
        styles["DocBody"]
    ))

    feature_matrix_data = [
        [Paragraph("Feature Domain", styles["TableHeader"]), Paragraph("Frontend Entry", styles["TableHeader"]), Paragraph("API Route & Controller", styles["TableHeader"]), Paragraph("Database Tables", styles["TableHeader"]), Paragraph("Status", styles["TableHeader"])],
        [
            Paragraph("<b>Phone OTP Auth</b>", styles["TableCellBold"]),
            Paragraph("`/login`, `/register`<br/>`hero-register-card`", styles["TableCell"]),
            Paragraph("`POST /auth/send-otp`<br/>`POST /auth/verify-otp`<br/>`AuthController`", styles["TableCell"]),
            Paragraph("`users`<br/>`otp_attempts`", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Complete</b></font>", styles["TableCell"]),
        ],
        [
            Paragraph("<b>5-Step Registration</b>", styles["TableCellBold"]),
            Paragraph("`app/(auth)/register/page.tsx`<br/>`useSaveProfileMutation`", styles["TableCell"]),
            Paragraph("`POST /profiles/complete-registration`<br/>`ProfilesController`", styles["TableCell"]),
            Paragraph("`profiles`, `family_details`, `lifestyle_interests`, `horoscopes`, `partner_preferences`, `profile_photos`, `verifications`", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Complete</b></font><br/>(8-Table Tx)", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Profile Management</b>", styles["TableCellBold"]),
            Paragraph("`/profile`, `/profile/edit`<br/>`useUpdateProfileMutation`", styles["TableCell"]),
            Paragraph("`GET /profiles/me`<br/>`PATCH /profiles/me`<br/>`ProfilesController`", styles["TableCell"]),
            Paragraph("`profiles`, `family_details`, `lifestyle_interests`, `horoscopes`, `partner_preferences`", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Complete</b></font>", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Member Profile View</b>", styles["TableCellBold"]),
            Paragraph("`app/profiles/[profileId]/page.tsx`<br/>Server Component", styles["TableCell"]),
            Paragraph("`GET /profiles/:id`<br/>`POST /profiles/:id/visit`<br/>`ProfilesController`", styles["TableCell"]),
            Paragraph("`profiles`, `profile_photos`, `profile_views`, `user_settings`, `interests`", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Complete</b></font><br/>(Dynamic Blur)", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Discover & Search</b>", styles["TableCellBold"]),
            Paragraph("`app/(dashboard)/dashboard/page.tsx`<br/>`useSearchQuery`", styles["TableCell"]),
            Paragraph("`GET /search`<br/>`SearchController`", styles["TableCell"]),
            Paragraph("`profiles`, `profile_photos`, `user_settings`, `interests`", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Complete</b></font><br/>(Active)", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Legacy Search</b>", styles["TableCellBold"]),
            Paragraph("`app/(dashboard)/search/page.tsx`<br/>`useMatchesQuery`", styles["TableCell"]),
            Paragraph("None (`useMatchesQuery` returns `[]`)", styles["TableCell"]),
            Paragraph("None", styles["TableCell"]),
            Paragraph("<font color='#DC2626'><b>Broken / Dead</b></font><br/>(Duplicate)", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Top Matches</b>", styles["TableCellBold"]),
            Paragraph("`/home`<br/>`useTopMatchesQuery`", styles["TableCell"]),
            Paragraph("`GET /matches/top`<br/>`MatchesController`", styles["TableCell"]),
            Paragraph("`profiles`, `profile_photos`, `user_settings`, `interests`", styles["TableCell"]),
            Paragraph("<font color='#D97706'><b>Underengineered</b></font><br/>(Limit 4)", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Interest Dispatch</b>", styles["TableCellBold"]),
            Paragraph("`MatchListCard`, `ProfileActionBar`<br/>`useSendInterestMutation`", styles["TableCell"]),
            Paragraph("`POST /interests`<br/>`InterestsController`", styles["TableCell"]),
            Paragraph("`interests`<br/>`notifications`", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Complete</b></font><br/>(Auto-Mutual)", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Interest Management</b>", styles["TableCellBold"]),
            Paragraph("`app/(dashboard)/interests/page.tsx`<br/>`useInterestsQuery`", styles["TableCell"]),
            Paragraph("`GET /interests/summary`<br/>`GET /interests/received`<br/>`GET /interests/sent`<br/>`GET /interests/mutual`", styles["TableCell"]),
            Paragraph("`interests`<br/>`profiles`<br/>`profile_photos`", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Complete</b></font>", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Chat & Messaging</b>", styles["TableCellBold"]),
            Paragraph("`app/(dashboard)/inbox/page.tsx`<br/>`app/(dashboard)/inbox/[threadId]`", styles["TableCell"]),
            Paragraph("`GET /chat/threads`<br/>`GET /chat/:threadId/messages`<br/>`POST /chat/:threadId/messages`", styles["TableCell"]),
            Paragraph("`messages`<br/>`profiles`<br/>`interests`", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Complete</b></font><br/>(3s Polling)", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Media S3 Uploads</b>", styles["TableCellBold"]),
            Paragraph("`profile/edit`, `step-verify`<br/>`apiClient.media.getUploadUrl`", styles["TableCell"]),
            Paragraph("`POST /media/upload-url`<br/>`POST /media/confirm-photo`<br/>`POST /media/confirm-verification`", styles["TableCell"]),
            Paragraph("`profile_photos`<br/>`verifications`<br/>`horoscopes`", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Complete</b></font>", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Shortlisting</b>", styles["TableCellBold"]),
            Paragraph("`ProfileActionBar`, `shortlists/page.tsx`<br/>`useToggleShortlistMutation`", styles["TableCell"]),
            Paragraph("`GET /shortlists`<br/>`POST /shortlists`<br/>`DELETE /shortlists/:id`", styles["TableCell"]),
            Paragraph("`shortlists`<br/>`profiles`", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Complete</b></font>", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Notifications</b>", styles["TableCellBold"]),
            Paragraph("`app/(dashboard)/notifications/page.tsx`<br/>`useNotificationsQuery`", styles["TableCell"]),
            Paragraph("`GET /notifications`<br/>`PATCH /notifications/:id/read`<br/>`DELETE /notifications/clear-all`", styles["TableCell"]),
            Paragraph("`notifications`", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Complete</b></font>", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Privacy & Settings</b>", styles["TableCellBold"]),
            Paragraph("`app/(dashboard)/settings/page.tsx`<br/>`useSettingsQuery`", styles["TableCell"]),
            Paragraph("`GET /users/me/settings`<br/>`PATCH /users/me/settings`<br/>`SettingsController`", styles["TableCell"]),
            Paragraph("`user_settings`", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Complete</b></font>", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Plans & Payments</b>", styles["TableCellBold"]),
            Paragraph("`app/(dashboard)/plans/page.tsx`<br/>`app/(dashboard)/checkout/page.tsx`", styles["TableCell"]),
            Paragraph("`GET /plans`<br/>`POST /payments/orders`<br/>`POST /payments/verify`", styles["TableCell"]),
            Paragraph("`plans`<br/>`payments`<br/>`subscriptions`", styles["TableCell"]),
            Paragraph("<font color='#D97706'><b>Partial / Mismatch</b></font><br/>(Backend 4 / Web 5)", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Admin Moderation</b>", styles["TableCellBold"]),
            Paragraph("No Frontend UI page yet<br/>(Admin Portal Unscaffolded)", styles["TableCell"]),
            Paragraph("`GET /admin/stats`<br/>`GET /admin/verifications/pending`<br/>`PATCH /admin/verifications/:id`", styles["TableCell"]),
            Paragraph("`verifications`<br/>`users`<br/>`profiles`", styles["TableCell"]),
            Paragraph("<font color='#D97706'><b>Backend Only</b></font><br/>(Guarded by Roles)", styles["TableCell"]),
        ],
    ]
    feat_table = Table(feature_matrix_data, colWidths=[85, 110, 125, 142, 70])
    feat_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, CARD_BG]),
        ('PADDING', (0,0), (-1,-1), 3.5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(feat_table)

    story.append(PageBreak())

    # =========================================================================
    # 5. DETAILED FEATURE-BY-FEATURE TECHNICAL WORKFLOWS
    # =========================================================================
    story.append(Paragraph("4. Deep Feature-by-Feature Technical Workflows", styles["DocH1"]))
    story.append(Paragraph(
        "Below is the exact, concrete execution trace for each significant feature across the stack.",
        styles["DocBody"]
    ))

    # Feature 1: Auth & Login Trace
    story.append(Paragraph("Feature 1: Passwordless Mobile Phone OTP Authentication & Session Issuance", styles["DocH2"]))
    auth_trace = (
        "<b>User Action:</b> User inputs 10-digit mobile number on `/login` and clicks 'Send OTP'.<br/>"
        "<b>1. Frontend Trigger:</b> `apps/web/src/app/(auth)/login/page.tsx` → `handleSendOtp()` invokes `apiClient.auth.sendOtp({ phone, consentAccepted: true })`.<br/>"
        "<b>2. BFF Route:</b> Calls Next.js proxy route `/api/proxy/auth/send-otp` → proxied to NestJS `POST /api/auth/send-otp`.<br/>"
        "<b>3. NestJS AuthController:</b> `apps/api/src/auth/auth.controller.ts:sendOtp()` receives validated DTO via `ZodValidationPipe(sendOtpSchema)`.<br/>"
        "<b>4. AuthService Logic:</b> `apps/api/src/auth/auth.service.ts:sendOtp()` generates a 6-digit OTP (or mock OTP `123456` if `MOCK_OTP_ENABLED=true`), calculates expiration (`Date.now() + 300s`), and inserts a record into PostgreSQL table `otp_attempts`.<br/>"
        "<b>5. Verification Action:</b> User inputs 6-digit OTP → `handleVerifyOtp()` invokes `apiClient.auth.verifyOtp()`.<br/>"
        "<b>6. Cookie Setting:</b> `apiClient.auth.verifyOtp` calls Next.js route handler `POST /api/auth/login`. This route handler forwards to NestJS `POST /auth/verify-otp`. Upon receiving `{ accessToken, refreshToken, user, hasProfile }`, the Next.js handler intercepts the response, sets HTTP-only cookies `astalakshimi.auth_token` (30 days) and `astalakshimi.refresh_token` (7 days), strips tokens from the JSON body, and returns `{ user, hasProfile }` to the client.<br/>"
        "<b>7. Client State Update:</b> `apiClient.setToken()` sets a flag in localStorage (`is_authenticated=true`) for synchronous React rendering checks; UI redirects to `/home` (if `hasProfile=true`) or `/register` (if new user)."
    )
    story.append(Paragraph(auth_trace, styles["DocBody"]))
    story.append(Spacer(1, 6))

    # Feature 2: 5-Step Registration
    story.append(Paragraph("Feature 2: Multi-Step Registration & 8-Table Atomic Database Transaction", styles["DocH2"]))
    reg_trace = (
        "<b>User Action:</b> User completes 5 registration steps on `/register` (Basics → Career → Family → Photos/Verification/Horoscope → Partner Preferences) and submits.<br/>"
        "<b>1. Frontend Trigger:</b> `apps/web/src/app/(auth)/register/page.tsx` → calls `saveProfileMutation.mutate(finalData)` (`useSaveProfileMutation` in `apps/web/src/hooks/queries.ts`).<br/>"
        "<b>2. Payload Construction:</b> Assembles `CompleteRegistrationPayload` encompassing personal details, DOB, career, income, family values, S3 keys, and preferences.<br/>"
        "<b>3. API Execution:</b> Dispatches `POST /api/proxy/profiles/complete-registration` → NestJS `ProfilesController.completeRegistration()`.<br/>"
        "<b>4. Atomic Transaction Boundary:</b> `apps/api/src/profiles/profiles.service.ts:completeRegistration()` executes `this.db.transaction(async (tx) => { ... })` across 8 tables:<br/>"
        "&nbsp;&nbsp;• `profiles`: Upserts full name, DOB (`YYYY-MM-DD`), gender, height, education, annual income, photo privacy.<br/>"
        "&nbsp;&nbsp;• `family_details`: Upserts family values, type, father/mother occupation, siblings count (`onConflictDoUpdate`).<br/>"
        "&nbsp;&nbsp;• `lifestyle_interests`: Upserts diet, smoking, alcohol, and hobby arrays (`onConflictDoUpdate`).<br/>"
        "&nbsp;&nbsp;• `horoscopes`: Upserts birth time, birth place, manglik status, rasi, nakshatra, and horoscope S3 PDF key.<br/>"
        "&nbsp;&nbsp;• `partner_preferences`: Upserts age range (min/max), height range, preferred religions, castes, mother tongues.<br/>"
        "&nbsp;&nbsp;• `profile_photos`: Deletes previous photos for profile, bulk-inserts new photo records with `isPrimary` and `displayOrder`.<br/>"
        "&nbsp;&nbsp;• `verifications`: Upserts verification record with method (`selfie` or `govt_id`), S3 keys, and status set to `pending`.<br/>"
        "<b>5. Response & State Update:</b> Returns `{ success: true, profileId }`. React Query invalidates and updates `queryKeys.profile` cache; UI redirects to `/home`."
    )
    story.append(Paragraph(reg_trace, styles["DocBody"]))
    story.append(Spacer(1, 6))

    # Feature 3: Matchmaking & Interest Dispatch with Auto-Mutual Acceptance
    story.append(Paragraph("Feature 3: Interest Dispatch, Quota Check & Automated Mutual Matching", styles["DocH2"]))
    interest_trace = (
        "<b>User Action:</b> Member clicks 'Connect' on a match card (`MatchListCard` or `ProfileActionBar`).<br/>"
        "<b>1. Frontend Trigger:</b> `useSendInterestMutation` (`apps/web/src/hooks/queries.ts`) calls `apiClient.interests.sendInterest(targetProfileId, message)`.<br/>"
        "<b>2. API Routing:</b> `POST /api/proxy/interests` → NestJS `InterestsController.sendInterest()` (`apps/api/src/interests/interests.controller.ts`).<br/>"
        "<b>3. Quota Enforcement:</b> `InterestsService.sendInterest()` checks user's active plan via `EntitlementsService.getUserPlan(userId)`. Queries count of sent interests; if `sentCount >= plan.interestQuota`, throws `403 Forbidden ('Interest quota limit reached')`.<br/>"
        "<b>4. Reverse-Interest Detection (Auto-Match):</b> Queries `interests` table to check if target user already sent a pending interest to current user. If found:<br/>"
        "&nbsp;&nbsp;• Updates reverse interest status to `'accepted'` with `respondedAt = now()`.<br/>"
        "&nbsp;&nbsp;• Dispatches asynchronous notifications to both users via `NotificationsService.createNotification()` (`'Interest Accepted! You are now connected.'`).<br/>"
        "&nbsp;&nbsp;• Returns `{ status: 'accepted', isMutual: true }`.<br/>"
        "<b>5. New Interest Insertion:</b> If no reverse interest exists, inserts a new record into `interests` with `status: 'pending'` and notifies target user.<br/>"
        "<b>6. UI Response:</b> TanStack Query invalidates `queryKeys.interests` and `queryKeys.notifications`. The UI immediately reflects 'Connected' (if mutual) or 'Interest Sent' (if pending)."
    )
    story.append(Paragraph(interest_trace, styles["DocBody"]))
    story.append(Spacer(1, 6))

    # Feature 4: Chat Engine & Polling Sync
    story.append(Paragraph("Feature 4: Real-Time Messaging & Dynamic Thread Resolution", styles["DocH2"]))
    chat_trace = (
        "<b>User Action:</b> Member navigates to `/inbox` or `/inbox/[threadId]` and types a message.<br/>"
        "<b>1. Active Thread Loading:</b> `useChatMessagesQuery(threadId)` (`apps/web/src/hooks/queries.ts`) executes with `refetchInterval: 3000` (polling every 3 seconds) calling `GET /api/proxy/chat/:threadId/messages`.<br/>"
        "<b>2. Backend Resolution:</b> `ChatService.getMessages(userId, threadId)` resolves the partner profile ID, selects messages between sender and receiver ordered by `createdAt ASC`, and executes a background SQL update to mark unread incoming messages as `isRead = true`.<br/>"
        "<b>3. Sending Message:</b> User clicks 'Send' → `useSendMessageMutation` performs an optimistic UI update (appending temporary message object), then calls `POST /api/proxy/chat/:threadId/messages`.<br/>"
        "<b>4. Persistence & Notification:</b> `ChatService.sendMessage()` computes `threadId` (sorted pair `profileA_profileB` or interest ID), inserts into PostgreSQL `messages` table, and triggers a notification for the recipient.<br/>"
        "<b>5. Invalidation:</b> Upon completion, TanStack Query invalidates `queryKeys.chat(threadId)` and `queryKeys.chatThreads`."
    )
    story.append(Paragraph(chat_trace, styles["DocBody"]))

    story.append(PageBreak())

    # =========================================================================
    # 6. MASTER API INVENTORY TABLE
    # =========================================================================
    story.append(Paragraph("5. Master API Inventory Table", styles["DocH1"]))
    story.append(Paragraph(
        "Complete catalog of all 37 backend REST endpoints implemented across the 18 NestJS controllers in `apps/api/src`. "
        "Every route is mapped with its HTTP method, endpoint path, controller, service method, database tables touched, auth guard, and frontend caller status.",
        styles["DocBody"]
    ))

    api_table_data = [
        [Paragraph("Method & Endpoint", styles["TableHeader"]), Paragraph("Controller & Service Method", styles["TableHeader"]), Paragraph("Guards / Auth", styles["TableHeader"]), Paragraph("Database Tables", styles["TableHeader"]), Paragraph("Frontend Caller & Status", styles["TableHeader"])],
        # Auth
        [Paragraph("<b>POST</b> `/auth/send-otp`", styles["TableCellBold"]), Paragraph("AuthController<br/>`sendOtp()`", styles["TableCell"]), Paragraph("Public<br/>ZodPipe", styles["TableCell"]), Paragraph("`otp_attempts`", styles["TableCell"]), Paragraph("`apiClient.auth.sendOtp`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>POST</b> `/auth/verify-otp`", styles["TableCellBold"]), Paragraph("AuthController<br/>`verifyOtp()`", styles["TableCell"]), Paragraph("Public<br/>ZodPipe", styles["TableCell"]), Paragraph("`otp_attempts`<br/>`users`, `profiles`", styles["TableCell"]), Paragraph("`app/api/auth/login`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>POST</b> `/auth/refresh`", styles["TableCellBold"]), Paragraph("AuthController<br/>`refresh()`", styles["TableCell"]), Paragraph("Public", styles["TableCell"]), Paragraph("`users`<br/>`profiles`", styles["TableCell"]), Paragraph("`app/api/proxy/[...path]`<br/><font color='#059669'><b>Active (BFF)</b></font>", styles["TableCell"])],
        [Paragraph("<b>GET</b> `/auth/me`", styles["TableCellBold"]), Paragraph("AuthController<br/>`getMe()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`users`<br/>`profiles`", styles["TableCell"]), Paragraph("`apiClient.auth.getMe`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        # Profiles
        [Paragraph("<b>POST</b> `/profiles/complete-registration`", styles["TableCellBold"]), Paragraph("ProfilesController<br/>`completeRegistration()`", styles["TableCell"]), Paragraph("JwtAuthGuard<br/>ZodPipe", styles["TableCell"]), Paragraph("8 Tables<br/>(Atomic Tx)", styles["TableCell"]), Paragraph("`apiClient.profiles.completeRegistration`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>GET</b> `/profiles/me`", styles["TableCellBold"]), Paragraph("ProfilesController<br/>`getMyProfile()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`profiles`, `family_details`, `lifestyle_interests`, etc.", styles["TableCell"]), Paragraph("`apiClient.profiles.getMyProfile`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>PATCH</b> `/profiles/me`", styles["TableCellBold"]), Paragraph("ProfilesController<br/>`updateMyProfile()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`profiles`, `family_details`, `lifestyle_interests`, etc.", styles["TableCell"]), Paragraph("`apiClient.profiles.updateMyProfile`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>POST</b> `/profiles/me/photos`", styles["TableCellBold"]), Paragraph("ProfilesController<br/>`addPhoto()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`profile_photos`", styles["TableCell"]), Paragraph("`apiClient.photos.add`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>DELETE</b> `/profiles/me/photos/:photoId`", styles["TableCellBold"]), Paragraph("ProfilesController<br/>`deletePhoto()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`profile_photos`", styles["TableCell"]), Paragraph("`apiClient.photos.remove`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>PUT</b> `/profiles/me/photos/order`", styles["TableCellBold"]), Paragraph("ProfilesController<br/>`reorderPhotos()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`profile_photos`", styles["TableCell"]), Paragraph("`apiClient.photos.reorder`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>GET</b> `/profiles/:id`", styles["TableCellBold"]), Paragraph("ProfilesController<br/>`getProfileById()`", styles["TableCell"]), Paragraph("OptionalJwtGuard", styles["TableCell"]), Paragraph("`profiles`, `profile_views`, `user_settings`, `interests`", styles["TableCell"]), Paragraph("`app/profiles/[id]/page.tsx`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>POST</b> `/profiles/:id/visit`", styles["TableCellBold"]), Paragraph("ProfilesController<br/>`recordVisit()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`profile_views`", styles["TableCell"]), Paragraph("`apiClient.profiles.recordVisit`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        # Search & Matches
        [Paragraph("<b>GET</b> `/search`", styles["TableCellBold"]), Paragraph("SearchController<br/>`searchProfiles()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`profiles`, `profile_photos`, `user_settings`, `interests`", styles["TableCell"]), Paragraph("`apiClient.search.searchProfiles`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>GET</b> `/matches/top`", styles["TableCellBold"]), Paragraph("MatchesController<br/>`getTopMatches()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`profiles`, `profile_photos`, `user_settings`, `interests`", styles["TableCell"]), Paragraph("`apiClient.matches.getTop`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        # Interests
        [Paragraph("<b>POST</b> `/interests`", styles["TableCellBold"]), Paragraph("InterestsController<br/>`sendInterest()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`interests`<br/>`notifications`", styles["TableCell"]), Paragraph("`apiClient.interests.sendInterest`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>GET</b> `/interests/summary`", styles["TableCellBold"]), Paragraph("InterestsController<br/>`getSummary()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`interests`<br/>`profiles`", styles["TableCell"]), Paragraph("`apiClient.interests.getSummary`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>GET</b> `/interests/received`", styles["TableCellBold"]), Paragraph("InterestsController<br/>`getReceivedInterests()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`interests`<br/>`profiles`", styles["TableCell"]), Paragraph("`apiClient.interests.getReceived`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>GET</b> `/interests/sent`", styles["TableCellBold"]), Paragraph("InterestsController<br/>`getSentInterests()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`interests`<br/>`profiles`", styles["TableCell"]), Paragraph("`apiClient.interests.getSent`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>GET</b> `/interests/mutual`", styles["TableCellBold"]), Paragraph("InterestsController<br/>`getMutualInterests()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`interests`<br/>`profiles`", styles["TableCell"]), Paragraph("`apiClient.interests.getMutual`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>PATCH</b> `/interests/:id/accept`", styles["TableCellBold"]), Paragraph("InterestsController<br/>`patchAccept()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`interests`<br/>`notifications`", styles["TableCell"]), Paragraph("`apiClient.interests.accept`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>PATCH</b> `/interests/:id/decline`", styles["TableCellBold"]), Paragraph("InterestsController<br/>`patchDecline()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`interests`", styles["TableCell"]), Paragraph("`apiClient.interests.decline`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>PATCH</b> `/interests/:id/withdraw`", styles["TableCellBold"]), Paragraph("InterestsController<br/>`patchWithdraw()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`interests`", styles["TableCell"]), Paragraph("`apiClient.interests.withdraw`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>PUT</b> `/interests/:id/status`", styles["TableCellBold"]), Paragraph("InterestsController<br/>`updateInterestStatus()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`interests`", styles["TableCell"]), Paragraph("`apiClient.interests.updateStatus`<br/><font color='#D97706'><b>Redundant Route</b></font>", styles["TableCell"])],
        # Chat
        [Paragraph("<b>GET</b> `/chat/threads`", styles["TableCellBold"]), Paragraph("ChatController<br/>`getThreads()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`interests`, `messages`, `profiles`, `profile_photos`", styles["TableCell"]), Paragraph("`apiClient.chat.getThreads`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>GET</b> `/chat/:threadId/messages`", styles["TableCellBold"]), Paragraph("ChatController<br/>`getMessages()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`messages`<br/>`profiles`", styles["TableCell"]), Paragraph("`apiClient.chat.getMessages`<br/><font color='#059669'><b>Active (Poll 3s)</b></font>", styles["TableCell"])],
        [Paragraph("<b>POST</b> `/chat/:threadId/messages`", styles["TableCellBold"]), Paragraph("ChatController<br/>`sendMessage()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`messages`<br/>`notifications`", styles["TableCell"]), Paragraph("`apiClient.chat.sendMessage`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>PATCH</b> `/chat/:threadId/read`", styles["TableCellBold"]), Paragraph("ChatController<br/>`markRead()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`messages`", styles["TableCell"]), Paragraph("`apiClient.chat.markRead`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        # Media
        [Paragraph("<b>POST</b> `/media/upload-url`", styles["TableCellBold"]), Paragraph("MediaController<br/>`getUploadUrl()`", styles["TableCell"]), Paragraph("JwtAuthGuard<br/>ZodPipe", styles["TableCell"]), Paragraph("None (AWS S3 Presigner)", styles["TableCell"]), Paragraph("`apiClient.media.getUploadUrl`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>POST</b> `/media/confirm-photo`", styles["TableCellBold"]), Paragraph("MediaController<br/>`confirmPhoto()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`profile_photos`", styles["TableCell"]), Paragraph("`apiClient.media` / Alt endpoint<br/><font color='#D97706'><b>Redundant Route</b></font>", styles["TableCell"])],
        [Paragraph("<b>POST</b> `/media/confirm-verification`", styles["TableCellBold"]), Paragraph("MediaController<br/>`confirmVerification()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`verifications`", styles["TableCell"]), Paragraph("`apiClient.media`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>POST</b> `/media/confirm-horoscope`", styles["TableCellBold"]), Paragraph("MediaController<br/>`confirmHoroscope()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`horoscopes`", styles["TableCell"]), Paragraph("`apiClient.media`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>DELETE</b> `/media/photos/:id`", styles["TableCellBold"]), Paragraph("MediaController<br/>`deletePhoto()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`profile_photos` + S3 delete", styles["TableCell"]), Paragraph("Duplicate of `/profiles/me/photos/:id`<br/><font color='#D97706'><b>Redundant Route</b></font>", styles["TableCell"])],
        # Shortlists
        [Paragraph("<b>GET</b> `/shortlists`", styles["TableCellBold"]), Paragraph("ShortlistsController<br/>`getShortlists()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`shortlists`<br/>`profiles`", styles["TableCell"]), Paragraph("`apiClient.shortlists.getAll`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>GET</b> `/shortlists/ids`", styles["TableCellBold"]), Paragraph("ShortlistsController<br/>`getShortlistIds()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`shortlists`", styles["TableCell"]), Paragraph("`apiClient.shortlists.getIds`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>POST</b> `/shortlists`", styles["TableCellBold"]), Paragraph("ShortlistsController<br/>`addShortlist()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`shortlists`", styles["TableCell"]), Paragraph("`apiClient.shortlists.add`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>DELETE</b> `/shortlists/:targetProfileId`", styles["TableCellBold"]), Paragraph("ShortlistsController<br/>`removeShortlist()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`shortlists`", styles["TableCell"]), Paragraph("`apiClient.shortlists.remove`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        # Notifications
        [Paragraph("<b>GET</b> `/notifications`", styles["TableCellBold"]), Paragraph("NotificationsController<br/>`getUserNotifications()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`notifications`", styles["TableCell"]), Paragraph("`apiClient.notifications.getAll`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>PATCH</b> `/notifications/:id/read`", styles["TableCellBold"]), Paragraph("NotificationsController<br/>`markAsRead()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`notifications`", styles["TableCell"]), Paragraph("`apiClient.notifications.markRead`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>PATCH</b> `/notifications/read`", styles["TableCellBold"]), Paragraph("NotificationsController<br/>`patchMarkRead()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`notifications`", styles["TableCell"]), Paragraph("`apiClient.notifications.markAllRead`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>DELETE</b> `/notifications/clear-all`", styles["TableCellBold"]), Paragraph("NotificationsController<br/>`clearAll()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`notifications`", styles["TableCell"]), Paragraph("`apiClient.notifications.clearAll`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        # Settings & Activity
        [Paragraph("<b>GET</b> `/users/me/settings`", styles["TableCellBold"]), Paragraph("SettingsController<br/>`getSettings()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`user_settings`", styles["TableCell"]), Paragraph("`apiClient.settings.getSettings`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>PATCH</b> `/users/me/settings`", styles["TableCellBold"]), Paragraph("SettingsController<br/>`updateSettings()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`user_settings`", styles["TableCell"]), Paragraph("`apiClient.settings.updateSettings`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        [Paragraph("<b>GET</b> `/activity/summary`", styles["TableCellBold"]), Paragraph("ActivityController<br/>`getSummary()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`profile_views`, `interests`, `shortlists`", styles["TableCell"]), Paragraph("`apiClient.activity.getSummary`<br/><font color='#059669'><b>Active</b></font>", styles["TableCell"])],
        # Plans & Payments
        [Paragraph("<b>GET</b> `/plans`", styles["TableCellBold"]), Paragraph("PlansController<br/>`getActivePlans()`", styles["TableCell"]), Paragraph("Public", styles["TableCell"]), Paragraph("`plans`", styles["TableCell"]), Paragraph("No Frontend Caller<br/><font color='#D97706'><b>Uncalled API</b></font>", styles["TableCell"])],
        [Paragraph("<b>POST</b> `/payments/orders`", styles["TableCellBold"]), Paragraph("PaymentsController<br/>`createOrder()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`payments`, `plans`, `profiles`", styles["TableCell"]), Paragraph("No Frontend Caller<br/><font color='#D97706'><b>Uncalled API</b></font>", styles["TableCell"])],
        [Paragraph("<b>POST</b> `/payments/verify`", styles["TableCellBold"]), Paragraph("PaymentsController<br/>`verifyPayment()`", styles["TableCell"]), Paragraph("JwtAuthGuard", styles["TableCell"]), Paragraph("`payments`, `subscriptions`, `plans`", styles["TableCell"]), Paragraph("No Frontend Caller<br/><font color='#D97706'><b>Uncalled API</b></font>", styles["TableCell"])],
        # Admin
        [Paragraph("<b>GET</b> `/admin/stats`", styles["TableCellBold"]), Paragraph("AdminController<br/>`getStats()`", styles["TableCell"]), Paragraph("JwtAuthGuard<br/>Roles(admin)", styles["TableCell"]), Paragraph("`users`, `profiles`, `subscriptions`, `verifications`", styles["TableCell"]), Paragraph("Backend Only<br/><font color='#D97706'><b>No UI Page</b></font>", styles["TableCell"])],
        [Paragraph("<b>GET</b> `/admin/verifications/pending`", styles["TableCellBold"]), Paragraph("AdminController<br/>`getPendingVerifications()`", styles["TableCell"]), Paragraph("JwtAuthGuard<br/>Roles(admin)", styles["TableCell"]), Paragraph("`verifications`", styles["TableCell"]), Paragraph("Backend Only<br/><font color='#D97706'><b>No UI Page</b></font>", styles["TableCell"])],
        [Paragraph("<b>PATCH</b> `/admin/verifications/:profileId`", styles["TableCellBold"]), Paragraph("AdminController<br/>`updateVerificationStatus()`", styles["TableCell"]), Paragraph("JwtAuthGuard<br/>Roles(admin)", styles["TableCell"]), Paragraph("`verifications`", styles["TableCell"]), Paragraph("Backend Only<br/><font color='#D97706'><b>No UI Page</b></font>", styles["TableCell"])],
    ]

    master_api_table = Table(api_table_data, colWidths=[110, 105, 75, 120, 122])
    master_api_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, CARD_BG]),
        ('PADDING', (0,0), (-1,-1), 2.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(master_api_table)

    story.append(PageBreak())

    # =========================================================================
    # 7. DATABASE ARCHITECTURE & ER SCHEMA SPECIFICATIONS
    # =========================================================================
    story.append(Paragraph("6. Database Architecture & Schema Specifications", styles["DocH1"]))
    story.append(Paragraph(
        "The Astalakshimi database layer consists of 18 PostgreSQL tables declared in `@astalakshimi/database` using Drizzle ORM. "
        "Every table uses UUID primary keys (`defaultRandom()`), strict foreign key cascade rules, timezone-aware timestamps, and enumerated domain types.",
        styles["DocBody"]
    ))

    er_table_data = [
        [Paragraph("Table Name", styles["TableHeader"]), Paragraph("Primary Key / Foreign Keys", styles["TableHeader"]), Paragraph("Key Columns & Enums", styles["TableHeader"]), Paragraph("Indexes & Constraints", styles["TableHeader"])],
        [
            Paragraph("`users`", styles["TableCellBold"]),
            Paragraph("`id` (UUID PK)", styles["TableCell"]),
            Paragraph("`phone` (VARCHAR 15), `is_phone_verified` (BOOL), `consent_accepted` (BOOL), `role` (enum: member, admin, moderator), `status` (enum: active, suspended)", styles["TableCell"]),
            Paragraph("UNIQUE (`phone`)", styles["TableCell"]),
        ],
        [
            Paragraph("`profiles`", styles["TableCellBold"]),
            Paragraph("`id` (UUID PK)<br/>`user_id` (FK → users.id ON DELETE CASCADE)", styles["TableCell"]),
            Paragraph("`profile_code` (VARCHAR 20), `full_name`, `gender` (enum), `dob` (DATE), `height_cm` (INT), `marital_status` (enum), `city`, `caste`, `education_level` (enum), `annual_income`, `photo_privacy` (enum)", styles["TableCell"]),
            Paragraph("UNIQUE (`user_id`)<br/>UNIQUE (`profile_code`)<br/>INDEX (`gender`, `religion`, `caste`, `city`)<br/>INDEX (`dob`)", styles["TableCell"]),
        ],
        [
            Paragraph("`profile_photos`", styles["TableCellBold"]),
            Paragraph("`id` (UUID PK)<br/>`profile_id` (FK → profiles.id CASCADE)", styles["TableCell"]),
            Paragraph("`s3_key` (VARCHAR 500), `is_primary` (BOOL), `display_order` (INT), `status` (enum: pending, approved, rejected)", styles["TableCell"]),
            Paragraph("INDEX (`profile_id`, `is_primary`)", styles["TableCell"]),
        ],
        [
            Paragraph("`family_details`", styles["TableCellBold"]),
            Paragraph("`id` (UUID PK)<br/>`profile_id` (FK → profiles.id CASCADE)", styles["TableCell"]),
            Paragraph("`family_values` (enum: Traditional, Moderate, Liberal), `family_type` (enum: Nuclear, Joint), `father_occupation`, `mother_occupation`, `brothers_count`, `sisters_count`", styles["TableCell"]),
            Paragraph("UNIQUE (`profile_id`)", styles["TableCell"]),
        ],
        [
            Paragraph("`lifestyle_interests`", styles["TableCellBold"]),
            Paragraph("`id` (UUID PK)<br/>`profile_id` (FK → profiles.id CASCADE)", styles["TableCell"]),
            Paragraph("`diet` (enum: Vegetarian, Non-vegetarian, Eggetarian, Jain, Vegan), `smoking` (enum), `alcohol` (enum), `interests` (JSONB)", styles["TableCell"]),
            Paragraph("UNIQUE (`profile_id`)", styles["TableCell"]),
        ],
        [
            Paragraph("`horoscopes`", styles["TableCellBold"]),
            Paragraph("`id` (UUID PK)<br/>`profile_id` (FK → profiles.id CASCADE)", styles["TableCell"]),
            Paragraph("`birth_time`, `birth_place`, `manglik` (enum: Yes, No, Don't Know), `rashi`, `nakshatra`, `horoscope_s3_key` (VARCHAR 500), `file_name`", styles["TableCell"]),
            Paragraph("UNIQUE (`profile_id`)", styles["TableCell"]),
        ],
        [
            Paragraph("`partner_preferences`", styles["TableCellBold"]),
            Paragraph("`id` (UUID PK)<br/>`profile_id` (FK → profiles.id CASCADE)", styles["TableCell"]),
            Paragraph("`pref_age_min`, `pref_age_max`, `pref_height_min_cm`, `pref_height_max_cm`, `pref_marital_statuses` (JSONB), `pref_religions` (JSONB), `pref_castes` (JSONB), `pref_mother_tongues` (JSONB)", styles["TableCell"]),
            Paragraph("UNIQUE (`profile_id`)", styles["TableCell"]),
        ],
        [
            Paragraph("`verifications`", styles["TableCellBold"]),
            Paragraph("`id` (UUID PK)<br/>`profile_id` (FK → profiles.id CASCADE)", styles["TableCell"]),
            Paragraph("`method` (enum: selfie, govt_id), `selfie_s3_key`, `govt_id_type` (enum: Aadhaar, PAN card, Passport, Driving licence, Voter ID), `govt_id_s3_key`, `status` (enum: idle, pending, verified, rejected)", styles["TableCell"]),
            Paragraph("UNIQUE (`profile_id`)", styles["TableCell"]),
        ],
        [
            Paragraph("`interests`", styles["TableCellBold"]),
            Paragraph("`id` (UUID PK)<br/>`sender_profile_id` (FK → profiles.id)<br/>`receiver_profile_id` (FK → profiles.id)", styles["TableCell"]),
            Paragraph("`status` (enum: pending, accepted, declined, withdrawn), `message` (TEXT), `responded_at` (TIMESTAMPTZ)", styles["TableCell"]),
            Paragraph("UNIQUE (`sender_profile_id`, `receiver_profile_id`)", styles["TableCell"]),
        ],
        [
            Paragraph("`messages`", styles["TableCellBold"]),
            Paragraph("`id` (UUID PK)<br/>`sender_profile_id` (FK → profiles.id)<br/>`receiver_profile_id` (FK → profiles.id)", styles["TableCell"]),
            Paragraph("`thread_id` (VARCHAR 255), `text` (TEXT), `is_read` (BOOL DEFAULT false), `created_at` (TIMESTAMPTZ)", styles["TableCell"]),
            Paragraph("INDEX (`thread_id`)<br/>INDEX (`sender_profile_id`, `receiver_profile_id`)", styles["TableCell"]),
        ],
        [
            Paragraph("`shortlists`", styles["TableCellBold"]),
            Paragraph("`id` (UUID PK)<br/>`profile_id` (FK → profiles.id CASCADE)<br/>`target_profile_id` (FK → profiles.id CASCADE)", styles["TableCell"]),
            Paragraph("`created_at` (TIMESTAMPTZ)", styles["TableCell"]),
            Paragraph("UNIQUE (`profile_id`, `target_profile_id`)", styles["TableCell"]),
        ],
        [
            Paragraph("`notifications`", styles["TableCellBold"]),
            Paragraph("`id` (UUID PK)<br/>`user_id` (FK → users.id CASCADE)<br/>`actor_profile_id` (FK → profiles.id)", styles["TableCell"]),
            Paragraph("`title` (VARCHAR 150), `body` (TEXT), `category` (VARCHAR 50), `kind` (VARCHAR 50), `is_read` (BOOL), `href` (TEXT)", styles["TableCell"]),
            Paragraph("INDEX (`user_id`, `is_read`)", styles["TableCell"]),
        ],
        [
            Paragraph("`plans`", styles["TableCellBold"]),
            Paragraph("`id` (UUID PK)", styles["TableCell"]),
            Paragraph("`slug` (VARCHAR 20: free, silver, gold, diamond), `name`, `price_paise` (INT), `duration_days` (INT), `interest_quota` (INT), `contact_unlocks` (INT), `has_advanced_filters` (BOOL)", styles["TableCell"]),
            Paragraph("UNIQUE (`slug`)", styles["TableCell"]),
        ],
        [
            Paragraph("`payments`", styles["TableCellBold"]),
            Paragraph("`id` (UUID PK)<br/>`user_id` (FK → users.id CASCADE)<br/>`plan_id` (FK → plans.id CASCADE)", styles["TableCell"]),
            Paragraph("`amount_paise` (INT), `currency` ('INR'), `provider` (enum: razorpay, phonepe), `provider_order_id`, `provider_payment_id`, `status` (enum: created, captured, failed, refunded)", styles["TableCell"]),
            Paragraph("UNIQUE (`provider_order_id`)<br/>UNIQUE (`provider_payment_id`)", styles["TableCell"]),
        ],
        [
            Paragraph("`subscriptions`", styles["TableCellBold"]),
            Paragraph("`id` (UUID PK)<br/>`user_id` (FK → users.id CASCADE)<br/>`plan_id` (FK → plans.id CASCADE)<br/>`payment_id` (FK → payments.id)", styles["TableCell"]),
            Paragraph("`status` (enum: active, expired, cancelled), `starts_at` (TIMESTAMPTZ), `expires_at` (TIMESTAMPTZ)", styles["TableCell"]),
            Paragraph("INDEX (`user_id`, `status`)", styles["TableCell"]),
        ],
        [
            Paragraph("`user_settings`", styles["TableCellBold"]),
            Paragraph("`id` (UUID PK)<br/>`user_id` (FK → users.id CASCADE)", styles["TableCell"]),
            Paragraph("`profile_visibility` (VARCHAR 20), `photo_blur` (VARCHAR 20: always, accepted, never), `hide_phone` (BOOL), `show_last_seen` (BOOL), `hide_from_users` (JSONB), `hide_from_cities` (JSONB)", styles["TableCell"]),
            Paragraph("UNIQUE (`user_id`)", styles["TableCell"]),
        ],
        [
            Paragraph("`profile_views`", styles["TableCellBold"]),
            Paragraph("`id` (UUID PK)<br/>`viewer_profile_id` (FK → profiles.id)<br/>`target_profile_id` (FK → profiles.id)", styles["TableCell"]),
            Paragraph("`created_at` (TIMESTAMPTZ)", styles["TableCell"]),
            Paragraph("UNIQUE (`viewer_profile_id`, `target_profile_id`)", styles["TableCell"]),
        ],
        [
            Paragraph("`otp_attempts`", styles["TableCellBold"]),
            Paragraph("`id` (UUID PK)", styles["TableCell"]),
            Paragraph("`phone` (VARCHAR 15), `otp_hash` (VARCHAR 255), `expires_at` (TIMESTAMPTZ), `verified` (BOOL), `attempts` (INT)", styles["TableCell"]),
            Paragraph("INDEX (`phone`, `created_at`)", styles["TableCell"]),
        ],
    ]
    er_table = Table(er_table_data, colWidths=[90, 125, 180, 137])
    er_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, CARD_BG]),
        ('PADDING', (0,0), (-1,-1), 3),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(er_table)

    story.append(PageBreak())

    # =========================================================================
    # 8. AUTHENTICATION, AUTHORIZATION & SECURITY AUDIT
    # =========================================================================
    story.append(Paragraph("7. Authentication, Authorization & Security Audit", styles["DocH1"]))
    story.append(Paragraph(
        "A rigorous security review was conducted across the codebase, identifying confirmed vulnerabilities, architectural security strengths, and missing security controls.",
        styles["DocBody"]
    ))

    # Security Strengths Box
    sec_strengths = (
        "<b>Architectural Security Strengths Implemented:</b><br/>"
        "• <b>BFF Cookie Protection:</b> JWT tokens are stored exclusively in HTTP-only, Secure, SameSite=Strict cookies (`astalakshimi.auth_token`), preventing XSS token theft from browser localStorage.<br/>"
        "• <b>Dual-Bucket Segregation:</b> Sensitive identity documents (Aadhaar, Passport, live selfies) are isolated in a private S3 vault with short-lived (15 min) admin-only presigned URLs.<br/>"
        "• <b>Payment HMAC Verification:</b> Razorpay webhook and client payments are verified using server-side SHA-256 HMAC cryptographic signature checks (`crypto.createHmac('sha256', secret)`)."
    )
    sec_strength_table = Table([[Paragraph(sec_strengths, styles["CalloutText"])]], colWidths=[532])
    sec_strength_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), SUCCESS_BG),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#059669")),
        ('PADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(sec_strength_table)
    story.append(Spacer(1, 8))

    # Vulnerability Table
    story.append(Paragraph("<b>Security Findings & Vulnerability Review:</b>", styles["DocH2"]))
    vuln_data = [
        [Paragraph("Vulnerability / Finding", styles["TableHeader"]), Paragraph("Severity & Status", styles["TableHeader"]), Paragraph("Evidence in Codebase", styles["TableHeader"]), Paragraph("Remediation Strategy", styles["TableHeader"])],
        [
            Paragraph("<b>Plaintext OTP Storage</b>", styles["TableCellBold"]),
            Paragraph("<font color='#DC2626'><b>P0 — Critical</b></font><br/>Confirmed Issue", styles["TableCell"]),
            Paragraph("`apps/api/src/auth/auth.service.ts:31`<br/>`// Save to PostgreSQL (TODO: add proper hashing for otpHash)`<br/>Inserts raw OTP digits into `otp_attempts.otpHash`.", styles["TableCell"]),
            Paragraph("Hash OTP with `bcrypt` or `argon2` before inserting into PostgreSQL. Verify using `bcrypt.compare()`.", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Unwired Entitlement Guard</b>", styles["TableCellBold"]),
            Paragraph("<font color='#D97706'><b>P1 — High</b></font><br/>Confirmed Issue", styles["TableCell"]),
            Paragraph("`apps/api/src/entitlements/entitlement.guard.ts`<br/>`@RequireEntitlement()` decorator created but never attached to `/search` or `/matches` controllers.", styles["TableCell"]),
            Paragraph("Attach `@UseGuards(EntitlementGuard)` and `@RequireEntitlement('advanced_filters')` to premium routes.", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Direct Schema Creation on Startup</b>", styles["TableCellBold"]),
            Paragraph("<font color='#D97706'><b>P1 — High</b></font><br/>Confirmed Issue", styles["TableCell"]),
            Paragraph("`apps/api/src/chat/chat.service.ts:21-34`<br/>`onModuleInit()` runs raw SQL `CREATE TABLE IF NOT EXISTS messages ...` on application startup.", styles["TableCell"]),
            Paragraph("Remove raw SQL from service startup lifecycle; manage all tables exclusively via Drizzle migrations.", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Unthrottled SMS / OTP Dispatch</b>", styles["TableCellBold"]),
            Paragraph("<font color='#D97706'><b>P1 — High</b></font><br/>Potential Risk", styles["TableCell"]),
            Paragraph("`POST /auth/send-otp` lacks IP and phone-number rate limiting guards.", styles["TableCell"]),
            Paragraph("Integrate `@nestjs/throttler` with Redis backend to enforce max 3 OTP requests per phone number per 10 minutes.", styles["TableCell"]),
        ],
        [
            Paragraph("<b>IDOR Exposure on Verification Docs</b>", styles["TableCellBold"]),
            Paragraph("<font color='#B45309'><b>P2 — Medium</b></font><br/>Architectural Risk", styles["TableCell"]),
            Paragraph("`apps/api/src/admin/admin.controller.ts`<br/>`PATCH /admin/verifications/:profileId` relies on `RolesGuard` but lacks audit logging of which admin reviewed the document.", styles["TableCell"]),
            Paragraph("Populate `verifications.reviewedBy = req.user.id` and `reviewedAt = new Date()` on approval/rejection.", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Mock Storage Remnants in Web</b>", styles["TableCellBold"]),
            Paragraph("<font color='#64748B'><b>P3 — Low</b></font><br/>Technical Debt", styles["TableCell"]),
            Paragraph("`apps/web/src/lib/profile-store.ts`<br/>Still writes serialized profile data to `sessionStorage` alongside server DB sync.", styles["TableCell"]),
            Paragraph("Deprecate `sessionStorage` caching; rely purely on TanStack Query cache backed by the REST API.", styles["TableCell"]),
        ],
    ]
    vuln_table = Table(vuln_data, colWidths=[105, 80, 177, 170])
    vuln_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, CARD_BG]),
        ('PADDING', (0,0), (-1,-1), 3.5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(vuln_table)

    story.append(PageBreak())

    # =========================================================================
    # 9. REDUNDANT, DEAD & UNUSED CODE AUDIT
    # =========================================================================
    story.append(Paragraph("8. Redundant, Dead & Unused Code Audit", styles["DocH1"]))
    story.append(Paragraph(
        "A systematic, file-by-file dead code audit was executed across the entire repository. "
        "Every candidate is classified by certainty level (High, Medium, Low) and supported by concrete codebase evidence.",
        styles["DocBody"]
    ))

    dead_code_data = [
        [Paragraph("File / Component Path", styles["TableHeader"]), Paragraph("Category", styles["TableHeader"]), Paragraph("Evidence & Codebase Analysis", styles["TableHeader"]), Paragraph("Confidence", styles["TableHeader"]), Paragraph("Action Recommendation", styles["TableHeader"])],
        [
            Paragraph("`apps/web/src/app/(dashboard)/search/page.tsx`", styles["TableCellBold"]),
            Paragraph("Duplicate Page", styles["TableCell"]),
            Paragraph("Broken duplicate of `/dashboard`. Calls `useMatchesQuery()` which returns `[]`. All active search is handled by `/dashboard` via `useSearchQuery`.", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>High</b></font>", styles["TableCell"]),
            Paragraph("<b>Delete Safely</b> or redirect `/search` to `/dashboard`.", styles["TableCell"]),
        ],
        [
            Paragraph("`apps/web/fix_ts.js`", styles["TableCellBold"]),
            Paragraph("Scratch Script", styles["TableCell"]),
            Paragraph("Temporary AST migration script used during initial cleanup. Not referenced by any build or test pipeline.", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>High</b></font>", styles["TableCell"]),
            Paragraph("<b>Delete Immediately</b>.", styles["TableCell"]),
        ],
        [
            Paragraph("`test-db.js`<br/>`apps/api/test-db.js`<br/>`packages/database/test-db.ts`", styles["TableCellBold"]),
            Paragraph("Scratch Scripts", styles["TableCell"]),
            Paragraph("One-off database connection debugging scripts containing hardcoded localhost connection strings.", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>High</b></font>", styles["TableCell"]),
            Paragraph("<b>Delete Immediately</b>.", styles["TableCell"]),
        ],
        [
            Paragraph("`apps/web/package-lock.json`", styles["TableCellBold"]),
            Paragraph("Redundant Lockfile", styles["TableCell"]),
            Paragraph("303 KB npm lockfile committed in `apps/web` while the monorepo root standard is `pnpm-lock.yaml`.", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>High</b></font>", styles["TableCell"]),
            Paragraph("<b>Delete Immediately</b>.", styles["TableCell"]),
        ],
        [
            Paragraph("`packages/config`", styles["TableCellBold"]),
            Paragraph("Empty Package", styles["TableCell"]),
            Paragraph("Contains only `.gitkeep`. Constants (plans, religions, enums) are duplicated in `apps/web/src/lib/plans.ts` and `apps/api/src/plans/plans.service.ts`.", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>High</b></font>", styles["TableCell"]),
            Paragraph("<b>Consolidate</b>: Move shared plan constants into this package.", styles["TableCell"]),
        ],
        [
            Paragraph("`packages/api-client`", styles["TableCellBold"]),
            Paragraph("Empty Package", styles["TableCell"]),
            Paragraph("Contains only `.gitkeep`. Spec originally planned a shared API client here, but it was embedded into `apps/web/src/lib/api-client.ts`.", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>High</b></font>", styles["TableCell"]),
            Paragraph("<b>Consolidate</b>: Extract `apps/web/src/lib/api-client.ts` into this package.", styles["TableCell"]),
        ],
        [
            Paragraph("`apps/api/src/entitlements/entitlement.guard.ts`", styles["TableCellBold"]),
            Paragraph("Unused Guard", styles["TableCell"]),
            Paragraph("`EntitlementGuard` and `@RequireEntitlement` decorator are declared but never attached to any route in any controller.", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>High</b></font>", styles["TableCell"]),
            Paragraph("<b>Wire Up</b> to protect premium discovery filters.", styles["TableCell"]),
        ],
        [
            Paragraph("`apps/api/src/media/media.controller.ts` (`confirm-photo`, `deletePhoto`)", styles["TableCellBold"]),
            Paragraph("Redundant APIs", styles["TableCell"]),
            Paragraph("Duplicate endpoints for `POST /profiles/me/photos` and `DELETE /profiles/me/photos/:photoId` in `ProfilesController`.", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>High</b></font>", styles["TableCell"]),
            Paragraph("<b>Consolidate</b> into `ProfilesController` or standard media service.", styles["TableCell"]),
        ],
        [
            Paragraph("`apps/web/src/components/layout/require-full-portal.tsx` (`if (!true)`)", styles["TableCellBold"]),
            Paragraph("Disabled Gate", styles["TableCell"]),
            Paragraph("Line 20 has hardcoded `if (!true)` which disables the profile completeness gate across all dashboard routes.", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>High</b></font>", styles["TableCell"]),
            Paragraph("<b>Refactor</b> to re-enable dynamic completeness checking.", styles["TableCell"]),
        ],
    ]
    dead_table = Table(dead_code_data, colWidths=[105, 75, 177, 65, 110])
    dead_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, CARD_BG]),
        ('PADDING', (0,0), (-1,-1), 3),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(dead_table)

    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>Architecture Gap Analysis (Specs vs Implementation Reality):</b>", styles["DocH2"]))

    gap_data = [
        [Paragraph("Architectural Dimension", styles["TableHeader"]), Paragraph("Intended Specification (`specs/*.md`)", styles["TableHeader"]), Paragraph("Actual Codebase Reality", styles["TableHeader"]), Paragraph("Evaluation", styles["TableHeader"])],
        [
            Paragraph("<b>API Client Location</b>", styles["TableCellBold"]),
            Paragraph("Shared package `packages/api-client` imported by web and future mobile app.", styles["TableCell"]),
            Paragraph("Local module `apps/web/src/lib/api-client.ts`; `packages/api-client` is an empty stub with `.gitkeep`.", styles["TableCell"]),
            Paragraph("<font color='#D97706'><b>Diverged</b></font>", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Shared Constants</b>", styles["TableCellBold"]),
            Paragraph("Shared package `packages/config` owning enums, limits, and plan tiers.", styles["TableCell"]),
            Paragraph("Scattered across `apps/web/src/lib/plans.ts` and `apps/api/src/plans/plans.service.ts`.", styles["TableCell"]),
            Paragraph("<font color='#D97706'><b>Diverged</b></font>", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Membership Plans</b>", styles["TableCellBold"]),
            Paragraph("Coherent subscription tiers with unified pricing and duration.", styles["TableCell"]),
            Paragraph("Backend seeds 4 plans (Free, Silver ₹999, Gold ₹2499, Diamond ₹4999). Frontend hardcodes 5 plans (Free, Silver ₹299, Gold ₹499, Platinum ₹899, Diamond ₹1299).", styles["TableCell"]),
            Paragraph("<font color='#DC2626'><b>Conflict</b></font>", styles["TableCell"]),
        ],
        [
            Paragraph("<b>Razorpay Integration</b>", styles["TableCellBold"]),
            Paragraph("End-to-end checkout with Razorpay modal, webhook verification, and subscription updates.", styles["TableCell"]),
            Paragraph("Backend implements full order creation & verification; web frontend uses simulated demo timeout checkout.", styles["TableCell"]),
            Paragraph("<font color='#D97706'><b>Incomplete UI</b></font>", styles["TableCell"]),
        ],
    ]
    gap_table = Table(gap_data, colWidths=[95, 145, 212, 80])
    gap_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, CARD_BG]),
        ('PADDING', (0,0), (-1,-1), 3.5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(gap_table)

    story.append(PageBreak())

    # =========================================================================
    # 10. DEPENDENCY & ENVIRONMENT VARIABLE AUDITS
    # =========================================================================
    story.append(Paragraph("9. Dependency & Environment Variable Audits", styles["DocH1"]))

    story.append(Paragraph("<b>Package Manifest Audit:</b>", styles["DocH2"]))
    dep_data = [
        [Paragraph("Package Name", styles["TableHeader"]), Paragraph("Declared Location", styles["TableHeader"]), Paragraph("Status / Usage Evidence", styles["TableHeader"]), Paragraph("Recommendation", styles["TableHeader"])],
        [
            Paragraph("`ts-morph`", styles["TableCellBold"]),
            Paragraph("`apps/web/package.json` (devDependencies)", styles["TableCell"]),
            Paragraph("<font color='#DC2626'><b>Unused in Production</b></font><br/>Was added only for `fix_ts.js` scratch script.", styles["TableCell"]),
            Paragraph("Remove dependency after deleting `fix_ts.js`.", styles["TableCell"]),
        ],
        [
            Paragraph("`crypto`", styles["TableCellBold"]),
            Paragraph("`apps/api/package.json` (dependencies)", styles["TableCell"]),
            Paragraph("<font color='#DC2626'><b>Redundant Package</b></font><br/>Node.js built-in module. No external npm package required.", styles["TableCell"]),
            Paragraph("Remove `crypto` from `package.json`.", styles["TableCell"]),
        ],
        [
            Paragraph("`@aws-sdk/client-s3`", styles["TableCellBold"]),
            Paragraph("`apps/api/package.json` (dependencies)", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Actively Used</b></font><br/>`apps/api/src/media/providers/s3.provider.ts`", styles["TableCell"]),
            Paragraph("Keep. Core S3 client.", styles["TableCell"]),
        ],
        [
            Paragraph("`@tanstack/react-query`", styles["TableCellBold"]),
            Paragraph("`apps/web/package.json` (dependencies)", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Actively Used</b></font><br/>`apps/web/src/hooks/queries.ts`", styles["TableCell"]),
            Paragraph("Keep. Core server state manager.", styles["TableCell"]),
        ],
        [
            Paragraph("`drizzle-orm` + `postgres`", styles["TableCellBold"]),
            Paragraph("`packages/database/package.json`", styles["TableCell"]),
            Paragraph("<font color='#059669'><b>Actively Used</b></font><br/>Database client and schema definitions.", styles["TableCell"]),
            Paragraph("Keep. Primary ORM layer.", styles["TableCell"]),
        ],
    ]
    dep_table = Table(dep_data, colWidths=[105, 130, 167, 130])
    dep_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, CARD_BG]),
        ('PADDING', (0,0), (-1,-1), 3.5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(dep_table)

    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>Environment Variable Inventory & Exposure Review:</b>", styles["DocH2"]))

    env_data = [
        [Paragraph("Variable Name", styles["TableHeader"]), Paragraph("Defined In", styles["TableHeader"]), Paragraph("Consumer / Service", styles["TableHeader"]), Paragraph("Exposure / Purpose", styles["TableHeader"]), Paragraph("Required", styles["TableHeader"])],
        [Paragraph("`DATABASE_URL`", styles["TableCellBold"]), Paragraph("`.env`", styles["TableCell"]), Paragraph("`packages/database/src/client.ts`<br/>`apps/api`", styles["TableCell"]), Paragraph("PostgreSQL connection string. Server-only secret.", styles["TableCell"]), Paragraph("Yes", styles["TableCell"])],
        [Paragraph("`JWT_SECRET`", styles["TableCellBold"]), Paragraph("`.env`", styles["TableCell"]), Paragraph("`apps/api/src/config/auth.config.ts`", styles["TableCell"]), Paragraph("HMAC key for signing JWT tokens. Server-only secret.", styles["TableCell"]), Paragraph("Yes", styles["TableCell"])],
        [Paragraph("`JWT_EXPIRES_IN`", styles["TableCellBold"]), Paragraph("`.env`", styles["TableCell"]), Paragraph("`apps/api/src/config/auth.config.ts`", styles["TableCell"]), Paragraph("Access token expiration (e.g., `30d`).", styles["TableCell"]), Paragraph("Yes", styles["TableCell"])],
        [Paragraph("`MOCK_OTP_ENABLED`", styles["TableCellBold"]), Paragraph("`.env`", styles["TableCell"]), Paragraph("`apps/api/src/auth/auth.service.ts`", styles["TableCell"]), Paragraph("Boolean flag enabling mock OTP (`123456`) in dev.", styles["TableCell"]), Paragraph("No", styles["TableCell"])],
        [Paragraph("`AWS_ACCESS_KEY_ID`", styles["TableCellBold"]), Paragraph("`.env`", styles["TableCell"]), Paragraph("`apps/api/src/media/providers/s3.provider.ts`", styles["TableCell"]), Paragraph("AWS IAM credentials for S3 operations.", styles["TableCell"]), Paragraph("Prod", styles["TableCell"])],
        [Paragraph("`AWS_SECRET_ACCESS_KEY`", styles["TableCellBold"]), Paragraph("`.env`", styles["TableCell"]), Paragraph("`apps/api/src/media/providers/s3.provider.ts`", styles["TableCell"]), Paragraph("AWS IAM secret key. High security sensitivity.", styles["TableCell"]), Paragraph("Prod", styles["TableCell"])],
        [Paragraph("`AWS_S3_MEDIA_BUCKET`", styles["TableCellBold"]), Paragraph("`.env`", styles["TableCell"]), Paragraph("`apps/api/src/config/storage.config.ts`", styles["TableCell"]), Paragraph("Public profile photos and horoscopes bucket.", styles["TableCell"]), Paragraph("Prod", styles["TableCell"])],
        [Paragraph("`AWS_S3_VAULT_BUCKET`", styles["TableCellBold"]), Paragraph("`.env`", styles["TableCell"]), Paragraph("`apps/api/src/config/storage.config.ts`", styles["TableCell"]), Paragraph("Private KYC document and selfie vault bucket.", styles["TableCell"]), Paragraph("Prod", styles["TableCell"])],
        [Paragraph("`CLOUDFRONT_URL`", styles["TableCellBold"]), Paragraph("`.env`", styles["TableCell"]), Paragraph("`apps/web/src/lib/utils.ts`", styles["TableCell"]), Paragraph("CDN domain for serving optimized public photos.", styles["TableCell"]), Paragraph("Prod", styles["TableCell"])],
        [Paragraph("`NEXT_PUBLIC_API_URL`", styles["TableCellBold"]), Paragraph("`.env`", styles["TableCell"]), Paragraph("`apps/web` BFF proxy handlers", styles["TableCell"]), Paragraph("Target backend URL for proxy (`http://localhost:4000/api`).", styles["TableCell"]), Paragraph("Yes", styles["TableCell"])],
        [Paragraph("`RAZORPAY_KEY_ID`", styles["TableCellBold"]), Paragraph("`.env`", styles["TableCell"]), Paragraph("`apps/api/src/payments/payments.service.ts`", styles["TableCell"]), Paragraph("Razorpay API public key.", styles["TableCell"]), Paragraph("Prod", styles["TableCell"])],
        [Paragraph("`RAZORPAY_KEY_SECRET`", styles["TableCellBold"]), Paragraph("`.env`", styles["TableCell"]), Paragraph("`apps/api/src/payments/payments.service.ts`", styles["TableCell"]), Paragraph("Razorpay API secret for signature verification.", styles["TableCell"]), Paragraph("Prod", styles["TableCell"])],
    ]
    env_table = Table(env_data, colWidths=[115, 45, 127, 195, 50])
    env_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, CARD_BG]),
        ('PADDING', (0,0), (-1,-1), 3),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(env_table)

    story.append(PageBreak())

    # =========================================================================
    # 11. BOTTLENECKS, ACTIONABLE ROADMAP & VERDICT
    # =========================================================================
    story.append(Paragraph("10. Performance Bottlenecks & Priority Action Matrix", styles["DocH1"]))
    story.append(Paragraph(
        "Senior engineering evaluation of system bottlenecks under 10× traffic load and prioritized remediation steps.",
        styles["DocBody"]
    ))

    priority_data = [
        [Paragraph("Priority", styles["TableHeader"]), Paragraph("Issue & Vulnerability", styles["TableHeader"]), Paragraph("Impact on Production", styles["TableHeader"]), Paragraph("Concrete Remediation Action", styles["TableHeader"])],
        [
            Paragraph("<font color='#DC2626'><b>P0 — Critical</b></font>", styles["TableCellBold"]),
            Paragraph("Plaintext OTP storage in PostgreSQL `otp_attempts` table.", styles["TableCell"]),
            Paragraph("Security breach risk: Any DB compromise exposes active login codes.", styles["TableCell"]),
            Paragraph("Hash OTP with `bcrypt`/`argon2` prior to insertion; compare hashes during verification.", styles["TableCell"]),
        ],
        [
            Paragraph("<font color='#DC2626'><b>P0 — Critical</b></font>", styles["TableCellBold"]),
            Paragraph("Raw SQL migration on startup in `ChatService.onModuleInit`.", styles["TableCell"]),
            Paragraph("Race conditions in multi-instance auto-scaling; bypasses Drizzle migration meta journal.", styles["TableCell"]),
            Paragraph("Generate proper Drizzle migration file for `messages` table and remove raw SQL from service.", styles["TableCell"]),
        ],
        [
            Paragraph("<font color='#D97706'><b>P1 — High</b></font>", styles["TableCellBold"]),
            Paragraph("N+1 DB queries in `ChatService.getThreads`.", styles["TableCell"]),
            Paragraph("Database connection exhaustion at scale; thread listing slows linearly with match count.", styles["TableCell"]),
            Paragraph("Replace `Promise.all` map loop with a single SQL query using `LEFT JOIN` and `COUNT(*) GROUP BY`.", styles["TableCell"]),
        ],
        [
            Paragraph("<font color='#D97706'><b>P1 — High</b></font>", styles["TableCellBold"]),
            Paragraph("Aggressive 3-second chat polling in `hooks/queries.ts`.", styles["TableCell"]),
            Paragraph("Overwhelming API compute: 1,000 active chat windows generate 20,000 HTTP requests/min.", styles["TableCell"]),
            Paragraph("Migrate chat transport to WebSockets (NestJS Gateway + Socket.io) or Server-Sent Events (SSE).", styles["TableCell"]),
        ],
        [
            Paragraph("<font color='#D97706'><b>P1 — High</b></font>", styles["TableCellBold"]),
            Paragraph("Memory-based total count in `SearchService.searchProfiles`.", styles["TableCell"]),
            Paragraph("Out-of-memory crashes: Fetches all matching profile IDs into memory to compute `.length`.", styles["TableCell"]),
            Paragraph("Execute a dedicated `SELECT COUNT(*)` query alongside the paginated query.", styles["TableCell"]),
        ],
        [
            Paragraph("<font color='#B45309'><b>P2 — Medium</b></font>", styles["TableCellBold"]),
            Paragraph("Plan tiers and pricing mismatch (Backend 4 vs Web 5).", styles["TableCell"]),
            Paragraph("Pricing confusion and payment failures during Razorpay order creation.", styles["TableCell"]),
            Paragraph("Align `apps/web/src/lib/plans.ts` with `packages/database/src/schema/plans.ts` or fetch plans dynamically from `GET /plans`.", styles["TableCell"]),
        ],
        [
            Paragraph("<font color='#64748B'><b>P3 — Low</b></font>", styles["TableCellBold"]),
            Paragraph("Leftover scratch scripts and duplicate npm lockfile (`apps/web/package-lock.json`).", styles["TableCell"]),
            Paragraph("Developer confusion and repository bloat.", styles["TableCell"]),
            Paragraph("Delete `apps/web/fix_ts.js`, `test-db.js`, `apps/api/test-db.js`, and `apps/web/package-lock.json`.", styles["TableCell"]),
        ],
    ]
    priority_table = Table(priority_data, colWidths=[70, 120, 152, 190])
    priority_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, CARD_BG]),
        ('PADDING', (0,0), (-1,-1), 3.5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(priority_table)

    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Final Architectural Verdict:</b>", styles["DocH2"]))

    verdict_text = (
        "<b>Architectural Coherence:</b> The Astalakshimi repository possesses a strong architectural foundation. "
        "The monorepo structure, BFF cookie authentication proxy, Drizzle schema relational design, and S3 dual-bucket vault separation "
        "are clean and production-oriented.<br/><br/>"
        "<b>Overengineered vs Underengineered Areas:</b><br/>"
        "• <i>Overengineered:</i> Redundant controller endpoints (multiple verbs and paths doing identical operations in `InterestsController` and `NotificationsController`).<br/>"
        "• <i>Underengineered:</i> Match scoring algorithm (hardcoded `limit(4)` without preference ranking) and real-time messaging (polling every 3s instead of WebSockets).<br/><br/>"
        "<b>What Breaks at 10× Traffic:</b><br/>"
        "1. <b>Chat Polling:</b> 3-second polling against `GET /chat/:threadId/messages` and `GET /chat/threads` will exhaust PostgreSQL connection pools.<br/>"
        "2. <b>Search Total Count:</b> `SearchService` pulling all IDs into memory to compute `.length` will exhaust Node.js heap memory on 50,000+ member profiles.<br/><br/>"
        "<b>Strategic Recommendation:</b> Address P0/P1 security and performance remediations first, delete confirmed dead artifacts (`fix_ts.js`, `package-lock.json`, `/search` page), "
        "and transition chat from HTTP polling to WebSockets before public launch."
    )
    verdict_table = Table([[Paragraph(verdict_text, styles["DocBody"])]], colWidths=[532])
    verdict_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), ACCENT_BG),
        ('BOX', (0,0), (-1,-1), 1, PRIMARY),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(verdict_table)

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated High-Level Design PDF: {filename}")

if __name__ == "__main__":
    output_path = "/Users/karikalanloganathan/Desktop/Astalakshimi/docs/Astalakshimi_Architecture_HLD_and_Codebase_Audit.pdf"
    build_pdf(output_path)
