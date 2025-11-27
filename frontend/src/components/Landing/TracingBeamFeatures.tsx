"use client";

import React from "react";
import { twMerge } from "tailwind-merge";
import { TracingBeam } from "@/components/ui/tracing-beam";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Mail,
  Globe,
  Eye,
  Brain,
  Search,
  AlertTriangle,
  Database,
  Table,
  CalendarDays,
} from "lucide-react";

// ---------------- COMPONENT ---------------- //

export function TracingBeamFeatures() {
  return (
    <TracingBeam className="px-6">
      <div className="max-w-4xl mx-auto antialiased pt-10 relative">
        {/* ----------- SECTION HEADING ----------- */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Why Choose <span className="text-primary">GoPilot</span>?
          </h2>
          <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto">
            GoPilot is an AI-powered workspace assistant that unifies Gmail,
            Google Drive, Google Sheets and Calendar into one conversational
            interface — so you can automate multi-step tasks (read a sheet,
            draft personalized emails, schedule meetings) with a single prompt.
          </p>
        </div>

        {/* ----------- FEATURES LIST ----------- */}
        {features.map((item, index) => (
          <Card
            key={`feature-${index}`}
            className={twMerge(
              "mb-10 border border-neutral-200 dark:border-neutral-800/50",
              "bg-white dark:bg-neutral-900",
              "text-neutral-900 dark:text-white shadow-lg hover:shadow-xl transition-all duration-300"
            )}
          >
            <CardHeader className="flex items-center justify-between">
              <Badge
                variant="outline"
                className="border-primary/30 text-primary/80 font-semibold px-3 py-1 rounded-full"
              >
                {item.badge}
              </Badge>
              <item.icon className="h-5 w-5 text-primary" />
            </CardHeader>

            <CardContent>
              <CardTitle className="text-2xl font-semibold mb-3">
                {item.title}
              </CardTitle>

              <CardDescription className="text-sm leading-relaxed text-muted-foreground mb-4">
                {item.description}
              </CardDescription>

              <ul className="space-y-3 text-sm text-muted-foreground">
                {item.points.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <point.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{point.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </TracingBeam>
  );
}

// ---------------- TYPES ---------------- //

interface FeaturePoint {
  text: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface Feature {
  title: string;
  description: string;
  badge: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  points: FeaturePoint[];
}

// ---------------- DATA (GoPilot version) ---------------- //

const features: Feature[] = [
  {
    title: "Unified AI Workspace Assistant",
    description:
      "Interact with Gmail, Google Drive, Calendar, and Sheets through a single conversational interface powered by the OpenAI Agent SDK.",
    badge: "Workspace Automation",
    icon: Brain,
    points: [
      { text: "Natural language commands for Google services", icon: Globe },
      { text: "Cross-service orchestration handled by AI", icon: Shield },
      { text: "Context-aware multi-step reasoning", icon: Brain },
      {
        text: "Fast switching between tasks without app hopping",
        icon: Search,
      },
    ],
  },

  {
    title: "Multi-Step Email Automation",
    description:
      "Automate email workflows such as drafting replies, summarizing inbox content, sending bulk messages, and generating personalized communication.",
    badge: "Smart Email Handling",
    icon: Mail,
    points: [
      {
        text: "Summarize, generate, and send emails automatically",
        icon: Brain,
      },
      { text: "Bulk personalized emails from Sheets data", icon: Database },
      {
        text: "Detect tasks and schedule events from inbox content",
        icon: AlertTriangle,
      },
      { text: "Gmail + AI-powered workflow optimization", icon: Globe },
    ],
  },

  {
    title: "Document & File Intelligence",
    description:
      "Instantly search, retrieve, summarize, and analyze Google Drive documents using semantic search powered by Qdrant.",
    badge: "File Intelligence",
    icon: Database,
    points: [
      { text: "Semantic search across Drive documents", icon: Search },
      { text: "Summarize PDFs, DOCX, and uploaded files", icon: Eye },
      { text: "Extract insights, action items and highlights", icon: Brain },
      {
        text: "Unified file access and previews directly from chat",
        icon: Globe,
      },
    ],
  },

  {
    title: "Smart Calendar Scheduling",
    description:
      "Create, modify, and analyze calendar events with AI-driven conflict detection and intelligent scheduling suggestions.",
    badge: "Calendar AI",
    icon: CalendarDays,
    points: [
      { text: "Auto-create and schedule meetings from chat", icon: Globe },
      { text: "Find availability across connected calendars", icon: Search },
      {
        text: "AI conflict resolution for overlapping events",
        icon: AlertTriangle,
      },
      { text: "Draft and send invites using Gmail integration", icon: Mail },
    ],
  },

  {
    title: "Google Sheets Automation",
    description:
      "Analyze spreadsheet data, extract insights, filter rows, generate reports, and trigger automated workflows directly from Sheets.",
    badge: "Sheets Automation",
    icon: Table,
    points: [
      { text: "Read and process Sheets data programmatically", icon: Database },
      { text: "Generate summaries and reports instantly", icon: Brain },
      { text: "Use Sheets data to personalize bulk emails", icon: Mail },
      {
        text: "Trigger cross-service operations from a sheet row",
        icon: Globe,
      },
    ],
  },

  {
    title: "Semantic Search & Knowledge Retrieval",
    description:
      "Find emails, files, notes, and calendar events using intelligent semantic search instead of basic keyword matching.",
    badge: "AI Semantic Search",
    icon: Search,
    points: [
      { text: "Vector-based search using Qdrant", icon: Database },
      { text: "Highly accurate results across services", icon: Brain },
      { text: "Search with natural language queries", icon: Globe },
      { text: "Fetch and combine multi-source data instantly", icon: Shield },
    ],
  },
];

export default TracingBeamFeatures;
