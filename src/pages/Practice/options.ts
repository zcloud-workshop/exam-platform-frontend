export interface PracticeOption {
  key: string;
  label: string;
}

export function shuffleOptions(options: Record<string, string>): PracticeOption[] {
  const keys = Object.keys(options);
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  return keys.map((key, index) => ({ key, label: String.fromCharCode(65 + index) }));
}

export function remapAnswer(answer: string, labels: Record<string, string>): string {
  return answer.split(',').map((key) => labels[key.trim()] ?? key.trim()).sort().join(',');
}

export function remapAnalysis(analysis: string, labels: Record<string, string>): string {
  // Replace references in one pass so swapped labels cannot replace each other again.
  return analysis.replace(
    /(?<![A-Za-z0-9_])[A-Z]+(?:[ \t]*(?:[,，、/&+]|和|与|及|或|and|or)[ \t]*[A-Z]+)*(?![A-Za-z0-9_])/g,
    (reference: string, offset: number) => {
      const keys = reference.match(/[A-Z]/g) ?? [];
      if (keys.some((key) => !labels[key])) return reference;

      const before = analysis.slice(0, offset);
      const after = analysis.slice(offset + reference.length);
      const namedReference = /(?:\b(?:options?|choices?|answers?|choose|select)(?:[ \t]+(?:is|are))?|(?:选项|答案|选择)(?:是|为)?)[ \t]*[:：]?[ \t]*$/i.test(before);
      const label = /^[ \t]*(?:\*\*)?[:：]/.test(after)
        || (/(?:^|\n)[ \t]*(?:[-*][ \t]*)?(?:\*\*)?$/.test(before)
          && /^[ \t]*(?:\*\*)?[.、)）]/.test(after));
      const description = /^[ \t]*(?:选项|项|\b(?:is|are)\b)/i.test(after);
      const chineseReference = /[\u3400-\u9fff][ \t]*$/.test(before)
        || /^[ \t]*[\u3400-\u9fff]/.test(after);
      const standalone = !before.trim() && !after.trim();
      if (!namedReference && !label && !description && !chineseReference && !standalone) return reference;

      return reference.replace(/[A-Z]/g, (key) => labels[key]);
    },
  );
}
