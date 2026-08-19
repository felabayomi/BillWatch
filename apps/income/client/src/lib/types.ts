export interface IncomeEntry {
  id: string;
  userId: string;
  amount: string;
  source: string;
  notes?: string;
  date: Date;
  createdAt: Date;
}

export interface QuickCashSuggestion {
  id: string;
  title: string;
  description: string;
  estimatedEarnings: string;
  timeframe: string;
  requirements: {
    hasItems?: boolean;
    hasTransport?: boolean;
    hasTime?: boolean;
    comfortableWithPeople?: boolean;
  };
  category: string;
}

export interface UserProgress {
  id: string;
  userId: string;
  level: string;
  milestone: string;
  achievedAt: Date;
}

export interface UserReflection {
  id: string;
  userId: string;
  weekStart: Date;
  reflection?: string;
  strategy?: string;
  createdAt: Date;
}

export interface User {
  id: string;
  username: string;
  currentLevel: string;
  levelStartedAt?: Date;
  dailyGoal?: string;
  weeklyGoal?: string;
  monthlyGoal?: string;
  yearlyGoal?: string;
  primaryGoalType?: string;
  levelTargets?: {
    foundation?: { amount: number; currency: string };
    stability?: { amount: number; currency: string };
    growth?: { amount: number; currency: string };
    legacy?: { amount: number; currency: string };
  } | null;
  showManifesto: boolean;
  createdAt: Date;
}

export interface UserAccount {
  id: string;
  userId: string;
  name: string;
  type: string;
  isDefault: boolean | null;
  createdAt: Date;
}

export type IncomeSource = 'wages' | 'side_hustle' | 'portfolio' | 'services' | 'other';

export type Level = 'survival' | 'stability' | 'growth' | 'legacy';

