export type BadgeId =
  | "wpm_50"
  | "wpm_100"
  | "wpm_150"
  | "streak_7"
  | "streak_30"
  | "tests_100"
  | "accuracy_99"
  | "daily_7";

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  icon: string;
}

export interface AchievementContext {
  latestWpm: number;
  latestAccuracy: number;
  totalTests: number;
  currentStreak: number;
  bestWpm: number;
  dailyChallengesCompleted: number;
}

export const BADGES: Badge[] = [
  {
    id: "wpm_50",
    name: "Speed Typist",
    description: "Reach 50 WPM in a test",
    icon: "\u26A1",
  },
  {
    id: "wpm_100",
    name: "Lightning Fingers",
    description: "Reach 100 WPM in a test",
    icon: "\uD83D\uDD25",
  },
  {
    id: "wpm_150",
    name: "Keyboard Demon",
    description: "Reach 150 WPM in a test",
    icon: "\uD83D\uDC7F",
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    description: "Maintain a 7-day practice streak",
    icon: "\uD83D\uDCC5",
  },
  {
    id: "streak_30",
    name: "Monthly Master",
    description: "Maintain a 30-day practice streak",
    icon: "\uD83C\uDFC6",
  },
  {
    id: "tests_100",
    name: "Centurion",
    description: "Complete 100 typing tests",
    icon: "\uD83D\uDCAF",
  },
  {
    id: "accuracy_99",
    name: "Perfectionist",
    description: "Achieve 99% or higher accuracy in a test",
    icon: "\uD83C\uDFAF",
  },
  {
    id: "daily_7",
    name: "Challenge Accepted",
    description: "Complete 7 daily challenges",
    icon: "\u2B50",
  },
];

const BADGE_CHECKS: Record<BadgeId, (ctx: AchievementContext) => boolean> = {
  wpm_50: (ctx) => ctx.latestWpm >= 50,
  wpm_100: (ctx) => ctx.latestWpm >= 100,
  wpm_150: (ctx) => ctx.latestWpm >= 150,
  streak_7: (ctx) => ctx.currentStreak >= 7,
  streak_30: (ctx) => ctx.currentStreak >= 30,
  tests_100: (ctx) => ctx.totalTests >= 100,
  accuracy_99: (ctx) => ctx.latestAccuracy >= 99,
  daily_7: (ctx) => ctx.dailyChallengesCompleted >= 7,
};

export function checkNewBadges(
  ctx: AchievementContext,
  earned: Set<string>
): BadgeId[] {
  const newlyEarned: BadgeId[] = [];

  for (const badge of BADGES) {
    if (earned.has(badge.id)) continue;

    const check = BADGE_CHECKS[badge.id];
    if (check && check(ctx)) {
      newlyEarned.push(badge.id);
    }
  }

  return newlyEarned;
}
