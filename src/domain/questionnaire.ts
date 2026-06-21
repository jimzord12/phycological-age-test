/**
 * Canonical questionnaire content for version RMP-1.0.
 *
 * Source of truth: Psychological-Maturity-Questionnaire.DOMAIN.md §5–§8.
 * Prompts, option labels and score maps are reproduced verbatim. Changing any
 * of them requires a questionnaire version increment (DOMAIN §17).
 *
 * Scores are SERVER-OWNED and must never be sent to the client (PRD §14.1).
 * Use {@link getPublicQuestionnaire} to produce a score-free projection.
 */

import type { DimensionId } from "./result-types";
import { QUESTIONNAIRE_VERSION } from "./versions";

export type OptionScore = 1 | 2 | 3 | 4 | 5 | null;

export type StructuredOption = {
  id: string;
  label: string;
  score: OptionScore;
  isNotApplicable?: boolean;
};

export type StructuredQuestion = {
  kind: "structured";
  id: string;
  dimension: DimensionId;
  prompt: string;
  options: readonly StructuredOption[];
};

export type NarrativeField = {
  id: string;
  label: string;
  maxWords: number;
};

export type NarrativeExercise = {
  kind: "narrative";
  id: "N01" | "N02";
  title: string;
  intro: string;
  fields: readonly NarrativeField[];
  minimumTotalWords: number;
};

/** Shared "Not applicable" option appended to every structured item (DOMAIN §6.4). */
const NOT_APPLICABLE: StructuredOption = {
  id: "NA",
  label: "Not applicable / I cannot recall a relevant situation",
  score: null,
  isNotApplicable: true,
};

function q(
  id: string,
  dimension: DimensionId,
  prompt: string,
  options: ReadonlyArray<[string, string, OptionScore]>,
): StructuredQuestion {
  return {
    kind: "structured",
    id,
    dimension,
    prompt,
    options: [
      ...options.map(([oid, label, score]) => ({ id: oid, label, score })),
      NOT_APPLICABLE,
    ],
  };
}

