import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client - will use ANTHROPIC_API_KEY env variable
const anthropic = new Anthropic();

export type WritingContext =
  | "progress_note"
  | "incident_report"
  | "daily_summary"
  | "care_plan"
  | "policy"
  | "procedure"
  | "email_template"
  | "sms_template"
  | "family_update"
  | "staff_announcement"
  | "general";

export type WritingAction =
  | "improve"
  | "expand"
  | "summarize"
  | "make_professional"
  | "simplify"
  | "generate"
  | "check_compliance"
  | "suggest_structure";

interface AIWritingRequest {
  action: WritingAction;
  context: WritingContext;
  content?: string; // Existing content to improve/modify
  prompt?: string; // Additional instructions or topic for generation
  tone?: "formal" | "friendly" | "neutral";
}

interface AIWritingResponse {
  success: boolean;
  result?: string;
  suggestions?: string[];
  error?: string;
}

// Privacy-safe system prompts for different contexts
const CONTEXT_PROMPTS: Record<WritingContext, string> = {
  progress_note: `You are an expert NDIS disability support worker helping to write professional progress notes.
Focus on:
- Objective observations (what you saw/heard)
- Participant engagement and responses
- Goals worked on and progress made
- Any concerns or changes noted
- Support provided
Use person-centered language. Never include identifying information in your response - use placeholders like [PARTICIPANT] if referencing people.`,

  incident_report: `You are helping write a professional incident report for an NDIS service provider.
Focus on:
- Clear factual account of what happened
- Timeline of events
- Actions taken in response
- Witnesses present
- Follow-up required
Be objective, factual, and avoid assumptions. Use placeholders like [PARTICIPANT], [STAFF] for names.`,

  daily_summary: `You are helping write a professional daily summary for disability support services.
Include:
- Overview of activities completed
- Participant engagement levels
- Any notable events or achievements
- Concerns requiring follow-up
- Handover information for next shift
Use clear, concise language.`,

  care_plan: `You are helping write professional care plan content for NDIS participants.
Focus on:
- Person-centered goals
- Specific support strategies
- Measurable outcomes
- Risk management approaches
- Strengths-based language
Use NDIS-appropriate terminology.`,

  policy: `You are helping write organizational policies for an NDIS service provider.
Focus on:
- Clear purpose and scope
- NDIS Practice Standards alignment
- Responsibilities and procedures
- Compliance requirements
- Review processes
Use formal policy language.`,

  procedure: `You are helping write standard operating procedures for disability support services.
Include:
- Step-by-step instructions
- Safety considerations
- Required documentation
- Escalation pathways
- Quality assurance checkpoints
Be clear and actionable.`,

  email_template: `You are helping write professional email templates for an NDIS service provider.
Focus on:
- Professional yet warm tone
- Clear purpose and call to action
- Appropriate level of detail
- NDIS-appropriate language
Use placeholders like [RECIPIENT_NAME], [DATE], etc.`,

  sms_template: `You are helping write SMS templates for disability support services.
Keep messages:
- Brief and clear (under 160 characters when possible)
- Action-oriented
- Professional yet friendly
Use placeholders for personalization.`,

  family_update: `You are helping write family/carer updates about participant progress.
Focus on:
- Positive achievements and progress
- Activities and engagement
- Any concerns communicated sensitively
- Upcoming plans or changes
Use warm, accessible language that families can understand.`,

  staff_announcement: `You are helping write internal staff announcements for a disability support organization.
Focus on:
- Clear and concise messaging
- Relevant details and actions required
- Professional yet approachable tone
- Important dates or deadlines
Keep it engaging and informative.`,

  general: `You are a helpful writing assistant for a disability support organization.
Provide professional, clear, and appropriate content for the NDIS sector.
Use person-centered, strengths-based language.`,
};

const ACTION_INSTRUCTIONS: Record<WritingAction, string> = {
  improve: "Improve the following text to be more professional, clear, and well-structured while maintaining the original meaning:",
  expand: "Expand the following text with more detail and professional language while maintaining the core message:",
  summarize: "Summarize the following text concisely while retaining key information:",
  make_professional: "Rewrite the following text in a more professional and formal tone:",
  simplify: "Simplify the following text to be clearer and easier to understand:",
  generate: "Generate professional content based on the following request:",
  check_compliance: "Review the following text and suggest improvements for NDIS compliance and best practices. Highlight any concerns:",
  suggest_structure: "Suggest a professional structure/template for the following topic:",
};

export async function processAIWritingRequest(
  request: AIWritingRequest
): Promise<AIWritingResponse> {
  try {
    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        success: false,
        error: "AI writing assistant is not configured. Please add ANTHROPIC_API_KEY to environment variables.",
      };
    }

    const systemPrompt = CONTEXT_PROMPTS[request.context];
    const actionInstruction = ACTION_INSTRUCTIONS[request.action];

    let userMessage = actionInstruction;

    if (request.content) {
      userMessage += `\n\n${request.content}`;
    }

    if (request.prompt) {
      userMessage += `\n\nAdditional instructions: ${request.prompt}`;
    }

    if (request.tone) {
      userMessage += `\n\nTone: ${request.tone}`;
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    // Extract text from response
    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return {
        success: false,
        error: "No text response received from AI",
      };
    }

    return {
      success: true,
      result: textContent.text,
    };
  } catch (error: any) {
    console.error("AI Writing Assistant error:", error);

    // Handle specific error types
    if (error.status === 401) {
      return {
        success: false,
        error: "Invalid API key. Please check your ANTHROPIC_API_KEY configuration.",
      };
    }

    if (error.status === 429) {
      return {
        success: false,
        error: "Rate limit exceeded. Please try again in a moment.",
      };
    }

    return {
      success: false,
      error: error.message || "An error occurred while processing your request",
    };
  }
}

// Quick templates for common use cases
export const QUICK_TEMPLATES = {
  progress_note: {
    title: "Progress Note",
    prompts: [
      { label: "Community Access", prompt: "Write a progress note about a community access outing" },
      { label: "Skill Building", prompt: "Write a progress note about skill building activities" },
      { label: "Personal Care", prompt: "Write a progress note about personal care support" },
      { label: "Social Activity", prompt: "Write a progress note about a social/group activity" },
    ],
  },
  incident_report: {
    title: "Incident Report",
    prompts: [
      { label: "Minor Injury", prompt: "Structure for reporting a minor injury incident" },
      { label: "Behavioral Incident", prompt: "Structure for reporting a behavioral incident" },
      { label: "Property Damage", prompt: "Structure for reporting property damage" },
      { label: "Near Miss", prompt: "Structure for reporting a near miss" },
    ],
  },
  email_template: {
    title: "Email Templates",
    prompts: [
      { label: "Service Introduction", prompt: "Email introducing our services to a new participant" },
      { label: "Schedule Change", prompt: "Email notifying about a schedule change" },
      { label: "Review Meeting", prompt: "Email inviting to a service review meeting" },
      { label: "Thank You", prompt: "Thank you email to a participant/family" },
    ],
  },
  policy: {
    title: "Policy Templates",
    prompts: [
      { label: "Privacy Policy", prompt: "Structure for a privacy and confidentiality policy" },
      { label: "Incident Management", prompt: "Structure for an incident management policy" },
      { label: "Medication Management", prompt: "Structure for a medication management policy" },
      { label: "WHS Policy", prompt: "Structure for a work health and safety policy" },
    ],
  },
};
