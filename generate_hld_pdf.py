#!/usr/bin/env python3
"""
Astalakshimi Matrimony - High-Level Design (HLD) & Codebase Audit PDF Generator
Generates a comprehensive, professional, multi-page architectural documentation and audit report.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and render total page count
    along with running headers, footers, decorative lines, and watermarks.
    """
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
            self.draw_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_decorations(self, page_count):
        if self._pageNumber == 1:
            # First page is Cover Page - skip standard header/footer
            return

        self.saveState()
        
        # Running Top Header
        self.setFont('Helvetica-Bold', 7)
        self.setFillColor(colors.HexColor('#800020')) # Deep Maroon
        self.drawString(54, 752, 'ASTALAKSHIMI MATRIMONY')
        
        self.setFont('Helvetica', 7)
        self.setFillColor(colors.HexColor('#64748B')) # Slate Gray
        self.drawString(175, 752, '|   HIGH-LEVEL DESIGN (HLD) & COMPREHENSIVE CODEBASE AUDIT')
        
        self.drawRightString(558, 752, 'SYSTEM ARCHITECTURE')
        
        # Top Rule
        self.setStrokeColor(colors.HexColor('#CBD5E1'))
        self.setLineWidth(0.75)
        self.line(54, 744, 558, 744)
        
        # Bottom Rule
        self.setStrokeColor(colors.HexColor('#E2E8F0'))
        self.setLineWidth(0.75)
        self.line(54, 46, 558, 46)
        
        # Running Bottom Footer
        self.setFont('Helvetica-Bold', 7)
        self.setFillColor(colors.HexColor('#991B1B'))
        self.drawString(54, 34, 'CONFIDENTIAL')
        
        self.setFont('Helvetica', 7)
        self.setFillColor(colors.HexColor('#64748B'))
        self.drawString(125, 34, '— FOR INTERNAL ENGINEERING & ARCHITECTURAL USE ONLY')
        
        self.drawRightString(558, 34, f'Page {self._pageNumber} of {page_count}')
        
        self.restoreState()