export const STRUCTURED_QUESTIONS: readonly StructuredQuestion[] = [
  // --- Emotional Regulation (ER) ---
  q("ER01", "ER", "Think of the last criticism that stayed with you after the conversation. What did you actually do first?", [
    ["A", "I responded before I had fully understood what they meant.", 1],
    ["B", "I defended myself point by point, then later noticed that I had missed part of the criticism.", 2],
    ["C", "I asked for a concrete example, paused, and responded after I understood the specific claim.", 5],
    ["D", "I said very little, but replayed the conversation and avoided the person afterward.", 2],
    ["E", "I acknowledged the useful part and directly challenged the part I believed was unfair.", 4],
  ]),
  q("ER02", "ER", "During the last emotionally intense situation you remember clearly, how accurately could you identify what you were feeling?", [
    ["A", "I mainly knew that I felt bad, stressed, or overwhelmed.", 1],
    ["B", "I identified the broad emotion several hours later.", 2],
    ["C", "I could distinguish the specific emotion and what it was pushing me to do while it was happening.", 5],
    ["D", "I identified the emotion quickly and treated it as proof that my interpretation was correct.", 3],
    ["E", "My first label was incomplete, but I revised it after noticing more of what was going on.", 4],
  ]),
  q("ER03", "ER", "After the last conflict that genuinely affected you, what best describes your recovery?", [
    ["A", "I appeared normal quickly and did not think about it again.", 3],
    ["B", "I took deliberate steps to settle, then returned to the issue with a clearer view.", 5],
    ["C", "It affected me for a day or more, but I continued functioning and eventually processed it.", 3],
    ["D", "I replayed it for days and repeatedly reopened the argument in my head or with other people.", 1],
    ["E", "I acted as if it was over, but the tension remained in my body or behavior.", 2],
  ]),
  q("ER04", "ER", "Think of the last time your behavior hurt or unfairly affected someone. What happened next?", [
    ["A", "I apologized, but spent most of the conversation explaining what I intended.", 2],
    ["B", "I waited for them to raise it again because I did not want to make the situation worse.", 1],
    ["C", "I named what I did, acknowledged the likely impact, and asked what repair would be useful.", 5],
    ["D", "I apologized quickly to end the tension, but did not change the repeated behavior.", 2],
    ["E", "I accepted the part that was mine, disagreed with what was not mine, and changed one concrete behavior.", 4],
  ]),
  q("ER05", "ER", "In the last high-pressure situation where strong emotion could have affected an important decision, what did you do?", [
    ["A", "I suppressed the emotion completely until the task was over, then made time to process it.", 4],
    ["B", "I expressed it immediately because holding it in felt dishonest.", 1],
    ["C", "I took a short, explicit pause and returned when I could act proportionately.", 5],
    ["D", "I distracted myself until the feeling passed and avoided revisiting the issue.", 2],
    ["E", "I looked for reassurance before I felt able to decide.", 3],
  ]),

  // --- Impulse Control (IC) ---
  q("IC01", "IC", "The last time you wrote a message while angry, hurt, or anxious, what did you do?", [
    ["A", "I sent it while the emotion was still at its peak.", 1],
    ["B", "I drafted it, waited at least twenty minutes, and reviewed whether the message still served my goal.", 4],
    ["C", "Because it was not urgent, I waited until the next day and then decided whether to send anything.", 5],
    ["D", "I did not send it, but later expressed the same anger indirectly.", 2],
    ["E", "I rewrote it repeatedly because I was trying to eliminate every possible negative reaction.", 3],
  ]),
  q("IC02", "IC", "When a repeated temptation conflicts with a longer-term goal, which pattern best matches what you have actually done?", [
    ["A", "I usually choose the immediate reward and deal with the cost later.", 1],
    ["B", "I rely on willpower in the moment, with mixed results.", 2],
    ["C", "I change the environment in advance so the preferred action becomes easier.", 5],
    ["D", "I sometimes choose the reward deliberately and accept the cost without pretending it was accidental.", 4],
    ["E", "I remove nearly all rewards because any exception feels dangerous.", 3],
  ]),
  q("IC03", "IC", "Think of the last difficult task that stopped progressing. What did you do after the first few failed attempts?", [
    ["A", "I switched to something easier and did not return.", 1],
    ["B", "I forced myself through it while getting increasingly angry, and the quality dropped.", 2],
    ["C", "I broke the problem into smaller parts, tried a different route, and returned with new information.", 5],
    ["D", "I defined what I had already tried, then asked for help.", 4],
    ["E", "I kept repeating roughly the same approach because stopping felt like failure.", 2],
  ]),
  q("IC04", "IC", "The last time you were likely to miss a meaningful commitment, what did you do?", [
    ["A", "I waited to see whether motivation would return.", 1],
    ["B", "I relied on a last-minute sprint.", 2],
    ["C", "I reduced the work to a minimum viable step and completed that step consistently.", 5],
    ["D", "I communicated early, renegotiated honestly, and accepted the inconvenience caused.", 4],
    ["E", "I quietly dropped a lower-priority promise because I had accepted too many commitments.", 2],
  ]),
  q("IC05", "IC", "Think of the last consequential decision that felt urgent but was not an emergency. What best describes your process?", [
    ["A", "I acted quickly mainly to remove the discomfort of uncertainty.", 1],
    ["B", "I delayed until some useful options were no longer available.", 2],
    ["C", "I gathered the minimum information needed, set a decision deadline, and chose deliberately.", 5],
    ["D", "I handed the decision to someone else because I did not want responsibility for the outcome.", 2],
    ["E", "I chose the most reversible reasonable option and scheduled a review point.", 4],
  ]),

  // --- Perspective-Taking (PT) ---
  q("PT01", "PT", "During the last disagreement with someone you respect, what did you actually do?", [
    ["A", "I focused on demonstrating where their reasoning failed.", 1],
    ["B", "I avoided the disagreement to protect the relationship.", 2],
    ["C", "I asked questions and summarized their reasoning before explaining my own view.", 5],
    ["D", "I agreed outwardly, then dismissed their position privately.", 2],
    ["E", "I identified the strongest part of their case while keeping my original conclusion.", 4],
  ]),
  q("PT02", "PT", "Think of the most recent time you changed your mind about something that mattered. What caused the change?", [
    ["A", "I cannot recall changing my mind about anything important recently.", 1],
    ["B", "Someone I trust or admire told me I was wrong.", 2],
    ["C", "New evidence contradicted the prediction my previous belief would have made.", 5],
    ["D", "A real consequence exposed a blind spot I had not considered.", 4],
    ["E", "I changed my stated position because disagreement was becoming socially costly.", 2],
  ]),
  q("PT03", "PT", "When the available evidence supports more than one plausible explanation, which pattern is closest to your own?", [
    ["A", "I choose an explanation quickly because uncertainty is distracting.", 1],
    ["B", "I keep collecting information and struggle to commit to any view.", 2],
    ["C", "I hold multiple explanations and deliberately look for evidence that could disprove each one.", 5],
    ["D", "I adopt a provisional explanation and update it when new information arrives.", 4],
    ["E", "I use the majority view until there is a strong reason not to.", 3],
  ]),
  q("PT04", "PT", "The last time useful feedback was delivered badly, what did you do?", [
    ["A", "I rejected the content because the delivery was disrespectful.", 1],
    ["B", "I accepted almost all of it because I wanted to prove I was open-minded.", 2],
    ["C", "I separated the delivery from the claim and evaluated each independently.", 5],
    ["D", "I rejected it in the moment but reconsidered it privately later.", 3],
    ["E", "I asked for a concrete example and tested whether the claim matched a broader pattern.", 4],
  ]),
  q("PT05", "PT", "When someone recently disappointed you, what explanation did you begin with?", [
    ["A", "I assumed it revealed a flaw in their character.", 1],
    ["B", "I assumed I had caused the problem.", 2],
    ["C", "I considered both situational and personal explanations and looked for information before deciding.", 5],
    ["D", "I chose the most charitable explanation even though the behavior crossed a boundary.", 3],
    ["E", "I withheld a strong conclusion until I could see whether it was a repeated pattern.", 4],
  ]),

  // --- Identity Stability (IS) — four items ---
  q("IS01", "IS", "Think of the last time your view differed from a group whose approval mattered to you. What did you do?", [
    ["A", "I changed my stated view so I would not stand out.", 1],
    ["B", "I became more certain and forceful mainly to prove that I was independent.", 2],
    ["C", "I stated my actual level of certainty without performing confidence or agreement.", 5],
    ["D", "I stayed quiet in the moment but made the later decision according to my own priorities.", 4],
    ["E", "I matched the group's tone more than its actual beliefs.", 3],
  ]),
  q("IS02", "IS", "After the last piece of negative feedback from someone important to you, what happened to your view of yourself?", [
    ["A", "My overall sense of competence or worth dropped for much of the day.", 1],
    ["B", "I dismissed the feedback to protect my confidence.", 2],
    ["C", "I compared it with evidence, my values, and other observations before deciding what it meant.", 5],
    ["D", "I asked several people for reassurance until I felt stable again.", 2],
    ["E", "I accepted the useful part without turning it into a global judgment about myself.", 4],
  ]),
  q("IS03", "IS", "Around a person or group you perceived as high-status, what did you notice yourself doing most recently?", [
    ["A", "I exaggerated my competence, certainty, or interests.", 1],
    ["B", "I withdrew because I expected to be evaluated negatively.", 2],
    ["C", "I noticed the urge to perform and kept my claims accurate.", 5],
    ["D", "I adapted my communication style without changing facts, values, or commitments.", 4],
    ["E", "I challenged them more aggressively than necessary to prove equality.", 2],
  ]),
  q("IS04", "IS", "Think of a recent decision where your own priorities conflicted with what other people expected. What did you do?", [
    ["A", "I chose the option most likely to preserve approval.", 1],
    ["B", "I chose the opposite of what was expected because compliance felt weak.", 2],
    ["C", "I named the trade-off and chose according to priorities I had already considered important.", 5],
    ["D", "I compromised a preference without violating a core value.", 4],
    ["E", "I postponed the decision because either choice could disappoint someone.", 2],
  ]),

  // --- Temporal Depth (TD) ---
  q("TD01", "TD", "In a recent meaningful decision, how far ahead did you genuinely consider the consequences?", [
    ["A", "I mainly considered what would make today easier.", 1],
    ["B", "I considered the next few months once the consequences became hard to ignore.", 2],
    ["C", "I considered immediate, one-year, and multi-year effects before deciding.", 5],
    ["D", "I prioritized the distant future so strongly that present needs received too little weight.", 3],
    ["E", "I chose a reversible step that created information for the next decision.", 4],
  ]),
  q("TD02", "TD", "When planning something important with uncertain conditions, which approach best matches your recent behavior?", [
    ["A", "I avoided making a plan because too much could change.", 1],
    ["B", "I made a detailed plan and treated deviations as failure.", 2],
    ["C", "I planned multiple scenarios, decision triggers, and a reasonable buffer.", 5],
    ["D", "I chose a direction and scheduled a checkpoint rather than pretending to know the full path.", 4],
    ["E", "I followed another person's plan because they seemed more certain.", 2],
  ]),
  q("TD03", "TD", "Think of a goal that produced little visible progress for several weeks. What did you do?", [
    ["A", "I abandoned it because the lack of progress suggested it was not working.", 1],
    ["B", "I continued mainly from guilt, without reviewing whether the method made sense.", 2],
    ["C", "I tracked leading indicators, reviewed the method, and adjusted while preserving the goal.", 5],
    ["D", "I reduced the pace to something sustainable and continued.", 4],
    ["E", "I invested more time even when it was damaging health, relationships, or other commitments.", 3],
  ]),
  q("TD04", "TD", "When you think about limited time or mortality, how does it affect actual decisions?", [
    ["A", "It is mostly an abstract thought and rarely changes behavior.", 2],
    ["B", "It makes recognition, achievement, or being remembered feel especially important.", 2],
    ["C", "It clarifies concrete priorities, boundaries, and commitments.", 5],
    ["D", "It makes long-term effort feel pointless.", 1],
    ["E", "It prompts periodic rebalancing without dominating everyday life.", 4],
  ]),
  q("TD05", "TD", "Which statement best matches how you handled a recent choice between present enjoyment and future security?", [
    ["A", "I chose the present benefit and assumed my future self would handle the cost.", 1],
    ["B", "I denied the present need because future security felt more important than almost anything else.", 3],
    ["C", "I explicitly allocated something to both the present and the future.", 5],
    ["D", "I swung between indulgence and restriction without a stable rule.", 2],
    ["E", "I prioritized according to the size, reversibility, and timing of the consequences.", 4],
  ]),
] as const;

