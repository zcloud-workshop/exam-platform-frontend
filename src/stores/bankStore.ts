import { create } from 'zustand';
import type { QuestionBankResponse } from '@/types/question-bank';

interface BankState {
  currentBank: QuestionBankResponse | null;
  setCurrentBank: (bank: QuestionBankResponse | null) => void;
}

export const useBankStore = create<BankState>((set) => ({
  currentBank: (() => {
    const saved = localStorage.getItem('currentBank');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  })(),

  setCurrentBank: (bank) => {
    if (bank) {
      localStorage.setItem('currentBank', JSON.stringify(bank));
    } else {
      localStorage.removeItem('currentBank');
    }
    set({ currentBank: bank });
  },
}));