def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    # Styles Setup
    styles = getSampleStyleSheet()

    # Custom Palette
    COLOR_PRIMARY = colors.HexColor('#800020')     # Deep Maroon
    COLOR_SECONDARY = colors.HexColor('#991B1B')   # Crimson
    COLOR_ACCENT = colors.HexColor('#B45309')      # Dark Amber / Gold
    COLOR_TEXT = colors.HexColor('#0F172A')        # Dark Slate
    COLOR_MUTED = colors.HexColor('#475569')       # Muted Slate
    COLOR_CODE_BG = colors.HexColor('#F8FAFC')     # Off-white / light slate
    COLOR_CALLOUT_BG = colors.HexColor('#FEF3C7')  # Light gold
    COLOR_CALLOUT_BORDER = colors.HexColor('#D97706') # Amber border

    # Typography Styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=32,
        textColor=COLOR_PRIMARY,
        alignment=TA_LEFT,
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=COLOR_MUTED,
        alignment=TA_LEFT,
    )

    meta_style = ParagraphStyle(
        'CoverMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=14,
        textColor=COLOR_MUTED,
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=COLOR_PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=15,
        textColor=COLOR_SECONDARY,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    )

    h3_style = ParagraphStyle(
        'SectionH3',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=COLOR_ACCENT,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=COLOR_TEXT,
        alignment=TA_LEFT,
        spaceAfter=5,
    )

    body_bold = ParagraphStyle(
        'BodyDarkBold',
        parent=body_style,
        fontName='Helvetica-Bold',
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=body_style,
        leftIndent=12,
        bulletIndent=4,
        spaceAfter=3,
    )

    code_style = ParagraphStyle(
        'CodeSnippet',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#0F172A'),
    )

    code_box_style = ParagraphStyle(
        'CodeBlock',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7,
        leading=9.5,
        textColor=colors.HexColor('#1E293B'),
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.white,
        alignment=TA_LEFT,
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=9.5,
        textColor=COLOR_TEXT,
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold',
    )

    table_cell_code = ParagraphStyle(
        'TableCellCode',
        parent=table_cell_style,
        fontName='Courier',
        fontSize=6.5,
        leading=8.5,
    )

    callout_text = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor('#78350F'),
    )

    story = []

    def add_callout(title, text, alert_type="warning"):
        border_col = colors.HexColor('#D97706') if alert_type == "warning" else colors.HexColor('#DC2626')
        bg_col = colors.HexColor('#FFFBEB') if alert_type == "warning" else colors.HexColor('#FEF2F2')
        txt_col = colors.HexColor('#92400E') if alert_type == "warning" else colors.HexColor('#991B1B')
        
        p_content = [
            Paragraph(f"<b>{title.upper()}</b>", ParagraphStyle('CTitle', parent=callout_text, fontName='Helvetica-Bold', textColor=txt_col)),
            Spacer(1, 2),
            Paragraph(text, ParagraphStyle('CText', parent=callout_text, textColor=txt_col))
        ]
        t = Table([[p_content]], colWidths=[504])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), bg_col),
            ('BOX', (0,0), (-1,-1), 1, border_col),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(Spacer(1, 4))
        story.append(t)
        story.append(Spacer(1, 4))

    def add_code_block(code_text):
        escaped = code_text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br/>').replace(' ', '&nbsp;')
        p = Paragraph(escaped, code_box_style)
        t = Table([[p]], colWidths=[504])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), COLOR_CODE_BG),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 7),
            ('RIGHTPADDING', (0,0), (-1,-1), 7),
        ]))
        story.append(Spacer(1, 3))
        story.append(t)
        story.append(Spacer(1, 4))

    # ==========================================
    # 1. COVER PAGE
    # ==========================================
    story.append(Spacer(1, 30))
    # Top decorative bar
    story.append(HRFlowable(width="100%", thickness=4, color=COLOR_PRIMARY, spaceBefore=0, spaceAfter=15))
    
    story.append(Paragraph("ASTALAKSHIMI MATRIMONY", title_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph("HIGH-LEVEL DESIGN (HLD), SYSTEM ARCHITECTURE & CODEBASE AUDIT", subtitle_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph("A Complete Technical Blueprint, Data Flow Tracing, and Repository Health Audit", ParagraphStyle('CoverDesc', parent=body_style, fontSize=9.5, leading=14, textColor=COLOR_MUTED)))
    
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_ACCENT, spaceBefore=12, spaceAfter=20))
    
    # Metadata Block
    meta_table_data = [
        [Paragraph("<b>Target Stack:</b>", meta_style), Paragraph("Next.js 16 (App Router) + React 19 + NestJS + Drizzle ORM + PostgreSQL + AWS S3", meta_style)],
        [Paragraph("<b>Repository Architecture:</b>", meta_style), Paragraph("pnpm Workspaces Monorepo + Turborepo Build Pipeline", meta_style)],
        [Paragraph("<b>Database Schema:</b>", meta_style), Paragraph("18 Relational Tables (PostgreSQL / AWS RDS)", meta_style)],
        [Paragraph("<b>Document Version:</b>", meta_style), Paragraph("2.0.0 (Comprehensive Repository Audit Edition)", meta_style)],
        [Paragraph("<b>Audit Date:</b>", meta_style), Paragraph("August 2026", meta_style)],
        [Paragraph("<b>Author / Role:</b>", meta_style), Paragraph("Senior Principal Software Architect & Lead Security Auditor", meta_style)],
        [Paragraph("<b>Classification:</b>", meta_style), Paragraph("<font color='#991B1B'><b>CONFIDENTIAL / INTERNAL ENGINEERING DISTRIBUTION ONLY</b></font>", meta_style)],
    ]
    t_meta = Table(meta_table_data, colWidths=[130, 374])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F1F5F9')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_meta)
    
    story.append(Spacer(1, 25))
    
    # Executive Highlights Card on Cover
    exec_highlights = [
        Paragraph("<b>EXECUTIVE AUDIT SUMMARY AT A GLANCE</b>", ParagraphStyle('ECoverTitle', parent=h3_style, textColor=COLOR_PRIMARY)),
        Spacer(1, 3),
        Paragraph("• <b>Dual-Stack Monorepo:</b> The frontend (<code>apps/web</code>) is a modern Next.js 16 App Router application with TanStack Query and Tailwind CSS. The backend (<code>apps/api</code>) is a modular NestJS service connecting to PostgreSQL via Drizzle ORM.", body_style),
        Paragraph("• <b>Active Core Engine:</b> 12 complete domains are active, including Passwordless Phone OTP Auth, Profile Discovery & Filtering, Interest & Interaction Handlers, 1-on-1 Messaging Threads, S3 Media/Vault Uploads, Razorpay Subscriptions, and Admin Verification.", body_style),
        Paragraph("• <b>Key Audit Findings:</b> 35 empty 0-byte placeholder files detected; duplicate controller aliases present in API (e.g., <code>/interests</code> vs <code>/interactions</code>); 8 root scratch fix scripts ready for immediate deletion; token storage in <code>localStorage</code> requires migration to secure HTTP-only cookies.", body_style),
    ]
    t_exec = Table([[exec_highlights]], colWidths=[504])
    t_exec.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FEF3C7')),
        ('BOX', (0,0), (-1,-1), 1.5, COLOR_CALLOUT_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_exec)

    story.append(PageBreak())

    # ==========================================
    # 2. TABLE OF CONTENTS & EXECUTIVE SUMMARY
    # ==========================================
    story.append(Paragraph("1. Table of Contents & Executive Summary", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_PRIMARY, spaceBefore=2, spaceAfter=8))
    
    story.append(Paragraph("<b>Table of Contents</b>", h2_style))
    toc_data = [
        [Paragraph("1. Table of Contents & Executive Summary", table_cell_bold), Paragraph("Page 2", table_cell_style)],
        [Paragraph("2. Repository Discovery, Tech Stack & Repository Map", table_cell_bold), Paragraph("Page 3", table_cell_style)],
        [Paragraph("3. End-to-End System Architecture & Data Flow Lifecycle", table_cell_bold), Paragraph("Page 4", table_cell_style)],
        [Paragraph("4. Complete Database Architecture & Relational ER Model (18 Tables)", table_cell_bold), Paragraph("Page 5", table_cell_style)],
        [Paragraph("5. Authentication, Authorization & Entitlements Engine", table_cell_bold), Paragraph("Page 7", table_cell_style)],
        [Paragraph("6. Master API Inventory & Endpoints Reference", table_cell_bold), Paragraph("Page 8", table_cell_style)],
        [Paragraph("7. Concrete Feature-by-Feature Implementation Workflows (12 Domains)", table_cell_bold), Paragraph("Page 10", table_cell_style)],
        [Paragraph("8. Frontend & Backend Architecture Deep Dive", table_cell_bold), Paragraph("Page 14", table_cell_style)],
        [Paragraph("9. Comprehensive Codebase Audit: Dead, Redundant & Unused Code", table_cell_bold), Paragraph("Page 16", table_cell_style)],
        [Paragraph("10. Environment Variables, Security, and Scalability Review", table_cell_bold), Paragraph("Page 18", table_cell_style)],
        [Paragraph("11. Actual Architecture vs. Intended Architecture (Gap Analysis)", table_cell_bold), Paragraph("Page 20", table_cell_style)],
        [Paragraph("12. Master Feature Matrix & Complete File/Folder Audit", table_cell_bold), Paragraph("Page 21", table_cell_style)],
        [Paragraph("13. Actionable Cleanup Plan, Priority Matrix & Final Verdict", table_cell_bold), Paragraph("Page 23", table_cell_style)],
    ]
    t_toc = Table(toc_data, colWidths=[420, 84])
    t_toc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_toc)
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>Executive Summary</b>", h2_style))
    story.append(Paragraph(
        "<b>Astalakshimi Matrimony</b> is an enterprise-grade matrimonial platform designed for the South Indian diaspora. "
        "The system has evolved from an early client-side prototype into a decoupled, monorepo-based architecture featuring a high-performance "
        "Next.js 16 frontend and a robust NestJS backend backed by PostgreSQL (managed via Drizzle ORM) and AWS S3.",
        body_style
    ))
    story.append(Paragraph(
        "This High-Level Design (HLD) and Codebase Audit document was compiled through systematic static code analysis, route and dependency tracing, "
        "schema inspection, and end-to-end request verification. It provides a ground-truth architectural blueprint of the actual codebase, "
        "documenting how data flows from user interactions to database transactions and back, while identifying technical debt, orphaned files, and security considerations.",
        body_style
    ))

    # ==========================================
    # 3. REPOSITORY DISCOVERY & TECH STACK
    # ==========================================
    story.append(Spacer(1, 8))
    story.append(Paragraph("2. Repository Discovery, Tech Stack & Repository Map", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_PRIMARY, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph("<b>Technology Stack Inventory (Confirmed from Codebase)</b>", h2_style))
    tech_data = [
        [Paragraph("Layer", table_header_style), Paragraph("Technology / Framework", table_header_style), Paragraph("Version / Package", table_header_style), Paragraph("Architectural Role in Repository", table_header_style)],
        [Paragraph("Frontend Framework", table_cell_bold), Paragraph("Next.js (App Router)", table_cell_style), Paragraph("16.3.1 (React 19.2.8)", table_cell_code), Paragraph("Server/Client Component Rendering, App Layouts, Routing", table_cell_style)],
        [Paragraph("UI & Styling", table_cell_bold), Paragraph("Tailwind CSS v4 + Radix UI + shadcn", table_cell_style), Paragraph("^4.0.0 / ^1.6.7", table_cell_code), Paragraph("Design tokens, responsive UI primitives, modal/dropdown state", table_cell_style)],
        [Paragraph("State & Data Fetching", table_cell_bold), Paragraph("TanStack React Query", table_cell_style), Paragraph("^5.101.4", table_cell_code), Paragraph("Server-state caching, optimistic updates, query invalidation", table_cell_style)],
        [Paragraph("Forms & Validation", table_cell_bold), Paragraph("React Hook Form + Zod", table_cell_style), Paragraph("^7.85.0 / ^3.24.2", table_cell_code), Paragraph("Client-side validation schemas and multi-step onboarding wizard", table_cell_style)],
        [Paragraph("Backend Framework", table_cell_bold), Paragraph("NestJS (Express HTTP Adapter)", table_cell_style), Paragraph("^11.0.1", table_cell_code), Paragraph("Modular REST API, Dependency Injection, Controller routing", table_cell_style)],
        [Paragraph("Database & ORM", table_cell_bold), Paragraph("PostgreSQL + Drizzle ORM", table_cell_style), Paragraph("drizzle-orm ^0.38.4", table_cell_code), Paragraph("Relational persistence, Drizzle schema, migrations, type inference", table_cell_style)],
        [Paragraph("Authentication", table_cell_bold), Paragraph("Passport JWT + Phone OTP", table_cell_style), Paragraph("@nestjs/jwt ^11.0.0", table_cell_code), Paragraph("Passwordless 6-digit OTP verification, JWT Bearer strategy", table_cell_style)],
        [Paragraph("Object Storage", table_cell_bold), Paragraph("AWS S3 + CloudFront (or Mock)", table_cell_style), Paragraph("@aws-sdk/client-s3 ^3.758", table_cell_code), Paragraph("Presigned upload URLs for profile photos, KYC vault, horoscopes", table_cell_style)],
        [Paragraph("Payment Gateway", table_cell_bold), Paragraph("Razorpay Node SDK", table_cell_style), Paragraph("razorpay ^2.9.6", table_cell_code), Paragraph("Order creation and HMAC SHA256 webhook signature verification", table_cell_style)],
        [Paragraph("Monorepo Tooling", table_cell_bold), Paragraph("pnpm Workspaces + Turborepo", table_cell_style), Paragraph("pnpm 9.15.9 / Node 22.x", table_cell_code), Paragraph("Package hoisting, workspace dependency linking, cached builds", table_cell_style)],
    ]
    t_tech = Table(tech_data, colWidths=[80, 110, 95, 219])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_tech)
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>Repository Directory Structure Map</b>", h2_style))
    add_code_block("""Astalakshimi/
├── apps/
│   ├── web/                     # Next.js 16 Frontend App (Port 3000)
│   │   ├── src/app/             # App Router routes: (public), (auth), (dashboard), profiles/
│   │   ├── src/components/      # UI components: ui/, layout/, dashboard/, profile/, signup/
│   │   ├── src/hooks/           # queries.ts (34 TanStack Query hooks)
│   │   └── src/lib/             # api-client.ts, profile-store.ts, plans.ts, validation.ts
│   └── api/                     # NestJS API Backend (Port 4000)
│       └── src/                 # 15 Modules: auth, profiles, search, matches, interests,
│                                # shortlists, messaging, notifications, media, payments, plans...
├── packages/
│   ├── database/                # Drizzle schema (18 models), migrations, client singleton
│   ├── types/                   # Shared TypeScript interfaces (User, Profile, Media, Prefs)
│   ├── validation/              # Shared Zod validation schemas (auth, profile, media, prefs)
│   ├── api-client/              # (Empty package with .gitkeep - Unused)
│   └── config/                  # (Empty package with .gitkeep - Unused)
├── specs/                       # Architectural specifications & UI/UX guidelines
├── infrastructure/              # Docker & Docker Compose configuration templates
└── docs/                        # PDF HLD Architecture and Design Deliverables""")

    story.append(PageBreak())

    # ==========================================
    # 4. SYSTEM ARCHITECTURE & DATA FLOW
    # ==========================================
    story.append(Paragraph("3. End-to-End System Architecture & Data Flow Lifecycle", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_PRIMARY, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph("<b>End-to-End System Topology Diagram</b>", h2_style))
    add_code_block("""+-----------------------------------------------------------------------------------------+
|                                    CLIENT TIER (BROWSER)                                |
|  Next.js 16 Web App  •  React 19 Components  •  TanStack Query Cache  •  React Hook Form|
+--------------------------------------------+--------------------------------------------+
                                             | HTTP / REST (Bearer JWT Auth)
                                             v
+-----------------------------------------------------------------------------------------+
|                                  API GATEWAY / NESTJS API                               |
|  Global Exception Filter  •  Zod Validation Pipe  •  JwtAuthGuard  •  RolesGuard        |
+--------------------------------------------+--------------------------------------------+
       |                                     |                                     |
       v                                     v                                     v
+---------------+                    +---------------+                    +---------------+
|  CONTROLLERS  |                    | CONTROLLERS   |                    | CONTROLLERS   |
| Auth, Profiles|                    | Search, Chat  |                    | Payments, Media|
+-------+-------+                    +-------+-------+                    +-------+-------+
        |                                    |                                    |
        v                                    v                                    v
+---------------+                    +---------------+                    +---------------+
|   SERVICES    |                    |   SERVICES    |                    |   SERVICES    |
| ProfilesService                    | MessagingSvc  |                    | PaymentsService|
| InterestsSvc  |                    | SearchService |                    | S3Provider    |
+-------+-------+                    +-------+-------+                    +-------+-------+
        |                                    |                                    |
        +------------------+                 |                 +------------------+
                           v                 v                 v
+-----------------------------------------------------------------------------------------+
|                               PERSISTENCE & EXTERNAL SERVICES                           |
|  PostgreSQL Database (Drizzle ORM)  •  AWS S3 Media/Vault Buckets  •  Razorpay Payments |
+-----------------------------------------------------------------------------------------+""")

    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>Concrete Request-Response Lifecycle Flow</b>", h2_style))
    story.append(Paragraph(
        "Every incoming HTTP request follows a deterministic 11-step execution pipeline across architectural boundaries:",
        body_style
    ))
    
    flow_steps = [
        "<b>1. User Interaction:</b> User triggers an event (e.g. clicks 'Send Interest', submits filter form, or enters OTP).",
        "<b>2. React UI & Validation:</b> React Hook Form validates data against Zod schemas; mutation function is dispatched.",
        "<b>3. TanStack Query Hook:</b> Custom hook in <code>queries.ts</code> invokes <code>apiClient</code> with active auth token from <code>localStorage</code>.",
        "<b>4. HTTP Request:</b> Fetch client sends typed HTTP payload with <code>Authorization: Bearer &lt;JWT&gt;</code> header to <code>/api/*</code>.",
        "<b>5. Global Filters & Pipes:</b> NestJS executes <code>GlobalHttpExceptionFilter</code> and parameter validation pipes.",
        "<b>6. Authentication & Guard Layer:</b> <code>JwtAuthGuard</code> validates token signature via <code>JwtStrategy</code>; attaches <code>UserSession</code> to <code>req.user</code>.",
        "<b>7. Controller Dispatch:</b> Controller extracts route parameters, query strings, and body, delegating to domain service.",
        "<b>8. Service & Business Logic:</b> Service validates domain constraints, enforces entitlements/quotas, and manages transactions.",
        "<b>9. Drizzle ORM & PostgreSQL:</b> Typed SQL query executes against AWS RDS PostgreSQL database via pooled connection client.",
        "<b>10. Response Transformation:</b> Service maps entity models into secure DTOs, masking private data and applying photo blur policies.",
        "<b>11. State & UI Re-render:</b> TanStack Query receives JSON response, invalidates related query keys, and updates React DOM seamlessly.",
    ]
    for step in flow_steps:
        story.append(Paragraph(f"• {step}", bullet_style))

    # ==========================================
    # 5. DATABASE ARCHITECTURE & ER MODEL
    # ==========================================
    story.append(Spacer(1, 8))
    story.append(Paragraph("4. Complete Database Architecture & Relational ER Model", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_PRIMARY, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "The relational database schema is managed in <code>packages/database/src/schema/</code> using <b>Drizzle ORM</b>. "
        "It consists of <b>18 PostgreSQL tables</b> with strict referential integrity, cascading foreign keys, unique composite indexes, and typed PostgreSQL ENUMs.",
        body_style
    ))

    db_tables_summary = [
        [Paragraph("Table Name", table_header_style), Paragraph("Primary Key / Foreign Keys", table_header_style), Paragraph("Key Columns & Data Types", table_header_style), Paragraph("Indexes & Constraints", table_header_style)],
        [Paragraph("<code>users</code>", table_cell_bold), Paragraph("<code>id (UUID PK)</code>", table_cell_code), Paragraph("phone (VARCHAR 15, Unique), isPhoneVerified (BOOL), role (ENUM: member, admin, moderator), status (ENUM: active, suspended)", table_cell_style), Paragraph("Unique index on <code>phone</code>", table_cell_style)],
        [Paragraph("<code>profiles</code>", table_cell_bold), Paragraph("<code>id (UUID PK)</code><br/><code>userId -&gt; users(id) ON DELETE CASCADE</code>", table_cell_code), Paragraph("fullName, gender (ENUM), dob (DATE), religion, caste, educationLevel (ENUM), profession, annualIncome, city, state, photoPrivacy (ENUM)", table_cell_style), Paragraph("Composite index on <code>(gender, religion, caste, city)</code>, index on <code>dob</code>", table_cell_style)],
        [Paragraph("<code>family_details</code>", table_cell_bold), Paragraph("<code>id (UUID PK)</code><br/><code>profileId -&gt; profiles(id) ON DELETE CASCADE</code>", table_cell_code), Paragraph("familyValues (ENUM), familyType (ENUM), fatherOccupation (ENUM), motherOccupation (ENUM), brothersCount (INT), sistersCount (INT)", table_cell_style), Paragraph("Unique constraint on <code>profileId</code> (1-to-1)", table_cell_style)],
        [Paragraph("<code>lifestyle_interests</code>", table_cell_bold), Paragraph("<code>id (UUID PK)</code><br/><code>profileId -&gt; profiles(id) ON DELETE CASCADE</code>", table_cell_code), Paragraph("diet (ENUM), smoking (ENUM), drinking (ENUM), hobbies (JSONB), interests (JSONB)", table_cell_style), Paragraph("Unique constraint on <code>profileId</code> (1-to-1)", table_cell_style)],
        [Paragraph("<code>horoscopes</code>", table_cell_bold), Paragraph("<code>id (UUID PK)</code><br/><code>profileId -&gt; profiles(id) ON DELETE CASCADE</code>", table_cell_code), Paragraph("birthTime, birthPlace, manglik (ENUM), rashi, nakshatra, horoscopeS3Key, horoscopeFileName, horoscopeFileSizeBytes", table_cell_style), Paragraph("Unique constraint on <code>profileId</code> (1-to-1)", table_cell_style)],
        [Paragraph("<code>partner_preferences</code>", table_cell_bold), Paragraph("<code>id (UUID PK)</code><br/><code>profileId -&gt; profiles(id) ON DELETE CASCADE</code>", table_cell_code), Paragraph("prefAgeMin (INT), prefAgeMax (INT), prefHeightMinCm, prefHeightMaxCm, prefMaritalStatuses (JSONB), prefReligions (JSONB), prefCastes (JSONB)", table_cell_style), Paragraph("Unique constraint on <code>profileId</code> (1-to-1)", table_cell_style)],
        [Paragraph("<code>profile_photos</code>", table_cell_bold), Paragraph("<code>id (UUID PK)</code><br/><code>profileId -&gt; profiles(id) ON DELETE CASCADE</code>", table_cell_code), Paragraph("s3Key (VARCHAR 500), isPrimary (BOOL), displayOrder (INT), status (ENUM: pending, approved, rejected)", table_cell_style), Paragraph("Index on <code>(profileId, displayOrder)</code>", table_cell_style)],
        [Paragraph("<code>verifications</code>", table_cell_bold), Paragraph("<code>id (UUID PK)</code><br/><code>profileId -&gt; profiles(id)</code><br/><code>reviewedBy -&gt; users(id)</code>", table_cell_code), Paragraph("method (ENUM: selfie, govt_id), selfieS3Key, govtIdType (ENUM), govtIdS3Key, status (ENUM: idle, pending, verified, rejected), rejectionReason", table_cell_style), Paragraph("Unique constraint on <code>profileId</code> (1-to-1)", table_cell_style)],
        [Paragraph("<code>interests</code>", table_cell_bold), Paragraph("<code>id (UUID PK)</code><br/><code>senderProfileId -&gt; profiles(id)</code><br/><code>receiverProfileId -&gt; profiles(id)</code>", table_cell_code), Paragraph("status (ENUM: pending, accepted, declined, withdrawn), message (TEXT), createdAt, updatedAt", table_cell_style), Paragraph("Unique composite index on <code>(senderProfileId, receiverProfileId)</code>", table_cell_style)],
        [Paragraph("<code>shortlists</code>", table_cell_bold), Paragraph("<code>id (UUID PK)</code><br/><code>profileId -&gt; profiles(id)</code><br/><code>targetProfileId -&gt; profiles(id)</code>", table_cell_code), Paragraph("createdAt (TIMESTAMPTZ)", table_cell_style), Paragraph("Unique composite index on <code>(profileId, targetProfileId)</code>", table_cell_style)],
        [Paragraph("<code>plans</code>", table_cell_bold), Paragraph("<code>id (UUID PK)</code>", table_cell_code), Paragraph("slug (VARCHAR 50, Unique), name, pricePaise (INT), durationDays (INT), interestQuota (INT), contactUnlocks (INT), hasAdvancedFilters (BOOL), isActive", table_cell_style), Paragraph("Unique index on <code>slug</code>, index on <code>isActive</code>", table_cell_style)],
        [Paragraph("<code>payments</code>", table_cell_bold), Paragraph("<code>id (UUID PK)</code><br/><code>userId -&gt; users(id)</code><br/><code>planId -&gt; plans(id)</code>", table_cell_code), Paragraph("amountPaise (INT), currency (INR), provider (ENUM: razorpay, phonepe), providerOrderId, providerPaymentId, providerSignature, status (ENUM)", table_cell_style), Paragraph("Index on <code>(userId, status)</code>, index on <code>providerOrderId</code>", table_cell_style)],
        [Paragraph("<code>subscriptions</code>", table_cell_bold), Paragraph("<code>id (UUID PK)</code><br/><code>userId -&gt; users(id)</code><br/><code>planId -&gt; plans(id)</code>", table_cell_code), Paragraph("status (ENUM: active, expired, cancelled), startsAt, expiresAt, cancelledAt", table_cell_style), Paragraph("Index on <code>(userId, status)</code>, index on <code>expiresAt</code>", table_cell_style)],
        [Paragraph("<code>user_settings</code>", table_cell_bold), Paragraph("<code>id (UUID PK)</code><br/><code>userId -&gt; users(id) ON DELETE CASCADE</code>", table_cell_code), Paragraph("hideProfile (BOOL), hidePhone (BOOL), profileVisibility, showLastSeen, notifyEmail, notifySms, photoBlur, hideFromUsers (JSONB), hideFromCities (JSONB)", table_cell_style), Paragraph("Unique constraint on <code>userId</code> (1-to-1)", table_cell_style)],
        [Paragraph("<code>notifications</code>", table_cell_bold), Paragraph("<code>id (UUID PK)</code><br/><code>userId -&gt; users(id)</code><br/><code>actorProfileId -&gt; profiles(id)</code>", table_cell_code), Paragraph("title, body, category (interests, messages, profile, account), kind, href, isRead (BOOL), paidOnly (BOOL)", table_cell_style), Paragraph("Index on <code>(userId, isRead, createdAt)</code>", table_cell_style)],
        [Paragraph("<code>otp_attempts</code>", table_cell_bold), Paragraph("<code>id (UUID PK)</code>", table_cell_code), Paragraph("phone (VARCHAR 15), otpHash (VARCHAR 255), attempts (INT), verified (BOOL), expiresAt, consentAccepted (BOOL), referredBy", table_cell_style), Paragraph("Index on <code>(phone, createdAt)</code>", table_cell_style)],
        [Paragraph("<code>profile_views</code>", table_cell_bold), Paragraph("<code>id (UUID PK)</code><br/><code>viewerProfileId -&gt; profiles(id)</code><br/><code>targetProfileId -&gt; profiles(id)</code>", table_cell_code), Paragraph("viewedAt (TIMESTAMPTZ)", table_cell_style), Paragraph("Unique composite index on <code>(viewerProfileId, targetProfileId)</code>", table_cell_style)],
        [Paragraph("<code>messages</code>", table_cell_bold), Paragraph("<code>id (UUID PK)</code><br/><code>senderProfileId -&gt; profiles(id)</code><br/><code>receiverProfileId -&gt; profiles(id)</code>", table_cell_code), Paragraph("threadId (VARCHAR 255), text (TEXT), isRead (BOOL), createdAt (TIMESTAMPTZ)", table_cell_style), Paragraph("Index on <code>threadId</code>, index on <code>(senderProfileId, receiverProfileId)</code>", table_cell_style)],
    ]
    t_db = Table(db_tables_summary, colWidths=[75, 120, 195, 114])
    t_db.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_db)

    story.append(PageBreak())

    # ==========================================
    # 6. AUTHENTICATION & ENTITLEMENTS
    # ==========================================
    story.append(Paragraph("5. Authentication, Authorization & Entitlements Engine", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_PRIMARY, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph("<b>Passwordless Mobile OTP Authentication Flow</b>", h2_style))
    story.append(Paragraph(
        "Authentication is completely passwordless, relying on Indian mobile number (+91) verification with a 6-digit OTP. "
        "The workflow handles both user login and automatic registration upon first successful OTP verification:",
        body_style
    ))

    add_code_block("""[User Enters Mobile Number + Accepts Terms]
                    |
                    v
          POST /api/auth/send-otp
                    |
          AuthService.sendOtp()
          - Generates 6-digit OTP (mock '123456' or random crypto integer)
          - Saves record to 'otp_attempts' table with 300s TTL (expiresAt)
                    |
                    v
          [User Receives & Submits 6-digit OTP]
                    |
                    v
          POST /api/auth/verify-otp
                    |
          AuthService.verifyOtp()
          - Finds latest pending attempt in 'otp_attempts' where verified=false
          - Checks expiry (expiresAt > now()) and attempt limit (attempts < 5)
          - Verifies OTP match; increments attempt counter on failure
          - Sets verified = true
          - Finds or Creates user record in 'users' table
          - Signs JWT Access Token with payload: { sub: userId, phone, role }
                    |
                    v
          HTTP 200 OK: { accessToken, user, isNewUser, hasProfile }
                    |
                    v
          Frontend stores JWT in localStorage ('astalakshimi.auth_token')
          Routes user to /home (if hasProfile=true) or /register (if hasProfile=false)""")

    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>Security & Role-Based Access Control (RBAC)</b>", h2_style))
    story.append(Paragraph(
        "Endpoints are protected using three layers of NestJS guards and custom decorators:",
        body_style
    ))
    story.append(Paragraph("• <b><code>JwtAuthGuard</code> (Passport JWT):</b> Validates Bearer token from the <code>Authorization</code> HTTP header, decodes payload, queries active user status in PostgreSQL, and injects <code>UserSession</code> into the execution context.", bullet_style))
    story.append(Paragraph("• <b><code>RolesGuard</code> & <code>@Roles('admin', 'moderator')</code>:</b> Inspects user role extracted from token and enforces administrative privileges for back-office endpoints (e.g. <code>/api/admin/*</code>).", bullet_style))
    story.append(Paragraph("• <b><code>EntitlementGuard</code> & <code>@RequireEntitlement()</code>:</b> Checks active subscription plan in database to restrict premium features (e.g. advanced search filters, priority listing, and contact unlocks).", bullet_style))

    # ==========================================
    # 7. MASTER API INVENTORY
    # ==========================================
    story.append(Spacer(1, 8))
    story.append(Paragraph("6. Master API Inventory & Endpoints Reference", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_PRIMARY, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "The following master inventory documents every registered REST endpoint in the NestJS API, mapping its HTTP method, "
        "route path, controller, service implementation, database tables accessed, authentication requirement, and frontend caller:",
        body_style
    ))

    api_master_data = [
        [Paragraph("Method & Route", table_header_style), Paragraph("Controller & Service", table_header_style), Paragraph("DB Tables", table_header_style), Paragraph("Auth", table_header_style), Paragraph("Frontend Caller & Purpose", table_header_style)],
        # Auth
        [Paragraph("<code>POST /auth/send-otp</code>", table_cell_code), Paragraph("<code>AuthController<br/>AuthService.sendOtp()</code>", table_cell_style), Paragraph("<code>otp_attempts</code>", table_cell_code), Paragraph("Public", table_cell_style), Paragraph("<code>apiClient.auth.sendOtp</code><br/>Dispatches OTP to mobile", table_cell_style)],
        [Paragraph("<code>POST /auth/verify-otp</code>", table_cell_code), Paragraph("<code>AuthController<br/>AuthService.verifyOtp()</code>", table_cell_style), Paragraph("<code>otp_attempts, users, profiles</code>", table_cell_code), Paragraph("Public", table_cell_style), Paragraph("<code>apiClient.auth.verifyOtp</code><br/>Verifies OTP, issues JWT token", table_cell_style)],
        [Paragraph("<code>GET /auth/me</code>", table_cell_code), Paragraph("<code>AuthController<br/>AuthService.getMe()</code>", table_cell_style), Paragraph("<code>users, profiles</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.auth.getMe</code><br/>Session validation & profile check", table_cell_style)],
        # Profiles
        [Paragraph("<code>POST /profiles/complete-registration</code>", table_cell_code), Paragraph("<code>ProfilesController<br/>ProfilesService.completeRegistration()</code>", table_cell_style), Paragraph("<code>profiles, family, lifestyle, horoscopes, verifications</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.profiles.completeRegistration</code><br/>Creates 5 relational profile records", table_cell_style)],
        [Paragraph("<code>GET /profiles/me</code>", table_cell_code), Paragraph("<code>ProfilesController<br/>ProfilesService.getMyProfile()</code>", table_cell_style), Paragraph("<code>profiles, family, lifestyle, horoscopes, photos, verifications</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.profiles.getMyProfile</code><br/>Fetches logged-in user full profile", table_cell_style)],
        [Paragraph("<code>PATCH /profiles/me</code>", table_cell_code), Paragraph("<code>ProfilesController<br/>ProfilesService.updateMyProfile()</code>", table_cell_style), Paragraph("<code>profiles, family, lifestyle, horoscopes</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.profiles.updateMyProfile</code><br/>Updates user profile fields", table_cell_style)],
        [Paragraph("<code>GET /profiles/:id</code>", table_cell_code), Paragraph("<code>ProfilesController<br/>ProfilesService.getProfileById()</code>", table_cell_style), Paragraph("<code>profiles, family, lifestyle, horoscopes, photos, views</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.profiles.getProfileById</code><br/>Public/member profile view", table_cell_style)],
        [Paragraph("<code>POST /profiles/:id/visit</code>", table_cell_code), Paragraph("<code>ProfilesController<br/>ProfilesService.recordVisit()</code>", table_cell_style), Paragraph("<code>profile_views</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.profiles.recordVisit</code><br/>Logs profile visit timestamp", table_cell_style)],
        [Paragraph("<code>POST /profiles/me/photos</code>", table_cell_code), Paragraph("<code>ProfilesController<br/>ProfilesService.addPhoto()</code>", table_cell_style), Paragraph("<code>profile_photos</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.photos.add</code><br/>Attaches S3 key as profile photo", table_cell_style)],
        [Paragraph("<code>DELETE /profiles/me/photos/:id</code>", table_cell_code), Paragraph("<code>ProfilesController<br/>ProfilesService.deletePhoto()</code>", table_cell_style), Paragraph("<code>profile_photos</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.photos.remove</code><br/>Deletes photo record and S3 file", table_cell_style)],
        [Paragraph("<code>PUT /profiles/me/photos/order</code>", table_cell_code), Paragraph("<code>ProfilesController<br/>ProfilesService.reorderPhotos()</code>", table_cell_style), Paragraph("<code>profile_photos</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.photos.reorder</code><br/>Reorders photo display indices", table_cell_style)],
        # Search & Matches
        [Paragraph("<code>GET /search</code>", table_cell_code), Paragraph("<code>SearchController<br/>SearchService.searchProfiles()</code>", table_cell_style), Paragraph("<code>profiles, profile_photos, user_settings, interests</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.search.searchProfiles</code><br/>Filtered partner search query", table_cell_style)],
        [Paragraph("<code>GET /matches/top</code>", table_cell_code), Paragraph("<code>MatchesController<br/>MatchesService.getTopMatches()</code>", table_cell_style), Paragraph("<code>profiles, profile_photos, user_settings, interests</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.matches.getTop</code><br/>Dashboard recommended matches", table_cell_style)],
        [Paragraph("<code>GET /activity/summary</code>", table_cell_code), Paragraph("<code>ActivityController<br/>ActivityService.getSummary()</code>", table_cell_style), Paragraph("<code>interests, shortlists, profile_views, profiles</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.activity.getSummary</code><br/>Dashboard counters & activity feed", table_cell_style)],
        # Interests
        [Paragraph("<code>POST /interests</code> &amp; <code>/interactions</code>", table_cell_code), Paragraph("<code>InterestsController<br/>InterestsService.sendInterest()</code>", table_cell_style), Paragraph("<code>interests, notifications, profiles</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.interests.sendInterest</code><br/>Sends connection interest request", table_cell_style)],
        [Paragraph("<code>GET /interests/received</code>", table_cell_code), Paragraph("<code>InterestsController<br/>InterestsService.getReceivedInterests()</code>", table_cell_style), Paragraph("<code>interests, profiles, profile_photos</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.interests.getReceived</code><br/>Inbox received interests list", table_cell_style)],
        [Paragraph("<code>GET /interests/sent</code>", table_cell_code), Paragraph("<code>InterestsController<br/>InterestsService.getSentInterests()</code>", table_cell_style), Paragraph("<code>interests, profiles, profile_photos</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.interests.getSent</code><br/>Sent interests tracking", table_cell_style)],
        [Paragraph("<code>GET /interests/mutual</code>", table_cell_code), Paragraph("<code>InterestsController<br/>InterestsService.getMutualInterests()</code>", table_cell_style), Paragraph("<code>interests, profiles, profile_photos</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.interests.getMutual</code><br/>Accepted connections list", table_cell_style)],
        [Paragraph("<code>PATCH /interests/:id/accept</code>", table_cell_code), Paragraph("<code>InterestsController<br/>InterestsService.acceptInterest()</code>", table_cell_style), Paragraph("<code>interests, notifications</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.interests.accept</code><br/>Accepts pending interest", table_cell_style)],
        [Paragraph("<code>PATCH /interests/:id/decline</code>", table_cell_code), Paragraph("<code>InterestsController<br/>InterestsService.declineInterest()</code>", table_cell_style), Paragraph("<code>interests</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.interests.decline</code><br/>Declines pending interest", table_cell_style)],
        # Shortlists
        [Paragraph("<code>GET /shortlists</code> &amp; <code>/shortlist</code>", table_cell_code), Paragraph("<code>ShortlistsController<br/>ShortlistsService.getShortlists()</code>", table_cell_style), Paragraph("<code>shortlists, profiles, profile_photos</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.shortlists.getAll</code><br/>Fetches bookmarked profiles", table_cell_style)],
        [Paragraph("<code>POST /shortlists</code> &amp; <code>/shortlist</code>", table_cell_code), Paragraph("<code>ShortlistsController<br/>ShortlistsService.addShortlist()</code>", table_cell_style), Paragraph("<code>shortlists</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.shortlists.add</code><br/>Bookmarks a profile", table_cell_style)],
        [Paragraph("<code>DELETE /shortlists/:targetId</code>", table_cell_code), Paragraph("<code>ShortlistsController<br/>ShortlistsService.removeShortlist()</code>", table_cell_style), Paragraph("<code>shortlists</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.shortlists.remove</code><br/>Removes profile bookmark", table_cell_style)],
        # Messaging
        [Paragraph("<code>GET /chat/threads</code>", table_cell_code), Paragraph("<code>ChatController<br/>MessagingService.getThreads()</code>", table_cell_style), Paragraph("<code>messages, profiles, profile_photos, interests</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.chat.getThreads</code><br/>Conversation threads overview", table_cell_style)],
        [Paragraph("<code>GET /chat/:threadId/messages</code>", table_cell_code), Paragraph("<code>ChatController<br/>MessagingService.getMessages()</code>", table_cell_style), Paragraph("<code>messages, profiles</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.chat.getMessages</code><br/>Chat message history", table_cell_style)],
        [Paragraph("<code>POST /chat/:threadId/messages</code>", table_cell_code), Paragraph("<code>ChatController<br/>MessagingService.sendMessage()</code>", table_cell_style), Paragraph("<code>messages, notifications</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.chat.sendMessage</code><br/>Sends 1-on-1 message", table_cell_style)],
        # Media & S3
        [Paragraph("<code>POST /media/upload-url</code>", table_cell_code), Paragraph("<code>MediaController<br/>MediaService.getUploadUrl()</code>", table_cell_style), Paragraph("None (S3 SDK)", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.media.getUploadUrl</code><br/>Generates S3 presigned PUT URL", table_cell_style)],
        [Paragraph("<code>POST /media/confirm-photo</code>", table_cell_code), Paragraph("<code>MediaController<br/>MediaService.confirmPhoto()</code>", table_cell_style), Paragraph("<code>profile_photos, profiles</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("Signup &amp; Profile Edit photo upload", table_cell_style)],
        [Paragraph("<code>POST /media/confirm-verification</code>", table_cell_code), Paragraph("<code>MediaController<br/>MediaService.confirmVerification()</code>", table_cell_style), Paragraph("<code>verifications, profiles</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("Selfie / Govt ID KYC confirmation", table_cell_style)],
        # Payments & Plans
        [Paragraph("<code>GET /plans</code>", table_cell_code), Paragraph("<code>PlansController<br/>PlansService.getActivePlans()</code>", table_cell_style), Paragraph("<code>plans</code>", table_cell_code), Paragraph("Public", table_cell_style), Paragraph("<code>/plans</code> pricing page display", table_cell_style)],
        [Paragraph("<code>POST /payments/orders</code>", table_cell_code), Paragraph("<code>PaymentsController<br/>PaymentsService.createOrder()</code>", table_cell_style), Paragraph("<code>payments, plans, profiles</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>/checkout</code> Razorpay order init", table_cell_style)],
        [Paragraph("<code>POST /payments/verify</code>", table_cell_code), Paragraph("<code>PaymentsController<br/>PaymentsService.verifyPayment()</code>", table_cell_style), Paragraph("<code>payments, subscriptions, plans</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("Razorpay payment HMAC validation", table_cell_style)],
        # Notifications & Settings
        [Paragraph("<code>GET /notifications</code>", table_cell_code), Paragraph("<code>NotificationsController<br/>NotificationsService.getUserNotifications()</code>", table_cell_style), Paragraph("<code>notifications, profiles</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.notifications.getAll</code>", table_cell_style)],
        [Paragraph("<code>GET /users/me/settings</code>", table_cell_code), Paragraph("<code>SettingsController<br/>SettingsService.getSettings()</code>", table_cell_style), Paragraph("<code>user_settings</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.settings.getSettings</code>", table_cell_style)],
        [Paragraph("<code>PATCH /users/me/settings</code>", table_cell_code), Paragraph("<code>SettingsController<br/>SettingsService.updateSettings()</code>", table_cell_style), Paragraph("<code>user_settings</code>", table_cell_code), Paragraph("JWT", table_cell_style), Paragraph("<code>apiClient.settings.updateSettings</code>", table_cell_style)],
        # Admin & Health
        [Paragraph("<code>GET /admin/stats</code>", table_cell_code), Paragraph("<code>AdminController<br/>AdminService.getStats()</code>", table_cell_style), Paragraph("<code>users, profiles, subscriptions, verifications</code>", table_cell_code), Paragraph("Admin", table_cell_style), Paragraph("Admin Dashboard metric stats", table_cell_style)],
        [Paragraph("<code>GET /health</code>", table_cell_code), Paragraph("<code>HealthController<br/>Database health ping</code>", table_cell_style), Paragraph("Database SELECT 1", table_cell_code), Paragraph("Public", table_cell_style), Paragraph("Load balancer health check probe", table_cell_style)],
    ]
    t_api = Table(api_master_data, colWidths=[120, 110, 100, 40, 134])
    t_api.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 3),
        ('RIGHTPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_api)

    story.append(PageBreak())

    # ==========================================
    # 8. CONCRETE FEATURE WORKFLOWS (12 DOMAINS)
    # ==========================================
    story.append(Paragraph("7. Concrete Feature-by-Feature Implementation Workflows", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_PRIMARY, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "This section documents the exact, layer-by-layer request execution for all 12 primary application features, "
        "tracing user actions through React components, TanStack Query hooks, HTTP API calls, NestJS controllers, services, "
        "Drizzle ORM queries, and UI re-rendering.",
        body_style
    ))

    features = [
        ("Feature 1: Multi-Step Registration & Profile Creation Wizard",
         "User completes 6-step onboarding form (Basic Info, Family, Education/Career, Lifestyle, Horoscope, Photos).",
         "apps/web/src/app/(auth)/register/page.tsx -> handleStepComplete()",
         "POST /api/profiles/complete-registration",
         "ProfilesController.completeRegistration() -> ProfilesService.completeRegistration()",
         "Inserts into 'profiles', 'family_details', 'lifestyle_interests', 'horoscopes', and 'verifications' in a single logical transaction.",
         "Returns { success: true, profileId }; frontend caches profile in localStorage ('astalakshimi.profile') and TanStack Query, routing user to /home."),

        ("Feature 2: Dynamic Partner Discovery & Multi-Criteria Search",
         "User adjusts search criteria (Age range, Religion, Caste, City, Education, Income, Diet).",
         "apps/web/src/app/(dashboard)/search/page.tsx -> useSearchQuery(filters)",
         "GET /api/search?ageMin=24&ageMax=30&city=Chennai&community=Iyer",
         "SearchController.searchProfiles() -> SearchService.searchProfiles()",
         "Applies dynamic SQL WHERE filters, computes opposite gender, executes paginated SELECT with total count, joins primary photo and user_settings.",
         "Applies photo blur logic if unaccepted; returns { profiles, totalCount }; UI renders MatchListCard grid with compatibility badges."),

        ("Feature 3: Profile Detail Viewing & Privacy Enforcement",
         "User clicks on a match profile card to view comprehensive biodata and horoscopes.",
         "apps/web/src/app/profiles/[profileId]/page.tsx -> apiClient.profiles.getProfileById()",
         "GET /api/profiles/:id",
         "ProfilesController.getProfileById() -> ProfilesService.getProfileById()",
         "Fetches profile and 1-to-1 relations (family, lifestyle, horoscope, photos, verification status); logs visit record into 'profile_views'.",
         "Returns FullProfileView DTO with masked contact numbers if hidePhone=true; renders ProfileGallery and CompletenessRing."),

        ("Feature 4: Expressing Interest & Mutual Connection Workflow",
         "User clicks 'Send Interest' or 'Accept Interest' on a prospective profile.",
         "apps/web/src/components/profile/profile-action-bar.tsx -> useSendInterestMutation()",
         "POST /api/interests or PATCH /api/interests/:id/accept",
         "InterestsController -> InterestsService.sendInterest() / acceptInterest()",
         "Validates user plan interest quota; detects reciprocal interest to auto-accept; inserts or updates 'interests' record; dispatches notification.",
         "Returns updated interest record; TanStack Query invalidates ['activity', 'interests'] and ['activity', 'summary']; UI updates button to 'Interest Sent' or 'Connected'."),

        ("Feature 5: Shortlisting / Bookmarking Profiles",
         "User clicks star bookmark icon on profile card.",
         "apps/web/src/components/dashboard/match-list-card.tsx -> useToggleShortlistMutation()",
         "POST /api/shortlists (add) or DELETE /api/shortlists/:targetId (remove)",
         "ShortlistsController -> ShortlistsService.addShortlist() / removeShortlist()",
         "Inserts or deletes record in 'shortlists' table using composite key (profileId, targetProfileId).",
         "Optimistically toggles star fill color in UI; invalidates ['activity', 'shortlist'] query key."),

        ("Feature 6: Direct 1-on-1 Messaging & Conversation Threads",
         "Connected users send direct chat messages in conversation inbox.",
         "apps/web/src/app/(dashboard)/inbox/[threadId]/page.tsx -> useSendMessageMutation()",
         "POST /api/chat/:threadId/messages",
         "ChatController.sendMessage() -> MessagingService.sendMessage()",
         "Resolves recipient profile UUID; inserts message into 'messages' table; creates in-app notification record for recipient.",
         "Message appended to chat window; updates thread list unread counter and lastMessageAt timestamp."),

        ("Feature 7: Secure Media & KYC Verification Upload via S3 Presigned URLs",
         "User uploads selfie photo or Government ID document (Aadhaar / PAN) for badge verification.",
         "apps/web/src/components/signup/step-verify.tsx -> apiClient.media.getUploadUrl()",
         "POST /api/media/upload-url followed by Direct S3 PUT and POST /api/media/confirm-verification",
         "MediaController -> MediaService -> S3Provider.generateUploadUrl()",
         "Generates presigned PUT URL with 600s TTL pointing to private S3 vault bucket; after direct upload, updates 'verifications' status to 'pending'.",
         "UI reflects 'Verification Pending (12-hour SLA)'; Admin portal receives record for review."),

        ("Feature 8: Horoscope Attachment & Compatibility Matching",
         "User attaches horoscope PDF or enters birth chart details (Rashi, Nakshatra, Manglik).",
         "apps/web/src/app/(dashboard)/profile/edit/page.tsx -> apiClient.media.confirmHoroscope()",
         "POST /api/media/confirm-horoscope",
         "MediaController -> MediaService.confirmHoroscope()",
         "Inserts/updates 'horoscopes' record with S3 key and metadata (file size, filename, nakshatra).",
         "Profile detail page renders interactive Vedic horoscope card with downloadable chart."),

        ("Feature 9: Subscription Plans & Razorpay Payment Integration",
         "User upgrades from Free to Silver/Gold/Diamond plan on checkout page.",
         "apps/web/src/app/(dashboard)/checkout/page.tsx -> apiClient (Razorpay SDK)",
         "POST /api/payments/orders -> Client Checkout -> POST /api/payments/verify",
         "PaymentsController -> PaymentsService.createOrder() / verifyPayment()",
         "Creates Razorpay order; verifies HMAC SHA256 signature; creates record in 'payments'; creates active 'subscriptions' record.",
         "EntitlementsService updates user plan quota; unlocks contact numbers and advanced search filters."),

        ("Feature 10: In-App Notifications & Activity Feed",
         "System notifies user of new interests, accepted requests, profile views, or messages.",
         "apps/web/src/app/(dashboard)/notifications/page.tsx -> useNotificationsQuery()",
         "GET /api/notifications & PATCH /api/notifications/read-all",
         "NotificationsController -> NotificationsService.getUserNotifications() / markAllAsRead()",
         "Queries 'notifications' table filtered by userId, joining actor profile details; marks isRead=true.",
         "SiteHeader displays unread notification badge counter; clicking notification navigates to relevant screen."),

        ("Feature 11: Privacy Controls & Contact Masking",
         "User toggles photo blur mode ('always', 'when_not_connected', 'never') or hides profile/phone.",
         "apps/web/src/app/(dashboard)/settings/page.tsx -> useSaveSettingsMutation()",
         "PATCH /api/users/me/settings",
         "SettingsController.updateSettings() -> SettingsService.updateSettings()",
         "Updates 'user_settings' record with visibility booleans and JSON exclusion lists.",
         "Search and profile services immediately enforce privacy rules for other viewers."),

        ("Feature 12: Admin Verification & Compliance SLA Review",
         "Admin or moderator reviews submitted KYC documents and approves/rejects badges.",
         "apps/api/src/admin/admin.controller.ts (RolesGuard: 'admin', 'moderator')",
         "GET /api/admin/verifications/pending & PATCH /api/admin/verifications/:profileId",
         "AdminController -> AdminService.updateVerificationStatus()",
         "Queries pending KYC records; updates status to 'verified' or 'rejected' with reviewer UUID and timestamp.",
         "User profile displays green verified badge; unlocks full platform privileges.")
    ]

    for title, trigger, fe, api, be, db, resp in features:
        story.append(Paragraph(f"<b>{title}</b>", h3_style))
        story.append(Paragraph(f"• <b>Trigger / User Action:</b> {trigger}", body_style))
        story.append(Paragraph(f"• <b>Frontend Entry Point:</b> <code>{fe}</code>", body_style))
        story.append(Paragraph(f"• <b>API Endpoint:</b> <code>{api}</code>", body_style))
        story.append(Paragraph(f"• <b>Backend Controller & Service:</b> <code>{be}</code>", body_style))
        story.append(Paragraph(f"• <b>Database Transaction:</b> {db}", body_style))
        story.append(Paragraph(f"• <b>Response & UI Update:</b> {resp}", body_style))
        story.append(Spacer(1, 4))

    story.append(PageBreak())

    # ==========================================
    # 9. FRONTEND & BACKEND ARCHITECTURE
    # ==========================================
    story.append(Paragraph("8. Frontend & Backend Architecture Deep Dive", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_PRIMARY, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph("<b>Frontend Architecture (Next.js 16 App Router)</b>", h2_style))
    story.append(Paragraph(
        "The frontend application in <code>apps/web</code> leverages the Next.js 16 App Router with route groups to achieve "
        "strict separation between public marketing pages, authentication wizards, authenticated member dashboards, and standalone profile views:",
        body_style
    ))
    story.append(Paragraph("• <b><code>app/(public)/page.tsx</code>:</b> High-converting landing page with hero registration card, live countdown banner, testimonials, and city-based community previews.", bullet_style))
    story.append(Paragraph("• <b><code>app/(auth)/</code>:</b> <code>login/page.tsx</code> and <code>register/page.tsx</code> managing phone number input, OTP verification, and the 6-step registration flow.", bullet_style))
    story.append(Paragraph("• <b><code>app/(dashboard)/</code>:</b> Authenticated route group wrapped by <code>DashboardShell</code> with navigation header, sidebar, and mobile bottom bar: <code>home</code>, <code>dashboard</code>, <code>search</code>, <code>interests</code>, <code>shortlist</code>, <code>inbox</code>, <code>plans</code>, <code>checkout</code>, <code>settings</code>, and <code>notifications</code>.", bullet_style))
    story.append(Paragraph("• <b><code>app/profiles/[profileId]/</code>:</b> Dynamic member profile view with photo gallery, Vedic horoscope card, family background, and connection action bar.", bullet_style))
    story.append(Paragraph("• <b>Access Control Gates:</b> <code>RequireFullPortal</code> and <code>CompleteProfileGate</code> components guard member features, redirecting incomplete users to the registration wizard.", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>Backend Architecture (NestJS Modular Engine)</b>", h2_style))
    story.append(Paragraph(
        "The backend in <code>apps/api</code> is organized into cohesive domain modules managed by <code>AppModule</code> in <code>src/app.module.ts</code>. "
        "Each module encapsulates its controllers, services, DTOs, and database interactions:",
        body_style
    ))

    add_code_block("""AppModule (apps/api/src/app.module.ts)
├── DatabaseModule (Configures Drizzle ORM client singleton via DB_CLIENT token)
├── AuthModule (AuthService, AuthController, JwtStrategy, PassportModule, JwtModule)
├── ProfilesModule (ProfilesService, ProfilesController)
├── SearchModule (SearchService, SearchController)
├── MatchesModule (MatchesService, MatchesController)
├── InterestsModule (InterestsService, InterestsController, InteractionsController)
├── ShortlistsModule (ShortlistsService, ShortlistsController, ShortlistController)
├── MessagingModule (MessagingService, ChatController, MessagingController)
├── MediaModule (MediaService, MediaController, S3Provider)
├── PlansModule (PlansService, PlansController)
├── PaymentsModule (PaymentsService, PaymentsController)
├── EntitlementsModule (EntitlementsService, EntitlementGuard)
├── SettingsModule (SettingsService, SettingsController)
├── PreferencesModule (PreferencesService, PreferencesController)
├── ActivityModule (ActivityService, ActivityController)
├── NotificationsModule (NotificationsService, NotificationsController)
├── AdminModule (AdminService, AdminController)
└── HealthModule (HealthController)""")

    story.append(PageBreak())

    # ==========================================
    # 10. CODEBASE AUDIT & DEAD CODE
    # ==========================================
    story.append(Paragraph("9. Comprehensive Codebase Audit: Dead, Redundant & Unused Code", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_PRIMARY, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "A rigorous, systematic audit of every directory, file, class, function, and import was conducted to identify "
        "orphaned code, empty placeholder files, redundant controller aliases, and obsolete scripts.",
        body_style
    ))

    add_callout(
        "Critical Audit Finding: 35 Empty 0-Byte Files & Orphaned Folders",
        "The repository contains 35 zero-byte placeholder files across <code>apps/api/src/</code>. "
        "These were originally scaffolded during initial architecture planning for repository layers, background workers, "
        "notification channels, and third-party providers (e.g. PhonePe, Cognito, SQS workers). "
        "Because active business logic was implemented directly within the primary domain services, these 0-byte files are completely dead and should be cleaned up.",
        "warning"
    )

    story.append(Paragraph("<b>Audit Table: 0-Byte Empty Files & Scaffolded Modules</b>", h2_style))
    dead_code_data = [
        [Paragraph("File / Directory Path", table_header_style), Paragraph("Category / Type", table_header_style), Paragraph("Evidence & Analysis", table_header_style), Paragraph("Status & Recommendation", table_header_style)],
        [Paragraph("<code>apps/api/src/payments/providers/phonepe.provider.ts</code><br/><code>razorpay.provider.ts</code>, <code>payment.provider.ts</code>", table_cell_code), Paragraph("Empty Providers", table_cell_style), Paragraph("0 bytes. Razorpay logic is implemented directly inside <code>PaymentsService</code>.", table_cell_style), Paragraph("<font color='#DC2626'><b>Confirmed Unused</b></font><br/>Delete safely", table_cell_style)],
        [Paragraph("<code>apps/api/src/auth/providers/cognito.provider.ts</code><br/><code>auth.provider.ts</code>", table_cell_code), Paragraph("Empty Providers", table_cell_style), Paragraph("0 bytes. Auth uses local JWT + OTP inside <code>AuthService</code>. Cognito was optional spec.", table_cell_style), Paragraph("<font color='#DC2626'><b>Confirmed Unused</b></font><br/>Delete safely", table_cell_style)],
        [Paragraph("<code>apps/api/src/subscriptions/</code> (5 files)<br/><code>entitlement.service.ts</code>, <code>subscriptions.*.ts</code>", table_cell_code), Paragraph("Orphaned Module", table_cell_style), Paragraph("All 5 files are 0 bytes. Active entitlements logic lives in <code>src/entitlements/</code>.", table_cell_style), Paragraph("<font color='#DC2626'><b>Confirmed Unused</b></font><br/>Delete folder", table_cell_style)],
        [Paragraph("<code>apps/api/src/horoscope/</code> (3 files)<br/><code>horoscope.module.ts</code>, <code>controller.ts</code>, <code>service.ts</code>", table_cell_code), Paragraph("Orphaned Module", table_cell_style), Paragraph("All 3 files are 0 bytes. Horoscope operations are handled inside <code>MediaService</code> and <code>ProfilesService</code>.", table_cell_style), Paragraph("<font color='#DC2626'><b>Confirmed Unused</b></font><br/>Delete folder", table_cell_style)],
        [Paragraph("<code>apps/api/src/moderation/</code> (1 module + 3 gitkeeps)<br/><code>moderation.module.ts</code>, <code>blocks/</code>, <code>reports/</code>", table_cell_code), Paragraph("Orphaned Module", table_cell_style), Paragraph("0 bytes. Admin moderation is implemented in <code>AdminService</code>.", table_cell_style), Paragraph("<font color='#DC2626'><b>Confirmed Unused</b></font><br/>Delete folder", table_cell_style)],
        [Paragraph("<code>apps/api/src/jobs/</code> (5 files)<br/><code>media.jobs.ts</code>, <code>cleanup.jobs.ts</code>, <code>notification.jobs.ts</code>", table_cell_code), Paragraph("Orphaned Module", table_cell_style), Paragraph("All 5 files are 0 bytes. Background workers not yet provisioned with SQS.", table_cell_style), Paragraph("<font color='#DC2626'><b>Confirmed Unused</b></font><br/>Delete folder", table_cell_style)],
        [Paragraph("<code>apps/api/src/users/</code> (4 files)<br/><code>users.service.ts</code>, <code>users.controller.ts</code>, <code>users.*.ts</code>", table_cell_code), Paragraph("Orphaned Module", table_cell_style), Paragraph("All 4 files are 0 bytes. User queries are performed via <code>AuthService</code> and <code>ProfilesService</code>.", table_cell_style), Paragraph("<font color='#DC2626'><b>Confirmed Unused</b></font><br/>Delete folder", table_cell_style)],
        [Paragraph("<code>apps/api/src/notifications/channels/</code> (3 files)<br/><code>sms.channel.ts</code>, <code>email.channel.ts</code>, <code>in-app.channel.ts</code>", table_cell_code), Paragraph("Empty Channels", table_cell_style), Paragraph("0 bytes. In-app notifications are written directly to DB in <code>NotificationsService</code>.", table_cell_style), Paragraph("<font color='#DC2626'><b>Confirmed Unused</b></font><br/>Delete folder", table_cell_style)],
        [Paragraph("<code>apps/api/src/common/guards/entitlement.guard.ts</code>", table_cell_code), Paragraph("Duplicate Guard", table_cell_style), Paragraph("0 bytes. Active guard is <code>apps/api/src/entitlements/entitlement.guard.ts</code>.", table_cell_style), Paragraph("<font color='#DC2626'><b>Confirmed Unused</b></font><br/>Delete safely", table_cell_style)],
        [Paragraph("<code>apps/api/src/config/payment.config.ts</code>", table_cell_code), Paragraph("Empty Config", table_cell_style), Paragraph("0 bytes. Razorpay keys are read directly in <code>PaymentsService</code>.", table_cell_style), Paragraph("<font color='#DC2626'><b>Confirmed Unused</b></font><br/>Delete or populate", table_cell_style)],
        [Paragraph("<code>packages/api-client/</code> &amp; <code>packages/config/</code>", table_cell_code), Paragraph("Unused Packages", table_cell_style), Paragraph("Contains only <code>.gitkeep</code>. Frontend implements its own local <code>api-client.ts</code>.", table_cell_style), Paragraph("<font color='#D97706'><b>Strongly Appears Unused</b></font><br/>Consolidate or delete", table_cell_style)],
        [Paragraph("Root Scratch Scripts:<br/><code>fix_all.py</code>, <code>fix_final.py</code>, <code>fix_home.py</code>, <code>fix_libs.py</code>, <code>fix_portal.py</code>, <code>fix_queries.py</code>, <code>fix_remaining.py</code>, <code>apps/web/fix_ts.js</code>", table_cell_code), Paragraph("Migration Scripts", table_cell_style), Paragraph("Temporary migration scripts used to patch imports and mock data during initial refactoring.", table_cell_style), Paragraph("<font color='#DC2626'><b>Confirmed Unused</b></font><br/>Delete immediately", table_cell_style)],
    ]
    t_dead = Table(dead_code_data, colWidths=[140, 75, 175, 114])
    t_dead.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 3),
        ('RIGHTPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_dead)

    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>Redundant Controller Route Aliases</b>", h2_style))
    story.append(Paragraph(
        "To maintain backward compatibility during the frontend API transition, several controllers define duplicate class aliases "
        "in the same file, resulting in duplicate route bindings in NestJS:",
        body_style
    ))
    story.append(Paragraph("• <b><code>InterestsController</code> vs <code>InteractionsController</code></b> in <code>interests.controller.ts</code>: Binds identical handler logic to both <code>/interests/*</code> and <code>/interactions/*</code>.", bullet_style))
    story.append(Paragraph("• <b><code>ShortlistsController</code> vs <code>ShortlistController</code></b> in <code>shortlists.controller.ts</code>: Binds handlers to both plural <code>/shortlists</code> and singular <code>/shortlist</code>.", bullet_style))
    story.append(Paragraph("• <b><code>ChatController</code> vs <code>MessagingController</code></b> in <code>messaging.controller.ts</code>: Binds handlers to both <code>/chat/*</code> and <code>/messaging/*</code>.", bullet_style))
    story.append(Paragraph("<i>Recommendation:</i> Standardize the frontend on single canonical REST endpoints (<code>/interests</code>, <code>/shortlists</code>, <code>/chat</code>) and remove the secondary alias classes to streamline API routing.", body_style))

    story.append(PageBreak())

    # ==========================================
    # 11. ENVIRONMENT VARIABLES & SECURITY
    # ==========================================
    story.append(Paragraph("10. Environment Variables, Security, and Scalability Review", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_PRIMARY, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph("<b>Environment Variables Audit</b>", h2_style))
    env_data = [
        [Paragraph("Variable Name", table_header_style), Paragraph("Defined In", table_header_style), Paragraph("Read In", table_header_style), Paragraph("Purpose & Security Impact", table_header_style), Paragraph("Status", table_header_style)],
        [Paragraph("<code>DATABASE_URL</code>", table_cell_code), Paragraph(".env", table_cell_style), Paragraph("<code>database.config.ts</code>, <code>packages/database/src/client.ts</code>", table_cell_style), Paragraph("PostgreSQL connection string. Critical backend secret.", table_cell_style), Paragraph("Actively Used", table_cell_style)],
        [Paragraph("<code>JWT_SECRET</code>", table_cell_code), Paragraph(".env", table_cell_style), Paragraph("<code>auth.config.ts</code>, <code>jwt.strategy.ts</code>", table_cell_style), Paragraph("HMAC secret for signing access tokens. Must be strong in prod.", table_cell_style), Paragraph("Actively Used", table_cell_style)],
        [Paragraph("<code>JWT_EXPIRES_IN</code>", table_cell_code), Paragraph(".env", table_cell_style), Paragraph("<code>auth.config.ts</code>", table_cell_style), Paragraph("Token validity duration (default: 30d).", table_cell_style), Paragraph("Actively Used", table_cell_style)],
        [Paragraph("<code>OTP_TTL_SECONDS</code>", table_cell_code), Paragraph(".env", table_cell_style), Paragraph("<code>auth.config.ts</code>, <code>auth.service.ts</code>", table_cell_style), Paragraph("OTP expiration window in seconds (default: 300s).", table_cell_style), Paragraph("Actively Used", table_cell_style)],
        [Paragraph("<code>MOCK_OTP_ENABLED</code>", table_cell_code), Paragraph(".env", table_cell_style), Paragraph("<code>auth.config.ts</code>, <code>auth.service.ts</code>", table_cell_style), Paragraph("Enables fixed OTP '123456' for local development.", table_cell_style), Paragraph("Actively Used (Dev)", table_cell_style)],
        [Paragraph("<code>DEFAULT_MOCK_OTP</code>", table_cell_code), Paragraph(".env", table_cell_style), Paragraph("<code>auth.config.ts</code>, <code>auth.service.ts</code>", table_cell_style), Paragraph("Default OTP value in mock mode.", table_cell_style), Paragraph("Actively Used (Dev)", table_cell_style)],
        [Paragraph("<code>AWS_REGION</code>", table_cell_code), Paragraph(".env", table_cell_style), Paragraph("<code>storage.config.ts</code>, <code>s3.provider.ts</code>", table_cell_style), Paragraph("AWS Region for S3 buckets (default: ap-south-1).", table_cell_style), Paragraph("Actively Used", table_cell_style)],
        [Paragraph("<code>AWS_ACCESS_KEY_ID</code>", table_cell_code), Paragraph(".env", table_cell_style), Paragraph("<code>storage.config.ts</code>, <code>s3.provider.ts</code>", table_cell_style), Paragraph("AWS IAM credentials for S3 presigning.", table_cell_style), Paragraph("Actively Used", table_cell_style)],
        [Paragraph("<code>AWS_SECRET_ACCESS_KEY</code>", table_cell_code), Paragraph(".env", table_cell_style), Paragraph("<code>storage.config.ts</code>, <code>s3.provider.ts</code>", table_cell_style), Paragraph("AWS IAM secret key. Never expose to frontend.", table_cell_style), Paragraph("Actively Used", table_cell_style)],
        [Paragraph("<code>AWS_S3_MEDIA_BUCKET</code>", table_cell_code), Paragraph(".env", table_cell_style), Paragraph("<code>storage.config.ts</code>, <code>s3.provider.ts</code>", table_cell_style), Paragraph("Public profile photos and horoscopes S3 bucket.", table_cell_style), Paragraph("Actively Used", table_cell_style)],
        [Paragraph("<code>AWS_S3_VAULT_BUCKET</code>", table_cell_code), Paragraph(".env", table_cell_style), Paragraph("<code>storage.config.ts</code>, <code>s3.provider.ts</code>", table_cell_style), Paragraph("Private KYC verification selfies/IDs S3 vault bucket.", table_cell_style), Paragraph("Actively Used", table_cell_style)],
        [Paragraph("<code>CLOUDFRONT_URL</code>", table_cell_code), Paragraph(".env", table_cell_style), Paragraph("<code>storage.config.ts</code>, <code>utils.ts</code> (Next.js)", table_cell_style), Paragraph("CDN distribution domain for optimized image delivery.", table_cell_style), Paragraph("Actively Used", table_cell_style)],
        [Paragraph("<code>NEXT_PUBLIC_API_URL</code>", table_cell_code), Paragraph(".env", table_cell_style), Paragraph("<code>apps/web/src/lib/api-client.ts</code>", table_cell_style), Paragraph("Base URL for backend API (http://localhost:4000/api).", table_cell_style), Paragraph("Actively Used", table_cell_style)],
        [Paragraph("<code>RAZORPAY_KEY_ID</code>", table_cell_code), Paragraph("Missing in .env", table_cell_style), Paragraph("<code>payments.service.ts</code>", table_cell_style), Paragraph("Razorpay public key for payments order creation.", table_cell_style), Paragraph("<font color='#D97706'><b>Needs Config</b></font>", table_cell_style)],
        [Paragraph("<code>RAZORPAY_KEY_SECRET</code>", table_cell_code), Paragraph("Missing in .env", table_cell_style), Paragraph("<code>payments.service.ts</code>", table_cell_style), Paragraph("Razorpay webhook signature verification secret.", table_cell_style), Paragraph("<font color='#D97706'><b>Needs Config</b></font>", table_cell_style)],
    ]
    t_env = Table(env_data, colWidths=[120, 70, 114, 140, 60])
    t_env.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 3),
        ('RIGHTPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_env)

    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>Security & Architectural Risk Assessment</b>", h2_style))
    story.append(Paragraph("• <b>JWT Token Storage in <code>localStorage</code> (Medium Risk):</b> Access tokens stored in browser <code>localStorage</code> are susceptible to Cross-Site Scripting (XSS). <i>Remediation:</i> Transition to HTTP-only, Secure, SameSite cookies via Next.js middleware / BFF layer.", body_style))
    story.append(Paragraph("• <b>In-Memory S3 & Razorpay Fallbacks (Low Risk - Dev Only):</b> Services gracefully fall back to mock URLs when credentials are not configured, enabling smooth offline developer experience without crashing.", body_style))
    story.append(Paragraph("• <b>IDOR Protection:</b> Controllers enforce user isolation by extracting <code>userId</code> from verified JWT payload (<code>@CurrentUser()</code>) rather than client-supplied URL request parameters.", body_style))
    story.append(Paragraph("• <b>Database Query Optimization:</b> <code>SearchService</code>, <code>ShortlistsService</code>, and <code>MatchesService</code> execute batch queries using <code>inArray()</code> to retrieve photos and settings in 2-3 queries, avoiding classic N+1 bottlenecks.", body_style))

    story.append(PageBreak())

    # ==========================================
    # 12. ACTUAL VS INTENDED ARCHITECTURE
    # ==========================================
    story.append(Paragraph("11. Actual Architecture vs. Intended Architecture (Gap Analysis)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_PRIMARY, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "Comparing the target design in <code>specs/architecture.md</code> with the actual implementation in the repository "
        "reveals several architectural divergences:",
        body_style
    ))

    gap_data = [
        [Paragraph("Architectural Layer", table_header_style), Paragraph("Intended Architecture (from Specs)", table_header_style), Paragraph("Actual Implementation (in Codebase)", table_header_style), Paragraph("Gap Analysis & Recommendation", table_header_style)],
        [Paragraph("Repository Pattern", table_cell_bold), Paragraph("Each module should have a dedicated <code>*.repository.ts</code> separating SQL queries from business logic.", table_cell_style), Paragraph("Repositories were scaffolded as 0-byte files; Drizzle queries are executed directly inside <code>*.service.ts</code>.", table_cell_style), Paragraph("<b>Consolidation:</b> The service-direct-to-Drizzle pattern works well for current scale. Remove empty repository files.", table_cell_style)],
        [Paragraph("Shared API Client", table_cell_bold), Paragraph("Shared package <code>packages/api-client</code> used by Web and future Mobile apps.", table_cell_style), Paragraph("<code>packages/api-client</code> is empty. Web implements a complete local <code>apps/web/src/lib/api-client.ts</code>.", table_cell_style), Paragraph("<b>Action:</b> Move <code>apps/web/src/lib/api-client.ts</code> into <code>packages/api-client</code> when mobile development begins.", table_cell_style)],
        [Paragraph("Session Management", table_cell_bold), Paragraph("HTTP-only cookies issued by API / BFF. No access tokens in <code>localStorage</code>.", table_cell_style), Paragraph("<code>ApiClient</code> writes JWT to <code>localStorage.setItem('astalakshimi.auth_token')</code>.", table_cell_style), Paragraph("<b>Action:</b> Implement HTTP-only cookie session handling to harden against XSS token theft.", table_cell_style)],
        [Paragraph("Validation Schemas", table_cell_bold), Paragraph("Single source of truth in <code>packages/validation</code> shared by Web forms and API DTOs.", table_cell_style), Paragraph("Partially shared. Web also maintains local duplicate schemas in <code>apps/web/src/lib/validation.ts</code>.", table_cell_style), Paragraph("<b>Action:</b> Re-export all schemas from <code>packages/validation</code> and deprecate web-local duplicate definitions.", table_cell_style)],
        [Paragraph("Async Background Jobs", table_cell_bold), Paragraph("AWS SQS queue with worker consumers for notifications, media compression, and cleanup.", table_cell_style), Paragraph("Jobs module has 5 empty 0-byte files. Notifications are written synchronously to PostgreSQL.", table_cell_style), Paragraph("<b>Status:</b> Acceptable for current MVP traffic. Implement BullMQ / SQS worker when traffic scales 10x.", table_cell_style)],
    ]
    t_gap = Table(gap_data, colWidths=[90, 130, 140, 144])
    t_gap.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_gap)

    # ==========================================
    # 13. MASTER FEATURE MATRIX
    # ==========================================
    story.append(Spacer(1, 8))
    story.append(Paragraph("12. Master Feature Matrix & Complete File/Folder Audit", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_PRIMARY, spaceBefore=2, spaceAfter=8))

    matrix_data = [
        [Paragraph("Feature Domain", table_header_style), Paragraph("Frontend Component", table_header_style), Paragraph("API Route & Controller", table_header_style), Paragraph("Database Models", table_header_style), Paragraph("Status", table_header_style)],
        [Paragraph("Phone OTP Login / Signup", table_cell_bold), Paragraph("<code>login/page.tsx</code><br/><code>register/page.tsx</code>", table_cell_code), Paragraph("<code>POST /auth/send-otp</code><br/><code>POST /auth/verify-otp</code>", table_cell_code), Paragraph("<code>otp_attempts, users, profiles</code>", table_cell_style), Paragraph("<font color='#059669'><b>Complete</b></font>", table_cell_style)],
        [Paragraph("Profile Creation Stepper", table_cell_bold), Paragraph("<code>register/page.tsx</code><br/><code>step-verify.tsx</code>", table_cell_code), Paragraph("<code>POST /profiles/complete-registration</code>", table_cell_code), Paragraph("<code>profiles, family, lifestyle, horoscopes</code>", table_cell_style), Paragraph("<font color='#059669'><b>Complete</b></font>", table_cell_style)],
        [Paragraph("Profile Search & Filters", table_cell_bold), Paragraph("<code>search/page.tsx</code><br/><code>MatchListCard</code>", table_cell_code), Paragraph("<code>GET /search</code>", table_cell_code), Paragraph("<code>profiles, photos, user_settings</code>", table_cell_style), Paragraph("<font color='#059669'><b>Complete</b></font>", table_cell_style)],
        [Paragraph("Recommendations / Matches", table_cell_bold), Paragraph("<code>dashboard/page.tsx</code><br/><code>home/page.tsx</code>", table_cell_code), Paragraph("<code>GET /matches/top</code>", table_cell_code), Paragraph("<code>profiles, profile_photos, user_settings</code>", table_cell_style), Paragraph("<font color='#059669'><b>Complete</b></font>", table_cell_style)],
        [Paragraph("Send / Accept Interests", table_cell_bold), Paragraph("<code>interests/page.tsx</code><br/><code>ProfileActionBar</code>", table_cell_code), Paragraph("<code>POST /interests</code><br/><code>PATCH /interests/:id/accept</code>", table_cell_code), Paragraph("<code>interests, notifications, profiles</code>", table_cell_style), Paragraph("<font color='#059669'><b>Complete</b></font>", table_cell_style)],
        [Paragraph("Shortlist Profiles", table_cell_bold), Paragraph("<code>shortlist/page.tsx</code>", table_cell_code), Paragraph("<code>GET/POST/DELETE /shortlist</code>", table_cell_code), Paragraph("<code>shortlists, profiles, photos</code>", table_cell_style), Paragraph("<font color='#059669'><b>Complete</b></font>", table_cell_style)],
        [Paragraph("Direct Chat / Messaging", table_cell_bold), Paragraph("<code>inbox/page.tsx</code><br/><code>inbox/[threadId]/page.tsx</code>", table_cell_code), Paragraph("<code>GET/POST /chat/:threadId/messages</code>", table_cell_code), Paragraph("<code>messages, profiles, notifications</code>", table_cell_style), Paragraph("<font color='#059669'><b>Complete</b></font>", table_cell_style)],
        [Paragraph("S3 Media Uploads", table_cell_bold), Paragraph("<code>profile/edit/page.tsx</code><br/><code>step-verify.tsx</code>", table_cell_code), Paragraph("<code>POST /media/upload-url</code><br/><code>POST /media/confirm-photo</code>", table_cell_code), Paragraph("<code>profile_photos, verifications, horoscopes</code>", table_cell_style), Paragraph("<font color='#059669'><b>Complete</b></font>", table_cell_style)],
        [Paragraph("Pricing & Razorpay Checkout", table_cell_bold), Paragraph("<code>plans/page.tsx</code><br/><code>checkout/page.tsx</code>", table_cell_code), Paragraph("<code>GET /plans</code><br/><code>POST /payments/orders</code>", table_cell_code), Paragraph("<code>plans, payments, subscriptions</code>", table_cell_style), Paragraph("<font color='#059669'><b>Complete</b></font>", table_cell_style)],
        [Paragraph("User Settings & Privacy", table_cell_bold), Paragraph("<code>settings/page.tsx</code>", table_cell_code), Paragraph("<code>GET/PATCH /users/me/settings</code>", table_cell_code), Paragraph("<code>user_settings</code>", table_cell_style), Paragraph("<font color='#059669'><b>Complete</b></font>", table_cell_style)],
        [Paragraph("Notifications Feed", table_cell_bold), Paragraph("<code>notifications/page.tsx</code>", table_cell_code), Paragraph("<code>GET/PATCH /notifications</code>", table_cell_code), Paragraph("<code>notifications, profiles</code>", table_cell_style), Paragraph("<font color='#059669'><b>Complete</b></font>", table_cell_style)],
        [Paragraph("Admin Moderation SLA", table_cell_bold), Paragraph("Backend Controller", table_cell_code), Paragraph("<code>GET/PATCH /admin/verifications/*</code>", table_cell_code), Paragraph("<code>verifications, users, profiles</code>", table_cell_style), Paragraph("<font color='#059669'><b>Complete</b></font>", table_cell_style)],
    ]
    t_matrix = Table(matrix_data, colWidths=[100, 110, 130, 114, 50])
    t_matrix.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 3),
        ('RIGHTPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_matrix)

    story.append(PageBreak())

    # ==========================================
    # 14. CLEANUP PLAN & VERDICT
    # ==========================================
    story.append(Paragraph("13. Actionable Cleanup Plan, Priority Matrix & Final Verdict", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_PRIMARY, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph("<b>Actionable Repository Cleanup Plan</b>", h2_style))
    
    cleanup_items = [
        ("1. Remove Immediately (High Confidence)", [
            "Root scratch fix scripts: <code>fix_all.py</code>, <code>fix_final.py</code>, <code>fix_home.py</code>, <code>fix_libs.py</code>, <code>fix_portal.py</code>, <code>fix_queries.py</code>, <code>fix_remaining.py</code>, and <code>apps/web/fix_ts.js</code>.",
            "Empty 0-byte orphan modules in <code>apps/api/src/</code>: <code>subscriptions/</code>, <code>horoscope/</code>, <code>moderation/</code>, <code>jobs/</code>, <code>users/</code>.",
            "Empty 0-byte provider files: <code>payments/providers/phonepe.provider.ts</code>, <code>razorpay.provider.ts</code>, <code>payment.provider.ts</code>, <code>auth/providers/cognito.provider.ts</code>, <code>auth.provider.ts</code>.",
            "Duplicate empty guards: <code>apps/api/src/common/guards/entitlement.guard.ts</code>."
        ]),
        ("2. Refactor & Consolidate (Medium Priority)", [
            "Standardize API controller routing: Remove duplicate alias controllers (<code>InteractionsController</code>, <code>ShortlistController</code>, <code>MessagingController</code>) in favor of canonical REST endpoints.",
            "Consolidate validation schemas: Export all client form schemas from <code>packages/validation</code> and eliminate duplicate schemas in <code>apps/web/src/lib/validation.ts</code>.",
            "Refactor dynamic require in <code>profiles.service.ts</code> (lines 508 & 617) to standard ES top-level imports.",
            "Align subscription plan slugs between frontend <code>plans.ts</code> and backend <code>plans.service.ts</code>."
        ]),
        ("3. Security & Production Hardening (P0 / P1)", [
            "Migrate JWT token storage from client <code>localStorage</code> to HTTP-only, Secure SameSite session cookies.",
            "Ensure <code>JWT_SECRET</code>, <code>AWS_ACCESS_KEY_ID</code>, <code>AWS_SECRET_ACCESS_KEY</code>, and <code>RAZORPAY_KEY_SECRET</code> are injected securely via AWS Secrets Manager in production.",
            "Set <code>MOCK_OTP_ENABLED=false</code> in production environment and wire SMS delivery via AWS SNS or Fast2SMS gateway."
        ])
    ]

    for c_title, items in cleanup_items:
        story.append(Paragraph(f"<b>{c_title}</b>", h3_style))
        for it in items:
            story.append(Paragraph(f"• {it}", bullet_style))
        story.append(Spacer(1, 3))

    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>Priority Issue Matrix</b>", h2_style))
    prio_data = [
        [Paragraph("Priority", table_header_style), Paragraph("Identified Issue", table_header_style), Paragraph("Impact & Evidence", table_header_style), Paragraph("Recommended Action", table_header_style)],
        [Paragraph("<font color='#DC2626'><b>P0 - Critical</b></font>", table_cell_style), Paragraph("JWT Token in localStorage", table_cell_bold), Paragraph("Vulnerable to token exfiltration via client-side XSS.", table_cell_style), Paragraph("Implement HTTP-only cookies in Next.js BFF/API middleware.", table_cell_style)],
        [Paragraph("<font color='#D97706'><b>P1 - High</b></font>", table_cell_style), Paragraph("Razorpay Config & Mock OTP in Prod", table_cell_bold), Paragraph("Missing Razorpay config keys in <code>.env</code>; mock OTP risk if left enabled.", table_cell_style), Paragraph("Add Razorpay keys; strictly disable <code>MOCK_OTP_ENABLED</code> in production.", table_cell_style)],
        [Paragraph("<font color='#2563EB'><b>P2 - Medium</b></font>", table_cell_style), Paragraph("Duplicate Controller Aliases & Schemas", table_cell_bold), Paragraph("Duplicate routes in <code>interests</code>, <code>shortlists</code>, <code>chat</code>; split Zod schemas.", table_cell_style), Paragraph("Standardize on canonical endpoints; centralize Zod schemas in <code>packages/validation</code>.", table_cell_style)],
        [Paragraph("<font color='#64748B'><b>P3 - Low</b></font>", table_cell_style), Paragraph("35 Empty 0-Byte Files & Root Scripts", table_cell_bold), Paragraph("Repository clutter; confusing to new onboarding engineers.", table_cell_style), Paragraph("Delete 35 0-byte files, empty packages, and 8 root python fix scripts.", table_cell_style)],
    ]
    t_prio = Table(prio_data, colWidths=[70, 120, 174, 140])
    t_prio.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_prio)

    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>Final Architectural Verdict</b>", h2_style))
    story.append(Paragraph(
        "<b>Architectural Coherence:</b> The Astalakshimi Matrimony application has a solid, well-conceived core architecture. "
        "The decision to split the application into a Next.js 16 frontend and a NestJS backend communicating over typed REST APIs "
        "backed by PostgreSQL and Drizzle ORM provides excellent foundation for enterprise scalability.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Scalability Assessment at 10x Traffic:</b> The core read and write paths are well-indexed and use batch querying to avoid N+1 traps. "
        "At 10x current traffic (50,000+ DAU), the system will require: (1) Redis caching for match recommendations and discovery search results, "
        "(2) An SQS/BullMQ asynchronous job queue for in-app notification fan-out, and (3) Read-replica PostgreSQL database instances. "
        "No major architectural re-platforming is required.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Technical Debt Cost:</b> The technical debt in this repository is low-to-medium and primarily consists of repository cleanup "
        "(removing empty placeholder files and obsolete migration scripts) rather than deep architectural flaws. "
        "Addressing the P0 and P1 recommendations will position Astalakshimi as a production-ready, highly secure platform.",
        body_style
    ))

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] High-Level Design PDF generated successfully at: {filename}")

if __name__ == '__main__':
    output_path = sys.argv[1] if len(sys.argv) > 1 else 'docs/Astalakshimi_Architecture_HLD_and_Codebase_Audit.pdf'
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    build_pdf(output_path)