export const NARRATIVE_EXERCISES: readonly NarrativeExercise[] = [
  {
    kind: "narrative",
    id: "N01",
    title: "The Friction Story",
    intro:
      "Describe one real situation from the last 12 months. Concrete detail is more useful than polished language. There is no ideal type of answer.",
    fields: [
      { id: "event", label: "What happened, and what did you do?", maxWords: 90 },
      { id: "selfStory", label: "What were you telling yourself at the time?", maxWords: 60 },
      { id: "newUnderstanding", label: "What do you understand differently now?", maxWords: 90 },
    ],
    minimumTotalWords: 45,
  },
  {
    kind: "narrative",
    id: "N02",
    title: "The Unsolved Pattern",
    intro:
      "Describe a pattern you can observe but do not fully understand. This could involve a repeated reaction, a type of person who affects you unusually strongly, or a decision pattern you keep repeating.",
    fields: [
      { id: "pattern", label: "What is the repeated pattern?", maxWords: 70 },
      { id: "contexts", label: "When or around whom does it tend to appear?", maxWords: 50 },
      { id: "unknown", label: "What part remains genuinely unclear to you?", maxWords: 70 },
    ],
    minimumTotalWords: 35,
  },
] as const;

/** Required non-clinical disclaimer (DOMAIN §2). */
export const PUBLIC_DISCLAIMER =
  "This is a reflective self-assessment, not a diagnosis or a scientifically validated measure of literal psychological age. Results depend on self-report, interpretation, current circumstances, and how specifically you answer.";

// --- Lookup helpers -------------------------------------------------------

const QUESTION_BY_ID: ReadonlyMap<string, StructuredQuestion> = new Map(
  STRUCTURED_QUESTIONS.map((question) => [question.id, question]),
);

export function getStructuredQuestion(id: string): StructuredQuestion | undefined {
  return QUESTION_BY_ID.get(id);
}

export function getOptionScore(questionId: string, optionId: string): OptionScore | undefined {
  const question = QUESTION_BY_ID.get(questionId);
  if (!question) return undefined;
  const option = question.options.find((o) => o.id === optionId);
  return option ? option.score : undefined;
}

export function questionsForDimension(dimension: DimensionId): StructuredQuestion[] {
  return STRUCTURED_QUESTIONS.filter((question) => question.dimension === dimension);
}

/**
 * Score-free questionnaire projection for the public API (PRD §14.1).
 * Numeric option scores are stripped so they never reach the client.
 */
export function getPublicQuestionnaire() {
  return {
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    disclaimer: PUBLIC_DISCLAIMER,
    structured: STRUCTURED_QUESTIONS.map((question) => ({
      kind: question.kind,
      id: question.id,
      dimension: question.dimension,
      prompt: question.prompt,
      options: question.options.map((option) => ({
        id: option.id,
        label: option.label,
        isNotApplicable: option.isNotApplicable ?? false,
      })),
    })),
    narrative: NARRATIVE_EXERCISES,
  };
}
